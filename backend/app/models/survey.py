"""Modelos de encuestas y plantillas de email."""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime,
    ForeignKey, JSON,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.enums import SurveyStatus


class Survey(BaseModel):
    """Encuestas de satisfacción."""
    __tablename__ = "surveys"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    survey_type = Column(String(100))
    status = Column(SAEnum(SurveyStatus), default=SurveyStatus.DRAFT, index=True)
    sent_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    responses = Column(JSON)
    nps_score = Column(Integer)
    overall_score = Column(Float)
    improvements_suggested = Column(JSON)
    follow_up_actions = Column(JSON)
    response_token = Column(String(64), unique=True, index=True)
    external_provider = Column(String(50))
    external_survey_id = Column(String(255))
    external_survey_url = Column(String(1000))
    external_response_data = Column(JSON)
    notes = Column(Text)

    lead = relationship("Lead", back_populates="surveys")


class EmailTemplate(BaseModel):
    """Plantillas de email reutilizables."""
    __tablename__ = "email_templates"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text)
    variables = Column(JSON)
    is_active = Column(Boolean, default=True)
