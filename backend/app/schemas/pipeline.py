"""Schemas de oportunidades y ofertas."""
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID
from pydantic import Field

from app.models.enums import OpportunityStage, OfferStatus
from app.schemas.base import BaseSchema, TimestampSchema


# ─── Opportunity Schemas ──────────────────────────────────────────

class OpportunityCreate(BaseSchema):
    lead_id: UUID
    name: str
    description: Optional[str] = None
    stage: OpportunityStage = OpportunityStage.DISCOVERY
    probability: int = Field(default=10, ge=0, le=100)
    value: Optional[float] = None
    currency: str = "EUR"
    recurring_revenue: Optional[float] = None
    expected_close_date: Optional[date] = None
    products: Optional[List[str]] = None
    notes: Optional[str] = None


class OpportunityUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    stage: Optional[OpportunityStage] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    value: Optional[float] = None
    currency: Optional[str] = None
    recurring_revenue: Optional[float] = None
    expected_close_date: Optional[date] = None
    products: Optional[List[str]] = None
    notes: Optional[str] = None


class OpportunityResponse(TimestampSchema):
    id: UUID
    lead_id: UUID
    name: str
    stage: OpportunityStage
    probability: int
    value: Optional[float] = None
    currency: str
    recurring_revenue: Optional[float] = None
    expected_close_date: Optional[date] = None
    products: Optional[List[str]] = None


# ─── Offer Schemas ───────────────────────────────────────────────

class OfferCreate(BaseSchema):
    lead_id: UUID
    opportunity_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    items: Optional[List[dict]] = None
    subtotal: float = 0
    tax_rate: float = 21
    tax_amount: float = 0
    discount_percent: float = 0
    discount_amount: float = 0
    total: float = 0
    currency: str = "EUR"
    valid_until: Optional[date] = None
    payment_terms: Optional[str] = None
    terms_conditions: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class OfferUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    opportunity_id: Optional[UUID] = None
    status: Optional[OfferStatus] = None
    items: Optional[List[dict]] = None
    subtotal: Optional[float] = None
    tax_rate: Optional[float] = None
    tax_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    total: Optional[float] = None
    currency: Optional[str] = None
    valid_until: Optional[date] = None
    payment_terms: Optional[str] = None
    terms_conditions: Optional[str] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class OfferResponse(TimestampSchema):
    id: UUID
    lead_id: UUID
    lead_name: Optional[str] = None
    opportunity_id: Optional[UUID] = None
    reference: str
    title: str
    description: Optional[str] = None
    status: OfferStatus
    items: Optional[List[dict]] = None
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount_percent: float
    discount_amount: float
    total: float
    currency: str
    valid_until: Optional[date] = None
    payment_terms: Optional[str] = None
    terms_conditions: Optional[str] = None
    sent_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    signature_provider: Optional[str] = None
    signature_request_id: Optional[str] = None
    signature_url: Optional[str] = None
    signature_status: Optional[str] = None
    signed_at: Optional[datetime] = None
    invoice_provider: Optional[str] = None
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_url: Optional[str] = None
    invoice_status: Optional[str] = None
    invoiced_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
