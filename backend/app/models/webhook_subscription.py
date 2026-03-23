"""Modelo para suscripciones de webhooks salientes (Zapier, Make, n8n, custom)."""
from sqlalchemy import Column, String, Text, JSON, Boolean

from app.models.base import BaseModel


class WebhookSubscription(BaseModel):
    """Suscripcion a eventos del CRM para enviar webhooks salientes."""
    __tablename__ = "webhook_subscriptions"

    name = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    secret = Column(String(255))  # HMAC secret for signature verification
    events = Column(JSON, default=[])  # ["lead.created", "opportunity.won", ...]
    is_active = Column(Boolean, default=True)
    headers = Column(JSON)  # Custom headers {"X-Api-Key": "..."}
    last_status = Column(String(20))  # success, error
    last_error = Column(Text)
    total_sent = Column(String(20), default="0")
    total_errors = Column(String(20), default="0")
