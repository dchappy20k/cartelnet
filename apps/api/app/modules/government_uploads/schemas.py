from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, date


class DepartmentSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Official government department name")
    department_code: str = Field(..., min_length=2, max_length=50, description="Department code abbreviation (e.g. PWD, NHAI)")

    @field_validator("name", "department_code")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Value cannot be blank or whitespace only")
        return s


class RegisteredCompanySchema(BaseModel):
    company_id: str = Field(..., min_length=1, max_length=100, description="Unique source company identifier (e.g. C001)")
    company_name: str = Field(..., min_length=1, max_length=255, description="Legal registered company name")

    @field_validator("company_id", "company_name")
    @classmethod
    def strip_and_validate(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Value cannot be blank")
        return s


class BidderSchema(BaseModel):
    company_id: str = Field(..., min_length=1, max_length=100, description="Identifier referencing registered company")
    bid_amount: float = Field(..., ge=0.0, description="Bid submission amount in monetary units (must be >= 0)")
    bid_rank: Optional[int] = Field(None, ge=1, description="Bid rank position (e.g. 1 for L1 lowest bidder)")
    status: str = Field("qualified", description="Bid evaluation status")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        s = v.strip().lower()
        allowed = {"qualified", "disqualified", "submitted", "awarded", "runner-up", "rejected", "withdrawn"}
        if s not in allowed:
            raise ValueError(f"Invalid status '{v}'. Allowed statuses: {', '.join(sorted(allowed))}")
        return s


class TenderItemSchema(BaseModel):
    tender_id: str = Field(..., min_length=1, max_length=100, description="Unique procurement tender reference")
    title: str = Field(..., min_length=2, max_length=500, description="Tender subject/title")
    location: Optional[str] = Field(None, max_length=255, description="Geographic jurisdiction or location")
    estimated_value: float = Field(0.0, ge=0.0, description="Official estimated contract budget")
    submission_deadline: Optional[str] = Field(None, description="ISO-8601 deadline date (YYYY-MM-DD)")
    registered_companies: List[RegisteredCompanySchema] = Field(..., min_length=1, description="Companies registered for this tender")
    bidders: List[BidderSchema] = Field(..., min_length=1, description="Submitted bidder offers for this tender")

    @field_validator("tender_id", "title")
    @classmethod
    def strip_text(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Cannot be empty")
        return s

    @field_validator("submission_deadline")
    @classmethod
    def validate_iso_date(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v_clean = v.strip()
        try:
            # Validate ISO date or datetime
            if "T" in v_clean:
                datetime.fromisoformat(v_clean)
            else:
                date.fromisoformat(v_clean)
            return v_clean
        except ValueError:
            raise ValueError(f"Invalid ISO-8601 date format '{v}'. Expected YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS")


class GovernmentUploadPayload(BaseModel):
    department: DepartmentSchema
    tenders: List[TenderItemSchema] = Field(..., min_length=1, description="List of tender contract records")


class ValidationErrorDetail(BaseModel):
    path: str
    message: str
    code: Optional[str] = "INVALID_VALUE"


class ValidationSummary(BaseModel):
    departments: int = 1
    tenders: int = 0
    companies: int = 0
    bidders: int = 0
    total_estimated_value: float = 0.0


class ValidationResponse(BaseModel):
    success: bool
    upload_id: str
    status: str  # VALID, INVALID
    summary: ValidationSummary
    errors: List[ValidationErrorDetail] = []
    warnings: List[str] = []


class ImportSummary(BaseModel):
    departments: int = 0
    tenders: int = 0
    companies: int = 0
    participants: int = 0
    bids: int = 0


class ImportResponse(BaseModel):
    success: bool
    upload_id: str
    status: str  # IMPORTED, ROLLED_BACK, FAILED
    summary: ImportSummary
    errors: List[ValidationErrorDetail] = []
    warnings: List[str] = []
    processing_duration_ms: int = 0


class UploadAuditOut(BaseModel):
    upload_id: str
    department_id: Optional[str] = None
    department_code: Optional[str] = None
    uploaded_by: str
    filename: str
    file_size: int
    status: str
    records_received: Optional[Dict[str, Any]] = None
    records_imported: Optional[Dict[str, Any]] = None
    records_failed: int = 0
    validation_errors: Optional[List[Dict[str, Any]]] = None
    processing_duration_ms: int = 0
    created_at: str

    model_config = {"from_attributes": True}
