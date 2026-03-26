"""Modelo de lead/prospecto."""
from sqlalchemy import Column, ForeignKey, String, Text, Integer, Boolean, JSON, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import Enum as SAEnum

from app.models.base import BaseModel
from app.models.enums import LeadStatus, LeadSource


class Lead(BaseModel):
    """Cliente potencial / Prospecto."""
    __tablename__ = "leads"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    # Company info
    company_name = Column(String(255), nullable=False, index=True)
    company_cif = Column(String(20), unique=True, nullable=True)
    company_website = Column(String(500))
    company_sector = Column(String(100))
    company_size = Column(String(50))
    company_revenue = Column(String(100))
    company_address = Column(Text)
    company_city = Column(String(100))
    company_province = Column(String(100))
    company_country = Column(String(100), default="España")

    # Contact info
    contact_name = Column(String(255))
    contact_title = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    contact_linkedin = Column(String(500))

    # Sales info
    status = Column(SAEnum(LeadStatus), default=LeadStatus.NEW, nullable=False, index=True)
    source = Column(SAEnum(LeadSource), default=LeadSource.OTHER)
    score = Column(Integer, default=0)
    assigned_to = Column(String(255))

    # Regulatory context
    regulatory_frameworks = Column(JSON)
    is_critical_infrastructure = Column(Boolean, default=False)
    is_public_sector = Column(Boolean, default=False)

    # Enrichment (Apollo.io / external)
    enrichment_data = Column(JSON)  # Raw enrichment response
    enriched_at = Column(DateTime(timezone=True))
    enrichment_source = Column(String(50))  # apollo, clearbit, manual

    # Extended fields (FORM-LEAD-001)
    company_revenue = Column(String(100))
    company_address = Column(Text)
    company_postal_code = Column(String(20))
    contact_lastname = Column(String(255))
    contact_language = Column(String(10), default="es")
    decision_role = Column(String(50))
    campaign_origin = Column(String(255))
    review_date = Column(Date)
    priority = Column(String(20))
    ens_level = Column(String(20))
    compliance_deadline = Column(Date)
    current_grc_tool = Column(String(255))

    # Notes
    notes = Column(Text)
    tags = Column(JSON)
    metadata_ = Column("metadata", JSON)

    # GTM: tácticas de captación aplicadas
    acquisition_channel = Column(String(100))  # blog, seo, retell, lemlist, event, referral
    tactics_applied = Column(JSON)  # ["seo_organic", "email_abm", ...]

    # Relationships
    visits = relationship("Visit", back_populates="lead", cascade="all, delete-orphan")
    emails = relationship("Email", back_populates="lead", cascade="all, delete-orphan")
    account_plan = relationship("AccountPlan", back_populates="lead", uselist=False, cascade="all, delete-orphan")
    actions = relationship("Action", back_populates="lead", cascade="all, delete-orphan")
    opportunities = relationship("Opportunity", back_populates="lead", cascade="all, delete-orphan")
    offers = relationship("Offer", back_populates="lead", cascade="all, delete-orphan")
    surveys = relationship("Survey", back_populates="lead", cascade="all, delete-orphan")
    monthly_reviews = relationship("MonthlyReview", back_populates="lead", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="lead", cascade="all, delete-orphan")
