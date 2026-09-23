from typing import List, Dict, Set
from collections import defaultdict
from sqlalchemy.orm import Session

from app.modules.risk.detectors.base import BaseDetector, DetectedSignalData
from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import Company, Address


class SharedAddressDetector(BaseDetector):
    """Detects competing bidding entities registered at the same physical address."""

    @property
    def detector_code(self) -> str:
        return "SHARED_ADDRESS"

    @property
    def base_weight(self) -> int:
        return 20

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

        companies = db.query(Company).filter(
            Company.id.in_(company_ids),
            Company.address_id.isnot(None),
        ).all()

        addr_to_companies: Dict[str, List[Company]] = defaultdict(list)
        for comp in companies:
            if comp.address_id:
                addr_to_companies[comp.address_id].append(comp)

        signals = []
        for addr_id, comp_list in addr_to_companies.items():
            if len(comp_list) >= 2:
                address = db.query(Address).filter(Address.id == addr_id).first()
                addr_text = address.raw_address if address else "Registered Address"
                names = [c.legal_name for c in comp_list]

                signals.append(
                    DetectedSignalData(
                        detector_code=self.detector_code,
                        title="Shared Registered Address",
                        severity="medium" if len(comp_list) == 2 else "high",
                        confidence=0.86,
                        description=f"Multiple bidding entities ({', '.join(names)}) are registered at the same physical office: {addr_text}.",
                        explanation="Competing bidding entities share the same registered physical address. Potential coordination pattern requiring human review.",
                        source="Corporate registry",
                        records_count=len(comp_list),
                        evidence_payload={
                            "address": addr_text,
                            "companies_involved": names,
                            "company_ids": [c.id for c in comp_list],
                        },
                    )
                )

        return signals
