"""Audit log model for tracking sensitive marketing actions."""
from sqlalchemy import Column, String, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    # Who
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(255), nullable=False)

    # What
    action = Column(String(50), nullable=False)  # create, update, delete, publish, archive, export, login, etc.
    entity_type = Column(String(50), nullable=False)  # campaign, funnel, asset, document, alert, setting, etc.
    entity_id = Column(String(36), nullable=True)
    entity_name = Column(String(255), nullable=True)

    # Details
    description = Column(Text, nullable=True)
    changes = Column(JSON, nullable=True)  # {"field": {"old": x, "new": y}}
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # Module
    module = Column(String(50), default="marketing")  # marketing, crm, system
