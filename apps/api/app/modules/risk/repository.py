from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.modules.risk.models import RiskSignal, Evidence


class RiskRepository:
    """Repository handling persistence and queries for risk signals and evidence."""

    @staticmethod
    def get_signals_by_tender(db: Session, tender_id: str) -> List[RiskSignal]:
        return db.query(RiskSignal).options(
            joinedload(RiskSignal.evidence_items)
        ).filter(
            RiskSignal.tender_id == tender_id
        ).all()

    @staticmethod
    def list_all_signals(
        db: Session,
        organization_id: str,
        severity: Optional[str] = None,
        limit: int = 100,
    ) -> List[RiskSignal]:
        query = db.query(RiskSignal).options(
            joinedload(RiskSignal.evidence_items)
        ).filter(
            RiskSignal.organization_id == organization_id
        )
        if severity:
            query = query.filter(RiskSignal.severity == severity.lower())
        return query.order_by(RiskSignal.created_at.desc()).limit(limit).all()

    @staticmethod
    def clear_tender_signals(db: Session, tender_id: str):
        """Clears previously generated signals for a tender prior to re-screening."""
        db.query(RiskSignal).filter(RiskSignal.tender_id == tender_id).delete()
        db.flush()
