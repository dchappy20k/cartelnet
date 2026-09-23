from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.core.config import DEFAULT_ORG_ID
from app.modules.tenders.service import TenderService
from app.modules.tenders.schemas import TenderOut, Tender360Out

router = APIRouter(prefix="/tenders", tags=["Tenders & Tender 360"])


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
