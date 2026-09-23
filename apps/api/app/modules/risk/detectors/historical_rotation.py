from typing import List, Dict
from sqlalchemy.orm import Session

from app.modules.risk.detectors.base import BaseDetector, DetectedSignalData
from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import Company


class HistoricalWinnerPatternDetector(BaseDetector):
    """Detects systematic alternating win/loss patterns (bid rotation) across tenders."""

    @property
    def detector_code(self) -> str:
        return "HISTORICAL_ROTATION"

    @property
    def base_weight(self) -> int:
        return 25

    def analyze(
        self,
        tender: Tender,
        bids: List[Bid],
        db: Session,
        organization_id: str,
    ) -> List[DetectedSignalData]:
        # Find current winner and runner-up/competitors
        current_winner = next((b for b in bids if b.status.lower() in ("awarded", "won")), None)
        if not current_winner:
            return []

        competing_bids = [b for b in bids if b.id != current_winner.id and b.company_id]
        competing_company_ids = [b.company_id for b in competing_bids]
        if not competing_company_ids:
            return []

        # Look for other tenders in the same org where one of these competitors won and the current winner also bid
        historical_wins = db.query(Bid).join(Tender, Bid.tender_id == Tender.id).filter(
            Bid.organization_id == organization_id,
            Bid.tender_id != tender.id,
            Bid.company_id.in_(competing_company_ids),
            Bid.status.in_(["Awarded", "Won"]),
        ).all()

        rotation_evidence = []
        for past_win in historical_wins:
            # Check if current winner also submitted a bid in that past tender
            rival_bid = db.query(Bid).filter(
                Bid.tender_id == past_win.tender_id,
                Bid.company_id == current_winner.company_id,
            ).first()

            if rival_bid:
                past_tender = db.query(Tender).filter(Tender.id == past_win.tender_id).first()
                past_ref = past_tender.tender_ref if past_tender else past_win.tender_id
                winner_comp = db.query(Company).filter(Company.id == past_win.company_id).first()
                current_comp = db.query(Company).filter(Company.id == current_winner.company_id).first()

                rotation_evidence.append({
                    "past_tender_ref": past_ref,
                    "past_winner": winner_comp.legal_name if winner_comp else past_win.company_id,
                    "past_competitor": current_comp.legal_name if current_comp else current_winner.company_id,
                    "current_tender_ref": tender.tender_ref,
                    "current_winner": current_comp.legal_name if current_comp else current_winner.company_id,
                })

        if not rotation_evidence:
            return []

        past_winner_names = list(set(e["past_winner"] for e in rotation_evidence))
        current_winner_name = db.query(Company).filter(Company.id == current_winner.company_id).first()
        c_name = current_winner_name.legal_name if current_winner_name else current_winner.company_id

        return [
            DetectedSignalData(
                detector_code=self.detector_code,
                title="Bid Rotation Pattern",
                severity="high",
                confidence=0.82,
                description=f"Winning bidder ({c_name}) alternates awards sequentially with competitor(s): {', '.join(past_winner_names)}.",
                explanation="Award history exhibits alternating winner patterns across related public contracts. Potential coordination pattern requiring human review.",
                source="Historical procurement awards",
                records_count=len(rotation_evidence) + 1,
                evidence_payload={
                    "current_winner": c_name,
                    "rotation_events": rotation_evidence,
                },
            )
        ]
