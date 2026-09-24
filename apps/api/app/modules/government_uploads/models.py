from sqlalchemy import String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
from datetime import datetime
import uuid

from app.db.base import Base, TenantAwareModel, utc_now


class GovernmentDepartment(TenantAwareModel):
    """Government Department issuing procurement tenders."""
    __tablename__ = "departments"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department_code: Mapped[str] = mapped_column(String(50), index=True, nullable=False)

    tenders: Mapped[List["Tender"]] = relationship("Tender", back_populates="department")


class TenderParticipant(TenantAwareModel):
    """Registered corporate participant for a specific tender."""
    __tablename__ = "tender_participants"

    tender_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenders.id", ondelete="CASCADE"), index=True, nullable=False)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    registered_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Registered", nullable=False)
    source_upload_id: Mapped[Optional[str]] = mapped_column(String(50), index=True, nullable=True)

    tender: Mapped["Tender"] = relationship("Tender")
    company: Mapped["Company"] = relationship("Company")


class GovernmentUploadAudit(TenantAwareModel):
    """Immutable audit record for every government JSON upload attempt."""
    __tablename__ = "government_uploads"

    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    department_code: Mapped[Optional[str]] = mapped_column(String(50), index=True, nullable=True)
    uploaded_by: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="VALIDATING", nullable=False)
    # Statuses: VALIDATING, VALID, INVALID, IMPORTING, IMPORTED, FAILED, ROLLED_BACK
    records_received: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    records_imported: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    records_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    validation_errors: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processing_duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
