from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
import uuid

from app.db.base import Base, TenantAwareModel, utc_now


class Address(TenantAwareModel):
    """Registered physical office address."""
    __tablename__ = "addresses"

    raw_address: Mapped[str] = mapped_column(String(500), nullable=False)
    normalized_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), default="National", nullable=True)

    companies: Mapped[List["Company"]] = relationship("Company", back_populates="address")


class Company(TenantAwareModel):
    """Corporate entity participating in tenders."""
    __tablename__ = "companies"

    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    tax_id: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    address_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Active", nullable=False)

    address: Mapped[Optional["Address"]] = relationship("Address", back_populates="companies")
    directors: Mapped[List["CompanyDirector"]] = relationship("CompanyDirector", back_populates="company", cascade="all, delete-orphan")


class Director(TenantAwareModel):
    """Corporate executive, officer, or board member."""
    __tablename__ = "directors"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    national_id_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    companies: Mapped[List["CompanyDirector"]] = relationship("CompanyDirector", back_populates="director", cascade="all, delete-orphan")


class CompanyDirector(TenantAwareModel):
    """Association linking directors to companies with role terms."""
    __tablename__ = "company_directors"

    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    director_id: Mapped[str] = mapped_column(String(36), ForeignKey("directors.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(100), default="Director", nullable=False)
    appointed_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resigned_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    company: Mapped["Company"] = relationship("Company", back_populates="directors")
    director: Mapped["Director"] = relationship("Director", back_populates="companies")
