from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field

InvestigationStatus = Literal["Open", "Under Review", "Escalated", "Closed"]
InvestigationPriority = Literal["Low", "Medium", "High", "Critical"]


class InvestigationNoteCreate(BaseModel):
    content: str
    author_name: Optional[str] = "Investigator"
    author_id: Optional[str] = None


class InvestigationNoteOut(BaseModel):
    id: str
    investigation_id: str
    author_id: Optional[str] = None
    author_name: str
    content: str
    created_at: datetime


class InvestigationCreate(BaseModel):
    title: str
    tender_id: Optional[str] = None  # tender UUID or tender_ref
    priority: InvestigationPriority = "Medium"
    investigator: Optional[str] = "Unassigned"
    initial_note: Optional[str] = None


class InvestigationUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[InvestigationPriority] = None
    status: Optional[InvestigationStatus] = None
    investigator: Optional[str] = None
    note: Optional[str] = None  # optional reason or update note


class InvestigationOut(BaseModel):
    id: str
    case_ref: str
    title: str
    priority: str
    status: str
    investigator: str
    tender_id: Optional[str] = None
    tender_ref: Optional[str] = None
    entities_count: int
    signals_count: int
    created_at: datetime
    updated_at: datetime
    notes: List[InvestigationNoteOut] = []


class InvestigationDetailOut(InvestigationOut):
    tender_title: Optional[str] = None
    tender_authority: Optional[str] = None
    tender_value: Optional[float] = None
    tender_risk_score: Optional[int] = None
    bidders: List[Dict[str, Any]] = []
    signals: List[Dict[str, Any]] = []
