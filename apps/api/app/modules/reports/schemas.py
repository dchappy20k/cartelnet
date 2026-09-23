from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field

ReportType = Literal["TENDER_RISK_AUDIT", "INVESTIGATION_CASE_DOSSIER"]
ReportFormat = Literal["JSON", "HTML", "MARKDOWN"]


class ReportGenerateRequest(BaseModel):
    report_type: ReportType = "TENDER_RISK_AUDIT"
    target_id: str  # tender_ref (e.g. TND-8842) or case_ref (e.g. CASE-2026-001)
    format: ReportFormat = "HTML"
    include_evidence_payloads: bool = True
    auditor_name: Optional[str] = "Integrity Officer"


class ReportResponse(BaseModel):
    report_id: str
    report_title: str
    generated_at: datetime
    report_type: ReportType
    format: ReportFormat
    target_id: str
    risk_score: Optional[int] = None
    risk_level: Optional[str] = None
    executive_summary: str
    evidence_log: List[Dict[str, Any]] = []
    entities_involved: List[Dict[str, Any]] = []
    rendered_content: Optional[str] = None


class ReportTemplateInfo(BaseModel):
    code: ReportType
    title: str
    description: str
    supported_formats: List[ReportFormat]
