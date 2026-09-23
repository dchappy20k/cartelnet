import csv
import io
import os
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.modules.ingestion.models import ImportJob, ImportRecordError
from app.modules.ingestion.schemas import ValidationResult, RowErrorDetail, CommitResult
from app.modules.ingestion.normalization import (
    normalize_company_name,
    normalize_director_name,
    normalize_address,
    parse_amount,
    parse_date,
)
from app.modules.organizations.models import Organization
from app.modules.tenders.models import Tender
from app.modules.companies.models import Company, Director, CompanyDirector, Address
from app.modules.bids.models import Bid


DEFAULT_ORG_ID = "org-cartelnet-demo"


class IngestionService:
    """Core ingestion, normalization, and entity resolution engine."""

    REQUIRED_COLUMNS = ["tender_ref", "company_name", "bid_amount"]

    @classmethod
    def get_or_create_default_org(cls, db: Session) -> Organization:
        org = db.query(Organization).filter(Organization.id == DEFAULT_ORG_ID).first()
        if not org:
            org = Organization(
                id=DEFAULT_ORG_ID,
                name="National Procurement Authority",
                type="GOVERNMENT_AUTHORITY",
            )
            db.add(org)
            db.commit()
            db.refresh(org)
        return org

    @classmethod
    def parse_csv_stream(cls, stream: io.StringIO) -> List[Dict[str, str]]:
        reader = csv.DictReader(stream)
        records = []
        for row in reader:
            clean_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
            records.append(clean_row)
        return records

    @classmethod
    def validate_csv(cls, content: str, filename: str, organization_id: str, db: Session) -> ValidationResult:
        stream = io.StringIO(content)
        records = cls.parse_csv_stream(stream)

        job = ImportJob(
            organization_id=organization_id,
            filename=filename,
            source_type="CSV",
            total_rows=len(records),
            status="PENDING",
        )
        db.add(job)
        db.flush()

        detected_columns = list(records[0].keys()) if records else []
        errors: List[RowErrorDetail] = []
        valid_rows = 0
        error_rows = 0
        warning_rows = 0

        # Check required columns
        missing_required = [col for col in cls.REQUIRED_COLUMNS if col not in detected_columns]
        if missing_required:
            err = RowErrorDetail(
                row_number=0,
                column_name=", ".join(missing_required),
                error_message=f"Missing mandatory CSV columns: {', '.join(missing_required)}",
            )
            errors.append(err)
            db.add(ImportRecordError(
                organization_id=organization_id,
                import_job_id=job.id,
                row_number=0,
                column_name=", ".join(missing_required),
                error_message=err.error_message,
            ))

        # Row-by-row validation
        for i, row in enumerate(records, start=1):
            row_has_error = False
            
            # Check mandatory values
            if not row.get("tender_ref"):
                errors.append(RowErrorDetail(row_number=i, column_name="tender_ref", error_message="Empty tender_ref"))
                row_has_error = True
            
            if not row.get("company_name"):
                errors.append(RowErrorDetail(row_number=i, column_name="company_name", error_message="Empty company_name"))
                row_has_error = True
                
            amount = parse_amount(row.get("bid_amount"))
            if amount <= 0:
                errors.append(RowErrorDetail(row_number=i, column_name="bid_amount", raw_value=row.get("bid_amount"), error_message="Bid amount must be a positive number"))
                row_has_error = True

            if row_has_error:
                error_rows += 1
            else:
                valid_rows += 1

        job.valid_rows = valid_rows
        job.error_rows = error_rows
        job.warning_rows = warning_rows
        job.status = "VALIDATED" if error_rows == 0 else "FAILED"
        db.commit()

        return ValidationResult(
            import_job_id=job.id,
            total_rows=len(records),
            valid_rows=valid_rows,
            warning_rows=warning_rows,
            error_rows=error_rows,
            is_valid=(error_rows == 0 and len(missing_required) == 0),
            detected_columns=detected_columns,
            sample_preview=records[:5],
            errors=errors[:20],
        )

    @classmethod
    def ingest_records(cls, records: List[Dict[str, str]], organization_id: str, db: Session, job_id: Optional[str] = None) -> CommitResult:
        """Processes and stores normalized entities and relationships into PostgreSQL/SQLite."""
        tenders_created = 0
        bids_created = 0
        companies_created = 0
        directors_created = 0

        # Cache lookups for speed
        tender_cache: Dict[str, Tender] = {}
        company_cache: Dict[str, Company] = {}
        director_cache: Dict[str, Director] = {}
        address_cache: Dict[str, Address] = {}

        for row in records:
            tender_ref = row.get("tender_ref", "").strip()
            if not tender_ref:
                continue

            # 1. Tender
            if tender_ref not in tender_cache:
                tender = db.query(Tender).filter(
                    Tender.organization_id == organization_id,
                    Tender.tender_ref == tender_ref,
                ).first()
                if not tender:
                    tender = Tender(
                        organization_id=organization_id,
                        tender_ref=tender_ref,
                        title=row.get("tender_title", f"Tender {tender_ref}"),
                        authority=row.get("authority_name", "Procurement Authority"),
                        estimated_value=parse_amount(row.get("estimated_value")),
                        category=row.get("category", "Infrastructure"),
                        status="Under Review",
                        publication_date=parse_date(row.get("submission_date")),
                    )
                    db.add(tender)
                    db.flush()
                    tenders_created += 1
                tender_cache[tender_ref] = tender
            tender = tender_cache[tender_ref]

            # 2. Address Normalization
            raw_addr = row.get("registered_address", "").strip()
            address_id = None
            if raw_addr:
                clean_addr, addr_hash = normalize_address(raw_addr)
                if addr_hash not in address_cache:
                    addr_obj = db.query(Address).filter(
                        Address.organization_id == organization_id,
                        Address.normalized_hash == addr_hash,
                    ).first()
                    if not addr_obj:
                        addr_obj = Address(
                            organization_id=organization_id,
                            raw_address=raw_addr,
                            normalized_hash=addr_hash,
                        )
                        db.add(addr_obj)
                        db.flush()
                    address_cache[addr_hash] = addr_obj
                address_id = address_cache[addr_hash].id

            # 3. Company Normalization
            company_raw = row.get("company_name", "").strip()
            norm_company = normalize_company_name(company_raw)
            if not norm_company:
                continue

            if norm_company not in company_cache:
                company = db.query(Company).filter(
                    Company.organization_id == organization_id,
                    Company.normalized_name == norm_company,
                ).first()
                if not company:
                    company = Company(
                        organization_id=organization_id,
                        legal_name=company_raw,
                        normalized_name=norm_company,
                        address_id=address_id,
                        status="Active",
                    )
                    db.add(company)
                    db.flush()
                    companies_created += 1
                company_cache[norm_company] = company
            company = company_cache[norm_company]

            # 4. Directors
            directors_str = row.get("directors", "")
            if directors_str:
                for dir_name in directors_str.split(";"):
                    dir_name = dir_name.strip()
                    if not dir_name:
                        continue
                    norm_dir = normalize_director_name(dir_name)
                    if norm_dir not in director_cache:
                        director = db.query(Director).filter(
                            Director.organization_id == organization_id,
                            Director.normalized_name == norm_dir,
                        ).first()
                        if not director:
                            director = Director(
                                organization_id=organization_id,
                                full_name=dir_name,
                                normalized_name=norm_dir,
                            )
                            db.add(director)
                            db.flush()
                            directors_created += 1
                        director_cache[norm_dir] = director
                    director = director_cache[norm_dir]

                    # Link CompanyDirector
                    existing_link = db.query(CompanyDirector).filter(
                        CompanyDirector.company_id == company.id,
                        CompanyDirector.director_id == director.id,
                    ).first()
                    if not existing_link:
                        link = CompanyDirector(
                            organization_id=organization_id,
                            company_id=company.id,
                            director_id=director.id,
                            role="Director",
                        )
                        db.add(link)

            # 5. Bid
            bid_amount = parse_amount(row.get("bid_amount"))
            bid_status = row.get("bid_status", "Submitted")
            
            existing_bid = db.query(Bid).filter(
                Bid.tender_id == tender.id,
                Bid.company_id == company.id,
            ).first()
            if not existing_bid:
                bid = Bid(
                    organization_id=organization_id,
                    tender_id=tender.id,
                    company_id=company.id,
                    amount=bid_amount,
                    status=bid_status,
                    submitted_at=parse_date(row.get("submission_date")),
                )
                db.add(bid)
                bids_created += 1

        if job_id:
            job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
            if job:
                job.status = "COMPLETED"

        db.commit()

        return CommitResult(
            import_job_id=job_id or "direct-seed",
            status="SUCCESS",
            tenders_count=tenders_created,
            bids_count=bids_created,
            companies_count=companies_created,
            directors_count=directors_created,
            message=f"Successfully imported {tenders_created} tenders, {bids_created} bids, and {companies_created} entities.",
        )

    @classmethod
    def seed_demo_dataset(cls, db: Session, organization_id: Optional[str] = None) -> CommitResult:
        """Reads data/demo/tenders_procurement_benchmark.csv and seeds the database."""
        if not organization_id:
            org = cls.get_or_create_default_org(db)
            organization_id = org.id

        csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../../data/demo/tenders_procurement_benchmark.csv"))
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"Benchmark CSV not found at {csv_path}")

        with open(csv_path, mode="r", encoding="utf-8") as f:
            content = f.read()

        stream = io.StringIO(content)
        records = cls.parse_csv_stream(stream)
        return cls.ingest_records(records, organization_id=organization_id, db=db, job_id=f"demo-seed-{int(os.path.getmtime(csv_path))}")
