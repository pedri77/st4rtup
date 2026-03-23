"""Modelo de usuario del sistema."""
from sqlalchemy import Column, String, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel
from app.models.enums import UserRole
from sqlalchemy import Enum as SAEnum


class User(BaseModel):
    """
    Usuarios del sistema CRM.
    Se sincroniza con Supabase Auth pero mantiene metadatos adicionales.
    """
    __tablename__ = "users"

    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255))
    avatar_url = Column(String(500))
    phone = Column(String(50))
    role = Column(SAEnum(UserRole), default=UserRole.VIEWER, nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    preferences = Column(JSON)
    last_login_at = Column(DateTime(timezone=True))
    invited_at = Column(DateTime(timezone=True))
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes = Column(String)
