from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.modules.ingestion.service import DEFAULT_ORG_ID
from app.modules.network.service import NetworkService
from app.modules.network.schemas import (
    GraphResponse,
    ClusterListResponse,
    CompanyDossierResponse,
)

router = APIRouter(prefix="/network", tags=["Network Graph Engine"])


@router.get("/graph", response_model=GraphResponse)
def get_global_graph(
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Project all relational entities (tenders, companies, directors, addresses)
    into a dynamic 2D NetworkX graph scaled to an 800x500 viewport.
    """
    return NetworkService.build_global_graph(db=db, organization_id=organization_id)


@router.get("/tenders/{tender_identifier}/graph", response_model=GraphResponse)
def get_tender_subgraph(
    tender_identifier: str,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Generate an ego-graph centered on a specific tender and its bidders,
    shared directors, and shared registered offices.
    """
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
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Discover dense relationship clusters: companies sharing directors or physical addresses.
    """
    return NetworkService.detect_clusters(db=db, organization_id=organization_id)


@router.get("/companies/{company_identifier}/dossier", response_model=CompanyDossierResponse)
def get_company_dossier(
    company_identifier: str,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Retrieve full entity dossier: win/loss rates, connected directors,
    co-bidders, and related risk signals.
    """
    dossier = NetworkService.get_company_dossier(
        db=db,
        company_identifier=company_identifier,
        organization_id=organization_id,
    )
    if not dossier:
        raise HTTPException(status_code=404, detail=f"Company '{company_identifier}' not found")
    return dossier
