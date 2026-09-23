from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class BidSummaryOut(BaseModel):
    id: str
    company_id: str
    company_name: str
    amount: float
    status: str
    submitted_at: Optional[str] = None
    variance_pct: Optional[float] = None


class TenderOut(BaseModel):
    id: str
    tender_ref: str
    title: str
    authority: str
    estimated_value: float
    category: str
    status: str
    publication_date: Optional[str] = None
    closing_date: Optional[str] = None
    risk_score: int
    risk_level: str
    signal_count: int
    bidders_count: int


class Tender360Out(BaseModel):
    tender: TenderOut
    bids: List[BidSummaryOut]
    signals: List[Dict[str, Any]]
    metrics: Dict[str, Any]
