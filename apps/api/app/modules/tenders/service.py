from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc
import numpy as np

from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import Company
from app.modules.risk.models import RiskSignal, Evidence
from app.modules.tenders.schemas import (
    TenderOut,
    BidSummaryOut,
    Tender360Out,
)


class TenderService:
    """Service layer for tenders and Tender 360 dossiers."""

    @classmethod
    def list_tenders(
        cls, 
        db: Session, 
        organization_id: str = "default",
        status: Optional[str] = None,
        category: Optional[str] = None,
        risk_level: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[TenderOut]:
        """List tenders with optional filtering and search."""
        query = select(Tender).filter(Tender.organization_id == organization_id)

        if status:
            query = query.filter(Tender.status == status)
        if category:
            query = query.filter(Tender.category == category)
        if risk_level:
            query = query.filter(Tender.risk_level == risk_level)
        if search:
            s = f"%{search.lower()}%"
            query = query.filter((Tender.title.ilike(s)) | (Tender.tender_ref.ilike(s)))

        query = query.order_by(desc(Tender.risk_score), desc(Tender.created_at))
        tenders = db.execute(query).scalars().all()

        results: List[TenderOut] = []
        for t in tenders:
            bidders_count = db.execute(
                select(func.count(Bid.id)).filter(Bid.organization_id == organization_id, Bid.tender_id == t.id)
            ).scalar() or 0
            results.append(
                TenderOut(
                    id=t.id,
                    tender_ref=t.tender_ref,
                    title=t.title,
                    authority=t.authority,
                    estimated_value=t.estimated_value,
                    category=t.category,
                    status=t.status,
                    publication_date=t.publication_date,
                    closing_date=t.closing_date,
                    risk_score=t.risk_score,
                    risk_level=t.risk_level,
                    signal_count=t.signal_count,
                    bidders_count=bidders_count,
                )
            )

        return results

    @classmethod
    def get_tender_360(
        cls, 
        db: Session, 
        identifier: str, 
        organization_id: str = "default"
    ) -> Optional[Tender360Out]:
        """Fetch complete Tender 360 dossier with bids, statistical variance, and risk signals."""
        tender = db.execute(
            select(Tender).filter(
                Tender.organization_id == organization_id,
                (Tender.id == identifier) | (Tender.tender_ref == identifier)
            )
        ).scalar_one_or_none()

        if not tender:
            return None

        # Fetch bids
        bids = db.execute(
            select(Bid).filter(Bid.organization_id == organization_id, Bid.tender_id == tender.id)
        ).scalars().all()

        amounts = [b.amount for b in bids if b.amount > 0]
        mean_amt = float(np.mean(amounts)) if amounts else 0.0
        min_amt = float(np.min(amounts)) if amounts else 0.0
        max_amt = float(np.max(amounts)) if amounts else 0.0
        std_amt = float(np.std(amounts)) if len(amounts) > 1 else 0.0
        cv_pct = round((std_amt / mean_amt) * 100, 2) if mean_amt > 0 else 0.0
        spread_pct = round(((max_amt - min_amt) / min_amt) * 100, 2) if min_amt > 0 else 0.0

        bids_out: List[BidSummaryOut] = []
        for b in bids:
            comp = db.execute(select(Company).filter(Company.id == b.company_id)).scalar_one_or_none()
            var_pct = round(((b.amount - mean_amt) / mean_amt) * 100, 2) if mean_amt > 0 else 0.0
            bids_out.append(
                BidSummaryOut(
                    id=b.id,
                    company_id=b.company_id,
                    company_name=comp.legal_name if comp else "Unknown",
                    amount=b.amount,
                    status=b.status,
                    submitted_at=b.submitted_at,
                    variance_pct=var_pct,
                )
            )

        # Sort bids ascending by amount
        bids_out.sort(key=lambda x: x.amount)

        # Fetch signals & evidence
        signals = db.execute(
            select(RiskSignal).filter(RiskSignal.organization_id == organization_id, RiskSignal.tender_id == tender.id)
        ).scalars().all()

        signals_out: List[Dict[str, Any]] = []
        for s in signals:
            ev_items = db.execute(select(Evidence).filter(Evidence.signal_id == s.id)).scalars().all()
            signals_out.append({
                "id": s.id,
                "detector_code": s.detector_code,
                "title": s.title,
                "severity": s.severity,
                "confidence": s.confidence,
                "score_contribution": s.score_contribution,
                "description": s.description,
                "explanation": s.explanation,
                "evidence": [
                    {
                        "id": e.id,
                        "source_type": e.source_type,
                        "summary": e.summary,
                        "data_payload": e.data_payload,
                    }
                    for e in ev_items
                ],
            })

        metrics = {
            "mean_bid": round(mean_amt, 2),
            "min_bid": round(min_amt, 2),
            "max_bid": round(max_amt, 2),
            "spread_pct": spread_pct,
            "cv_pct": cv_pct,
            "estimated_value": tender.estimated_value,
            "variance_to_estimate_pct": round(((mean_amt - tender.estimated_value) / tender.estimated_value) * 100, 2) if tender.estimated_value > 0 else 0.0,
        }

        tender_out = TenderOut(
            id=tender.id,
            tender_ref=tender.tender_ref,
            title=tender.title,
            authority=tender.authority,
            estimated_value=tender.estimated_value,
            category=tender.category,
            status=tender.status,
            publication_date=tender.publication_date,
            closing_date=tender.closing_date,
            risk_score=tender.risk_score,
            risk_level=tender.risk_level,
            signal_count=tender.signal_count,
            bidders_count=len(bids),
        )

        return Tender360Out(
            tender=tender_out,
            bids=bids_out,
            signals=signals_out,
            metrics=metrics,
        )
