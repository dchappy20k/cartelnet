from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.modules.ingestion.service import DEFAULT_ORG_ID
from app.modules.reports.service import ReportService
from app.modules.reports.schemas import (
    ReportGenerateRequest,
    ReportResponse,
    ReportTemplateInfo,
)

router = APIRouter(prefix="/reports", tags=["Audit Report Generator"])


@router.get("/templates", response_model=List[ReportTemplateInfo])
def get_report_templates():
    """List all available report templates and supported formats."""
    return ReportService.get_templates()


@router.post("/generate", response_model=ReportResponse)
def generate_report(
    req: ReportGenerateRequest,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Generate an explainable audit report or investigation dossier
    in JSON, HTML, or Markdown format with underlying evidence items.
    """
    try:
        return ReportService.generate_report(
            db=db,
            req=req,
            organization_id=organization_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
