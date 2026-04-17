"""Modelos para formularios operativos: BANT, Partners, Onboarding, Churn, ROI."""
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, Date, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class LeadBANT(BaseModel):
    """Cualificacion BANT de un lead."""
    __tablename__ = "lead_bant"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=True, index=True)
    qualification_date = Column(Date)
    # Budget
    has_budget = Column(String(50))
    budget_range = Column(String(50))
    budget_approver = Column(String(255))
    budget_approval_period = Column(String(20))
    budget_notes = Column(Text)
    score_budget = Column(Integer, default=0)
    # Authority
    is_contact_decision_maker = Column(String(50))
    decision_maker_name = Column(String(255))
    decision_maker_title = Column(String(255))
    contacted_decision_maker = Column(String(50))
    stakeholder_map = Column(Text)
    score_authority = Column(Integer, default=0)
    # Need
    pain_point = Column(String(255))
    regulatory_urgency = Column(String(100))
    current_situation = Column(Text)
    desired_situation = Column(Text)
    competitors_evaluated = Column(Text)
    score_need = Column(Integer, default=0)
    # Timeline
    has_implementation_deadline = Column(String(100))
    regulatory_deadline = Column(Date)
    decision_timeframe = Column(String(50))
    buying_phase = Column(String(50))
    next_milestone = Column(String(255))
    score_timeline = Column(Integer, default=0)
    # Total
    score_total = Column(Integer, default=0)
    recommendation = Column(String(50))
    notes = Column(Text)


class Partner(BaseModel):
    """Partner / aliado comercial."""
    __tablename__ = "partners"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    name = Column(String(255), nullable=False)
    partner_type = Column(String(50), nullable=False)
    contact_name = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    agreement_type = Column(String(100))
    commission_pct = Column(Float, default=0)
    territory = Column(String(255))
    status = Column(String(20), default="active")
    notes = Column(Text)
    metadata_ = Column("metadata", JSON)


class OnboardingChecklist(BaseModel):
    """Checklist de onboarding de nuevo cliente."""
    __tablename__ = "onboarding_checklists"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"))
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="SET NULL"))
    client_name = Column(String(255), nullable=False)
    start_date = Column(Date)
    status = Column(String(20), default="pending")
    kickoff_date = Column(Date)
    kickoff_completed = Column(Boolean, default=False)
    access_provisioned = Column(Boolean, default=False)
    data_migration_done = Column(Boolean, default=False)
    training_scheduled = Column(Boolean, default=False)
    training_completed = Column(Boolean, default=False)
    go_live_date = Column(Date)
    go_live_completed = Column(Boolean, default=False)
    csm_assigned = Column(String(255))
    checklist_items = Column(JSON, default=list)
    notes = Column(Text)


class ChurnRecord(BaseModel):
    """Registro de baja / no-renovacion."""
    __tablename__ = "churn_records"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"))
    client_name = Column(String(255), nullable=False)
    churn_date = Column(Date)
    churn_reason = Column(String(100), nullable=False)
    churn_category = Column(String(50))
    previous_arr = Column(Float, default=0)
    contract_duration_months = Column(Integer)
    last_nps = Column(Integer)
    warning_signals = Column(Text)
    retention_attempts = Column(Text)
    competitor_switched_to = Column(String(255))
    win_back_possible = Column(String(50))
    lessons_learned = Column(Text)
    notes = Column(Text)


class ROICalculation(BaseModel):
    """Calculo de ROI para cliente."""
    __tablename__ = "roi_calculations"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"))
    client_name = Column(String(255), nullable=False)
    calculation_date = Column(Date)
    # Without St4rtup
    current_fte_cost = Column(Float, default=0)
    current_tools_cost = Column(Float, default=0)
    current_audit_cost = Column(Float, default=0)
    current_incident_cost = Column(Float, default=0)
    current_penalty_risk = Column(Float, default=0)
    total_current_cost = Column(Float, default=0)
    # With St4rtup
    st4rtup_license_cost = Column(Float, default=0)
    st4rtup_implementation_cost = Column(Float, default=0)
    st4rtup_training_cost = Column(Float, default=0)
    total_st4rtup_cost = Column(Float, default=0)
    # Savings
    fte_savings = Column(Float, default=0)
    tools_savings = Column(Float, default=0)
    audit_savings = Column(Float, default=0)
    risk_reduction = Column(Float, default=0)
    total_savings = Column(Float, default=0)
    # ROI
    roi_pct = Column(Float, default=0)
    payback_months = Column(Integer, default=0)
    three_year_value = Column(Float, default=0)
    notes = Column(Text)
