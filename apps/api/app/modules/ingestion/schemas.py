from pydantic import BaseModel
from typing import List, Optional, Any


class RowErrorDetail(BaseModel):
    row_number: int
    column_name: Optional[str] = None
    raw_value: Optional[str] = None
    error_message: str


class ValidationResult(BaseModel):
    import_job_id: str
    total_rows: int
    valid_rows: int
    warning_rows: int
    error_rows: int
    is_valid: bool
    detected_columns: List[str]
    sample_preview: List[dict]
    errors: List[RowErrorDetail]


class CommitResult(BaseModel):
    import_job_id: str
    status: str
    tenders_count: int
    bids_count: int
    companies_count: int
    directors_count: int
    message: str


class ImportJobOut(BaseModel):
    id: str
    filename: str
    source_type: str
    total_rows: int
    valid_rows: int
    error_rows: int
    status: str
    created_at: Any
