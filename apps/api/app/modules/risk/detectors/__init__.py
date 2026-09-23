from app.modules.risk.detectors.base import BaseDetector, DetectedSignalData
from app.modules.risk.detectors.price_clustering import PriceClusteringDetector
from app.modules.risk.detectors.shared_director import SharedDirectorDetector
from app.modules.risk.detectors.shared_address import SharedAddressDetector
from app.modules.risk.detectors.participation_pattern import RepeatedParticipationDetector
from app.modules.risk.detectors.historical_rotation import HistoricalWinnerPatternDetector

ALL_DETECTORS = [
    PriceClusteringDetector(),
    SharedDirectorDetector(),
    SharedAddressDetector(),
    RepeatedParticipationDetector(),
    HistoricalWinnerPatternDetector(),
]

__all__ = [
    "BaseDetector",
    "DetectedSignalData",
    "PriceClusteringDetector",
    "SharedDirectorDetector",
    "SharedAddressDetector",
    "RepeatedParticipationDetector",
    "HistoricalWinnerPatternDetector",
    "ALL_DETECTORS",
]
