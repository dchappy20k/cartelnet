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


@router.get("/export/pdf")
def export_report_pdf(
    target_id: str = Query(..., description="Target Tender Ref (e.g. TND-8842) or Case Ref (e.g. INV-2026-001)"),
    report_type: str = Query(None, description="TENDER_RISK_AUDIT or INVESTIGATION_CASE_DOSSIER"),
    auditor_name: str = Query("Public Integrity Review", description="Auditor or reviewer name for attribution"),
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Download a formatted institutional PDF risk report.
    Publicly accessible for procurement transparency and official disclosure.
    """
    try:
        pdf_bytes, filename = ReportService.generate_pdf(
            db=db,
            target_id=target_id,
            report_type=report_type,
            auditor_name=auditor_name,
            organization_id=organization_id,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/public/download/{target_id}")
def public_download_pdf(
    target_id: str,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Direct public PDF download URL for citizens, civil society, and oversight bodies.
    Example: /api/v1/reports/public/download/TND-8842
    """
    try:
        pdf_bytes, filename = ReportService.generate_pdf(
            db=db,
            target_id=target_id,
            auditor_name="CartelNet Public Transparency Portal",
            organization_id=organization_id,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/export/pdf")
def export_report_pdf_post(
    req: ReportGenerateRequest,
    organization_id: str = Query(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """
    Generate and download PDF report from structured request body.
    """
    try:
        pdf_bytes, filename = ReportService.generate_pdf(
            db=db,
            target_id=req.target_id,
            report_type=req.report_type,
            auditor_name=req.auditor_name,
            organization_id=organization_id,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

