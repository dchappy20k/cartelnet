from sqlalchemy import String, Float, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional

from app.db.base import TenantAwareModel


class Tender(TenantAwareModel):
    """Procurement contract tender."""
    __tablename__ = "tenders"

    tender_ref: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    authority: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    estimated_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="Infrastructure", nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Open", nullable=False)  # Open, Awarded, Under Review, Closed
    publication_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    closing_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Government department & provenance
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    source_upload_id: Mapped[Optional[str]] = mapped_column(String(50), index=True, nullable=True)

    # Aggregated screening results
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), default="low", nullable=False)  # low, medium, high, critical
    signal_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    department: Mapped[Optional["GovernmentDepartment"]] = relationship("GovernmentDepartment", back_populates="tenders")
    bids: Mapped[List["Bid"]] = relationship("Bid", back_populates="tender", cascade="all, delete-orphan")
