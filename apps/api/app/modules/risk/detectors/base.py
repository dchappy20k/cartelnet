from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid


class DetectedSignalData(BaseModel):
    """Normalized payload emitted by a deterministic risk detector."""
    detector_code: str
    title: str
    severity: str  # low, medium, high, critical
    confidence: float  # 0.0 to 1.0
    description: str
    explanation: str
    source: str
    records_count: int
    evidence_payload: Optional[Dict[str, Any]] = None


class BaseDetector(ABC):
    """Abstract base class for deterministic risk detectors."""

    @property
    @abstractmethod
    def detector_code(self) -> str:
        """Unique code identifying the detector (e.g. PRICE_CLUSTERING)."""
        pass

    @property
    @abstractmethod
    def base_weight(self) -> int:
        """Default score contribution weight."""
        pass

    @abstractmethod
    def analyze(
        self,
        tender: Tender,
        bids: List[Bid],
        db: Session,
        organization_id: str,
    ) -> List[DetectedSignalData]:
        """Executes deterministic risk analysis. Must NEVER declare guilt or cartelization."""
        pass
