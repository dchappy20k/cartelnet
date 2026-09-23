from typing import Optional, List, Literal
from pydantic import BaseModel, EmailStr

OrgType = Literal["GOVERNMENT_AUTHORITY", "COMPANY"]
RoleType = Literal["ADMIN", "PROCUREMENT_OFFICER", "COMPLIANCE_ANALYST", "INVESTIGATOR", "VIEWER"]


class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    organization_name: str
    organization_type: OrgType = "GOVERNMENT_AUTHORITY"


class UserLogin(BaseModel):
    email: str
    password: str


class OrganizationProfile(BaseModel):
    id: str
    name: str
    type: str
    role: str


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
    organization: OrganizationProfile


class UserMeResponse(BaseModel):
    user: UserProfile
    organizations: List[OrganizationProfile]
