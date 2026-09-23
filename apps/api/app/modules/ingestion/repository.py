from sqlalchemy.orm import Session
from typing import List, Optional

from app.modules.ingestion.models import ImportJob, ImportRecordError


class IngestionRepository:
    """Repository handling persistence of import jobs and validation errors."""

    @staticmethod
    def get_job_by_id(db: Session, job_id: str, organization_id: str) -> Optional[ImportJob]:
        return db.query(ImportJob).filter(
            ImportJob.id == job_id,
            ImportJob.organization_id == organization_id,
        ).first()

    @staticmethod
    def list_jobs(db: Session, organization_id: str, limit: int = 50) -> List[ImportJob]:
        return db.query(ImportJob).filter(
            ImportJob.organization_id == organization_id,
        ).order_by(ImportJob.created_at.desc()).limit(limit).all()
