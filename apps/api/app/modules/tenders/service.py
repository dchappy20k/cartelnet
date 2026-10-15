from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc
import numpy as np

from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.companies.models import Company, Director, CompanyDirector, Address
from app.modules.government_uploads.models import GovernmentDepartment
from app.modules.risk.models import RiskSignal, Evidence
from app.modules.ingestion.normalization import (
    normalize_company_name,
    normalize_director_name,
    normalize_address,
)
from app.modules.tenders.schemas import (
    TenderOut,
    BidSummaryOut,
    Tender360Out,
    PublishTenderRequest,
    BidderInput,
    TenderManagementUpdate,
    TenderProjectStatusOut,
)


class TenderService:
    """Service layer for tenders and Tender 360 dossiers."""

    @classmethod
    def list_tenders(
        cls, 
        db: Session, 
        organization_id: str = "default",
        status: Optional[str] = None,
        category: Optional[str] = None,
        risk_level: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[TenderOut]:
        """List tenders with optional filtering and search."""
        query = select(Tender).filter(Tender.organization_id == organization_id)

        if status:
            query = query.filter(Tender.status == status)
        if category:
            query = query.filter(Tender.category == category)
        if risk_level:
            query = query.filter(Tender.risk_level == risk_level)
        if search:
            s = f"%{search.lower()}%"
            query = query.filter((Tender.title.ilike(s)) | (Tender.tender_ref.ilike(s)))

        query = query.order_by(desc(Tender.risk_score), desc(Tender.created_at))
        tenders = db.execute(query).scalars().all()

        results: List[TenderOut] = []
        for t in tenders:
            bidders_count = db.execute(
                select(func.count(Bid.id)).filter(Bid.organization_id == organization_id, Bid.tender_id == t.id)
            ).scalar() or 0
            results.append(
                TenderOut(
                    id=t.id,
                    tender_ref=t.tender_ref,
                    title=t.title,
                    authority=t.authority,
                    estimated_value=t.estimated_value,
                    category=t.category,
                    status=t.status,
                    publication_date=t.publication_date,
                    closing_date=t.closing_date,
                    risk_score=t.risk_score,
                    risk_level=t.risk_level,
                    signal_count=t.signal_count,
                    bidders_count=bidders_count,
                )
            )

        return results

    @classmethod
    def get_tender_360(
        cls, 
        db: Session, 
        identifier: str, 
        organization_id: str = "default"
    ) -> Optional[Tender360Out]:
        """Fetch complete Tender 360 dossier with bids, statistical variance, and risk signals."""
        tender = db.execute(
            select(Tender).filter(
                Tender.organization_id == organization_id,
                (Tender.id == identifier) | (Tender.tender_ref == identifier)
            )
        ).scalar_one_or_none()

        if not tender:
            return None

        # Fetch bids
        bids = db.execute(
            select(Bid).filter(Bid.organization_id == organization_id, Bid.tender_id == tender.id)
        ).scalars().all()

        amounts = [b.amount for b in bids if b.amount > 0]
        mean_amt = float(np.mean(amounts)) if amounts else 0.0
        min_amt = float(np.min(amounts)) if amounts else 0.0
        max_amt = float(np.max(amounts)) if amounts else 0.0
        std_amt = float(np.std(amounts)) if len(amounts) > 1 else 0.0
        cv_pct = round((std_amt / mean_amt) * 100, 2) if mean_amt > 0 else 0.0
        spread_pct = round(((max_amt - min_amt) / min_amt) * 100, 2) if min_amt > 0 else 0.0

        bids_out: List[BidSummaryOut] = []
        for b in bids:
            comp = db.execute(select(Company).filter(Company.id == b.company_id)).scalar_one_or_none()
            var_pct = round(((b.amount - mean_amt) / mean_amt) * 100, 2) if mean_amt > 0 else 0.0
            bids_out.append(
                BidSummaryOut(
                    id=b.id,
                    company_id=b.company_id,
                    company_name=comp.legal_name if comp else "Unknown",
                    amount=b.amount,
                    status=b.status,
                    submitted_at=b.submitted_at,
                    variance_pct=var_pct,
                )
            )

        # Sort bids ascending by amount
        bids_out.sort(key=lambda x: x.amount)

        # Fetch signals & evidence
        signals = db.execute(
            select(RiskSignal).filter(RiskSignal.organization_id == organization_id, RiskSignal.tender_id == tender.id)
        ).scalars().all()

        signals_out: List[Dict[str, Any]] = []
        for s in signals:
            ev_items = db.execute(select(Evidence).filter(Evidence.signal_id == s.id)).scalars().all()
            signals_out.append({
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
                    for e in ev_items
                ],
            })

        metrics = {
            "mean_bid": round(mean_amt, 2),
            "min_bid": round(min_amt, 2),
            "max_bid": round(max_amt, 2),
            "spread_pct": spread_pct,
            "cv_pct": cv_pct,
            "estimated_value": tender.estimated_value,
            "variance_to_estimate_pct": round(((mean_amt - tender.estimated_value) / tender.estimated_value) * 100, 2) if tender.estimated_value > 0 else 0.0,
        }

        tender_out = TenderOut(
            id=tender.id,
            tender_ref=tender.tender_ref,
            title=tender.title,
            authority=tender.authority,
            estimated_value=tender.estimated_value,
            category=tender.category,
            status=tender.status,
            publication_date=tender.publication_date,
            closing_date=tender.closing_date,
            risk_score=tender.risk_score,
            risk_level=tender.risk_level,
            signal_count=tender.signal_count,
            bidders_count=len(bids),
        )

        return Tender360Out(
            tender=tender_out,
            bids=bids_out,
            signals=signals_out,
            metrics=metrics,
        )

    @classmethod
    def publish_tender(
        cls,
        db: Session,
        req: PublishTenderRequest,
        organization_id: str = "default",
    ) -> Tender360Out:
        """
        Publishes a government tender with structured or JSON input.
        Normalizes entities, creates bids, and executes immediate deterministic risk screening.
        """
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 1. Resolve or create department
        dept_id = None
        if req.department_code and req.department_name:
            dept = db.execute(
                select(GovernmentDepartment).filter(
                    GovernmentDepartment.organization_id == organization_id,
                    GovernmentDepartment.department_code == req.department_code,
                )
            ).scalar_one_or_none()
            if not dept:
                dept = GovernmentDepartment(
                    organization_id=organization_id,
                    name=req.department_name,
                    department_code=req.department_code,
                )
                db.add(dept)
                db.flush()
            dept_id = dept.id

        # 2. Resolve or create tender
        tender = db.execute(
            select(Tender).filter(
                Tender.organization_id == organization_id,
                Tender.tender_ref == req.tender_ref,
            )
        ).scalar_one_or_none()

        if not tender:
            tender = Tender(
                organization_id=organization_id,
                tender_ref=req.tender_ref,
                title=req.title,
                authority=req.department_name or "Directorate of Public Contracts",
                estimated_value=float(req.estimated_value),
                category=req.category or "Infrastructure",
                location=req.location,
                status=req.status or "Live",
                publication_date=req.publication_date or now_str,
                closing_date=req.closing_date,
                department_id=dept_id,
            )
            db.add(tender)
            db.flush()
        else:
            tender.title = req.title
            tender.authority = req.department_name or tender.authority
            tender.estimated_value = float(req.estimated_value)
            tender.category = req.category or tender.category
            tender.location = req.location or tender.location
            tender.status = req.status or tender.status
            if req.closing_date:
                tender.closing_date = req.closing_date
            db.flush()

        # 3. Process Bidders
        for b_item in req.bidders:
            norm_name = normalize_company_name(b_item.company_name)
            comp = db.execute(
                select(Company).filter(
                    Company.organization_id == organization_id,
                    (Company.normalized_name == norm_name) | (Company.source_company_id == (b_item.company_id or "NONE"))
                )
            ).scalar_one_or_none()

            if not comp:
                comp = Company(
                    organization_id=organization_id,
                    legal_name=b_item.company_name,
                    normalized_name=norm_name,
                    source_company_id=b_item.company_id,
                )
                db.add(comp)
                db.flush()

            # Handle address if provided
            if b_item.registered_address:
                _, addr_hash = normalize_address(b_item.registered_address)
                addr = db.execute(
                    select(Address).filter(
                        Address.organization_id == organization_id,
                        (Address.normalized_hash == addr_hash) | (Address.raw_address == b_item.registered_address),
                    )
                ).scalar_one_or_none()
                if not addr:
                    addr = Address(
                        organization_id=organization_id,
                        raw_address=b_item.registered_address,
                        normalized_hash=addr_hash,
                    )
                    db.add(addr)
                    db.flush()
                comp.address_id = addr.id
                db.flush()

            # Handle directors if provided
            if b_item.directors:
                for d_name in b_item.directors:
                    norm_dir = d_name.lower().strip()
                    director = db.execute(
                        select(Director).filter(
                            Director.organization_id == organization_id,
                            Director.normalized_name == norm_dir,
                        )
                    ).scalar_one_or_none()
                    if not director:
                        director = Director(
                            organization_id=organization_id,
                            full_name=d_name,
                            normalized_name=norm_dir,
                        )
                        db.add(director)
                        db.flush()

                    link = db.execute(
                        select(CompanyDirector).filter(
                            CompanyDirector.organization_id == organization_id,
                            CompanyDirector.company_id == comp.id,
                            CompanyDirector.director_id == director.id,
                        )
                    ).scalar_one_or_none()
                    if not link:
                        link = CompanyDirector(
                            organization_id=organization_id,
                            company_id=comp.id,
                            director_id=director.id,
                            role="Director",
                        )
                        db.add(link)
                        db.flush()

            # Check if bid exists
            existing_bid = db.execute(
                select(Bid).filter(
                    Bid.organization_id == organization_id,
                    Bid.tender_id == tender.id,
                    Bid.company_id == comp.id,
                )
            ).scalar_one_or_none()

            if not existing_bid:
                bid = Bid(
                    organization_id=organization_id,
                    tender_id=tender.id,
                    company_id=comp.id,
                    amount=float(b_item.bid_amount),
                    status=b_item.bid_status or "Submitted",
                    submitted_at=b_item.submitted_at or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
                )
                db.add(bid)
            else:
                existing_bid.amount = float(b_item.bid_amount)
                existing_bid.status = b_item.bid_status or existing_bid.status
                if b_item.submitted_at:
                    existing_bid.submitted_at = b_item.submitted_at

        db.commit()

        # 4. Trigger Risk Screening
        try:
            from app.modules.risk.service import RiskService

            RiskService.screen_tender(
                tender_id=tender.id,
                organization_id=organization_id,
                db=db,
            )
        except Exception:
            pass

        return cls.get_tender_360(db, tender.id, organization_id)

    @classmethod
    def manage_tender(
        cls,
        db: Session,
        identifier: str,
        update: TenderManagementUpdate,
        organization_id: str = "default",
    ) -> Optional[Tender360Out]:
        """Updates a tender project's status, progress stage, or details."""
        tender = db.execute(
            select(Tender).filter(
                Tender.organization_id == organization_id,
                (Tender.id == identifier) | (Tender.tender_ref == identifier)
            )
        ).scalar_one_or_none()

        if not tender:
            return None

        if update.status is not None:
            tender.status = update.status
        if update.title is not None:
            tender.title = update.title
        if update.estimated_value is not None:
            tender.estimated_value = float(update.estimated_value)
        if update.closing_date is not None:
            tender.closing_date = update.closing_date

        db.commit()

        if update.run_risk_screening:
            try:
                from app.modules.risk.service import RiskService

                RiskService.screen_tender(tender.id, organization_id, db)
            except Exception:
                pass

        return cls.get_tender_360(db, tender.id, organization_id)

    @classmethod
    def add_bidder(
        cls,
        db: Session,
        identifier: str,
        bidder: BidderInput,
        organization_id: str = "default",
    ) -> Optional[Tender360Out]:
        """Adds a new bidder & bid to an existing live tender."""
        tender = db.execute(
            select(Tender).filter(
                Tender.organization_id == organization_id,
                (Tender.id == identifier) | (Tender.tender_ref == identifier)
            )
        ).scalar_one_or_none()

        if not tender:
            return None

        norm_name = normalize_company_name(bidder.company_name)
        comp = db.execute(
            select(Company).filter(
                Company.organization_id == organization_id,
                (Company.normalized_name == norm_name) | (Company.source_company_id == (bidder.company_id or "NONE"))
            )
        ).scalar_one_or_none()

        if not comp:
            comp = Company(
                organization_id=organization_id,
                legal_name=bidder.company_name,
                normalized_name=norm_name,
                source_company_id=bidder.company_id,
            )
            db.add(comp)
            db.flush()

        # Handle address & directors if provided
        if bidder.registered_address:
            _, addr_hash = normalize_address(bidder.registered_address)
            addr = db.execute(
                select(Address).filter(
                    Address.organization_id == organization_id,
                    (Address.normalized_hash == addr_hash) | (Address.raw_address == bidder.registered_address),
                )
            ).scalar_one_or_none()
            if not addr:
                addr = Address(
                    organization_id=organization_id,
                    raw_address=bidder.registered_address,
                    normalized_hash=addr_hash,
                )
                db.add(addr)
                db.flush()
            comp.address_id = addr.id
            db.flush()

        if bidder.directors:
            for d_name in bidder.directors:
                norm_dir = normalize_director_name(d_name)
                director = db.execute(
                    select(Director).filter(
                        Director.organization_id == organization_id,
                        Director.normalized_name == norm_dir,
                    )
                ).scalar_one_or_none()
                if not director:
                    director = Director(
                        organization_id=organization_id,
                        full_name=d_name,
                        normalized_name=norm_dir,
                    )
                    db.add(director)
                    db.flush()
                link = db.execute(
                    select(CompanyDirector).filter(
                        CompanyDirector.organization_id == organization_id,
                        CompanyDirector.company_id == comp.id,
                        CompanyDirector.director_id == director.id,
                    )
                ).scalar_one_or_none()
                if not link:
                    link = CompanyDirector(
                        organization_id=organization_id,
                        company_id=comp.id,
                        director_id=director.id,
                        role="Director",
                    )
                    db.add(link)
                    db.flush()

        bid = Bid(
            organization_id=organization_id,
            tender_id=tender.id,
            company_id=comp.id,
            amount=float(bidder.bid_amount),
            status=bidder.bid_status or "Submitted",
            submitted_at=bidder.submitted_at or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        )
        db.add(bid)
        db.commit()

        try:
            from app.modules.risk.service import RiskService

            RiskService.screen_tender(tender.id, organization_id, db)
        except Exception:
            pass

        return cls.get_tender_360(db, tender.id, organization_id)

    @classmethod
    def get_project_status(
        cls,
        db: Session,
        identifier: str,
        organization_id: str = "default",
    ) -> Optional[TenderProjectStatusOut]:
        """Provides full management visibility into live status, progress, bidders, amounts, and risk."""
        t360 = cls.get_tender_360(db, identifier, organization_id)
        if not t360:
            return None

        t = t360.tender
        status_lower = t.status.lower()
        is_live = status_lower in ["live", "open"]

        if status_lower in ["awarded", "closed"]:
            progress_pct = 100
            stage = "Contract Awarded"
        elif status_lower in ["under review", "under evaluation", "evaluation"]:
            progress_pct = 75
            stage = "Bid Evaluation & Compliance Check"
        elif is_live:
            progress_pct = 40
            stage = "Live & Accepting Bids"
        else:
            progress_pct = 20
            stage = "Draft & Scope Finalization"

        flags = [
            s.get("title", "Potential coordination pattern detected")
            for s in t360.signals
            if isinstance(s, dict)
        ]
        recommended_action = (
            "Elevated risk pattern detected. Recommend manual forensic review prior to contract award."
            if t.risk_score >= 60
            else "Risk score within normal threshold. Proceed with standard procurement monitoring."
        )

        return TenderProjectStatusOut(
            id=t.id,
            tender_ref=t.tender_ref,
            title=t.title,
            authority=t.authority,
            is_live=is_live,
            status=t.status,
            progress_stage=stage,
            progress_pct=progress_pct,
            estimated_value=t.estimated_value,
            publication_date=t.publication_date,
            closing_date=t.closing_date,
            bidders=t360.bids,
            bidding_summary=t360.metrics,
            risk_assessment={
                "risk_score": t.risk_score,
                "risk_level": t.risk_level,
                "signal_count": t.signal_count,
                "flags": flags,
                "recommended_action": recommended_action,
                "signals": t360.signals,
            },
        )
