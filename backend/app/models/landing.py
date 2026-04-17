"""Landing pages tracking."""
from sqlalchemy import Column, ForeignKey, String, Float, Integer, Text, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class LandingPage(BaseModel):
    """Landing page con métricas de conversión."""
    __tablename__ = "landing_pages"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    url = Column(String(1000), nullable=False)
    name = Column(String(255))
    campaign_id = Column(String(36))
    clarity_project_id = Column(String(100))
    visits = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    ctr = Column(Float, default=0)
    conv_rate = Column(Float, default=0)
    bounce_rate = Column(Float, default=0)
    avg_time_seconds = Column(Integer, default=0)
    status = Column(String(20), default="active")  # active, paused, archived
    metadata_ = Column("metadata", JSON)


class WorkflowAuditLog(BaseModel):
    """Audit log centralizado de ejecuciones de workflows n8n."""
    __tablename__ = "workflow_audit_log"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    workflow_id = Column(String(100), nullable=False)
    module = Column(String(50))  # MKT, CALLS, DEAL, CRM, SUPPORT
    trigger_type = Column(String(50))  # cron, webhook, manual
    entity_id = Column(String(36))
    entity_type = Column(String(50))  # lead, opportunity, email, etc.
    status = Column(String(20), default="success")  # success, error, skipped
    error_message = Column(Text)
    payload = Column(JSON)
    duration_ms = Column(Integer)
