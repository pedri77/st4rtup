"""Schemas de contactos/stakeholders."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import EmailStr, Field

from app.models.enums import ContactRoleType, ContactInfluenceLevel, ContactRelationship
from app.schemas.base import BaseSchema, TimestampSchema


class ContactCreate(BaseSchema):
    """Schema para crear un contacto/stakeholder."""
    lead_id: UUID
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    linkedin_url: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    role_type: ContactRoleType = ContactRoleType.OTHER
    influence_level: ContactInfluenceLevel = ContactInfluenceLevel.UNKNOWN
    relationship_status: ContactRelationship = ContactRelationship.UNKNOWN
    is_primary: bool = False
    is_budget_holder: bool = False
    is_technical_evaluator: bool = False
    reports_to: Optional[UUID] = None
    linkedin_data: Optional[dict] = None
    enrichment_data: Optional[dict] = None
    avatar_url: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class ContactUpdate(BaseSchema):
    """Schema para actualizar un contacto/stakeholder."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    linkedin_url: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    role_type: Optional[ContactRoleType] = None
    influence_level: Optional[ContactInfluenceLevel] = None
    relationship_status: Optional[ContactRelationship] = None
    is_primary: Optional[bool] = None
    is_budget_holder: Optional[bool] = None
    is_technical_evaluator: Optional[bool] = None
    reports_to: Optional[UUID] = None
    last_contacted_at: Optional[datetime] = None
    last_interaction_type: Optional[str] = None
    engagement_score: Optional[int] = Field(default=None, ge=0, le=100)
    linkedin_data: Optional[dict] = None
    enrichment_data: Optional[dict] = None
    avatar_url: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class ContactResponse(TimestampSchema):
    """Schema de respuesta de contacto/stakeholder."""
    id: UUID
    lead_id: UUID
    lead_name: Optional[str] = None
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    linkedin_url: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    role_type: ContactRoleType
    influence_level: ContactInfluenceLevel
    relationship_status: ContactRelationship
    is_primary: bool
    is_budget_holder: bool
    is_technical_evaluator: bool
    reports_to: Optional[UUID] = None
    last_contacted_at: Optional[datetime] = None
    last_interaction_type: Optional[str] = None
    engagement_score: int
    linkedin_data: Optional[dict] = None
    enrichment_data: Optional[dict] = None
    avatar_url: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
