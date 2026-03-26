"""Modelo de contacto/stakeholder."""
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import Enum as SAEnum

from app.models.base import BaseModel
from app.models.enums import ContactRoleType, ContactInfluenceLevel, ContactRelationship


class Contact(BaseModel):
    """Contacto/stakeholder de una empresa (lead)."""
    __tablename__ = "contacts"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)

    # Personal info
    full_name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    mobile = Column(String(50))
    linkedin_url = Column(String(500))

    # Professional info
    job_title = Column(String(255))
    department = Column(String(100))
    role_type = Column(SAEnum(ContactRoleType, values_callable=lambda x: [e.value for e in x]), default=ContactRoleType.OTHER, index=True)

    # Sales mapping (power map)
    influence_level = Column(SAEnum(ContactInfluenceLevel, values_callable=lambda x: [e.value for e in x]), default=ContactInfluenceLevel.UNKNOWN)
    relationship_status = Column(SAEnum(ContactRelationship, values_callable=lambda x: [e.value for e in x]), default=ContactRelationship.UNKNOWN)
    is_primary = Column(Boolean, default=False)
    is_budget_holder = Column(Boolean, default=False)
    is_technical_evaluator = Column(Boolean, default=False)
    reports_to = Column(UUID(as_uuid=True), nullable=True)

    # Engagement
    last_contacted_at = Column(DateTime(timezone=True))
    last_interaction_type = Column(String(50))
    engagement_score = Column(Integer, default=0)

    # Enrichment data
    linkedin_data = Column(JSON)
    enrichment_data = Column(JSON)
    avatar_url = Column(String(500))

    # Notes
    notes = Column(Text)
    tags = Column(JSON)

    # Relationships
    lead = relationship("Lead", back_populates="contacts")
