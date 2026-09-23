from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional

from app.db.base import TenantAwareModel
from app.modules.tenders.models import Tender


class Investigation(TenantAwareModel):
    """Investigation case record."""
    __tablename__ = "investigations"

    tender_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("tenders.id", ondelete="SET NULL"), nullable=True)
    case_ref: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="Medium", nullable=False)  # High, Medium, Low, Critical
    status: Mapped[str] = mapped_column(String(50), default="Open", nullable=False)  # Under Review, Open, Escalated, Closed
    investigator: Mapped[str] = mapped_column(String(255), default="Unassigned", nullable=False)
    entities_count: Mapped[int] = mapped_column(default=0, nullable=False)
    signals_count: Mapped[int] = mapped_column(default=0, nullable=False)

    tender: Mapped[Optional["Tender"]] = relationship("Tender")
    notes: Mapped[List["InvestigationNote"]] = relationship("InvestigationNote", back_populates="investigation", cascade="all, delete-orphan", order_by="desc(InvestigationNote.created_at)")


class InvestigationNote(TenantAwareModel):
    """Timestamped case note logged by an investigator."""
    __tablename__ = "investigation_notes"

    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), index=True, nullable=False)
    author_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    author_name: Mapped[str] = mapped_column(String(255), default="System", nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="notes")
