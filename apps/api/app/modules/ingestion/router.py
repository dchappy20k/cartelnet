from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.modules.ingestion.service import IngestionService, DEFAULT_ORG_ID
from app.modules.ingestion.repository import IngestionRepository
from app.modules.ingestion.schemas import ValidationResult, CommitResult, ImportJobOut

router = APIRouter(prefix="/ingestion", tags=["Ingestion"])


@router.post("/upload", response_model=ValidationResult)
async def upload_csv_file(
    file: UploadFile = File(...),
    organization_id: str = Form(DEFAULT_ORG_ID),
    db: Session = Depends(get_db),
):
    """Uploads a CSV procurement file and runs dry-run schema validation."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV spreadsheet files (.csv) are currently supported.",
        )

    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin-1")

    return IngestionService.validate_csv(
        content=content_str,
        filename=file.filename,
        organization_id=organization_id,
        db=db,
    )


@router.post("/demo-seed", response_model=CommitResult)
def seed_demo_data(
    organization_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Loads and normalizes the built-in benchmark procurement dataset into the database."""
    org_id = organization_id or DEFAULT_ORG_ID
    return IngestionService.seed_demo_dataset(db=db, organization_id=org_id)


@router.get("/history", response_model=List[ImportJobOut])
def get_import_history(
    organization_id: str = DEFAULT_ORG_ID,
    db: Session = Depends(get_db),
):
    """Lists recent data ingestion and import jobs."""
    return IngestionRepository.list_jobs(db=db, organization_id=organization_id)
