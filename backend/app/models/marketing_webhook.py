"""Modelos para webhooks de marketing n8n."""
from sqlalchemy import (
    Column, String, Text, Integer, Boolean, Date,
    DateTime, JSON, ForeignKey, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class MarketingWebhookLog(BaseModel):
    """Log de webhooks de marketing procesados por n8n."""
    __tablename__ = "marketing_webhook_logs"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    event_id = Column(String(255), unique=True, nullable=False, index=True)
    webhook_type = Column(String(50), nullable=False, index=True)
    source = Column(String(100))
    payload = Column(JSON)
    result = Column(JSON)
    entities_affected = Column(Integer, default=0)
    success = Column(Boolean, default=True)
    error = Column(Text)
    processing_ms = Column(Integer)
    ip_address = Column(String(50))


class LeadAttribution(BaseModel):
    """Atribución de leads a canales y campañas de marketing."""
    __tablename__ = "lead_attributions"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(50))
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"))
    utm_source = Column(String(100))
    utm_medium = Column(String(100))
    utm_campaign = Column(String(255))
    landing_page = Column(String(500))
    country = Column(String(10))
    region = Column(String(100))
    touchpoint_at = Column(DateTime(timezone=True))
    attribution_model = Column(String(30), default="last_touch")
    is_converting = Column(Boolean, default=False)


class MarketingMetricsCache(BaseModel):
    """Cache de métricas consolidadas de marketing."""
    __tablename__ = "marketing_metrics_cache"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    date = Column(Date, nullable=False, index=True)
    source = Column(String(50), nullable=False)
    country_code = Column(String(10), default="ES")
    metrics = Column(JSON, nullable=False)

    __table_args__ = (
        UniqueConstraint('date', 'source', 'country_code', name='uq_metrics_cache'),
    )
