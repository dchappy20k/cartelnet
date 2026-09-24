import base64
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import Company, Director, CompanyDirector, Address
from app.modules.risk.models import RiskSignal, Evidence
from app.modules.investigations.models import Investigation, InvestigationNote
from app.modules.reports.schemas import (
    ReportGenerateRequest,
    ReportResponse,
    ReportTemplateInfo,
)
from app.modules.reports.pdf_builder import (
    build_tender_risk_pdf,
    build_investigation_pdf,
)


class ReportService:
    """Service layer for synthesizing explainable procurement risk intelligence reports."""

    @classmethod
    def get_templates(cls) -> List[ReportTemplateInfo]:
        """List all available report templates."""
        return [
            ReportTemplateInfo(
                code="TENDER_RISK_AUDIT",
                title="Tender Risk & Anti-Collusion Audit Dossier",
                description="Comprehensive screening report covering bidding spreads, price clustering variance, shared directors, shared addresses, and mathematical evidence.",
                supported_formats=["JSON", "HTML", "MARKDOWN", "PDF"],
            ),
            ReportTemplateInfo(
                code="INVESTIGATION_CASE_DOSSIER",
                title="Investigation Case Dossier & Evidence Log",
                description="Formal case file report documenting case overview, participating entities, investigator notes timeline, and evidentiary attachments.",
                supported_formats=["JSON", "HTML", "MARKDOWN", "PDF"],
            ),
        ]

    @classmethod
    def generate_report(
        cls, 
        db: Session, 
        req: ReportGenerateRequest, 
        organization_id: str = "default"
    ) -> ReportResponse:
        """Generate structured audit report in requested format."""
        if req.report_type == "TENDER_RISK_AUDIT":
            return cls._generate_tender_report(db, req, organization_id)
        else:
            return cls._generate_investigation_report(db, req, organization_id)

    @classmethod
    def _generate_tender_report(
        cls, 
        db: Session, 
        req: ReportGenerateRequest, 
        organization_id: str
    ) -> ReportResponse:
        tender = db.execute(
            select(Tender).filter(
                Tender.organization_id == organization_id,
                (Tender.tender_ref == req.target_id) | (Tender.id == req.target_id)
            )
        ).scalar_one_or_none()

        if not tender:
            raise ValueError(f"Tender '{req.target_id}' not found")

        # Fetch bids & companies
        bids = db.execute(
            select(Bid).filter(Bid.organization_id == organization_id, Bid.tender_id == tender.id)
        ).scalars().all()

        entities: List[Dict[str, Any]] = []
        for b in bids:
            comp = db.execute(select(Company).filter(Company.id == b.company_id)).scalar_one_or_none()
            addr = db.execute(select(Address).filter(Address.id == comp.address_id)).scalar_one_or_none() if comp and comp.address_id else None
            entities.append({
                "company_id": b.company_id,
                "company_name": comp.legal_name if comp else "Unknown",
                "bid_amount": b.amount,
                "bid_status": b.status,
                "registered_address": addr.raw_address if addr else "N/A",
            })

        # Fetch signals & evidence
        signals = db.execute(
            select(RiskSignal).filter(RiskSignal.organization_id == organization_id, RiskSignal.tender_id == tender.id)
        ).scalars().all()

        evidence_log: List[Dict[str, Any]] = []
        for s in signals:
            ev_items = db.execute(select(Evidence).filter(Evidence.signal_id == s.id)).scalars().all()
            evidence_log.append({
                "signal_id": s.id,
                "detector_code": s.detector_code,
                "title": s.title,
                "severity": s.severity,
                "score_contribution": s.score_contribution,
                "confidence": s.confidence,
                "description": s.description,
                "explanation": s.explanation,
                "evidence_items": [
                    {
                        "source_type": e.source_type,
                        "summary": e.summary,
                        "payload": e.data_payload if req.include_evidence_payloads else None,
                    }
                    for e in ev_items
                ],
            })

        summary = (
            f"Screening evaluation of tender '{tender.title}' ({tender.tender_ref}) revealed an overall "
            f"Risk Score of {tender.risk_score}/100 ({tender.risk_level.upper()}). "
            f"{len(signals)} risk signal(s) were flagged across {len(bids)} participating bidder(s). "
            f"Key observations require human verification prior to contract execution or fund disbursement."
        )

        report_id = f"REP-TND-{str(uuid.uuid4())[:8].upper()}"
        report_title = f"Tender Risk Screening Dossier: {tender.tender_ref}"
        now = datetime.now(timezone.utc)

        rendered = None
        if req.format == "HTML":
            rendered = cls._render_tender_html(
                report_id=report_id,
                tender=tender,
                summary=summary,
                entities=entities,
                signals=evidence_log,
                auditor=req.auditor_name or "Integrity Officer",
                now=now,
            )
        elif req.format == "MARKDOWN":
            rendered = cls._render_tender_markdown(
                report_id=report_id,
                tender=tender,
                summary=summary,
                entities=entities,
                signals=evidence_log,
                auditor=req.auditor_name or "Integrity Officer",
                now=now,
            )
        elif req.format == "PDF":
            pdf_bytes = build_tender_risk_pdf(
                report_id=report_id,
                tender=tender,
                summary=summary,
                entities=entities,
                signals=evidence_log,
                auditor=req.auditor_name or "Integrity Officer",
                now=now,
            )
            rendered = base64.b64encode(pdf_bytes).decode("utf-8")

        return ReportResponse(
            report_id=report_id,
            report_title=report_title,
            generated_at=now,
            report_type="TENDER_RISK_AUDIT",
            format=req.format,
            target_id=tender.tender_ref,
            risk_score=tender.risk_score,
            risk_level=tender.risk_level,
            executive_summary=summary,
            evidence_log=evidence_log,
            entities_involved=entities,
            rendered_content=rendered,
        )

    @classmethod
    def _generate_investigation_report(
        cls, 
        db: Session, 
        req: ReportGenerateRequest, 
        organization_id: str
    ) -> ReportResponse:
        inv = db.execute(
            select(Investigation).filter(
                Investigation.organization_id == organization_id,
                (Investigation.case_ref == req.target_id) | (Investigation.id == req.target_id)
            )
        ).scalar_one_or_none()

        if not inv:
            raise ValueError(f"Investigation '{req.target_id}' not found")

        tender = inv.tender
        notes = inv.notes

        summary = (
            f"Investigation Dossier for {inv.case_ref} ('{inv.title}'). Status: {inv.status}, Priority: {inv.priority}. "
            f"Assigned Investigator: {inv.investigator}. Linked to Tender: {tender.tender_ref if tender else 'Unlinked'}. "
            f"Total logged audit notes: {len(notes)}."
        )

        notes_log = [
            {
                "author": n.author_name,
                "created_at": n.created_at.isoformat(),
                "content": n.content,
            }
            for n in notes
        ]

        report_id = f"REP-INV-{str(uuid.uuid4())[:8].upper()}"
        report_title = f"Investigation Case Dossier: {inv.case_ref}"
        now = datetime.now(timezone.utc)

        rendered = None
        if req.format == "HTML":
            rendered = cls._render_investigation_html(
                report_id=report_id,
                inv=inv,
                tender=tender,
                summary=summary,
                notes=notes_log,
                now=now,
            )
        elif req.format == "PDF":
            pdf_bytes = build_investigation_pdf(
                report_id=report_id,
                inv=inv,
                tender=tender,
                summary=summary,
                notes=notes_log,
                auditor=req.auditor_name or "Integrity Officer",
                now=now,
            )
            rendered = base64.b64encode(pdf_bytes).decode("utf-8")

        return ReportResponse(
            report_id=report_id,
            report_title=report_title,
            generated_at=now,
            report_type="INVESTIGATION_CASE_DOSSIER",
            format=req.format,
            target_id=inv.case_ref,
            risk_score=tender.risk_score if tender else None,
            risk_level=tender.risk_level if tender else None,
            executive_summary=summary,
            evidence_log=notes_log,
            entities_involved=[],
            rendered_content=rendered,
        )

    @classmethod
    def generate_pdf(
        cls, 
        db: Session, 
        target_id: str, 
        report_type: Optional[str] = None,
        auditor_name: Optional[str] = "Public Integrity Review",
        organization_id: str = "default",
    ) -> Tuple[bytes, str]:
        """Directly generates a binary PDF file stream and recommended filename."""
        now = datetime.now(timezone.utc)
        
        # Auto-detect report type if not provided
        if not report_type:
            tender = db.execute(
                select(Tender).filter(
                    Tender.organization_id == organization_id,
                    (Tender.tender_ref == target_id) | (Tender.id == target_id)
                )
            ).scalar_one_or_none()
            if tender:
                report_type = "TENDER_RISK_AUDIT"
            else:
                report_type = "INVESTIGATION_CASE_DOSSIER"

        if report_type == "TENDER_RISK_AUDIT":
            tender = db.execute(
                select(Tender).filter(
                    Tender.organization_id == organization_id,
                    (Tender.tender_ref == target_id) | (Tender.id == target_id)
                )
            ).scalar_one_or_none()
            if not tender:
                raise ValueError(f"Tender '{target_id}' not found")

            bids = db.execute(
                select(Bid).filter(Bid.organization_id == organization_id, Bid.tender_id == tender.id)
            ).scalars().all()

            entities = []
            for b in bids:
                comp = db.execute(select(Company).filter(Company.id == b.company_id)).scalar_one_or_none()
                addr = db.execute(select(Address).filter(Address.id == comp.address_id)).scalar_one_or_none() if comp and comp.address_id else None
                entities.append({
                    "company_name": comp.legal_name if comp else "Unknown",
                    "bid_amount": b.amount,
                    "bid_status": b.status,
                    "registered_address": addr.raw_address if addr else "N/A",
                })

            signals = db.execute(
                select(RiskSignal).filter(RiskSignal.organization_id == organization_id, RiskSignal.tender_id == tender.id)
            ).scalars().all()

            evidence_log = []
            for s in signals:
                evidence_log.append({
                    "signal_id": s.id,
                    "detector_code": s.detector_code,
                    "title": s.title,
                    "severity": s.severity,
                    "score_contribution": s.score_contribution,
                    "description": s.description,
                    "explanation": s.explanation,
                })

            summary = (
                f"Screening evaluation of tender '{tender.title}' ({tender.tender_ref}) revealed an overall "
                f"Risk Score of {tender.risk_score}/100 ({tender.risk_level.upper()}). "
                f"{len(signals)} risk signal(s) were flagged across {len(bids)} participating bidder(s). "
                f"Key observations require human verification prior to contract execution or fund disbursement."
            )
            report_id = f"REP-TND-{str(uuid.uuid4())[:8].upper()}"
            pdf_bytes = build_tender_risk_pdf(
                report_id=report_id,
                tender=tender,
                summary=summary,
                entities=entities,
                signals=evidence_log,
                auditor=auditor_name or "Integrity Officer",
                now=now,
            )
            filename = f"CartelNet_Risk_Audit_{tender.tender_ref}.pdf"
            return pdf_bytes, filename
        else:
            inv = db.execute(
                select(Investigation).filter(
                    Investigation.organization_id == organization_id,
                    (Investigation.case_ref == target_id) | (Investigation.id == target_id)
                )
            ).scalar_one_or_none()
            if not inv:
                raise ValueError(f"Investigation or Tender '{target_id}' not found")

            tender = inv.tender
            notes = inv.notes
            summary = (
                f"Investigation Dossier for {inv.case_ref} ('{inv.title}'). Status: {inv.status}, Priority: {inv.priority}. "
                f"Assigned Investigator: {inv.investigator}. Linked to Tender: {tender.tender_ref if tender else 'Unlinked'}. "
                f"Total logged audit notes: {len(notes)}."
            )
            notes_log = [
                {
                    "author": n.author_name,
                    "created_at": n.created_at.isoformat(),
                    "content": n.content,
                }
                for n in notes
            ]
            report_id = f"REP-INV-{str(uuid.uuid4())[:8].upper()}"
            pdf_bytes = build_investigation_pdf(
                report_id=report_id,
                inv=inv,
                tender=tender,
                summary=summary,
                notes=notes_log,
                auditor=auditor_name or "Integrity Officer",
                now=now,
            )
            filename = f"CartelNet_Investigation_Dossier_{inv.case_ref}.pdf"
            return pdf_bytes, filename

    @staticmethod
    def _render_tender_html(report_id, tender, summary, entities, signals, auditor, now) -> str:
        rows_bids = "".join([
            f"<tr><td>{e['company_name']}</td><td>${e['bid_amount']:,.2f}</td><td>{e['bid_status']}</td><td>{e['registered_address']}</td></tr>"
            for e in entities
        ])
        
        rows_signals = "".join([
            f"""<div style='margin-bottom: 16px; padding: 12px; border-left: 4px solid #ef4444; background: #fef2f2;'>
                <h4 style='margin:0 0 4px 0; color: #b91c1c;'>{s['title']} ({s['severity'].upper()})</h4>
                <p style='margin:0 0 6px 0; font-size: 13px; color: #4b5563;'>{s['description']}</p>
                <div style='font-size: 12px; color: #6b7280;'><strong>Explanation:</strong> {s['explanation']}</div>
            </div>"""
            for s in signals
        ])

        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{report_id} — CartelNet Audit Report</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #111827; padding: 40px; max-width: 900px; margin: 0 auto; }}
.header {{ border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }}
.tag {{ display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #fee2e2; color: #991b1b; }}
table {{ width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }}
th, td {{ border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }}
th {{ background-color: #f9fafb; font-weight: 600; }}
.disclaimer {{ margin-top: 40px; padding: 16px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; color: #6b7280; background: #f9fafb; }}
</style>
</head>
<body>
<div class="header">
  <div style="float: right; text-align: right;">
    <div style="font-family: monospace; font-size: 12px; color: #6b7280;">REPORT ID: {report_id}</div>
    <div style="font-size: 12px; color: #6b7280;">Date: {now.strftime('%Y-%m-%d %H:%M UTC')}</div>
    <div style="font-size: 12px; color: #6b7280;">Reviewer: {auditor}</div>
  </div>
  <h1 style="margin: 0; font-size: 24px; color: #0f172a;">CartelNet Procurement Intelligence</h1>
  <div style="margin-top: 6px; font-size: 14px; color: #64748b;">Automated Anti-Collusion Audit Dossier</div>
</div>

<div style="margin-bottom: 24px;">
  <span class="tag">{tender.risk_level} Priority · Score {tender.risk_score}/100</span>
  <h2 style="margin: 12px 0 6px 0;">{tender.title} ({tender.tender_ref})</h2>
  <div style="font-size: 14px; color: #4b5563;">Authority: <strong>{tender.authority}</strong> · Value: <strong>${tender.estimated_value:,.2f}</strong></div>
</div>

<h3>Executive Summary</h3>
<p style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px; font-size: 14px; color: #334155;">{summary}</p>

<h3>Submitted Bids & Entity Registry</h3>
<table>
  <thead>
    <tr><th>Company Name</th><th>Bid Amount</th><th>Status</th><th>Registered Address</th></tr>
  </thead>
  <tbody>
    {rows_bids}
  </tbody>
</table>

<h3>Detected Risk Signals & Evidence Log</h3>
{rows_signals}

<div class="disclaimer">
  <strong>LEGAL & REGULATORY NOTICE:</strong> This intelligence dossier is generated by CartelNet as an automated decision-support tool. Findings highlight statistical, relational, and behavioral anomalies for human integrity review. This report does not constitute proof of unlawful conduct or legal determination of guilt.
</div>
</body>
</html>"""

    @staticmethod
    def _render_tender_markdown(report_id, tender, summary, entities, signals, auditor, now) -> str:
        return f"""# CartelNet Procurement Risk Audit: {tender.tender_ref}
**Report ID:** {report_id}  
**Date:** {now.strftime('%Y-%m-%d %H:%M UTC')}  
**Auditor:** {auditor}  
**Risk Score:** {tender.risk_score}/100 ({tender.risk_level.upper()})

---

## Executive Summary
{summary}

## Submitted Bids
| Company Name | Bid Amount | Status | Registered Address |
|---|---|---|---|
""" + "\n".join([f"| {e['company_name']} | ${e['bid_amount']:,.2f} | {e['bid_status']} | {e['registered_address']} |" for e in entities]) + """

## Risk Signals & Evidence Log
""" + "\n".join([f"### {s['title']} ({s['severity'].upper()})\n{s['description']}\n\n*Explanation:* {s['explanation']}\n" for s in signals])

    @staticmethod
    def _render_investigation_html(report_id, inv, tender, summary, notes, now) -> str:
        rows_notes = "".join([
            f"<div style='margin-bottom:12px; padding:10px; border-left:3px solid #6366f1; background:#f5f3ff;'><strong>{n['author']}</strong> <span style='font-size:11px; color:#6b7280;'>({n['created_at'][:16]})</span><p style='margin:4px 0 0 0; font-size:13px;'>{n['content']}</p></div>"
            for n in notes
        ])

        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{report_id} — Case File</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; max-width: 850px; margin: 0 auto; color: #1e293b; line-height: 1.5; }}
.header {{ border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }}
</style>
</head>
<body>
<div class="header">
  <div style="float:right; font-family:monospace; font-size:12px; color:#64748b;">CASE FILE: {inv.case_ref}</div>
  <h1 style="margin:0; font-size:22px;">Investigation Dossier</h1>
  <div style="font-size:13px; color:#64748b;">CartelNet Case Management System</div>
</div>
<h2>{inv.title}</h2>
<p><strong>Status:</strong> {inv.status} | <strong>Priority:</strong> {inv.priority} | <strong>Investigator:</strong> {inv.investigator}</p>
<p style="background:#f1f5f9; padding:12px; border-radius:6px; font-size:14px;">{summary}</p>

<h3>Investigator Notes Timeline</h3>
{rows_notes}
</body>
</html>"""
