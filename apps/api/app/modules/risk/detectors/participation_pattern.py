from typing import List, Dict, Set
from collections import defaultdict
from itertools import combinations
from sqlalchemy.orm import Session

from app.modules.risk.detectors.base import BaseDetector, DetectedSignalData
from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import Company


class RepeatedParticipationDetector(BaseDetector):
    """Detects pairs or cliques of bidders with unusually high historical co-participation."""

    @property
    def detector_code(self) -> str:
        return "REPEATED_PARTICIPATION"

    @property
    def base_weight(self) -> int:
        return 15

    def analyze(
        self,
        tender: Tender,
        bids: List[Bid],
        db: Session,
        organization_id: str,
    ) -> List[DetectedSignalData]:
        company_ids = [b.company_id for b in bids if b.company_id]
        if len(set(company_ids)) < 2:
            return []

        # Find other tenders where these companies co-bid
        other_bids = db.query(Bid.tender_id, Bid.company_id).filter(
            Bid.organization_id == organization_id,
            Bid.company_id.in_(company_ids),
            Bid.tender_id != tender.id,
        ).all()

        tender_to_companies: Dict[str, Set[str]] = defaultdict(set)
        for t_id, c_id in other_bids:
            tender_to_companies[t_id].add(c_id)

        # Count pair co-occurrences
        pair_counts: Dict[tuple, List[str]] = defaultdict(list)
        for t_id, c_set in tender_to_companies.items():
            if len(c_set) >= 2:
                for p1, p2 in combinations(sorted(c_set), 2):
                    pair_counts[(p1, p2)].append(t_id)

        signals = []
        for (c1, c2), t_ids in pair_counts.items():
            # If they co-bid in 2 or more other tenders
            if len(t_ids) >= 2:
                comp1 = db.query(Company).filter(Company.id == c1).first()
                comp2 = db.query(Company).filter(Company.id == c2).first()
                name1 = comp1.legal_name if comp1 else c1
                name2 = comp2.legal_name if comp2 else c2

                tenders_involved = db.query(Tender.tender_ref).filter(Tender.id.in_(t_ids)).all()
                refs = [t[0] for t in tenders_involved]

                signals.append(
                    DetectedSignalData(
                        detector_code=self.detector_code,
                        title="Repeated Co-Participation Pattern",
                        severity="medium",
                        confidence=0.76,
                        description=f"Bidders {name1} and {name2} repeatedly co-bid together across {len(refs) + 1} tenders.",
                        explanation="Unusually frequent co-participation across multiple tenders in the same regional market. Potential coordination pattern requiring human review.",
                        source="Historical procurement awards",
                        records_count=len(refs) + 1,
                        evidence_payload={
                            "bidders": [name1, name2],
                            "historical_tenders": refs,
                            "co_bid_count": len(refs) + 1,
                        },
                    )
                )

        return signals
