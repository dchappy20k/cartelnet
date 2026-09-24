from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.modules.ingestion.service import DEFAULT_ORG_ID
from app.modules.auth.dependencies import get_current_token_payload, get_active_organization_id
from app.modules.network.service import NetworkService
from app.modules.network.schemas import (
    GraphResponse,
    ClusterListResponse,
    CompanyDossierResponse,
    EntitySearchResult,
    GraphSignalOut,
    CreateInvestigationFromNodePayload,
)

router = APIRouter(prefix="/network", tags=["Network Graph Engine"])


@router.get("/graph", response_model=GraphResponse)
def get_global_graph(
    node_types: Optional[List[str]] = Query(None, description="Filter by node types (company, tender, director, address, authority, investigation)"),
    relationship_types: Optional[List[str]] = Query(None, description="Filter by edge types (PARTICIPATED_IN, HAS_DIRECTOR, REGISTERED_AT, etc.)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk rating (all, low, medium, high, critical)"),
    limit: int = Query(150, ge=10, le=500),
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """
    Project procurement entities into an interactive 2D NetworkX property graph
    scaled to standard viewport coordinates with real database provenance.
    """
    return NetworkService.build_global_graph(
        db=db,
        organization_id=organization_id,
        node_types=node_types,
        relationship_types=relationship_types,
        risk_level=risk_level,
        limit=limit,
    )


@router.get("/entity/{entity_id}/neighbors", response_model=GraphResponse)
def get_entity_neighbors(
    entity_id: str,
    depth: int = Query(2, ge=1, le=3, description="Neighborhood traversal depth (1, 2, or 3 hops)"),
    max_nodes: int = Query(100, ge=10, le=250),
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """
    Traverse relationship neighborhood around a target entity up to depth hops.
    Scales layout with the target entity pinned at the center.
    """
    res = NetworkService.get_entity_neighborhood(
        entity_id=entity_id,
        db=db,
        organization_id=organization_id,
        depth=depth,
        max_nodes=max_nodes,
    )
    if not res.nodes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity '{entity_id}' not found in relationship network.",
        )
    return res


@router.get("/search", response_model=List[EntitySearchResult])
def search_graph_entities(
    q: str = Query(..., min_length=1, description="Entity search query (name, code, ID, or title)"),
    node_type: Optional[str] = Query(None, description="Restrict search to node type (company, tender, director, address)"),
    limit: int = Query(20, ge=1, le=50),
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """Full-text search across all graph entities with type and risk annotations."""
    return NetworkService.search_entities(
        query=q,
        db=db,
        organization_id=organization_id,
        node_type=node_type,
        limit=limit,
    )


@router.get("/temporal", response_model=GraphResponse)
def get_temporal_graph(
    start_year: int = Query(2023, description="Start year filter"),
    end_year: int = Query(2026, description="End year filter"),
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """Generates a time-sliced relationship graph filtering tenders by their award/closing year."""
    return NetworkService.get_temporal_graph(
        start_year=start_year,
        end_year=end_year,
        db=db,
        organization_id=organization_id,
    )


@router.get("/signals", response_model=List[GraphSignalOut])
def get_graph_signals(
    entity_id: Optional[str] = Query(None, description="Optional entity ID to scope signals"),
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """Calculates independent, explainable topological risk signals directly from the relationship graph."""
    return NetworkService.get_graph_signals(
        db=db,
        organization_id=organization_id,
        entity_id=entity_id,
    )


@router.post("/investigations/create-from-node")
def create_investigation_from_node(
    payload: CreateInvestigationFromNodePayload,
    token_payload: Optional[dict] = Depends(get_current_token_payload),
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """Creates a new official investigation case initialized directly from a graph node and its linked evidence."""
    user_email = token_payload.get("sub", "investigator@cartelnet.internal") if token_payload else "investigator@cartelnet.internal"
    return NetworkService.create_investigation_from_node(
        payload=payload,
        db=db,
        organization_id=organization_id,
        user_email=user_email,
    )


# Backward-compatible routes
@router.get("/tenders/{tender_identifier}/graph", response_model=GraphResponse)
def get_tender_subgraph(
    tender_identifier: str,
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """Generate an ego-graph centered on a specific tender and its bidders."""
    result = NetworkService.build_tender_subgraph(
        db=db,
        tender_identifier=tender_identifier,
        organization_id=organization_id,
    )
    if not result.nodes:
        raise HTTPException(status_code=404, detail=f"Tender '{tender_identifier}' not found")
    return result


@router.get("/clusters", response_model=ClusterListResponse)
def get_collusion_clusters(
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """Discover dense relationship clusters: companies sharing directors or physical addresses."""
    return NetworkService.detect_clusters(db=db, organization_id=organization_id)


@router.get("/companies/{company_identifier}/dossier", response_model=CompanyDossierResponse)
def get_company_dossier(
    company_identifier: str,
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """Retrieve full company intelligence dossier with provenance and co-bidders."""
    dossier = NetworkService.get_company_dossier(
        db=db,
        company_identifier=company_identifier,
        organization_id=organization_id,
    )
    if not dossier:
        raise HTTPException(status_code=404, detail=f"Company '{company_identifier}' not found")
    return dossier
