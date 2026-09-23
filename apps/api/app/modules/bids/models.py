from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.db.base import TenantAwareModel


class Bid(TenantAwareModel):
    """Bid submission for a tender by a participating company."""
    __tablename__ = "bids"

    tender_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenders.id", ondelete="CASCADE"), index=True, nullable=False)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Submitted", nullable=False)  # Awarded, Runner-up, Rejected, Withdrawn, Submitted
    submitted_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    tender: Mapped["Tender"] = relationship("Tender", back_populates="bids")
    company: Mapped["Company"] = relationship("Company")
