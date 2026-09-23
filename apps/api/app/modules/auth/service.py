from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.security import get_password_hash, verify_password, create_access_token
from app.modules.organizations.models import User, Organization, OrganizationMembership
from app.modules.auth.schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserProfile,
    OrganizationProfile,
    UserMeResponse,
)


class AuthService:
    """Service layer for authentication, registration, and RBAC memberships."""

    @classmethod
    def register(cls, db: Session, data: UserRegister) -> TokenResponse:
        """Register a new user and create their initial organization with ADMIN role."""
        existing = db.execute(select(User).filter(User.email == data.email.lower())).scalar_one_or_none()
        if existing:
            raise ValueError(f"User with email '{data.email}' already exists")

        # 1. Create Organization
        org = Organization(
            name=data.organization_name,
            type=data.organization_type,
        )
        db.add(org)
        db.flush()

        # 2. Create User
        user = User(
            email=data.email.lower(),
            hashed_password=get_password_hash(data.password),
            full_name=data.full_name,
            is_active=True,
        )
        db.add(user)
        db.flush()

        # 3. Create Membership (Admin)
        membership = OrganizationMembership(
            organization_id=org.id,
            user_id=user.id,
            role="ADMIN",
        )
        db.add(membership)
        db.commit()
        db.refresh(user)
        db.refresh(org)

        token = create_access_token(
            subject=user.id,
            organization_id=org.id,
            role="ADMIN",
        )

        return TokenResponse(
            access_token=token,
            user=UserProfile(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
            ),
            organization=OrganizationProfile(
                id=org.id,
                name=org.name,
                type=org.type,
                role="ADMIN",
            ),
        )

    @classmethod
    def login(cls, db: Session, data: UserLogin) -> TokenResponse:
        """Authenticate user by email and password, returning JWT token with primary org."""
        user = db.execute(select(User).filter(User.email == data.email.lower())).scalar_one_or_none()
        if not user or not verify_password(data.password, user.hashed_password):
            raise ValueError("Invalid email or password")

        if not user.is_active:
            raise ValueError("User account is inactive")

        # Fetch primary membership
        membership = db.execute(
            select(OrganizationMembership).filter(OrganizationMembership.user_id == user.id)
        ).scalar_one_or_none()

        org_id = "default"
        org_name = "Default Organization"
        org_type = "GOVERNMENT_AUTHORITY"
        role = "VIEWER"

        if membership:
            org = db.execute(select(Organization).filter(Organization.id == membership.organization_id)).scalar_one_or_none()
            if org:
                org_id = org.id
                org_name = org.name
                org_type = org.type
                role = membership.role

        token = create_access_token(
            subject=user.id,
            organization_id=org_id,
            role=role,
        )

        return TokenResponse(
            access_token=token,
            user=UserProfile(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
            ),
            organization=OrganizationProfile(
                id=org_id,
                name=org_name,
                type=org_type,
                role=role,
            ),
        )

    @classmethod
    def demo_login(cls, db: Session, role: str = "INVESTIGATOR") -> TokenResponse:
        """Instant demo login for judges and evaluators."""
        demo_email = f"demo.{role.lower()}@cartelnet.internal"
        user = db.execute(select(User).filter(User.email == demo_email)).scalar_one_or_none()

        org = db.execute(
            select(Organization).filter(Organization.name == "National Procurement Authority")
        ).scalar_one_or_none()

        if not org:
            org = Organization(
                id="org-cartelnet-demo",
                name="National Procurement Authority",
                type="GOVERNMENT_AUTHORITY",
            )
            db.add(org)
            db.flush()

        if not user:
            user = User(
                email=demo_email,
                hashed_password=get_password_hash("cartelnet-demo-password"),
                full_name=f"Demo {role.replace('_', ' ').title()}",
                is_active=True,
            )
            db.add(user)
            db.flush()

            membership = OrganizationMembership(
                organization_id=org.id,
                user_id=user.id,
                role=role,
            )
            db.add(membership)
            db.commit()
            db.refresh(user)
            db.refresh(org)

        token = create_access_token(
            subject=user.id,
            organization_id=org.id,
            role=role,
        )

        return TokenResponse(
            access_token=token,
            user=UserProfile(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
            ),
            organization=OrganizationProfile(
                id=org.id,
                name=org.name,
                type=org.type,
                role=role,
            ),
        )

    @classmethod
    def get_me(cls, db: Session, user_id: str) -> UserMeResponse:
        """Fetch profile and memberships for an authenticated user."""
        user = db.execute(select(User).filter(User.id == user_id)).scalar_one_or_none()
        if not user:
            raise ValueError("User not found")

        memberships = db.execute(
            select(OrganizationMembership).filter(OrganizationMembership.user_id == user.id)
        ).scalars().all()

        orgs_out = []
        for m in memberships:
            org = db.execute(select(Organization).filter(Organization.id == m.organization_id)).scalar_one_or_none()
            if org:
                orgs_out.append(
                    OrganizationProfile(
                        id=org.id,
                        name=org.name,
                        type=org.type,
                        role=m.role,
                    )
                )

        return UserMeResponse(
            user=UserProfile(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                is_active=user.is_active,
            ),
            organizations=orgs_out,
        )
