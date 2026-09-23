from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.modules.investigations.models import Investigation, InvestigationNote
from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import Company
from app.modules.risk.models import RiskSignal, Evidence
from app.modules.investigations.schemas import (
    InvestigationCreate,
    InvestigationUpdate,
    InvestigationOut,
    InvestigationDetailOut,
    InvestigationNoteCreate,
    InvestigationNoteOut,
)


class InvestigationService:
    """Service layer for managing procurement fraud investigation cases and audit logs."""

    @classmethod
    def create_investigation(
        cls, 
        db: Session, 
        data: InvestigationCreate, 
        organization_id: str = "default"
    ) -> InvestigationOut:
        """Create a new investigation case linked to a flagged tender or supplier cluster."""
        count_query = select(func.count(Investigation.id)).filter(Investigation.organization_id == organization_id)
        current_count = db.execute(count_query).scalar() or 0
        case_ref = f"CASE-2026-{current_count + 1:03d}"

        tender = None
        tender_id = None
        entities_count = 0
        signals_count = 0

        if data.tender_id:
            tender = db.execute(
                select(Tender).filter(
                    Tender.organization_id == organization_id,
                    (Tender.id == data.tender_id) | (Tender.tender_ref == data.tender_id)
                )
            ).scalar_one_or_none()

            if tender:
                tender_id = tender.id
                signals_count = tender.signal_count
                bids_count_query = select(func.count(Bid.id)).filter(
                    Bid.organization_id == organization_id, 
                    Bid.tender_id == tender.id
                )
                entities_count = db.execute(bids_count_query).scalar() or 0

        investigation = Investigation(
            organization_id=organization_id,
            case_ref=case_ref,
            title=data.title,
            priority=data.priority,
            status="Open",
            investigator=data.investigator or "Unassigned",
            tender_id=tender_id,
            entities_count=entities_count,
            signals_count=signals_count,
        )
        db.add(investigation)
        db.flush()

        # Add initial audit note if provided
        if data.initial_note:
            note = InvestigationNote(
                organization_id=organization_id,
                investigation_id=investigation.id,
                author_name=data.investigator if data.investigator and data.investigator != "Unassigned" else "System",
                content=data.initial_note,
            )
            db.add(note)
            db.flush()

        db.commit()
        db.refresh(investigation)

        return cls._format_out(investigation, tender)

    @classmethod
    def list_investigations(
        cls, 
        db: Session, 
        organization_id: str = "default",
        status: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> List[InvestigationOut]:
        """List all investigation cases for an organization with optional filtering."""
        query = (
            select(Investigation)
            .filter(Investigation.organization_id == organization_id)
            .order_by(desc(Investigation.created_at))
        )
        if status:
            query = query.filter(Investigation.status == status)
        if priority:
            query = query.filter(Investigation.priority == priority)

        investigations = db.execute(query).scalars().all()
        return [cls._format_out(inv, inv.tender) for inv in investigations]

    @classmethod
    def get_investigation_detail(
        cls, 
        db: Session, 
        identifier: str, 
        organization_id: str = "default"
    ) -> Optional[InvestigationDetailOut]:
        """Fetch 360-degree case details including linked tenders, bids, signals, and notes."""
        investigation = db.execute(
            select(Investigation).filter(
                Investigation.organization_id == organization_id,
                (Investigation.id == identifier) | (Investigation.case_ref == identifier)
            )
        ).scalar_one_or_none()

        if not investigation:
            return None

        tender = investigation.tender
        bidders_list: List[Dict[str, Any]] = []
        signals_list: List[Dict[str, Any]] = []

        if tender:
            # Query bidders
            bids = db.execute(
                select(Bid).filter(Bid.organization_id == organization_id, Bid.tender_id == tender.id)
            ).scalars().all()
            for b in bids:
                company = db.execute(select(Company).filter(Company.id == b.company_id)).scalar_one_or_none()
                bidders_list.append({
                    "bid_id": b.id,
                    "company_id": b.company_id,
                    "company_name": company.legal_name if company else "Unknown",
                    "amount": b.amount,
                    "status": b.status,
                    "submitted_at": b.submitted_at,
                })

            # Query signals and evidence
            signals = db.execute(
                select(RiskSignal).filter(RiskSignal.organization_id == organization_id, RiskSignal.tender_id == tender.id)
            ).scalars().all()
            for s in signals:
                evidence_items = db.execute(
                    select(Evidence).filter(Evidence.signal_id == s.id)
                ).scalars().all()
                signals_list.append({
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
                        for e in evidence_items
                    ],
                })

        notes_out = [
            InvestigationNoteOut(
                id=n.id,
                investigation_id=n.investigation_id,
                author_id=n.author_id,
                author_name=n.author_name,
                content=n.content,
                created_at=n.created_at,
            )
            for n in investigation.notes
        ]

        return InvestigationDetailOut(
            id=investigation.id,
            case_ref=investigation.case_ref,
            title=investigation.title,
            priority=investigation.priority,
            status=investigation.status,
            investigator=investigation.investigator,
            tender_id=investigation.tender_id,
            tender_ref=tender.tender_ref if tender else None,
            entities_count=len(bidders_list) if bidders_list else investigation.entities_count,
            signals_count=len(signals_list) if signals_list else investigation.signals_count,
            created_at=investigation.created_at,
            updated_at=investigation.updated_at,
            notes=notes_out,
            tender_title=tender.title if tender else None,
            tender_authority=tender.authority if tender else None,
            tender_value=tender.estimated_value if tender else None,
            tender_risk_score=tender.risk_score if tender else None,
            bidders=bidders_list,
            signals=signals_list,
        )

    @classmethod
    def update_investigation(
        cls, 
        db: Session, 
        identifier: str, 
        data: InvestigationUpdate, 
        organization_id: str = "default"
    ) -> Optional[InvestigationOut]:
        """Update case status, priority, or assigned investigator, logging audit notes on status change."""
        investigation = db.execute(
            select(Investigation).filter(
                Investigation.organization_id == organization_id,
                (Investigation.id == identifier) | (Investigation.case_ref == identifier)
            )
        ).scalar_one_or_none()

        if not investigation:
            return None

        old_status = investigation.status

        if data.title is not None:
            investigation.title = data.title
        if data.priority is not None:
            investigation.priority = data.priority
        if data.investigator is not None:
            investigation.investigator = data.investigator
        if data.status is not None:
            investigation.status = data.status

        # If status changed, auto-log audit note
        if data.status is not None and data.status != old_status:
            audit_msg = f"Status changed from '{old_status}' to '{data.status}'"
            if data.note:
                audit_msg += f". Note: {data.note}"
            note = InvestigationNote(
                organization_id=organization_id,
                investigation_id=investigation.id,
                author_name="System Audit",
                content=audit_msg,
            )
            db.add(note)
        elif data.note:
            note = InvestigationNote(
                organization_id=organization_id,
                investigation_id=investigation.id,
                author_name=investigation.investigator or "Investigator",
                content=data.note,
            )
            db.add(note)

        db.commit()
        db.refresh(investigation)

        return cls._format_out(investigation, investigation.tender)

    @classmethod
    def add_note(
        cls, 
        db: Session, 
        identifier: str, 
        data: InvestigationNoteCreate, 
        organization_id: str = "default"
    ) -> Optional[InvestigationNoteOut]:
        """Add a timestamped observation or evidence note to the case file."""
        investigation = db.execute(
            select(Investigation).filter(
                Investigation.organization_id == organization_id,
                (Investigation.id == identifier) | (Investigation.case_ref == identifier)
            )
        ).scalar_one_or_none()

        if not investigation:
            return None

        note = InvestigationNote(
            organization_id=organization_id,
            investigation_id=investigation.id,
            author_id=data.author_id,
            author_name=data.author_name or investigation.investigator or "Investigator",
            content=data.content,
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        return InvestigationNoteOut(
            id=note.id,
            investigation_id=note.investigation_id,
            author_id=note.author_id,
            author_name=note.author_name,
            content=note.content,
            created_at=note.created_at,
        )

    @classmethod
    def _format_out(cls, inv: Investigation, tender: Optional[Tender] = None) -> InvestigationOut:
        notes_out = [
            InvestigationNoteOut(
                id=n.id,
                investigation_id=n.investigation_id,
                author_id=n.author_id,
                author_name=n.author_name,
                content=n.content,
                created_at=n.created_at,
            )
            for n in inv.notes
        ]
        return InvestigationOut(
            id=inv.id,
            case_ref=inv.case_ref,
            title=inv.title,
            priority=inv.priority,
            status=inv.status,
            investigator=inv.investigator,
            tender_id=inv.tender_id,
            tender_ref=tender.tender_ref if tender else None,
            entities_count=inv.entities_count,
            signals_count=inv.signals_count,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
            notes=notes_out,
        )
