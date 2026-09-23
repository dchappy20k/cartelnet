import numpy as np
from typing import List
from sqlalchemy.orm import Session

from app.modules.risk.detectors.base import BaseDetector, DetectedSignalData
from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid


class PriceClusteringDetector(BaseDetector):
    """Detects unusually narrow price separation among submitted bids."""

    @property
    def detector_code(self) -> str:
        return "PRICE_CLUSTERING"

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
        valid_bids = [b for b in bids if b.amount and b.amount > 0]
        if len(valid_bids) < 2:
            return []

        amounts = [b.amount for b in valid_bids]
        mean_val = float(np.mean(amounts))
        std_val = float(np.std(amounts))
        
        cv = (std_val / mean_val) if mean_val > 0 else 1.0
        min_amount = min(amounts)
        max_amount = max(amounts)
        spread_pct = ((max_amount - min_amount) / min_amount * 100) if min_amount > 0 else 100.0

        # Thresholds: CV <= 2.5% or spread <= 3.5%
        if cv > 0.025 and spread_pct > 3.5:
            return []

        if cv <= 0.012 or spread_pct <= 1.8:
            severity = "high"
            confidence = 0.88
        elif cv <= 0.006 or spread_pct <= 0.9:
            severity = "critical"
            confidence = 0.94
        else:
            severity = "medium"
            confidence = 0.72

        bids_detail = [
            {
                "bidder": b.company.legal_name if b.company else b.company_id,
                "amount": b.amount,
                "status": b.status,
            }
            for b in valid_bids
        ]

        return [
            DetectedSignalData(
                detector_code=self.detector_code,
                title="Price Clustering Pattern",
                severity=severity,
                confidence=confidence,
                description=f"{len(valid_bids)} submitted bids exhibit narrow price variance ({spread_pct:.2f}% total spread, CV={cv*100:.2f}%).",
                explanation="Unusually tight price separation relative to typical competitive variance observed in similar commercial tenders. Potential coordination pattern requiring human review.",
                source="Bid submission records",
                records_count=len(valid_bids),
                evidence_payload={
                    "bids_count": len(valid_bids),
                    "mean_bid": round(mean_val, 2),
                    "std_dev": round(std_val, 2),
                    "cv_percent": round(cv * 100, 2),
                    "spread_percent": round(spread_pct, 2),
                    "bids": bids_detail,
                },
            )
        ]
