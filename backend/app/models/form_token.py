"""Form tokens + submissions tracking."""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class FormSubmission(BaseModel):
    """Registro de cada envio de formulario publico."""
    __tablename__ = "form_submissions"

    form_id = Column(String(50), nullable=False, index=True)
    token_id = Column(UUID(as_uuid=True), ForeignKey("form_tokens.id", ondelete="SET NULL"))
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="SET NULL"))
    submitted_by = Column(String(255))
    submitted_email = Column(String(255))
    data = Column(JSON, default=dict)
    result = Column(JSON)
    entity_type = Column(String(50))
    entity_id = Column(String(36))
    ip_address = Column(String(50))


class FormToken(BaseModel):
    """Token de acceso a formulario publico."""
    __tablename__ = "form_tokens"

    token = Column(String(64), nullable=False, unique=True, index=True)
    form_id = Column(String(50), nullable=False, index=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="SET NULL"))
    recipient_email = Column(String(255), nullable=False)
    recipient_name = Column(String(255))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    max_uses = Column(Integer, default=1)
    uses = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    sent_at = Column(DateTime(timezone=True))
    submitted_at = Column(DateTime(timezone=True))
    created_by = Column(String(255))
    metadata_ = Column("metadata", JSON)
