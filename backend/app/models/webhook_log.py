"""Modelo para log de webhooks entrantes."""
from sqlalchemy import Column, String, Text, JSON, Boolean

from app.models.base import BaseModel


class WebhookLog(BaseModel):
    """Log de webhooks recibidos (Typeform, Tally, etc.)."""
    __tablename__ = "webhook_logs"

    provider = Column(String(50), nullable=False, index=True)  # typeform, tally
    event_type = Column(String(100))  # form_response, submission
    form_id = Column(String(255))  # ID del formulario
    form_name = Column(String(255))  # Nombre del formulario
    submission_id = Column(String(255), unique=True)  # Para idempotencia
    payload = Column(JSON)  # Raw webhook payload
    parsed_data = Column(JSON)  # Parsed lead data
    lead_created = Column(Boolean, default=False)
    lead_id = Column(String(36))  # UUID del lead creado (si aplica)
    error = Column(Text)  # Error si falló el procesamiento
    ip_address = Column(String(50))
