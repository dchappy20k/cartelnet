from typing import List, Optional
from sqlalchemy.orm import Session, joinedload

from app.modules.risk.detectors import ALL_DETECTORS, DetectedSignalData
from app.modules.risk.scoring import RiskScoringEngine
from app.modules.risk.models import RiskSignal, Evidence
from app.modules.risk.repository import RiskRepository
from app.modules.risk.schemas import TenderScreeningResult, RiskSignalOut, EvidenceOut, RuleDefinition
from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.core.errors import EntityNotFoundException


class RiskService:
    """Orchestrates deterministic detector execution, scoring, and evidence persistence."""

    @classmethod
    def get_rules(cls) -> List[RuleDefinition]:
        return [
            RuleDefinition(
                code=d.detector_code,
                name=d.detector_code.replace("_", " ").title(),
                base_weight=d.base_weight,
                description=d.__doc__ or "Deterministic risk detector.",
            )
            for d in ALL_DETECTORS
        ]

    @classmethod
    def screen_tender(
        cls,
        tender_id: str,
        organization_id: str,
        db: Session,
    ) -> TenderScreeningResult:
        """Executes all deterministic detectors against a tender and updates risk scores."""
        tender = db.query(Tender).filter(
            Tender.id == tender_id,
            Tender.organization_id == organization_id,
        ).first()

        if not tender:
            # Fallback by tender_ref if ID lookup didn't match
            tender = db.query(Tender).filter(
                Tender.tender_ref == tender_id,
                Tender.organization_id == organization_id,
            ).first()

        if not tender:
            raise EntityNotFoundException("Tender", tender_id)

        # Load bids with linked company
        bids = db.query(Bid).options(joinedload(Bid.company)).filter(
            Bid.tender_id == tender.id
        ).all()

        # Run all active detectors
        all_signals: List[DetectedSignalData] = []
        for detector in ALL_DETECTORS:
            detected = detector.analyze(tender=tender, bids=bids, db=db, organization_id=organization_id)
            all_signals.extend(detected)

        # Calculate composite screening score
        score, risk_level, contributions = RiskScoringEngine.calculate_score(all_signals)

        # Update Tender record
        tender.risk_score = score
        tender.risk_level = risk_level
        tender.signal_count = len(all_signals)

        # Clear prior signals
        RiskRepository.clear_tender_signals(db, tender.id)

        # Persist new signals and evidence items
        persisted_signals = []
        for s_data, contrib in zip(all_signals, contributions):
            signal_record = RiskSignal(
                organization_id=organization_id,
                tender_id=tender.id,
                detector_code=s_data.detector_code,
                title=s_data.title,
                severity=s_data.severity,
                confidence=s_data.confidence,
                score_contribution=contrib,
                description=s_data.description,
                explanation=s_data.explanation,
                source=s_data.source,
                records_count=s_data.records_count,
            )
            db.add(signal_record)
            db.flush()

            if s_data.evidence_payload:
                evidence_record = Evidence(
                    organization_id=organization_id,
                    signal_id=signal_record.id,
                    source_type=s_data.source,
                    summary=f"Evidence supporting {s_data.title}",
                    data_payload=s_data.evidence_payload,
                )
                db.add(evidence_record)

            persisted_signals.append(signal_record)

        db.commit()

        # Build explainable summary
        summary = (
            f"Screening complete: {len(all_signals)} risk signal(s) detected. "
            f"Composite risk score: {score}/100 ({risk_level.upper()}). "
            "Requires human review — not a determination of wrongdoing."
        )

        # Map to output schema
        signals_out = [
            RiskSignalOut(
                id=s.id,
                tender_id=s.tender_id,
                detector_code=s.detector_code,
                title=s.title,
                severity=s.severity,
                confidence=s.confidence,
                score_contribution=s.score_contribution,
                description=s.description,
                explanation=s.explanation,
                source=s.source,
                records_count=s.records_count,
                created_at=s.created_at,
                evidence_items=[
                    EvidenceOut(
                        id=e.id,
                        source_type=e.source_type,
                        summary=e.summary,
                        data_payload=e.data_payload,
                    )
                    for e in s.evidence_items
                ],
            )
            for s in persisted_signals
        ]

        return TenderScreeningResult(
            tender_id=tender.id,
            tender_ref=tender.tender_ref,
            risk_score=score,
            risk_level=risk_level,
            signals_count=len(all_signals),
            signals=signals_out,
            summary=summary,
        )

    @classmethod
    def screen_all_tenders(cls, organization_id: str, db: Session) -> List[TenderScreeningResult]:
        tenders = db.query(Tender).filter(Tender.organization_id == organization_id).all()
        results = []
        for t in tenders:
            results.append(cls.screen_tender(tender_id=t.id, organization_id=organization_id, db=db))
        return results

    @classmethod
    def list_signals(
        cls,
        organization_id: str,
        severity: Optional[str],
        db: Session,
    ) -> List[RiskSignalOut]:
        signals = RiskRepository.list_all_signals(db, organization_id=organization_id, severity=severity)
        return [
            RiskSignalOut(
                id=s.id,
                tender_id=s.tender_id,
                detector_code=s.detector_code,
                title=s.title,
                severity=s.severity,
                confidence=s.confidence,
                score_contribution=s.score_contribution,
                description=s.description,
                explanation=s.explanation,
                source=s.source,
                records_count=s.records_count,
                created_at=s.created_at,
                evidence_items=[
                    EvidenceOut(
                        id=e.id,
                        source_type=e.source_type,
                        summary=e.summary,
                        data_payload=e.data_payload,
                    )
                    for e in s.evidence_items
                ],
            )
            for s in signals
        ]
