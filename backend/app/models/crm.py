"""Modelos CRM: visitas, emails, planes de cuenta, acciones, reviews mensuales."""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, Date, DateTime,
    ForeignKey, JSON,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.enums import (
    VisitType, VisitResult, EmailStatus, ActionStatus, ActionPriority,
)


class Visit(BaseModel):
    """Registro de visitas comerciales."""
    __tablename__ = "visits"

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    visit_date = Column(DateTime(timezone=True), nullable=False)
    visit_type = Column(SAEnum(VisitType), nullable=False)
    duration_minutes = Column(Integer)
    location = Column(String(500))
    attendees_internal = Column(JSON)
    attendees_external = Column(JSON)
    result = Column(SAEnum(VisitResult), nullable=False)
    summary = Column(Text)
    key_findings = Column(JSON)
    pain_points = Column(JSON)
    next_steps = Column(JSON)
    follow_up_date = Column(Date)
    follow_up_notes = Column(Text)
    metadata_ = Column("metadata", JSON)
    # Demo report fields (FORM-VISIT-002)
    demo_modules = Column(JSON)
    demo_type = Column(String(50))
    demo_environment = Column(String(100))
    demo_product_version = Column(String(20))
    demo_positive_reactions = Column(Text)
    demo_technical_questions = Column(Text)
    demo_gaps = Column(Text)
    demo_score = Column(Integer)
    demo_poc_requested = Column(String(50))
    objections = Column(Text)

    lead = relationship("Lead", back_populates="visits")


class Email(BaseModel):
    """Gestión de emails comerciales."""
    __tablename__ = "emails"

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String(500), nullable=False)
    body_html = Column(Text)
    body_text = Column(Text)
    template_id = Column(String(100))
    to_email = Column(String(255), nullable=False)
    from_email = Column(String(255))
    cc = Column(JSON)
    status = Column(SAEnum(EmailStatus), default=EmailStatus.DRAFT, index=True)
    sent_at = Column(DateTime(timezone=True))
    opened_at = Column(DateTime(timezone=True))
    clicked_at = Column(DateTime(timezone=True))
    replied_at = Column(DateTime(timezone=True))
    resend_id = Column(String(255))
    is_follow_up = Column(Boolean, default=False)
    follow_up_sequence = Column(Integer)
    parent_email_id = Column(UUID(as_uuid=True), ForeignKey("emails.id"), nullable=True)
    scheduled_at = Column(DateTime(timezone=True))
    metadata_ = Column("metadata", JSON)
    # Email briefing fields (FORM-EMAIL-001)
    email_type = Column(String(50))
    objective = Column(String(255))
    platform = Column(String(50))
    segment = Column(String(255))
    persona_icp = Column(String(100))
    exclusions = Column(Text)
    copy_notes = Column(Text)
    ab_variant = Column(String(10))

    lead = relationship("Lead", back_populates="emails")
    follow_ups = relationship("Email", foreign_keys=[parent_email_id])


class AccountPlan(BaseModel):
    """Plan de cuenta por cliente."""
    __tablename__ = "account_plans"

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, unique=True)
    objective = Column(Text)
    value_proposition = Column(Text)
    target_products = Column(JSON)
    estimated_deal_value = Column(Float)
    estimated_close_date = Column(Date)
    decision_makers = Column(JSON)
    champions = Column(JSON)
    blockers = Column(JSON)
    competitive_landscape = Column(Text)
    strengths = Column(JSON)
    weaknesses = Column(JSON)
    opportunities_list = Column(JSON)
    threats = Column(JSON)
    milestones = Column(JSON)
    notes = Column(Text)
    last_reviewed = Column(Date)

    lead = relationship("Lead", back_populates="account_plan")


class Action(BaseModel):
    """Acciones de seguimiento comercial."""
    __tablename__ = "actions"

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    action_type = Column(String(100))
    status = Column(SAEnum(ActionStatus), default=ActionStatus.PENDING, index=True)
    priority = Column(SAEnum(ActionPriority), default=ActionPriority.MEDIUM)
    due_date = Column(Date, nullable=False)
    completed_date = Column(Date)
    assigned_to = Column(String(255))
    result = Column(Text)

    lead = relationship("Lead", back_populates="actions")


class MonthlyReview(BaseModel):
    """Seguimiento mensual del proyecto por cliente."""
    __tablename__ = "monthly_reviews"

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    review_month = Column(Integer, nullable=False)
    review_year = Column(Integer, nullable=False)
    project_status = Column(String(50))
    health_score = Column(Integer)
    summary = Column(Text)
    conversations_held = Column(JSON)
    emails_sent = Column(Integer, default=0)
    emails_received = Column(Integer, default=0)
    meetings_held = Column(Integer, default=0)
    actions_completed = Column(JSON)
    actions_pending = Column(JSON)
    actions_planned = Column(JSON)
    improvements_identified = Column(JSON)
    client_feedback = Column(Text)
    notes = Column(Text)

    lead = relationship("Lead", back_populates="monthly_reviews")
