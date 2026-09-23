from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.modules.ingestion.service import DEFAULT_ORG_ID
from app.modules.investigations.service import InvestigationService
from app.modules.investigations.schemas import (
    InvestigationCreate,
    InvestigationUpdate,
    InvestigationOut,
    InvestigationDetailOut,
    InvestigationNoteCreate,
    InvestigationNoteOut,
)

router = APIRouter(prefix="/investigations", tags=["Investigation Case Management"])


@router.get("/", response_model=List[InvestigationOut])
def list_investigations(
    status: Optional[str] = Query(None, description="Filter by status (Open, Under Review, Escalated, Closed)"),
    priority: Optional[str] = Query(None, description="Filter by priority (Low, Medium, High, Critical)"),
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """List all investigation cases for an organization with optional status and priority filtering."""
    return InvestigationService.list_investigations(
        db=db,
        organization_id=organization_id,
        status=status,
        priority=priority,
    )


@router.post("/", response_model=InvestigationOut, status_code=201)
def create_investigation(
    data: InvestigationCreate,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """Open a new investigation case linked to a flagged tender or suspicious supplier cluster."""
    return InvestigationService.create_investigation(
        db=db,
        data=data,
        organization_id=organization_id,
    )


@router.get("/{identifier}", response_model=InvestigationDetailOut)
def get_investigation_detail(
    identifier: str,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """Retrieve 360-degree case details including linked tender, bids, risk signals, and notes."""
    case = InvestigationService.get_investigation_detail(
        db=db,
        identifier=identifier,
        organization_id=organization_id,
    )
    if not case:
        raise HTTPException(status_code=404, detail=f"Investigation '{identifier}' not found")
    return case


@router.patch("/{identifier}", response_model=InvestigationOut)
def update_investigation(
    identifier: str,
    data: InvestigationUpdate,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """Update case status, priority, or assigned investigator, logging audit notes on status change."""
    case = InvestigationService.update_investigation(
        db=db,
        identifier=identifier,
        data=data,
        organization_id=organization_id,
    )
    if not case:
        raise HTTPException(status_code=404, detail=f"Investigation '{identifier}' not found")
    return case


@router.post("/{identifier}/notes", response_model=InvestigationNoteOut, status_code=201)
def add_investigation_note(
    identifier: str,
    data: InvestigationNoteCreate,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """Log a timestamped investigator observation or evidence note to the case file."""
    note = InvestigationService.add_note(
        db=db,
        identifier=identifier,
        data=data,
        organization_id=organization_id,
    )
    if not note:
        raise HTTPException(status_code=404, detail=f"Investigation '{identifier}' not found")
    return note
