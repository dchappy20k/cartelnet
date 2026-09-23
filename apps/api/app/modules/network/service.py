from typing import Dict, Any, List, Optional, Set, Tuple
import networkx as nx
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import Company, Director, CompanyDirector, Address
from app.modules.risk.models import RiskSignal, Evidence
from app.modules.network.schemas import (
    GraphNode,
    GraphEdge,
    GraphResponse,
    GraphSummary,
    ClusterListResponse,
    CollusionCluster,
    ClusterEntity,
    CompanyDossierResponse,
    DirectorSummary,
    CoBidderSummary,
)


class NetworkService:
    """Service layer for projecting relational entity records into NetworkX graphs."""

    @staticmethod
    def _compute_layout(
        nodes: List[Dict[str, Any]], 
        edges: List[Dict[str, Any]], 
        pinned_node: Optional[str] = None
    ) -> Dict[str, Tuple[float, float]]:
        """Compute optimal 2D coordinates scaled to standard SVG viewport (800 x 500)."""
        G = nx.Graph()
        for n in nodes:
            G.add_node(n["id"])
        for e in edges:
            G.add_edge(e["from"], e["to"])

        if len(G.nodes) == 0:
            return {}

        fixed = [pinned_node] if pinned_node and pinned_node in G.nodes else None
        pos_init = {pinned_node: (0.0, 0.0)} if fixed else None

        k_val = 1.0 / max(len(G.nodes) ** 0.4, 1.0)
        raw_pos = nx.spring_layout(
            G, 
            pos=pos_init, 
            fixed=fixed, 
            k=k_val, 
            iterations=70, 
            seed=42
        )

        xs = [coords[0] for coords in raw_pos.values()]
        ys = [coords[1] for coords in raw_pos.values()]

        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)

        span_x = (max_x - min_x) if (max_x - min_x) > 1e-5 else 1.0
        span_y = (max_y - min_y) if (max_y - min_y) > 1e-5 else 1.0

        scaled_pos: Dict[str, Tuple[float, float]] = {}
        for nid, (x, y) in raw_pos.items():
            if fixed and nid == pinned_node:
                scaled_pos[nid] = (400.0, 250.0)
            else:
                norm_x = (x - min_x) / span_x
                norm_y = (y - min_y) / span_y
                scaled_x = round(100.0 + norm_x * 600.0, 1)
                scaled_y = round(80.0 + norm_y * 340.0, 1)
                scaled_pos[nid] = (scaled_x, scaled_y)

        return scaled_pos

    @classmethod
    def build_global_graph(cls, db: Session, organization_id: str = "default") -> GraphResponse:
        """Project all procurement entities into a global NetworkX relationship graph."""
        tenders = db.execute(select(Tender).filter(Tender.organization_id == organization_id)).scalars().all()
        companies = db.execute(select(Company).filter(Company.organization_id == organization_id)).scalars().all()
        directors = db.execute(select(Director).filter(Director.organization_id == organization_id)).scalars().all()
        addresses = db.execute(select(Address).filter(Address.organization_id == organization_id)).scalars().all()
        bids = db.execute(select(Bid).filter(Bid.organization_id == organization_id)).scalars().all()
        cd_links = db.execute(select(CompanyDirector).filter(CompanyDirector.organization_id == organization_id)).scalars().all()

        nodes_dict: Dict[str, Dict[str, Any]] = {}
        edges_list: List[Dict[str, Any]] = []

        # 1. Tender Nodes
        for t in tenders:
            nodes_dict[t.tender_ref] = {
                "id": t.tender_ref,
                "label": t.title if len(t.title) <= 28 else t.title[:25] + "...",
                "type": "tender",
                "risk": t.risk_level,
                "metadata": {
                    "id": t.id,
                    "tender_ref": t.tender_ref,
                    "authority": t.authority,
                    "value": t.estimated_value,
                    "score": t.risk_score,
                },
            }

        # 2. Company Nodes
        company_lookup = {c.id: c for c in companies}
        for c in companies:
            nodes_dict[c.id] = {
                "id": c.id,
                "label": c.legal_name,
                "type": "company",
                "companyId": c.id,
                "risk": "high" if c.status == "Under Review" else "low",
                "metadata": {
                    "legal_name": c.legal_name,
                    "tax_id": c.tax_id,
                    "status": c.status,
                },
            }

        # 3. Director Nodes
        for d in directors:
            nodes_dict[d.id] = {
                "id": d.id,
                "label": d.full_name,
                "type": "director",
                "metadata": {
                    "normalized_name": d.normalized_name,
                },
            }

        # 4. Address Nodes
        for a in addresses:
            addr_label = a.city if a.city else (a.raw_address[:20] + "...")
            nodes_dict[a.id] = {
                "id": a.id,
                "label": addr_label,
                "type": "address",
                "metadata": {
                    "raw_address": a.raw_address,
                    "hash": a.normalized_hash,
                },
            }

        # 5. Edges: Bids (Company -> Tender)
        tender_ref_by_id = {t.id: t.tender_ref for t in tenders}
        for b in bids:
            tender_ref = tender_ref_by_id.get(b.tender_id)
            if tender_ref and b.company_id in nodes_dict and tender_ref in nodes_dict:
                edges_list.append({
                    "from": b.company_id,
                    "to": tender_ref,
                    "label": f"Bid ${b.amount / 1_000_000:.1f}M",
                    "relationship_type": "bids_on",
                    "weight": 1.0,
                })

        # 6. Edges: CompanyDirector (Director -> Company)
        for cd in cd_links:
            if cd.director_id in nodes_dict and cd.company_id in nodes_dict:
                edges_list.append({
                    "from": cd.director_id,
                    "to": cd.company_id,
                    "label": cd.role or "director",
                    "relationship_type": "director_of",
                    "weight": 1.5,
                })

        # 7. Edges: Company -> Address
        for c in companies:
            if c.address_id and c.address_id in nodes_dict:
                edges_list.append({
                    "from": c.id,
                    "to": c.address_id,
                    "label": "registered at",
                    "relationship_type": "registered_at",
                    "weight": 1.2,
                })

        # Compute 2D coordinates via NetworkX
        coords = cls._compute_layout(list(nodes_dict.values()), edges_list)

        graph_nodes: List[GraphNode] = []
        entity_counts: Dict[str, int] = {}
        risk_counts: Dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}

        for nid, data in nodes_dict.items():
            pos = coords.get(nid, (400.0, 250.0))
            node_type = data["type"]
            entity_counts[node_type] = entity_counts.get(node_type, 0) + 1
            if data.get("risk"):
                risk_counts[data["risk"]] = risk_counts.get(data["risk"], 0) + 1

            graph_nodes.append(
                GraphNode(
                    id=data["id"],
                    label=data["label"],
                    type=data["type"],
                    x=pos[0],
                    y=pos[1],
                    companyId=data.get("companyId"),
                    risk=data.get("risk"),
                    metadata=data.get("metadata", {}),
                )
            )

        graph_edges = [
            GraphEdge(
                source=e["from"],
                target=e["to"],
                label=e.get("label"),
                relationship_type=e.get("relationship_type"),
                weight=e.get("weight", 1.0),
            )
            for e in edges_list
        ]

        summary = GraphSummary(
            total_nodes=len(graph_nodes),
            total_edges=len(graph_edges),
            entity_counts=entity_counts,
            risk_summary=risk_counts,
        )

        return GraphResponse(nodes=graph_nodes, edges=graph_edges, summary=summary)

    @classmethod
    def build_tender_subgraph(
        cls, 
        db: Session, 
        tender_identifier: str, 
        organization_id: str = "default"
    ) -> GraphResponse:
        """Project a focused subgraph centered on a specific tender and its bidders/relationships."""
        tender = db.execute(
            select(Tender).filter(
                Tender.organization_id == organization_id,
                (Tender.id == tender_identifier) | (Tender.tender_ref == tender_identifier)
            )
        ).scalar_one_or_none()

        if not tender:
            return GraphResponse(
                nodes=[],
                edges=[],
                summary=GraphSummary(
                    total_nodes=0,
                    total_edges=0,
                    entity_counts={},
                    risk_summary={"low": 0, "medium": 0, "high": 0, "critical": 0}
                )
            )

        bids = db.execute(
            select(Bid).filter(Bid.organization_id == organization_id, Bid.tender_id == tender.id)
        ).scalars().all()
        bidder_company_ids = {b.company_id for b in bids}

        companies = db.execute(
            select(Company).filter(Company.organization_id == organization_id, Company.id.in_(bidder_company_ids))
        ).scalars().all()

        cd_links = db.execute(
            select(CompanyDirector).filter(
                CompanyDirector.organization_id == organization_id,
                CompanyDirector.company_id.in_(bidder_company_ids)
            )
        ).scalars().all()
        director_ids = {cd.director_id for cd in cd_links}

        directors = db.execute(
            select(Director).filter(Director.organization_id == organization_id, Director.id.in_(director_ids))
        ).scalars().all() if director_ids else []

        address_ids = {c.address_id for c in companies if c.address_id}
        addresses = db.execute(
            select(Address).filter(Address.organization_id == organization_id, Address.id.in_(address_ids))
        ).scalars().all() if address_ids else []

        nodes_dict: Dict[str, Dict[str, Any]] = {}
        edges_list: List[Dict[str, Any]] = []

        # Central Tender Node
        tender_key = tender.tender_ref
        nodes_dict[tender_key] = {
            "id": tender_key,
            "label": tender.title if len(tender.title) <= 30 else tender.title[:27] + "...",
            "type": "tender",
            "risk": tender.risk_level,
            "metadata": {
                "tender_ref": tender.tender_ref,
                "title": tender.title,
                "score": tender.risk_score,
                "value": tender.estimated_value,
                "bidders_count": len(bids),
            }
        }

        # Bidders
        for c in companies:
            nodes_dict[c.id] = {
                "id": c.id,
                "label": c.legal_name,
                "type": "company",
                "companyId": c.id,
                "risk": "critical" if tender.risk_level == "critical" else "medium",
                "metadata": {"tax_id": c.tax_id, "status": c.status}
            }

        # Directors
        for d in directors:
            nodes_dict[d.id] = {
                "id": d.id,
                "label": d.full_name,
                "type": "director",
                "metadata": {"normalized_name": d.normalized_name}
            }

        # Addresses
        for a in addresses:
            nodes_dict[a.id] = {
                "id": a.id,
                "label": a.raw_address if len(a.raw_address) <= 22 else a.raw_address[:19] + "...",
                "type": "address",
                "metadata": {"raw_address": a.raw_address, "hash": a.normalized_hash}
            }

        # Bids Edges
        for b in bids:
            if b.company_id in nodes_dict:
                edges_list.append({
                    "from": b.company_id,
                    "to": tender_key,
                    "label": f"Bid ${b.amount / 1_000_000:.1f}M",
                    "relationship_type": "bids_on",
                    "weight": 1.0,
                })

        # Director Edges
        for cd in cd_links:
            if cd.director_id in nodes_dict and cd.company_id in nodes_dict:
                edges_list.append({
                    "from": cd.director_id,
                    "to": cd.company_id,
                    "label": cd.role or "director",
                    "relationship_type": "director_of",
                    "weight": 1.5,
                })

        # Address Edges
        for c in companies:
            if c.address_id and c.address_id in nodes_dict:
                edges_list.append({
                    "from": c.id,
                    "to": c.address_id,
                    "label": "registered at",
                    "relationship_type": "registered_at",
                    "weight": 1.2,
                })

        # Compute coordinates centered on tender
        coords = cls._compute_layout(list(nodes_dict.values()), edges_list, pinned_node=tender_key)

        graph_nodes: List[GraphNode] = []
        entity_counts: Dict[str, int] = {}
        risk_counts: Dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}

        for nid, data in nodes_dict.items():
            pos = coords.get(nid, (400.0, 250.0))
            node_type = data["type"]
            entity_counts[node_type] = entity_counts.get(node_type, 0) + 1
            if data.get("risk"):
                risk_counts[data["risk"]] = risk_counts.get(data["risk"], 0) + 1

            graph_nodes.append(
                GraphNode(
                    id=data["id"],
                    label=data["label"],
                    type=data["type"],
                    x=pos[0],
                    y=pos[1],
                    companyId=data.get("companyId"),
                    risk=data.get("risk"),
                    metadata=data.get("metadata", {}),
                )
            )

        graph_edges = [
            GraphEdge(
                source=e["from"],
                target=e["to"],
                label=e.get("label"),
                relationship_type=e.get("relationship_type"),
                weight=e.get("weight", 1.0),
            )
            for e in edges_list
        ]

        summary = GraphSummary(
            total_nodes=len(graph_nodes),
            total_edges=len(graph_edges),
            entity_counts=entity_counts,
            risk_summary=risk_counts,
        )

        return GraphResponse(nodes=graph_nodes, edges=graph_edges, summary=summary)

    @classmethod
    def detect_clusters(cls, db: Session, organization_id: str = "default") -> ClusterListResponse:
        """Identify dense collusion or relationship clusters across companies."""
        clusters: List[CollusionCluster] = []

        companies = db.execute(select(Company).filter(Company.organization_id == organization_id)).scalars().all()
        company_lookup = {c.id: c for c in companies}

        # 1. Cluster by Shared Directors
        cd_links = db.execute(select(CompanyDirector).filter(CompanyDirector.organization_id == organization_id)).scalars().all()
        director_companies: Dict[str, Set[str]] = {}
        for cd in cd_links:
            director_companies.setdefault(cd.director_id, set()).add(cd.company_id)

        cluster_idx = 1
        for director_id, comp_ids in director_companies.items():
            if len(comp_ids) > 1:
                director = db.execute(select(Director).filter(Director.id == director_id)).scalar_one_or_none()
                comp_entities = [
                    ClusterEntity(
                        id=cid,
                        legal_name=company_lookup[cid].legal_name,
                        tax_id=company_lookup[cid].tax_id,
                        role_in_cluster="Co-Directed Entity"
                    )
                    for cid in comp_ids if cid in company_lookup
                ]

                # Find joint tenders
                tenders_query = (
                    select(Tender.tender_ref)
                    .join(Bid, Bid.tender_id == Tender.id)
                    .filter(Bid.company_id.in_(comp_ids))
                    .distinct()
                )
                tenders_involved = list(db.execute(tenders_query).scalars().all())

                clusters.append(
                    CollusionCluster(
                        cluster_id=f"CLUST-DIR-{cluster_idx:03d}",
                        cluster_type="SHARED_DIRECTORS",
                        title=f"Shared Directorship — {director.full_name if director else 'Officer'}",
                        description=f"{len(comp_ids)} companies share common director '{director.full_name if director else 'N/A'}'",
                        risk_level="critical",
                        companies=comp_entities,
                        shared_attributes={
                            "director_name": director.full_name if director else None,
                            "director_id": director_id,
                        },
                        tenders_involved=tenders_involved,
                    )
                )
                cluster_idx += 1

        # 2. Cluster by Shared Addresses
        address_companies: Dict[str, Set[str]] = {}
        for c in companies:
            if c.address_id:
                address_companies.setdefault(c.address_id, set()).add(c.id)

        for addr_id, comp_ids in address_companies.items():
            if len(comp_ids) > 1:
                addr = db.execute(select(Address).filter(Address.id == addr_id)).scalar_one_or_none()
                comp_entities = [
                    ClusterEntity(
                        id=cid,
                        legal_name=company_lookup[cid].legal_name,
                        tax_id=company_lookup[cid].tax_id,
                        role_in_cluster="Co-Located Entity"
                    )
                    for cid in comp_ids if cid in company_lookup
                ]

                tenders_query = (
                    select(Tender.tender_ref)
                    .join(Bid, Bid.tender_id == Tender.id)
                    .filter(Bid.company_id.in_(comp_ids))
                    .distinct()
                )
                tenders_involved = list(db.execute(tenders_query).scalars().all())

                clusters.append(
                    CollusionCluster(
                        cluster_id=f"CLUST-ADDR-{cluster_idx:03d}",
                        cluster_type="SHARED_ADDRESS",
                        title=f"Shared Registered Office — {addr.city or 'Co-location'}",
                        description=f"{len(comp_ids)} companies share physical registration at '{addr.raw_address if addr else 'N/A'}'",
                        risk_level="high",
                        companies=comp_entities,
                        shared_attributes={
                            "address": addr.raw_address if addr else None,
                            "city": addr.city if addr else None,
                        },
                        tenders_involved=tenders_involved,
                    )
                )
                cluster_idx += 1

        return ClusterListResponse(total_clusters=len(clusters), clusters=clusters)

    @classmethod
    def get_company_dossier(
        cls, 
        db: Session, 
        company_identifier: str, 
        organization_id: str = "default"
    ) -> Optional[CompanyDossierResponse]:
        """Fetch complete intelligence dossier for an entity including win stats and co-bidders."""
        company = db.execute(
            select(Company).filter(
                Company.organization_id == organization_id,
                (Company.id == company_identifier) | 
                (Company.legal_name == company_identifier) | 
                (Company.normalized_name == company_identifier.lower().strip())
            )
        ).scalar_one_or_none()

        if not company:
            return None

        # Bids by this company
        bids = db.execute(
            select(Bid).filter(Bid.organization_id == organization_id, Bid.company_id == company.id)
        ).scalars().all()

        total_bids = len(bids)
        total_bid_value = sum(b.amount for b in bids)
        won_bids = [b for b in bids if b.status.lower() in ["awarded", "won"]]
        won_tenders = len(won_bids)
        win_rate = round((won_tenders / total_bids) * 100, 1) if total_bids > 0 else 0.0

        # Directors
        cd_links = db.execute(
            select(CompanyDirector).filter(
                CompanyDirector.organization_id == organization_id,
                CompanyDirector.company_id == company.id
            )
        ).scalars().all()

        directors_list: List[DirectorSummary] = []
        my_director_ids: Set[str] = set()
        for cd in cd_links:
            d = db.execute(select(Director).filter(Director.id == cd.director_id)).scalar_one_or_none()
            if d:
                my_director_ids.add(d.id)
                directors_list.append(
                    DirectorSummary(
                        id=d.id,
                        full_name=d.full_name,
                        role=cd.role or "Director",
                        appointed_date=cd.appointed_date,
                    )
                )

        # Address
        address_str = None
        if company.address_id:
            addr = db.execute(select(Address).filter(Address.id == company.address_id)).scalar_one_or_none()
            if addr:
                address_str = addr.raw_address

        # Co-bidders calculation
        my_tender_ids = {b.tender_id for b in bids}
        other_bids = db.execute(
            select(Bid).filter(
                Bid.organization_id == organization_id,
                Bid.tender_id.in_(my_tender_ids),
                Bid.company_id != company.id
            )
        ).scalars().all() if my_tender_ids else []

        co_bidder_tenders: Dict[str, Set[str]] = {}
        for ob in other_bids:
            co_bidder_tenders.setdefault(ob.company_id, set()).add(ob.tender_id)

        co_bidders: List[CoBidderSummary] = []
        for other_cid, t_ids in co_bidder_tenders.items():
            other_comp = db.execute(select(Company).filter(Company.id == other_cid)).scalar_one_or_none()
            if not other_comp:
                continue

            # check shared directors
            other_cds = db.execute(
                select(CompanyDirector).filter(CompanyDirector.company_id == other_cid)
            ).scalars().all()
            other_d_ids = {ocd.director_id for ocd in other_cds}
            shared_d_count = len(my_director_ids.intersection(other_d_ids))

            shared_addr = bool(company.address_id and company.address_id == other_comp.address_id)

            co_bidders.append(
                CoBidderSummary(
                    company_id=other_comp.id,
                    company_name=other_comp.legal_name,
                    joint_tenders_count=len(t_ids),
                    shared_directors_count=shared_d_count,
                    shared_address=shared_addr,
                )
            )

        # Fetch risk signals for tenders this company bid on
        signals_query = (
            select(RiskSignal)
            .filter(RiskSignal.organization_id == organization_id, RiskSignal.tender_id.in_(my_tender_ids))
        )
        signals = db.execute(signals_query).scalars().all() if my_tender_ids else []

        risk_signals_summary = [
            {
                "id": s.id,
                "detector_code": s.detector_code,
                "title": s.title,
                "severity": s.severity,
                "confidence": s.confidence,
                "score_contribution": s.score_contribution,
                "description": s.description,
            }
            for s in signals
        ]

        return CompanyDossierResponse(
            id=company.id,
            legal_name=company.legal_name,
            normalized_name=company.normalized_name,
            tax_id=company.tax_id,
            status=company.status,
            address=address_str,
            total_bids=total_bids,
            won_tenders=won_tenders,
            win_rate=win_rate,
            total_bid_value=total_bid_value,
            directors=directors_list,
            co_bidders=co_bidders,
            risk_signals=risk_signals_summary,
        )
