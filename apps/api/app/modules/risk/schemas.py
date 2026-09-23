from pydantic import BaseModel
from typing import List, Optional, Any, Dict


class EvidenceOut(BaseModel):
    id: str
    source_type: str
    source_id: Optional[str] = None
    summary: str
    data_payload: Optional[Dict[str, Any]] = None


class RiskSignalOut(BaseModel):
    id: str
    tender_id: str
    detector_code: str
    title: str
    severity: str
    confidence: float
    score_contribution: int
    description: str
    explanation: str
    source: str
    records_count: int
    created_at: Any
    evidence_items: List[EvidenceOut] = []


class TenderScreeningResult(BaseModel):
    tender_id: str
    tender_ref: str
    risk_score: int
    risk_level: str
    signals_count: int
    signals: List[RiskSignalOut]
    summary: str


class RuleDefinition(BaseModel):
    code: str
    name: str
    base_weight: int
    description: str
