from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.core.config import DEFAULT_ORG_ID
from app.modules.auth.dependencies import get_current_token_payload, get_active_organization_id
from app.modules.government_uploads.service import GovernmentUploadService
from app.modules.government_uploads.schemas import (
    ValidationResponse,
    ImportResponse,
    UploadAuditOut,
)

router = APIRouter(prefix="/government/uploads", tags=["Government JSON Bulk Ingestion"])


def verify_government_role(payload: Optional[dict] = Depends(get_current_token_payload)):
    """Ensures caller has government/admin upload privileges if authenticated."""
    if payload:
        user_role = payload.get("role", "")
        user_roles = list(payload.get("roles", []))
        if user_role:
            user_roles.append(user_role)
        allowed = {"ADMIN", "PROCUREMENT_OFFICER", "COMPLIANCE_ANALYST"}
        if not any(r.upper() in allowed for r in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Government or Administrator privileges required for procurement JSON ingestion.",
            )
    return payload


@router.post("/validate", response_model=ValidationResponse)
async def validate_government_json(
    file: UploadFile = File(...),
    token_payload: Optional[dict] = Depends(verify_government_role),
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """
    Dry-run validation of a Government Procurement JSON file.
    Validates file format (.json only), UTF-8 decoding, schema constraints, and bidder-company integrity
    without modifying database procurement tables. Records an audit entry.
    """
    if not file.filename.lower().endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File rejected: Only JSON files (.json) are permitted. Received: " + file.filename,
        )

    content_bytes = await file.read()
    uploaded_by = token_payload.get("sub", "government-officer") if token_payload else "government-officer"

    return GovernmentUploadService.validate_upload(
        raw_bytes=content_bytes,
        filename=file.filename,
        organization_id=organization_id,
        uploaded_by=uploaded_by,
        db=db,
    )


@router.post("/import", response_model=ImportResponse)
async def import_government_json(
    file: UploadFile = File(...),
    token_payload: Optional[dict] = Depends(verify_government_role),
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """
    Validates and atomically imports a Government Procurement JSON file into the database.
    Reuses canonical company profiles, stores tenders, registered participants, and bids with full provenance.
    Immediately triggers deterministic risk screening on newly created tenders.
    Guarantees atomic rollback if any error occurs.
    """
    if not file.filename.lower().endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File rejected: Only JSON files (.json) are permitted. Received: " + file.filename,
        )

    content_bytes = await file.read()
    uploaded_by = token_payload.get("sub", "government-officer") if token_payload else "government-officer"

    return GovernmentUploadService.import_upload(
        raw_bytes=content_bytes,
        filename=file.filename,
        organization_id=organization_id,
        uploaded_by=uploaded_by,
        db=db,
    )


@router.get("", response_model=List[UploadAuditOut])
@router.get("/", response_model=List[UploadAuditOut])
def list_upload_audits(
    limit: int = Query(50, ge=1, le=100),
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """Lists audit history of government JSON uploads for the active tenant organization."""
    return GovernmentUploadService.list_uploads(
        organization_id=organization_id,
        db=db,
        limit=limit,
    )


@router.get("/{upload_id}", response_model=UploadAuditOut)
def get_upload_audit_detail(
    upload_id: str,
    organization_id: str = Depends(get_active_organization_id),
    db: Session = Depends(get_db),
):
    """Fetches full audit details and validation logs for a specific upload transaction."""
    record = GovernmentUploadService.get_upload_detail(
        upload_id=upload_id,
        organization_id=organization_id,
        db=db,
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Upload audit record '{upload_id}' not found.",
        )
    return record


@router.get("/sample-template/download")
def download_sample_template():
    """Returns official standard Government Procurement JSON template."""
    sample = {
        "department": {
            "name": "Public Works Department",
            "department_code": "PWD"
        },
        "tenders": [
            {
                "tender_id": "PWD-2026-1042",
                "title": "Highway Construction Project - Phase 4",
                "location": "Indore, Madhya Pradesh",
                "estimated_value": 85000000.0,
                "submission_deadline": "2026-09-30",
                "registered_companies": [
                    {
                        "company_id": "C001",
                        "company_name": "ABC Construction Pvt Ltd"
                    },
                    {
                        "company_id": "C002",
                        "company_name": "XYZ Infra Ltd"
                    },
                    {
                        "company_id": "C003",
                        "company_name": "Apex Roads Engineering"
                    }
                ],
                "bidders": [
                    {
                        "company_id": "C001",
                        "bid_amount": 84200000.0,
                        "bid_rank": 1,
                        "status": "qualified"
                    },
                    {
                        "company_id": "C002",
                        "bid_amount": 85100000.0,
                        "bid_rank": 2,
                        "status": "qualified"
                    },
                    {
                        "company_id": "C003",
                        "bid_amount": 86450000.0,
                        "bid_rank": 3,
                        "status": "qualified"
                    }
                ]
            }
        ]
    }
    return JSONResponse(
        content=sample,
        headers={"Content-Disposition": "attachment; filename=government_tender_upload_template.json"}
    )
