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


class BidderInput(BaseModel):
    company_name: str
    company_id: Optional[str] = None
    bid_amount: float
    bid_status: Optional[str] = "Submitted"
    submitted_at: Optional[str] = None
    directors: Optional[List[str]] = None
    registered_address: Optional[str] = None


class PublishTenderRequest(BaseModel):
    department_name: Optional[str] = "Directorate of Public Contracts"
    department_code: Optional[str] = "DPC"
    tender_ref: str
    title: str
    category: Optional[str] = "Infrastructure"
    location: Optional[str] = "National Capital Region"
    estimated_value: float
    status: Optional[str] = "Live"  # Live, Open, Under Review, Awarded, Closed
    progress_stage: Optional[str] = "Bidding Open"
    publication_date: Optional[str] = None
    closing_date: Optional[str] = None
    bidders: List[BidderInput] = []


class TenderManagementUpdate(BaseModel):
    status: Optional[str] = None
    progress_stage: Optional[str] = None
    title: Optional[str] = None
    estimated_value: Optional[float] = None
    closing_date: Optional[str] = None
    run_risk_screening: bool = True


class TenderProjectStatusOut(BaseModel):
    id: str
    tender_ref: str
    title: str
    authority: str
    is_live: bool
    status: str
    progress_stage: str
    progress_pct: int
    estimated_value: float
    publication_date: Optional[str] = None
    closing_date: Optional[str] = None
    bidders: List[BidSummaryOut]
    bidding_summary: Dict[str, Any]
    risk_assessment: Dict[str, Any]
