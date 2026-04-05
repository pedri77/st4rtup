"""Modelos de automatizaciones n8n."""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime,
    ForeignKey, JSON, UniqueConstraint,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.enums import (
    AutomationStatus, AutomationCategory, AutomationPriority,
    AutomationComplexity, AutomationTriggerType, AutomationPhase,
    AutomationImplStatus,
)


class Automation(BaseModel):
    """Definición y configuración de automatizaciones."""
    __tablename__ = "automations"
    __table_args__ = (UniqueConstraint("org_id", "code", name="uq_automation_org_code"),)

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    code = Column(String(10), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(SAEnum(AutomationCategory), nullable=False, index=True)
    trigger_type = Column(SAEnum(AutomationTriggerType), nullable=False)
    trigger_config = Column(JSON)
    actions_description = Column(Text)
    actions_config = Column(JSON)
    api_endpoints = Column(JSON)
    integrations = Column(JSON)
    priority = Column(SAEnum(AutomationPriority), default=AutomationPriority.MEDIUM, index=True)
    complexity = Column(SAEnum(AutomationComplexity), default=AutomationComplexity.MEDIUM)
    impact = Column(String(255))
    phase = Column(SAEnum(AutomationPhase))
    sprint = Column(String(50))
    estimated_hours = Column(Float)
    dependencies = Column(JSON)
    status = Column(SAEnum(AutomationStatus), default=AutomationStatus.DRAFT, index=True)
    impl_status = Column(SAEnum(AutomationImplStatus), default=AutomationImplStatus.PENDING, index=True)
    is_enabled = Column(Boolean, default=False)
    n8n_workflow_id = Column(String(100))
    n8n_workflow_url = Column(String(500))
    n8n_webhook_url = Column(String(500))
    notes = Column(Text)
    tags = Column(JSON)

    executions = relationship("AutomationExecution", back_populates="automation", cascade="all, delete-orphan")


class AutomationExecution(BaseModel):
    """Log de ejecuciones de automatizaciones."""
    __tablename__ = "automation_executions"

    automation_id = Column(UUID(as_uuid=True), ForeignKey("automations.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    finished_at = Column(DateTime(timezone=True))
    duration_ms = Column(Integer)
    status = Column(String(20), nullable=False, index=True)
    trigger_source = Column(String(100))
    items_processed = Column(Integer, default=0)
    items_succeeded = Column(Integer, default=0)
    items_failed = Column(Integer, default=0)
    error_message = Column(Text)
    error_details = Column(JSON)
    input_data = Column(JSON)
    output_data = Column(JSON)
    n8n_execution_id = Column(String(100))

    automation = relationship("Automation", back_populates="executions")
