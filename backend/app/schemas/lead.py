"""Schemas de leads."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import EmailStr, Field

from app.models.enums import LeadStatus, LeadSource
from app.schemas.base import BaseSchema, TimestampSchema


class LeadCreate(BaseSchema):
    company_name: str
    company_cif: Optional[str] = None
    company_website: Optional[str] = None
    company_sector: Optional[str] = None
    company_size: Optional[str] = None
    company_revenue: Optional[str] = None
    company_address: Optional[str] = None
    company_city: Optional[str] = None
    company_province: Optional[str] = None
    company_country: str = "España"
    contact_name: Optional[str] = None
    contact_title: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_linkedin: Optional[str] = None
    status: LeadStatus = LeadStatus.NEW
    source: LeadSource = LeadSource.OTHER
    score: int = Field(default=0, ge=0, le=100)
    assigned_to: Optional[str] = None
    regulatory_frameworks: Optional[List[str]] = None
    is_critical_infrastructure: bool = False
    is_public_sector: bool = False
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class LeadUpdate(BaseSchema):
    company_name: Optional[str] = None
    company_cif: Optional[str] = None
    company_website: Optional[str] = None
    company_sector: Optional[str] = None
    company_size: Optional[str] = None
    company_revenue: Optional[str] = None
    company_address: Optional[str] = None
    company_city: Optional[str] = None
    company_province: Optional[str] = None
    company_country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_title: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    contact_linkedin: Optional[str] = None
    status: Optional[LeadStatus] = None
    source: Optional[LeadSource] = None
    score: Optional[int] = Field(default=None, ge=0, le=100)
    assigned_to: Optional[str] = None
    regulatory_frameworks: Optional[List[str]] = None
    is_critical_infrastructure: Optional[bool] = None
    is_public_sector: Optional[bool] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class LeadResponse(TimestampSchema):
    id: UUID
    company_name: str
    company_cif: Optional[str] = None
    company_website: Optional[str] = None
    company_sector: Optional[str] = None
    company_size: Optional[str] = None
    company_city: Optional[str] = None
    company_province: Optional[str] = None
    company_country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_title: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: LeadStatus
    source: LeadSource
    score: int
    regulatory_frameworks: Optional[List[str]] = None
    is_critical_infrastructure: bool
    is_public_sector: bool
    tags: Optional[List[str]] = None


class LeadDetail(LeadResponse):
    company_revenue: Optional[str] = None
    company_address: Optional[str] = None
    contact_linkedin: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    visits_count: Optional[int] = 0
    emails_count: Optional[int] = 0
    actions_pending: Optional[int] = 0
    enrichment_data: Optional[dict] = None
    enriched_at: Optional[datetime] = None
    enrichment_source: Optional[str] = None
