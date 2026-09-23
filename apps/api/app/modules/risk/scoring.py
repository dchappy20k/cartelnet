from typing import List, Tuple
from app.modules.risk.detectors.base import DetectedSignalData

SEVERITY_MULTIPLIERS = {
    "critical": 1.25,
    "high": 1.0,
    "medium": 0.75,
    "low": 0.5,
}

DETECTOR_WEIGHTS = {
    "PRICE_CLUSTERING": 25,
    "SHARED_DIRECTORS": 35,
    "SHARED_ADDRESS": 20,
    "HISTORICAL_ROTATION": 25,
    "REPEATED_PARTICIPATION": 15,
}


class RiskScoringEngine:
    """Calculates explainable composite risk scores and assigns severity bands."""

    @classmethod
    def calculate_score(cls, signals: List[DetectedSignalData]) -> Tuple[int, str, List[int]]:
        """
        Returns:
            (total_score, risk_level, contributions)
        """
        if not signals:
            return 0, "low", []

        contributions = []
        for s in signals:
            weight = DETECTOR_WEIGHTS.get(s.detector_code, 20)
            sev_mult = SEVERITY_MULTIPLIERS.get(s.severity.lower(), 1.0)
            contrib = int(round(weight * s.confidence * sev_mult))
            contributions.append(contrib)

        total_score = min(100, sum(contributions))

        if total_score >= 85:
            level = "critical"
        elif total_score >= 60:
            level = "high"
        elif total_score >= 30:
            level = "medium"
        else:
            level = "low"

        return total_score, level, contributions
