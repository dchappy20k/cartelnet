from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.modules.ingestion.service import DEFAULT_ORG_ID
from app.modules.risk.service import RiskService
from app.modules.risk.schemas import TenderScreeningResult, RiskSignalOut, RuleDefinition

router = APIRouter(prefix="/risk", tags=["Risk Engine"])


@router.get("/rules", response_model=List[RuleDefinition])
def get_risk_rules():
    """Returns all active deterministic risk detectors and base score weights."""
    return RiskService.get_rules()


@router.post("/tenders/{tender_id}/screen", response_model=TenderScreeningResult)
def screen_tender(
    tender_id: str,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """Executes all deterministic risk detectors on a specific tender and persists signals."""
    return RiskService.screen_tender(
        tender_id=tender_id,
        organization_id=organization_id,
        db=db,
    )


@router.post("/screen-all", response_model=List[TenderScreeningResult])
def screen_all_tenders(
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """Executes screening across all procurement tenders in the organization."""
    return RiskService.screen_all_tenders(
        organization_id=organization_id,
        db=db,
    )


@router.get("/signals", response_model=List[RiskSignalOut])
def list_risk_signals(
    severity: Optional[str] = Query(None, description="Filter by severity: low, medium, high, critical"),
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """Returns live stream of detected risk signals across the organization."""
    return RiskService.list_signals(
        organization_id=organization_id,
        severity=severity,
        db=db,
    )
