"""Modelos de pipeline: oportunidades y ofertas."""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Date, DateTime, Boolean,
    ForeignKey, JSON,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.enums import OpportunityStage, OfferStatus


class Opportunity(BaseModel):
    """Pipeline de oportunidades comerciales."""
    __tablename__ = "opportunities"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(500), nullable=False)
    description = Column(Text)
    stage = Column(SAEnum(OpportunityStage), default=OpportunityStage.DISCOVERY, index=True)
    probability = Column(Integer, default=10)
    value = Column(Float)
    currency = Column(String(3), default="EUR")
    recurring_revenue = Column(Float)
    expected_close_date = Column(Date)
    actual_close_date = Column(Date)
    products = Column(JSON)
    win_reason = Column(Text)
    loss_reason = Column(Text)
    competitor = Column(String(255))
    notes = Column(Text)

    # GTM fields
    pricing_tier = Column(String(50))  # pilot_poc, enterprise, smb
    pricing_modules = Column(JSON)  # ["grc_core", "ens_alto", "nis2"]
    pricing_discount_pct = Column(Float, default=0)
    pricing_duration_months = Column(Integer, default=12)
    pricing_calculated = Column(Float)  # Precio calculado automáticamente
    pricing_margin_pct = Column(Float)  # Margen bruto %
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id", ondelete="SET NULL"), nullable=True)
    tactics_applied = Column(JSON)  # ["email_abm", "retell_calls", ...]

    # Proposal briefing fields (FORM-DEAL-002)
    proposal_deadline = Column(Date)
    modules_requested = Column(JSON)
    regulatory_frameworks = Column(JSON)
    num_licenses = Column(Integer)
    integrations_required = Column(Text)
    deployment_env = Column(String(100))
    sla_required = Column(String(50))
    security_requirements = Column(Text)
    pricing_model = Column(String(100))
    include_poc = Column(Boolean, default=False)
    payment_terms = Column(String(255))
    include_roi = Column(Boolean, default=False)
    include_competitor_comparison = Column(Boolean, default=False)
    delivery_format = Column(String(50))
    competitors_in_evaluation = Column(Text)

    lead = relationship("Lead", back_populates="opportunities")
    offers = relationship("Offer", back_populates="opportunity")


class Offer(BaseModel):
    """Ofertas/propuestas comerciales."""
    __tablename__ = "offers"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="SET NULL"), nullable=True)

    # Identification
    reference = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)

    # Status
    status = Column(SAEnum(OfferStatus), default=OfferStatus.DRAFT, nullable=False, index=True)

    # Line items
    items = Column(JSON)

    # Financial
    subtotal = Column(Float, default=0)
    tax_rate = Column(Float, default=21)
    tax_amount = Column(Float, default=0)
    discount_percent = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    total = Column(Float, default=0)
    currency = Column(String(3), default="EUR")

    # Terms
    valid_until = Column(Date)
    payment_terms = Column(String(500))
    terms_conditions = Column(Text)

    # Tracking
    sent_at = Column(DateTime(timezone=True))
    accepted_at = Column(DateTime(timezone=True))
    rejected_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)

    # E-signature
    signature_provider = Column(String(20))
    signature_request_id = Column(String(255))
    signature_url = Column(String(1000))
    signature_status = Column(String(20))
    signed_at = Column(DateTime(timezone=True))

    # Invoicing
    invoice_provider = Column(String(20))
    invoice_id = Column(String(255))
    invoice_number = Column(String(100))
    invoice_url = Column(String(1000))
    invoice_status = Column(String(20))
    invoiced_at = Column(DateTime(timezone=True))

    # Ownership
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Notes
    notes = Column(Text)
    tags = Column(JSON)

    # Relationships
    lead = relationship("Lead", back_populates="offers")
    opportunity = relationship("Opportunity", back_populates="offers")
