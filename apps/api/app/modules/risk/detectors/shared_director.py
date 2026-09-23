from typing import List, Dict, Set
from collections import defaultdict
from sqlalchemy.orm import Session

from app.modules.risk.detectors.base import BaseDetector, DetectedSignalData
from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import CompanyDirector, Director, Company


class SharedDirectorDetector(BaseDetector):
    """Detects competing bidding entities that share one or more directors."""

    @property
    def detector_code(self) -> str:
        return "SHARED_DIRECTORS"

    @property
    def base_weight(self) -> int:
        return 35

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

        # Map director_id -> set of company_ids in this tender
        director_links = db.query(CompanyDirector, Director).join(
            Director, CompanyDirector.director_id == Director.id
        ).filter(
            CompanyDirector.company_id.in_(company_ids)
        ).all()

        director_to_companies: Dict[str, Set[str]] = defaultdict(set)
        director_to_name: Dict[str, str] = {}
        for link, director in director_links:
            director_to_companies[director.id].add(link.company_id)
            director_to_name[director.id] = director.full_name

        signals = []
        for dir_id, comp_ids in director_to_companies.items():
            if len(comp_ids) >= 2:
                # Shared director between 2+ competing bidders!
                companies = db.query(Company).filter(Company.id.in_(list(comp_ids))).all()
                company_names = [c.legal_name for c in companies]
                dir_name = director_to_name.get(dir_id, "Unknown Director")

                signals.append(
                    DetectedSignalData(
                        detector_code=self.detector_code,
                        title="Shared Directorship Pattern",
                        severity="critical",
                        confidence=0.92,
                        description=f"Two competing bidders ({', '.join(company_names)}) share a common director record: {dir_name}.",
                        explanation="Competing bidding entities share an active director record within corporate registry filings. Potential structural coordination pattern requiring human review.",
                        source="Corporate registry",
                        records_count=len(comp_ids),
                        evidence_payload={
                            "director_name": dir_name,
                            "director_id": dir_id,
                            "companies_involved": company_names,
                            "company_ids": list(comp_ids),
                        },
                    )
                )

        return signals
