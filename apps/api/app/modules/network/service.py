import re
from typing import Dict, Any, List, Optional, Set, Tuple
import networkx as nx
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from datetime import datetime

from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import Company, Director, CompanyDirector, Address
from app.modules.government_uploads.models import GovernmentDepartment
from app.modules.investigations.models import Investigation, InvestigationNote
from app.modules.investigations.service import InvestigationService
from app.modules.investigations.schemas import InvestigationCreate
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
    ProvenanceMetadata,
    EntitySearchResult,
    GraphSignalOut,
    CreateInvestigationFromNodePayload,
)


class NetworkService:
    """Enterprise Graph Intelligence service layer powered by NetworkX and PostgreSQL."""

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
            source = e.get("from") or e.get("source")
            target = e.get("to") or e.get("target")
            if source and target:
                G.add_edge(source, target)

        if len(G.nodes) == 0:
            return {}

        fixed = [pinned_node] if pinned_node and pinned_node in G.nodes else None
        pos_init = {pinned_node: (0.0, 0.0)} if fixed else None

        k_val = 1.0 / max(len(G.nodes) ** 0.35, 1.0)
        raw_pos = nx.spring_layout(
            G, 
            pos=pos_init, 
            fixed=fixed, 
            k=k_val, 
            iterations=80, 
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
    def _extract_provenance(cls, entity: Any, default_source: str = "Government Public Procurement Portal") -> ProvenanceMetadata:
        """Extracts verifiable source provenance metadata from a model instance."""
        source_name = getattr(entity, "source_name", default_source)
        source_upload_id = getattr(entity, "source_upload_id", None)
        created_at_dt = getattr(entity, "created_at", None)
        created_at_str = created_at_dt.isoformat() if hasattr(created_at_dt, "isoformat") else str(created_at_dt or "")

        return ProvenanceMetadata(
            source_name=source_name,
            source_record_id=source_upload_id or getattr(entity, "id", None),
            retrieved_at=created_at_str,
            confidence=1.0,
            notes="Verified record from official database registry.",
        )

    @classmethod
    def _build_nx_multigraph(
        cls, 
        db: Session, 
        organization_id: str
    ) -> Tuple[nx.MultiDiGraph, Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
        """Loads relational entities from database and populates a complete NetworkX property graph."""
        tenders = db.execute(select(Tender).filter(Tender.organization_id == organization_id)).scalars().all()
        companies = db.execute(select(Company).filter(Company.organization_id == organization_id)).scalars().all()
        directors = db.execute(select(Director).filter(Director.organization_id == organization_id)).scalars().all()
        addresses = db.execute(select(Address).filter(Address.organization_id == organization_id)).scalars().all()
        bids = db.execute(select(Bid).filter(Bid.organization_id == organization_id)).scalars().all()
        cd_links = db.execute(select(CompanyDirector).filter(CompanyDirector.organization_id == organization_id)).scalars().all()
        departments = db.execute(select(GovernmentDepartment).filter(GovernmentDepartment.organization_id == organization_id)).scalars().all()
        investigations = db.execute(select(Investigation).filter(Investigation.organization_id == organization_id)).scalars().all()

        G = nx.MultiDiGraph()
        nodes_dict: Dict[str, Dict[str, Any]] = {}
        edges_list: List[Dict[str, Any]] = []

        # 1. Tender Nodes
        for t in tenders:
            t_node = {
                "id": t.tender_ref,
                "label": t.title if len(t.title) <= 28 else t.title[:25] + "...",
                "type": "tender",
                "risk": t.risk_level,
                "properties": {
                    "tender_ref": t.tender_ref,
                    "title": t.title,
                    "authority": t.authority,
                    "estimated_value": t.estimated_value,
                    "risk_score": t.risk_score,
                    "location": getattr(t, "location", None),
                    "closing_date": t.closing_date,
                    "status": t.status,
                },
                "provenance": cls._extract_provenance(t),
            }
            nodes_dict[t.tender_ref] = t_node
            G.add_node(t.tender_ref, **t_node)

        # 2. Company Nodes
        for c in companies:
            c_node = {
                "id": c.id,
                "label": c.legal_name,
                "type": "company",
                "companyId": c.id,
                "risk": "high" if c.status == "Under Review" else "low",
                "properties": {
                    "legal_name": c.legal_name,
                    "tax_id": c.tax_id,
                    "source_company_id": getattr(c, "source_company_id", None),
                    "status": c.status,
                },
                "provenance": cls._extract_provenance(c),
            }
            nodes_dict[c.id] = c_node
            G.add_node(c.id, **c_node)

        # 3. Director Nodes
        for d in directors:
            d_node = {
                "id": d.id,
                "label": d.full_name,
                "type": "director",
                "properties": {
                    "full_name": d.full_name,
                    "normalized_name": d.normalized_name,
                },
                "provenance": cls._extract_provenance(d),
            }
            nodes_dict[d.id] = d_node
            G.add_node(d.id, **d_node)

        # 4. Address Nodes
        for a in addresses:
            addr_label = a.city if a.city else (a.raw_address[:20] + "...")
            a_node = {
                "id": a.id,
                "label": addr_label,
                "type": "address",
                "properties": {
                    "raw_address": a.raw_address,
                    "hash": a.normalized_hash,
                    "city": a.city,
                    "postal_code": a.postal_code,
                },
                "provenance": cls._extract_provenance(a),
            }
            nodes_dict[a.id] = a_node
            G.add_node(a.id, **a_node)

        # 5. Authority Nodes (Departments)
        for dept in departments:
            dept_id = f"dept_{dept.department_code}"
            dept_node = {
                "id": dept_id,
                "label": dept.name,
                "type": "authority",
                "properties": {
                    "name": dept.name,
                    "department_code": dept.department_code,
                },
                "provenance": cls._extract_provenance(dept),
            }
            nodes_dict[dept_id] = dept_node
            G.add_node(dept_id, **dept_node)

        # 6. Investigation Nodes
        for inv in investigations:
            inv_node = {
                "id": inv.id,
                "label": inv.case_ref,
                "type": "investigation",
                "risk": "critical" if inv.priority == "Critical" else "high",
                "properties": {
                    "case_ref": inv.case_ref,
                    "title": inv.title,
                    "status": inv.status,
                    "priority": inv.priority,
                    "investigator": inv.investigator,
                },
                "provenance": cls._extract_provenance(inv),
            }
            nodes_dict[inv.id] = inv_node
            G.add_node(inv.id, **inv_node)

        # 7. Edges: Bids & Tender Participation
        tender_ref_by_id = {t.id: t.tender_ref for t in tenders}
        for b in bids:
            tender_ref = tender_ref_by_id.get(b.tender_id)
            if tender_ref and b.company_id in nodes_dict and tender_ref in nodes_dict:
                # Company -> PARTICIPATED_IN -> Tender
                edge_id = f"edge_bid_{b.id}"
                e_data = {
                    "id": edge_id,
                    "from": b.company_id,
                    "to": tender_ref,
                    "label": f"Bid ${b.amount / 1_000_000:.2f}M" if b.amount >= 1_000_000 else f"Bid ${b.amount:,.0f}",
                    "relationship_type": "PARTICIPATED_IN",
                    "weight": 1.0,
                    "properties": {
                        "amount": b.amount,
                        "status": b.status,
                        "bid_rank": getattr(b, "bid_rank", None),
                        "submitted_at": b.submitted_at,
                    },
                    "provenance": cls._extract_provenance(b),
                }
                edges_list.append(e_data)
                G.add_edge(b.company_id, tender_ref, key=edge_id, **e_data)

                # Company -> WON -> Tender if status is Awarded or rank 1
                if b.status.lower() in {"awarded", "winner"}:
                    won_edge_id = f"edge_won_{b.id}"
                    won_data = {
                        "id": won_edge_id,
                        "from": b.company_id,
                        "to": tender_ref,
                        "label": "WON",
                        "relationship_type": "WON",
                        "weight": 1.5,
                        "properties": {"amount": b.amount, "status": b.status},
                        "provenance": cls._extract_provenance(b),
                    }
                    edges_list.append(won_data)
                    G.add_edge(b.company_id, tender_ref, key=won_edge_id, **won_data)

        # 8. Edges: Company -> HAS_DIRECTOR -> Director
        for cd in cd_links:
            if cd.company_id in nodes_dict and cd.director_id in nodes_dict:
                edge_id = f"edge_dir_{cd.id}"
                e_data = {
                    "id": edge_id,
                    "from": cd.company_id,
                    "to": cd.director_id,
                    "label": cd.role or "HAS_DIRECTOR",
                    "relationship_type": "HAS_DIRECTOR",
                    "weight": 1.5,
                    "properties": {
                        "role": cd.role,
                        "appointed_date": cd.appointed_date,
                    },
                    "provenance": cls._extract_provenance(cd),
                }
                edges_list.append(e_data)
                G.add_edge(cd.company_id, cd.director_id, key=edge_id, **e_data)

        # 9. Edges: Company -> REGISTERED_AT -> Address
        for c in companies:
            if c.address_id and c.address_id in nodes_dict:
                edge_id = f"edge_addr_{c.id}_{c.address_id}"
                e_data = {
                    "id": edge_id,
                    "from": c.id,
                    "to": c.address_id,
                    "label": "REGISTERED_AT",
                    "relationship_type": "REGISTERED_AT",
                    "weight": 1.2,
                    "properties": {"status": c.status},
                    "provenance": cls._extract_provenance(c),
                }
                edges_list.append(e_data)
                G.add_edge(c.id, c.address_id, key=edge_id, **e_data)

        # 10. Edges: Tender -> ISSUED_BY -> Department
        for t in tenders:
            if getattr(t, "department_id", None):
                for dept in departments:
                    if dept.id == t.department_id:
                        dept_node_id = f"dept_{dept.department_code}"
                        if dept_node_id in nodes_dict and t.tender_ref in nodes_dict:
                            edge_id = f"edge_dept_{t.id}_{dept.id}"
                            e_data = {
                                "id": edge_id,
                                "from": t.tender_ref,
                                "to": dept_node_id,
                                "label": "ISSUED_BY",
                                "relationship_type": "ISSUED_BY",
                                "weight": 1.0,
                                "properties": {"authority": t.authority},
                                "provenance": cls._extract_provenance(t),
                            }
                            edges_list.append(e_data)
                            G.add_edge(t.tender_ref, dept_node_id, key=edge_id, **e_data)

        # 11. Edges: Investigation -> REFERENCES -> Tender / Company
        for inv in investigations:
            if inv.tender_id:
                tender_ref = tender_ref_by_id.get(inv.tender_id)
                if tender_ref and tender_ref in nodes_dict:
                    edge_id = f"edge_inv_{inv.id}_{tender_ref}"
                    e_data = {
                        "id": edge_id,
                        "from": inv.id,
                        "to": tender_ref,
                        "label": "INVESTIGATES",
                        "relationship_type": "REFERENCES",
                        "weight": 2.0,
                        "properties": {"case_ref": inv.case_ref, "priority": inv.priority},
                        "provenance": cls._extract_provenance(inv),
                    }
                    edges_list.append(e_data)
                    G.add_edge(inv.id, tender_ref, key=edge_id, **e_data)

        # 12. Derived Edges: Shared Director & Shared Address between Co-Bidders
        # Group companies by director
        comp_by_dir: Dict[str, List[str]] = {}
        for cd in cd_links:
            comp_by_dir.setdefault(cd.director_id, []).append(cd.company_id)

        for dir_id, comp_ids in comp_by_dir.items():
            if len(comp_ids) >= 2:
                for i in range(len(comp_ids)):
                    for j in range(i + 1, len(comp_ids)):
                        c1, c2 = comp_ids[i], comp_ids[j]
                        if c1 in nodes_dict and c2 in nodes_dict:
                            edge_id = f"edge_shared_dir_{c1}_{c2}_{dir_id}"
                            e_data = {
                                "id": edge_id,
                                "from": c1,
                                "to": c2,
                                "label": "SHARED_DIRECTOR",
                                "relationship_type": "SHARED_DIRECTOR",
                                "weight": 2.0,
                                "properties": {"director_id": dir_id},
                                "provenance": ProvenanceMetadata(
                                    source_name="Company Registrar Cross-Link",
                                    notes=f"Shared registered director {dir_id}",
                                ),
                            }
                            edges_list.append(e_data)
                            G.add_edge(c1, c2, key=edge_id, **e_data)

        # Group companies by address
        comp_by_addr: Dict[str, List[str]] = {}
        for c in companies:
            if c.address_id:
                comp_by_addr.setdefault(c.address_id, []).append(c.id)

        for addr_id, comp_ids in comp_by_addr.items():
            if len(comp_ids) >= 2:
                for i in range(len(comp_ids)):
                    for j in range(i + 1, len(comp_ids)):
                        c1, c2 = comp_ids[i], comp_ids[j]
                        if c1 in nodes_dict and c2 in nodes_dict:
                            edge_id = f"edge_shared_addr_{c1}_{c2}_{addr_id}"
                            e_data = {
                                "id": edge_id,
                                "from": c1,
                                "to": c2,
                                "label": "SHARED_ADDRESS",
                                "relationship_type": "SHARED_ADDRESS",
                                "weight": 1.8,
                                "properties": {"address_id": addr_id},
                                "provenance": ProvenanceMetadata(
                                    source_name="Official Corporate Registry",
                                    notes=f"Shared registered physical office {addr_id}",
                                ),
                            }
                            edges_list.append(e_data)
                            G.add_edge(c1, c2, key=edge_id, **e_data)

        return G, nodes_dict, edges_list

    @classmethod
    def build_global_graph(
        cls, 
        db: Session, 
        organization_id: str = "default",
        node_types: Optional[List[str]] = None,
        relationship_types: Optional[List[str]] = None,
        risk_level: Optional[str] = None,
        limit: int = 150,
    ) -> GraphResponse:
        """Project procurement entities into a global NetworkX relationship graph with filters."""
        G, nodes_dict, edges_list = cls._build_nx_multigraph(db, organization_id)

        # Apply filtering
        filtered_nodes = {}
        for nid, data in nodes_dict.items():
            if node_types and data["type"] not in node_types:
                continue
            if risk_level and risk_level != "all" and data.get("risk") != risk_level:
                continue
            filtered_nodes[nid] = data
            if len(filtered_nodes) >= limit:
                break

        allowed_ids = set(filtered_nodes.keys())
        filtered_edges = []
        for e in edges_list:
            source = e["from"]
            target = e["to"]
            if source in allowed_ids and target in allowed_ids:
                if relationship_types and e.get("relationship_type") not in relationship_types:
                    continue
                filtered_edges.append(e)

        coords = cls._compute_layout(list(filtered_nodes.values()), filtered_edges)

        graph_nodes: List[GraphNode] = []
        entity_counts: Dict[str, int] = {}
        risk_counts: Dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}

        for nid, data in filtered_nodes.items():
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
                    properties=data.get("properties", {}),
                    metadata=data.get("properties", {}),
                    provenance=data.get("provenance"),
                )
            )

        graph_edges = [
            GraphEdge(
                id=e.get("id"),
                source=e["from"],
                target=e["to"],
                label=e.get("label"),
                relationship_type=e.get("relationship_type"),
                weight=e.get("weight", 1.0),
                properties=e.get("properties", {}),
                provenance=e.get("provenance"),
            )
            for e in filtered_edges
        ]

        # Calculate graph density safely
        simple_g = nx.Graph()
        for gn in graph_nodes:
            simple_g.add_node(gn.id)
        for ge in graph_edges:
            simple_g.add_edge(ge.source, ge.target)
        density = round(nx.density(simple_g), 4) if len(graph_nodes) > 1 else 0.0

        summary = GraphSummary(
            total_nodes=len(graph_nodes),
            total_edges=len(graph_edges),
            entity_counts=entity_counts,
            risk_summary=risk_counts,
            density=density,
        )

        return GraphResponse(nodes=graph_nodes, edges=graph_edges, summary=summary)

    @classmethod
    def get_entity_neighborhood(
        cls,
        entity_id: str,
        db: Session,
        organization_id: str = "default",
        depth: int = 2,
        max_nodes: int = 100,
    ) -> GraphResponse:
        """Explores the relationship neighborhood around a target entity up to depth hops."""
        G, nodes_dict, edges_list = cls._build_nx_multigraph(db, organization_id)

        # Check if entity exists (by exact ID, tender_ref, or company legal name)
        target_id = entity_id
        if target_id not in G.nodes:
            for nid, data in nodes_dict.items():
                if data.get("properties", {}).get("tender_ref") == entity_id or data.get("label") == entity_id:
                    target_id = nid
                    break

        if target_id not in G.nodes:
            return GraphResponse(
                nodes=[],
                edges=[],
                summary=GraphSummary(total_nodes=0, total_edges=0, entity_counts={}, risk_summary={"low": 0, "medium": 0, "high": 0, "critical": 0})
            )

        # Convert to undirected graph for traversal
        undirected_g = G.to_undirected()
        cutoff_depth = min(max(1, depth), 3)

        # Single source shortest path to find all nodes within depth hops
        distances = nx.single_source_shortest_path_length(undirected_g, target_id, cutoff=cutoff_depth)
        
        # Sort by distance and cap at max_nodes
        sorted_nodes = sorted(distances.items(), key=lambda x: x[1])[:max_nodes]
        neighbor_ids = {nid for nid, _ in sorted_nodes}

        subgraph_nodes = {nid: nodes_dict[nid] for nid in neighbor_ids if nid in nodes_dict}
        subgraph_edges = [e for e in edges_list if e["from"] in neighbor_ids and e["to"] in neighbor_ids]

        coords = cls._compute_layout(list(subgraph_nodes.values()), subgraph_edges, pinned_node=target_id)

        graph_nodes: List[GraphNode] = []
        entity_counts: Dict[str, int] = {}
        risk_counts: Dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}

        for nid, data in subgraph_nodes.items():
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
                    properties=data.get("properties", {}),
                    metadata=data.get("properties", {}),
                    provenance=data.get("provenance"),
                )
            )

        graph_edges = [
            GraphEdge(
                id=e.get("id"),
                source=e["from"],
                target=e["to"],
                label=e.get("label"),
                relationship_type=e.get("relationship_type"),
                weight=e.get("weight", 1.0),
                properties=e.get("properties", {}),
                provenance=e.get("provenance"),
            )
            for e in subgraph_edges
        ]

        summary = GraphSummary(
            total_nodes=len(graph_nodes),
            total_edges=len(graph_edges),
            entity_counts=entity_counts,
            risk_summary=risk_counts,
            density=0.0,
        )

        return GraphResponse(nodes=graph_nodes, edges=graph_edges, summary=summary)

    @classmethod
    def search_entities(
        cls,
        query: str,
        db: Session,
        organization_id: str = "default",
        node_type: Optional[str] = None,
        limit: int = 20,
    ) -> List[EntitySearchResult]:
        """Searches across all graph entities with type and risk annotations."""
        results: List[EntitySearchResult] = []
        q = f"%{query.strip().lower()}%" if query else "%"

        # 1. Companies
        if not node_type or node_type == "company":
            comps = db.execute(
                select(Company).filter(
                    Company.organization_id == organization_id,
                    or_(
                        func.lower(Company.legal_name).like(q),
                        func.lower(Company.normalized_name).like(q),
                        Company.tax_id.like(q),
                    )
                ).limit(limit)
            ).scalars().all()

            for c in comps:
                results.append(EntitySearchResult(
                    id=c.id,
                    label=c.legal_name,
                    type="company",
                    subtitle=f"Tax ID: {c.tax_id or 'N/A'} · Status: {c.status}",
                    risk_level="high" if c.status == "Under Review" else "low",
                ))

        # 2. Tenders
        if not node_type or node_type == "tender":
            tenders = db.execute(
                select(Tender).filter(
                    Tender.organization_id == organization_id,
                    or_(
                        func.lower(Tender.tender_ref).like(q),
                        func.lower(Tender.title).like(q),
                        func.lower(Tender.authority).like(q),
                    )
                ).limit(limit)
            ).scalars().all()

            for t in tenders:
                results.append(EntitySearchResult(
                    id=t.tender_ref,
                    label=f"{t.tender_ref}: {t.title}",
                    type="tender",
                    subtitle=f"{t.authority} · Est: ${t.estimated_value:,.0f}",
                    risk_level=t.risk_level,
                ))

        # 3. Directors
        if not node_type or node_type == "director":
            dirs = db.execute(
                select(Director).filter(
                    Director.organization_id == organization_id,
                    func.lower(Director.full_name).like(q),
                ).limit(limit)
            ).scalars().all()

            for d in dirs:
                results.append(EntitySearchResult(
                    id=d.id,
                    label=d.full_name,
                    type="director",
                    subtitle="Corporate Director / Key Executive",
                    risk_level="medium",
                ))

        # 4. Addresses
        if not node_type or node_type == "address":
            addrs = db.execute(
                select(Address).filter(
                    Address.organization_id == organization_id,
                    func.lower(Address.raw_address).like(q),
                ).limit(limit)
            ).scalars().all()

            for a in addrs:
                results.append(EntitySearchResult(
                    id=a.id,
                    label=a.raw_address,
                    type="address",
                    subtitle=f"Postal Code: {a.postal_code or 'N/A'} · Hash: {a.normalized_hash[:12]}...",
                    risk_level="low",
                ))

        return results[:limit]

    @classmethod
    def get_temporal_graph(
        cls,
        start_year: int,
        end_year: int,
        db: Session,
        organization_id: str = "default",
    ) -> GraphResponse:
        """Constructs a time-sliced graph filtering tenders active within the specified year range."""
        G, nodes_dict, edges_list = cls._build_nx_multigraph(db, organization_id)

        # Filter tenders where closing_date or year falls in start_year..end_year
        valid_tenders = set()
        for nid, data in nodes_dict.items():
            if data["type"] == "tender":
                closing_date = data.get("properties", {}).get("closing_date") or ""
                # Attempt to extract year
                match = re.search(r"\b(20\d\d)\b", closing_date)
                year = int(match.group(1)) if match else 2026
                if start_year <= year <= end_year:
                    valid_tenders.add(nid)

        # Collect connected entities
        connected_nodes = set(valid_tenders)
        for e in edges_list:
            if e["from"] in valid_tenders or e["to"] in valid_tenders:
                connected_nodes.add(e["from"])
                connected_nodes.add(e["to"])

        filtered_nodes = {nid: nodes_dict[nid] for nid in connected_nodes if nid in nodes_dict}
        filtered_edges = [e for e in edges_list if e["from"] in connected_nodes and e["to"] in connected_nodes]

        coords = cls._compute_layout(list(filtered_nodes.values()), filtered_edges)

        graph_nodes: List[GraphNode] = []
        entity_counts: Dict[str, int] = {}
        risk_counts: Dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}

        for nid, data in filtered_nodes.items():
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
                    properties=data.get("properties", {}),
                    metadata=data.get("properties", {}),
                    provenance=data.get("provenance"),
                )
            )

        graph_edges = [
            GraphEdge(
                id=e.get("id"),
                source=e["from"],
                target=e["to"],
                label=e.get("label"),
                relationship_type=e.get("relationship_type"),
                weight=e.get("weight", 1.0),
                properties=e.get("properties", {}),
                provenance=e.get("provenance"),
            )
            for e in filtered_edges
        ]

        summary = GraphSummary(
            total_nodes=len(graph_nodes),
            total_edges=len(graph_edges),
            entity_counts=entity_counts,
            risk_summary=risk_counts,
            density=0.0,
        )

        return GraphResponse(nodes=graph_nodes, edges=graph_edges, summary=summary)

    @classmethod
    def get_graph_signals(
        cls,
        db: Session,
        organization_id: str = "default",
        entity_id: Optional[str] = None,
    ) -> List[GraphSignalOut]:
        """Calculates independent, explainable topological risk signals directly from the relationship graph."""
        signals: List[GraphSignalOut] = []
        G, nodes_dict, edges_list = cls._build_nx_multigraph(db, organization_id)

        # 1. Detect Shared Director between co-bidders
        for e in edges_list:
            if e.get("relationship_type") == "SHARED_DIRECTOR":
                c1, c2 = e["from"], e["to"]
                dir_id = e.get("properties", {}).get("director_id", "Unknown")
                dir_name = nodes_dict.get(dir_id, {}).get("label", "Key Executive")
                c1_name = nodes_dict.get(c1, {}).get("label", c1)
                c2_name = nodes_dict.get(c2, {}).get("label", c2)

                if entity_id and entity_id not in (c1, c2, dir_id):
                    continue

                signals.append(GraphSignalOut(
                    id=f"sig_dir_{c1}_{c2}",
                    signal_type="SHARED_DIRECTOR",
                    title="Documented Common Directorship",
                    severity="critical",
                    confidence=0.96,
                    explanation=(
                        f"Companies '{c1_name}' and '{c2_name}' share common registered executive "
                        f"'{dir_name}'. Under procurement integrity standards, shared leadership across competing entities "
                        f"requires formal conflict-of-interest verification."
                    ),
                    evidence=[
                        {"source": "Corporate Filings", "director_id": dir_id, "director_name": dir_name},
                        {"company_a": c1_name, "company_b": c2_name},
                    ],
                    entity_ids=[c1, c2, dir_id],
                ))

        # 2. Detect Shared Address between co-bidders
        for e in edges_list:
            if e.get("relationship_type") == "SHARED_ADDRESS":
                c1, c2 = e["from"], e["to"]
                addr_id = e.get("properties", {}).get("address_id", "Unknown")
                addr_text = nodes_dict.get(addr_id, {}).get("properties", {}).get("raw_address", "Registered Office")
                c1_name = nodes_dict.get(c1, {}).get("label", c1)
                c2_name = nodes_dict.get(c2, {}).get("label", c2)

                if entity_id and entity_id not in (c1, c2, addr_id):
                    continue

                signals.append(GraphSignalOut(
                    id=f"sig_addr_{c1}_{c2}",
                    signal_type="SHARED_REGISTERED_OFFICE",
                    title="Shared Physical Office Registration",
                    severity="high",
                    confidence=0.91,
                    explanation=(
                        f"Companies '{c1_name}' and '{c2_name}' are registered at identical normalized address "
                        f"'{addr_text}'. Common physical operational premises indicate potential operational coordination."
                    ),
                    evidence=[
                        {"source": "Registered Office Filings", "address_id": addr_id, "address": addr_text},
                        {"company_a": c1_name, "company_b": c2_name},
                    ],
                    entity_ids=[c1, c2, addr_id],
                ))

        # 3. Detect Repeated Co-Bidding Clusters
        tenders = db.execute(select(Tender).filter(Tender.organization_id == organization_id)).scalars().all()
        bids = db.execute(select(Bid).filter(Bid.organization_id == organization_id)).scalars().all()
        bids_by_tender: Dict[str, List[str]] = {}
        for b in bids:
            bids_by_tender.setdefault(b.tender_id, []).append(b.company_id)

        pair_counts: Dict[Tuple[str, str], int] = {}
        for t_id, c_ids in bids_by_tender.items():
            unique_comps = sorted(list(set(c_ids)))
            for i in range(len(unique_comps)):
                for j in range(i + 1, len(unique_comps)):
                    pair = (unique_comps[i], unique_comps[j])
                    pair_counts[pair] = pair_counts.get(pair, 0) + 1

        for (c1, c2), count in pair_counts.items():
            if count >= 2:
                c1_name = nodes_dict.get(c1, {}).get("label", c1)
                c2_name = nodes_dict.get(c2, {}).get("label", c2)

                if entity_id and entity_id not in (c1, c2):
                    continue

                signals.append(GraphSignalOut(
                    id=f"sig_cobid_{c1}_{c2}",
                    signal_type="REPEATED_CO_BIDDERS",
                    title="Repeated Co-Bidding Pattern",
                    severity="medium",
                    confidence=0.85,
                    explanation=(
                        f"'{c1_name}' and '{c2_name}' have submitted concurrent bids across {count} separate procurement tenders. "
                        f"Frequent co-bidding patterns warrant monitoring for cover-bidding or rotation arrangements."
                    ),
                    evidence=[
                        {"co_bidding_occurrences": count, "company_a": c1_name, "company_b": c2_name}
                    ],
                    entity_ids=[c1, c2],
                ))

        return signals

    @classmethod
    def create_investigation_from_node(
        cls,
        payload: CreateInvestigationFromNodePayload,
        db: Session,
        organization_id: str,
        user_email: str = "investigator@cartelnet.internal",
    ) -> Dict[str, Any]:
        """Creates an official investigation case linked to a graph entity or risk signal."""
        G, nodes_dict, edges_list = cls._build_nx_multigraph(db, organization_id)
        node_data = nodes_dict.get(payload.node_id)

        label = node_data.get("label", payload.node_id) if node_data else payload.node_id
        node_type = node_data.get("type", "entity") if node_data else "entity"

        title = payload.title or f"Integrity Inquest: {node_type.title()} [{label}]"
        tender_id = None
        if node_type == "tender":
            # Find matching tender record
            tender = db.query(Tender).filter(
                Tender.organization_id == organization_id,
                (Tender.tender_ref == payload.node_id) | (Tender.id == payload.node_id)
            ).first()
            if tender:
                tender_id = tender.id

        inv_data = InvestigationCreate(
            title=title,
            priority=payload.priority,
            tender_id=tender_id,
            investigator=user_email,
            initial_note=payload.notes or f"Case opened directly from Graph Intelligence explorer for {node_type} '{label}'.",
        )

        inv_out = InvestigationService.create_investigation(db=db, data=inv_data, organization_id=organization_id)
        return {
            "success": True,
            "case_id": inv_out.id,
            "case_ref": inv_out.case_ref,
            "title": inv_out.title,
            "priority": inv_out.priority,
            "status": inv_out.status,
        }

    # Preserved backward-compatible methods for Tender 360 & existing routes
    @classmethod
    def build_tender_subgraph(cls, db: Session, tender_identifier: str, organization_id: str = "default") -> GraphResponse:
        return cls.get_entity_neighborhood(entity_id=tender_identifier, db=db, organization_id=organization_id, depth=2)

    @classmethod
    def detect_clusters(cls, db: Session, organization_id: str = "default") -> ClusterListResponse:
        """Identifies dense relational clusters of shared directorships or shared physical addresses."""
        G, nodes_dict, edges_list = cls._build_nx_multigraph(db, organization_id)
        clusters: List[CollusionCluster] = []

        # Find connected components of shared directors
        dir_graph = nx.Graph()
        for e in edges_list:
            if e.get("relationship_type") == "SHARED_DIRECTOR":
                dir_graph.add_edge(e["from"], e["to"], **e.get("properties", {}))

        cluster_idx = 1
        for comp_set in nx.connected_components(dir_graph):
            if len(comp_set) >= 2:
                entities = []
                for cid in comp_set:
                    c_info = nodes_dict.get(cid, {})
                    entities.append(ClusterEntity(
                        id=cid,
                        legal_name=c_info.get("label", cid),
                        tax_id=c_info.get("properties", {}).get("tax_id"),
                        role_in_cluster="Co-Director Affiliate",
                    ))

                tenders_for_cluster = sorted(list({
                    e["to"] for e in edges_list
                    if e.get("relationship_type") == "PARTICIPATED_IN" and e["from"] in comp_set
                }))

                clusters.append(CollusionCluster(
                    cluster_id=f"CLUST-DIR-{cluster_idx:03d}",
                    cluster_type="SHARED_DIRECTORS",
                    title=f"Shared Directorship Cluster ({len(comp_set)} Entities)",
                    description="Multiple competing bidders linked to identical corporate board members.",
                    risk_level="critical",
                    companies=entities,
                    shared_attributes={"component_size": len(comp_set)},
                    tenders_involved=tenders_for_cluster,
                ))
                cluster_idx += 1

        # Find connected components of shared address
        addr_graph = nx.Graph()
        for e in edges_list:
            if e.get("relationship_type") == "SHARED_ADDRESS":
                addr_graph.add_edge(e["from"], e["to"], **e.get("properties", {}))

        for comp_set in nx.connected_components(addr_graph):
            if len(comp_set) >= 2:
                entities = []
                for cid in comp_set:
                    c_info = nodes_dict.get(cid, {})
                    entities.append(ClusterEntity(
                        id=cid,
                        legal_name=c_info.get("label", cid),
                        tax_id=c_info.get("properties", {}).get("tax_id"),
                        role_in_cluster="Shared Facility Co-Tenant",
                    ))

                tenders_for_cluster = sorted(list({
                    e["to"] for e in edges_list
                    if e.get("relationship_type") == "PARTICIPATED_IN" and e["from"] in comp_set
                }))

                clusters.append(CollusionCluster(
                    cluster_id=f"CLUST-ADDR-{cluster_idx:03d}",
                    cluster_type="SHARED_ADDRESS",
                    title=f"Shared Registered Office Cluster ({len(comp_set)} Entities)",
                    description="Multiple competing bidders registered at identical physical premises.",
                    risk_level="high",
                    companies=entities,
                    shared_attributes={"component_size": len(comp_set)},
                    tenders_involved=tenders_for_cluster,
                ))
                cluster_idx += 1

        return ClusterListResponse(total_clusters=len(clusters), clusters=clusters)

    @classmethod
    def get_company_dossier(cls, db: Session, company_identifier: str, organization_id: str = "default") -> Optional[CompanyDossierResponse]:
        """Compiles a complete 360-degree intelligence dossier for an individual company."""
        company = db.execute(
            select(Company).filter(
                Company.organization_id == organization_id,
                (Company.id == company_identifier) | (Company.legal_name == company_identifier)
            )
        ).scalar_one_or_none()

        if not company:
            return None

        # Bids & Tenders
        bids = db.execute(
            select(Bid).filter(Bid.organization_id == organization_id, Bid.company_id == company.id)
        ).scalars().all()

        total_bids = len(bids)
        total_value = sum(b.amount for b in bids)
        won_tenders = sum(1 for b in bids if b.status.lower() in {"awarded", "winner"})
        win_rate = round(won_tenders / total_bids, 2) if total_bids > 0 else 0.0

        # Directors
        cd_links = db.execute(
            select(CompanyDirector).filter(CompanyDirector.organization_id == organization_id, CompanyDirector.company_id == company.id)
        ).scalars().all()
        dir_ids = [cd.director_id for cd in cd_links]
        directors = db.execute(
            select(Director).filter(Director.organization_id == organization_id, Director.id.in_(dir_ids))
        ).scalars().all() if dir_ids else []

        dir_map = {d.id: d.full_name for d in directors}
        dir_summaries = [
            DirectorSummary(
                id=cd.director_id,
                full_name=dir_map.get(cd.director_id, "Unknown"),
                role=cd.role,
                appointed_date=cd.appointed_date,
            )
            for cd in cd_links
        ]

        # Co-bidders
        tender_ids = [b.tender_id for b in bids]
        cobids = db.execute(
            select(Bid).filter(
                Bid.organization_id == organization_id,
                Bid.tender_id.in_(tender_ids),
                Bid.company_id != company.id
            )
        ).scalars().all() if tender_ids else []

        cobid_counts: Dict[str, int] = {}
        for cb in cobids:
            cobid_counts[cb.company_id] = cobid_counts.get(cb.company_id, 0) + 1

        cobid_comps = db.execute(
            select(Company).filter(Company.organization_id == organization_id, Company.id.in_(cobid_counts.keys()))
        ).scalars().all() if cobid_counts else []

        cobid_map = {c.id: c.legal_name for c in cobid_comps}
        cobidder_summaries = [
            CoBidderSummary(
                company_id=cid,
                company_name=cobid_map.get(cid, "Supplier"),
                joint_tenders_count=count,
                shared_directors_count=0,
                shared_address=False,
            )
            for cid, count in cobid_counts.items()
        ]

        return CompanyDossierResponse(
            id=company.id,
            legal_name=company.legal_name,
            normalized_name=company.normalized_name,
            tax_id=company.tax_id,
            status=company.status,
            address=company.address.raw_address if company.address else None,
            total_bids=total_bids,
            won_tenders=won_tenders,
            win_rate=win_rate,
            total_bid_value=total_value,
            directors=dir_summaries,
            co_bidders=cobidder_summaries,
            risk_signals=[],
            provenance=cls._extract_provenance(company),
        )
