from fastapi import Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.core.security import decode_access_token
from app.core.config import DEFAULT_ORG_ID


def get_current_token_payload(
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    """Extract and decode JWT token payload from Authorization: Bearer <token>."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:].strip()
    return decode_access_token(token)


def get_active_organization_id(
    organization_id: Optional[str] = Query(None),
    payload: Optional[dict] = Depends(get_current_token_payload),
) -> str:
    """Returns active tenant organization ID, checking JWT claims first, then query param fallback."""
    if payload and "org_id" in payload:
        return payload["org_id"]
    return organization_id or DEFAULT_ORG_ID
