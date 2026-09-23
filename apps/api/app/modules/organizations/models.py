from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
import uuid

from app.db.base import Base, TenantAwareModel, utc_now


class Organization(Base):
    """Multi-tenant organization account (Government Authority or Company)."""
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="GOVERNMENT_AUTHORITY")  # GOVERNMENT_AUTHORITY, COMPANY
    created_at: Mapped[str] = mapped_column(default=utc_now, nullable=False)
    updated_at: Mapped[str] = mapped_column(default=utc_now, onupdate=utc_now, nullable=False)

    memberships: Mapped[List["OrganizationMembership"]] = relationship("OrganizationMembership", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    """User account model."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[str] = mapped_column(default=utc_now, nullable=False)
    updated_at: Mapped[str] = mapped_column(default=utc_now, onupdate=utc_now, nullable=False)

    memberships: Mapped[List["OrganizationMembership"]] = relationship("OrganizationMembership", back_populates="user", cascade="all, delete-orphan")


class OrganizationMembership(Base):
    """Links user to an organization with a specific RBAC role."""
    __tablename__ = "organization_memberships"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="VIEWER")  # ADMIN, PROCUREMENT_OFFICER, COMPLIANCE_ANALYST, INVESTIGATOR, VIEWER
    created_at: Mapped[str] = mapped_column(default=utc_now, nullable=False)
    updated_at: Mapped[str] = mapped_column(default=utc_now, onupdate=utc_now, nullable=False)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="memberships")
    user: Mapped["User"] = relationship("User", back_populates="memberships")
