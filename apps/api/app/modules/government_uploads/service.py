import json
import time
import uuid
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.modules.government_uploads.models import (
    GovernmentDepartment,
    TenderParticipant,
    GovernmentUploadAudit,
)
from app.modules.government_uploads.schemas import (
    GovernmentUploadPayload,
    ValidationErrorDetail,
    ValidationResponse,
    ValidationSummary,
    ImportResponse,
    ImportSummary,
    UploadAuditOut,
)
from app.modules.ingestion.normalization import (
    normalize_company_name,
    parse_amount,
    parse_date,
)
from app.modules.companies.models import Company
from app.modules.tenders.models import Tender
from app.modules.bids.models import Bid
from app.modules.risk.service import RiskService

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB server limit


class GovernmentUploadService:
    """Core server-side validator, deduplicator, and atomic database transaction engine."""

    @classmethod
    def generate_upload_id(cls) -> str:
        return f"UPL-2026-{uuid.uuid4().hex[:8].upper()}"

    @classmethod
    def validate_file_basics(cls, raw_bytes: bytes, filename: str) -> Optional[List[ValidationErrorDetail]]:
        """Validates extension, size, and UTF-8 encoding."""
        errors: List[ValidationErrorDetail] = []
        if not filename.lower().endswith(".json"):
            errors.append(ValidationErrorDetail(
                path="file.extension",
                message=f"Only JSON files (.json) are permitted. Received '{filename}'.",
                code="INVALID_FILE_TYPE",
            ))
            return errors

        if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
            errors.append(ValidationErrorDetail(
                path="file.size",
                message=f"File exceeds maximum size of 50 MB ({len(raw_bytes):,} bytes).",
                code="FILE_TOO_LARGE",
            ))
            return errors

        try:
            raw_bytes.decode("utf-8")
        except UnicodeDecodeError as exc:
            errors.append(ValidationErrorDetail(
                path="file.encoding",
                message=f"File must be valid UTF-8. Decode error: {str(exc)}",
                code="INVALID_ENCODING",
            ))
            return errors

        return None

    @classmethod
    def parse_and_validate_payload(
        cls,
        raw_bytes: bytes,
        filename: str,
        organization_id: str,
        db: Session,
    ) -> Tuple[Optional[GovernmentUploadPayload], List[ValidationErrorDetail], List[str]]:
        """Validates JSON structure, Pydantic constraints, and inter-entity integrity."""
        errors: List[ValidationErrorDetail] = []
        warnings: List[str] = []

        file_errs = cls.validate_file_basics(raw_bytes, filename)
        if file_errs:
            return None, file_errs, warnings

        try:
            text = raw_bytes.decode("utf-8")
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            errors.append(ValidationErrorDetail(
                path=f"json.syntax[line {exc.lineno}, col {exc.colno}]",
                message=f"Malformed JSON syntax: {exc.msg}",
                code="MALFORMED_JSON",
            ))
            return None, errors, warnings

        if not isinstance(data, dict):
            errors.append(ValidationErrorDetail(
                path="root",
                message="Root JSON value must be an object with 'department' and 'tenders'.",
                code="INVALID_ROOT_TYPE",
            ))
            return None, errors, warnings

        # Pydantic schema validation
        try:
            payload = GovernmentUploadPayload.model_validate(data)
        except ValidationError as exc:
            for err in exc.errors():
                loc_path = ".".join(str(p) for p in err["loc"])
                errors.append(ValidationErrorDetail(
                    path=loc_path,
                    message=err["msg"],
                    code="SCHEMA_VALIDATION_ERROR",
                ))
            return None, errors, warnings

        # Inter-entity integrity checks
        seen_tenders = set()
        for t_idx, tender in enumerate(payload.tenders):
            t_path = f"tenders[{t_idx}]"

            # Check duplicate tender_id in payload
            if tender.tender_id in seen_tenders:
                errors.append(ValidationErrorDetail(
                    path=f"{t_path}.tender_id",
                    message=f"Duplicate tender_id '{tender.tender_id}' within upload batch.",
                    code="DUPLICATE_TENDER_ID",
                ))
            else:
                seen_tenders.add(tender.tender_id)

            # Map registered companies in this tender
            reg_comp_ids = {rc.company_id for rc in tender.registered_companies}

            # Check bidders reference registered companies
            seen_bidder_comps = set()
            for b_idx, bidder in enumerate(tender.bidders):
                b_path = f"{t_path}.bidders[{b_idx}]"

                if bidder.company_id not in reg_comp_ids:
                    # Also check if already exists in database for this organization
                    existing_in_db = db.query(Company).filter(
                        Company.organization_id == organization_id,
                        (Company.source_company_id == bidder.company_id) | (Company.tax_id == bidder.company_id)
                    ).first()
                    if not existing_in_db:
                        errors.append(ValidationErrorDetail(
                            path=f"{b_path}.company_id",
                            message=f"Bidder company_id '{bidder.company_id}' is not registered under tender '{tender.tender_id}'.",
                            code="UNREGISTERED_BIDDER",
                        ))

                if bidder.company_id in seen_bidder_comps:
                    errors.append(ValidationErrorDetail(
                        path=f"{b_path}.company_id",
                        message=f"Duplicate bid submission for company_id '{bidder.company_id}' in tender '{tender.tender_id}'.",
                        code="DUPLICATE_BIDDER",
                    ))
                else:
                    seen_bidder_comps.add(bidder.company_id)

        return payload, errors, warnings

    @classmethod
    def validate_upload(
        cls,
        raw_bytes: bytes,
        filename: str,
        organization_id: str,
        uploaded_by: str,
        db: Session,
    ) -> ValidationResponse:
        """Dry-run validation endpoint handler. Does NOT modify procurement database records."""
        start_time = time.time()
        upload_id = cls.generate_upload_id()

        payload, errors, warnings = cls.parse_and_validate_payload(
            raw_bytes=raw_bytes,
            filename=filename,
            organization_id=organization_id,
            db=db,
        )

        duration_ms = int((time.time() - start_time) * 1000)

        # Compute summary
        if payload and not errors:
            all_comps = {rc.company_id for t in payload.tenders for rc in t.registered_companies}
            all_bids = sum(len(t.bidders) for t in payload.tenders)
            total_val = sum(t.estimated_value for t in payload.tenders)
            summary = ValidationSummary(
                departments=1,
                tenders=len(payload.tenders),
                companies=len(all_comps),
                bidders=all_bids,
                total_estimated_value=total_val,
            )
            status = "VALID"
        else:
            summary = ValidationSummary(
                departments=1 if payload else 0,
                tenders=len(payload.tenders) if payload else 0,
                companies=0,
                bidders=0,
                total_estimated_value=0.0,
            )
            status = "INVALID"

        # Record audit entry
        audit = GovernmentUploadAudit(
            id=upload_id,
            organization_id=organization_id,
            department_code=payload.department.department_code if payload else None,
            uploaded_by=uploaded_by,
            filename=filename,
            file_size=len(raw_bytes),
            status=status,
            records_received=json.dumps(summary.model_dump()),
            records_imported=None,
            records_failed=len(errors),
            validation_errors=json.dumps([e.model_dump() for e in errors]) if errors else None,
            processing_duration_ms=duration_ms,
        )
        db.add(audit)
        db.commit()

        return ValidationResponse(
            success=(status == "VALID"),
            upload_id=upload_id,
            status=status,
            summary=summary,
            errors=errors,
            warnings=warnings,
        )

    @classmethod
    def import_upload(
        cls,
        raw_bytes: bytes,
        filename: str,
        organization_id: str,
        uploaded_by: str,
        db: Session,
    ) -> ImportResponse:
        """Executes strict validation and atomic database transaction import."""
        start_time = time.time()
        upload_id = cls.generate_upload_id()

        payload, errors, warnings = cls.parse_and_validate_payload(
            raw_bytes=raw_bytes,
            filename=filename,
            organization_id=organization_id,
            db=db,
        )

        if not payload or errors:
            duration_ms = int((time.time() - start_time) * 1000)
            audit = GovernmentUploadAudit(
                id=upload_id,
                organization_id=organization_id,
                department_code=payload.department.department_code if payload else None,
                uploaded_by=uploaded_by,
                filename=filename,
                file_size=len(raw_bytes),
                status="INVALID",
                records_received=json.dumps({"errors_count": len(errors)}),
                records_failed=len(errors),
                validation_errors=json.dumps([e.model_dump() for e in errors]),
                processing_duration_ms=duration_ms,
            )
            db.add(audit)
            db.commit()
            return ImportResponse(
                success=False,
                upload_id=upload_id,
                status="INVALID",
                summary=ImportSummary(),
                errors=errors,
                warnings=warnings,
                processing_duration_ms=duration_ms,
            )

        # Atomic Transaction
        try:
            # 1. Department: Resolve or create
            dept = db.query(GovernmentDepartment).filter(
                GovernmentDepartment.organization_id == organization_id,
                GovernmentDepartment.department_code == payload.department.department_code,
            ).first()

            if not dept:
                dept = GovernmentDepartment(
                    organization_id=organization_id,
                    name=payload.department.name,
                    department_code=payload.department.department_code,
                )
                db.add(dept)
                db.flush()

            # Cache for companies within this tenant
            company_cache: Dict[str, Company] = {}
            existing_companies = db.query(Company).filter(
                Company.organization_id == organization_id
            ).all()

            for c in existing_companies:
                if c.source_company_id:
                    company_cache[f"id:{c.source_company_id}"] = c
                if c.normalized_name:
                    company_cache[f"norm:{c.normalized_name}"] = c

            tenders_imported = 0
            companies_imported = 0
            participants_imported = 0
            bids_imported = 0
            imported_tender_ids: List[str] = []

            for t_item in payload.tenders:
                # 2. Resolve/Update Tender
                tender = db.query(Tender).filter(
                    Tender.organization_id == organization_id,
                    Tender.tender_ref == t_item.tender_id,
                ).first()

                if not tender:
                    tender = Tender(
                        organization_id=organization_id,
                        tender_ref=t_item.tender_id,
                        title=t_item.title,
                        authority=payload.department.name,
                        estimated_value=t_item.estimated_value,
                        category="Infrastructure",
                        location=t_item.location,
                        status="Under Review",
                        closing_date=t_item.submission_deadline,
                        department_id=dept.id,
                        source_upload_id=upload_id,
                    )
                    db.add(tender)
                    db.flush()
                    tenders_imported += 1
                else:
                    # Update existing tender with incoming metadata & provenance
                    tender.title = t_item.title
                    tender.authority = payload.department.name
                    tender.estimated_value = t_item.estimated_value
                    tender.location = t_item.location
                    tender.closing_date = t_item.submission_deadline
                    tender.department_id = dept.id
                    tender.source_upload_id = upload_id
                    db.flush()

                imported_tender_ids.append(tender.id)

                # 3. Companies: Resolve or create
                tender_company_map: Dict[str, Company] = {}

                for rc in t_item.registered_companies:
                    norm_name = normalize_company_name(rc.company_name)
                    comp_obj = company_cache.get(f"id:{rc.company_id}") or company_cache.get(f"norm:{norm_name}")

                    if not comp_obj:
                        comp_obj = Company(
                            organization_id=organization_id,
                            legal_name=rc.company_name,
                            normalized_name=norm_name,
                            source_company_id=rc.company_id,
                            source_upload_id=upload_id,
                            status="Active",
                        )
                        db.add(comp_obj)
                        db.flush()
                        companies_imported += 1
                        company_cache[f"id:{rc.company_id}"] = comp_obj
                        company_cache[f"norm:{norm_name}"] = comp_obj

                    tender_company_map[rc.company_id] = comp_obj

                    # 4. TenderParticipant registration link
                    existing_participant = db.query(TenderParticipant).filter(
                        TenderParticipant.organization_id == organization_id,
                        TenderParticipant.tender_id == tender.id,
                        TenderParticipant.company_id == comp_obj.id,
                    ).first()

                    if not existing_participant:
                        participant = TenderParticipant(
                            organization_id=organization_id,
                            tender_id=tender.id,
                            company_id=comp_obj.id,
                            source_upload_id=upload_id,
                            registered_at=t_item.submission_deadline,
                            status="Registered",
                        )
                        db.add(participant)
                        participants_imported += 1

                # 5. Bids
                for b_item in t_item.bidders:
                    bidder_comp = tender_company_map.get(b_item.company_id) or company_cache.get(f"id:{b_item.company_id}")
                    if not bidder_comp:
                        raise ValueError(f"Integrity failure: company '{b_item.company_id}' unresolved.")

                    existing_bid = db.query(Bid).filter(
                        Bid.organization_id == organization_id,
                        Bid.tender_id == tender.id,
                        Bid.company_id == bidder_comp.id,
                    ).first()

                    if not existing_bid:
                        bid = Bid(
                            organization_id=organization_id,
                            tender_id=tender.id,
                            company_id=bidder_comp.id,
                            amount=b_item.bid_amount,
                            bid_rank=b_item.bid_rank,
                            status=b_item.status.capitalize(),
                            source_upload_id=upload_id,
                            submitted_at=t_item.submission_deadline,
                        )
                        db.add(bid)
                        bids_imported += 1
                    else:
                        existing_bid.amount = b_item.bid_amount
                        existing_bid.bid_rank = b_item.bid_rank
                        existing_bid.status = b_item.status.capitalize()
                        existing_bid.source_upload_id = upload_id

            # Commit the atomic transaction
            db.commit()

            # Post-commit: Execute deterministic risk screening on newly imported tenders
            for t_id in imported_tender_ids:
                try:
                    RiskService.screen_tender(tender_id=t_id, organization_id=organization_id, db=db)
                except Exception:
                    # Non-fatal if minimum bids criteria not met for all detectors
                    pass

            duration_ms = int((time.time() - start_time) * 1000)

            summary = ImportSummary(
                departments=1,
                tenders=tenders_imported,
                companies=companies_imported,
                participants=participants_imported,
                bids=bids_imported,
            )

            # Record successful audit log
            audit = GovernmentUploadAudit(
                id=upload_id,
                organization_id=organization_id,
                department_id=dept.id,
                department_code=dept.department_code,
                uploaded_by=uploaded_by,
                filename=filename,
                file_size=len(raw_bytes),
                status="IMPORTED",
                records_received=json.dumps({"tenders": len(payload.tenders)}),
                records_imported=json.dumps(summary.model_dump()),
                records_failed=0,
                processing_duration_ms=duration_ms,
            )
            db.add(audit)
            db.commit()

            return ImportResponse(
                success=True,
                upload_id=upload_id,
                status="IMPORTED",
                summary=summary,
                errors=[],
                warnings=warnings,
                processing_duration_ms=duration_ms,
            )

        except Exception as exc:
            db.rollback()
            duration_ms = int((time.time() - start_time) * 1000)

            err_detail = ValidationErrorDetail(
                path="database.transaction",
                message=f"Transaction rolled back due to error: {str(exc)}",
                code="TRANSACTION_ROLLED_BACK",
            )

            # Record rolled back audit
            try:
                audit = GovernmentUploadAudit(
                    id=upload_id,
                    organization_id=organization_id,
                    department_code=payload.department.department_code,
                    uploaded_by=uploaded_by,
                    filename=filename,
                    file_size=len(raw_bytes),
                    status="ROLLED_BACK",
                    records_received=json.dumps({"tenders": len(payload.tenders)}),
                    records_failed=1,
                    validation_errors=json.dumps([err_detail.model_dump()]),
                    processing_duration_ms=duration_ms,
                )
                db.add(audit)
                db.commit()
            except Exception:
                pass

            return ImportResponse(
                success=False,
                upload_id=upload_id,
                status="ROLLED_BACK",
                summary=ImportSummary(),
                errors=[err_detail],
                warnings=[],
                processing_duration_ms=duration_ms,
            )

    @classmethod
    def list_uploads(cls, organization_id: str, db: Session, limit: int = 50) -> List[UploadAuditOut]:
        """Lists historical upload audits for this tenant organization."""
        records = db.query(GovernmentUploadAudit).filter(
            GovernmentUploadAudit.organization_id == organization_id
        ).order_by(GovernmentUploadAudit.created_at.desc()).limit(limit).all()

        results = []
        for r in records:
            rec_rec = json.loads(r.records_received) if r.records_received else None
            rec_imp = json.loads(r.records_imported) if r.records_imported else None
            val_errs = json.loads(r.validation_errors) if r.validation_errors else None

            results.append(UploadAuditOut(
                upload_id=r.id,
                department_id=r.department_id,
                department_code=r.department_code,
                uploaded_by=r.uploaded_by,
                filename=r.filename,
                file_size=r.file_size,
                status=r.status,
                records_received=rec_rec,
                records_imported=rec_imp,
                records_failed=r.records_failed,
                validation_errors=val_errs,
                processing_duration_ms=r.processing_duration_ms,
                created_at=r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else str(r.created_at),
            ))
        return results

    @classmethod
    def get_upload_detail(cls, upload_id: str, organization_id: str, db: Session) -> Optional[UploadAuditOut]:
        """Retrieves single upload audit record by upload ID."""
        r = db.query(GovernmentUploadAudit).filter(
            GovernmentUploadAudit.id == upload_id,
            GovernmentUploadAudit.organization_id == organization_id,
        ).first()

        if not r:
            return None

        rec_rec = json.loads(r.records_received) if r.records_received else None
        rec_imp = json.loads(r.records_imported) if r.records_imported else None
        val_errs = json.loads(r.validation_errors) if r.validation_errors else None

        return UploadAuditOut(
            upload_id=r.id,
            department_id=r.department_id,
            department_code=r.department_code,
            uploaded_by=r.uploaded_by,
            filename=r.filename,
            file_size=r.file_size,
            status=r.status,
            records_received=rec_rec,
            records_imported=rec_imp,
            records_failed=r.records_failed,
            validation_errors=val_errs,
            processing_duration_ms=r.processing_duration_ms,
            created_at=r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else str(r.created_at),
        )
