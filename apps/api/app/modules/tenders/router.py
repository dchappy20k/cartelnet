from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.core.config import DEFAULT_ORG_ID
from app.modules.tenders.service import TenderService
from app.modules.tenders.schemas import (
    TenderOut,
    Tender360Out,
    PublishTenderRequest,
    TenderManagementUpdate,
    BidderInput,
    TenderProjectStatusOut,
)

router = APIRouter(prefix="/tenders", tags=["Tenders & Tender 360"])


@router.post("/publish", response_model=Tender360Out)
def publish_tender(
    req: PublishTenderRequest,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Publish a new or updated tender project from structured or JSON data.
    Automatically registers participating companies and runs deterministic risk screening.
    """
    try:
        return TenderService.publish_tender(
            db=db,
            req=req,
            organization_id=organization_id,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{identifier}/manage", response_model=Tender360Out)
def manage_tender(
    identifier: str,
    update: TenderManagementUpdate,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Updates a government tender project's operational status (Live, Under Review, Awarded, Closed),
    progress stage, or estimated contract value.
    """
    result = TenderService.manage_tender(
        db=db,
        identifier=identifier,
        update=update,
        organization_id=organization_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail=f"Tender '{identifier}' not found")
    return result


@router.post("/{identifier}/bidders", response_model=Tender360Out)
def add_tender_bidder(
    identifier: str,
    bidder: BidderInput,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Add a new bidder and bid amount to a live tender project.
    Triggers instant automated collusion risk screening.
    """
    result = TenderService.add_bidder(
        db=db,
        identifier=identifier,
        bidder=bidder,
        organization_id=organization_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail=f"Tender '{identifier}' not found")
    return result


@router.get("/{identifier}/project-status", response_model=TenderProjectStatusOut)
def get_project_status(
    identifier: str,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Returns full government project management visibility:
    live/active status, progress %, milestones, all bidders details, bid amounts, and risk assessment.
    """
    result = TenderService.get_project_status(
        db=db,
        identifier=identifier,
        organization_id=organization_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail=f"Tender '{identifier}' not found")
    return result


@router.get("/", response_model=List[TenderOut])
def list_tenders(
    status: Optional[str] = Query(None, description="Filter by status (Open, Awarded, Under Review, Closed)"),
    category: Optional[str] = Query(None, description="Filter by category (Infrastructure, Utilities, Technology, etc.)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (low, medium, high, critical)"),
    search: Optional[str] = Query(None, description="Search query by tender ref or title"),
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """List all tenders for an organization with optional status, category, and risk filtering."""
    return TenderService.list_tenders(
        db=db,
        organization_id=organization_id,
        status=status,
        category=category,
        risk_level=risk_level,
        search=search,
    )


@router.get("/{identifier}", response_model=Tender360Out)
def get_tender_360(
    identifier: str,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """Fetch complete Tender 360 view with bids, statistical variance, and risk signals."""
    result = TenderService.get_tender_360(
        db=db,
        identifier=identifier,
        organization_id=organization_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail=f"Tender '{identifier}' not found")
    return result
