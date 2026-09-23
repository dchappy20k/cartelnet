from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional

from app.db.base import TenantAwareModel


class ImportJob(TenantAwareModel):
    """Tracks an ingestion upload or data batch import."""
    __tablename__ = "import_jobs"

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), default="CSV", nullable=False)  # CSV, EXCEL, DEMO
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    warning_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)  # PENDING, VALIDATED, COMPLETED, FAILED

    errors: Mapped[List["ImportRecordError"]] = relationship("ImportRecordError", back_populates="import_job", cascade="all, delete-orphan")


class ImportRecordError(TenantAwareModel):
    """Detailed row-level error caught during data import validation."""
    __tablename__ = "import_record_errors"

    import_job_id: Mapped[str] = mapped_column(String(36), ForeignKey("import_jobs.id", ondelete="CASCADE"), index=True, nullable=False)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    column_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    raw_value: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)

    import_job: Mapped["ImportJob"] = relationship("ImportJob", back_populates="errors")
