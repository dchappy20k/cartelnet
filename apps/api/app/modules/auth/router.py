from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.modules.auth.service import AuthService
from app.modules.auth.schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserMeResponse,
)
from app.modules.auth.dependencies import get_current_token_payload

router = APIRouter(prefix="/auth", tags=["Authentication & Multi-Tenant RBAC"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(
    data: UserRegister,
    db: Session = Depends(get_db),
):
    """Register a new user account and organization workspace."""
    try:
        return AuthService.register(db=db, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
def login(
    data: UserLogin,
    db: Session = Depends(get_db),
):
    """Authenticate with email and password to receive a JWT access token."""
    try:
        return AuthService.login(db=db, data=data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(
    role: str = Query("INVESTIGATOR", description="Demo role: INVESTIGATOR, ADMIN, PROCUREMENT_OFFICER, VIEWER"),
    db: Session = Depends(get_db),
):
    """One-click demo login for evaluators and judges without requiring manual registration."""
    return AuthService.demo_login(db=db, role=role.upper())


@router.get("/me", response_model=UserMeResponse)
def get_me(
    payload: Optional[dict] = Depends(get_current_token_payload),
    db: Session = Depends(get_db),
):
    """Get authenticated user profile and list of organization memberships."""
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Authentication token required")
    try:
        return AuthService.get_me(db=db, user_id=payload["sub"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
