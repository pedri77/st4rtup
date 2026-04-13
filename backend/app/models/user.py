"""Modelo de usuario del sistema."""
from sqlalchemy import Column, String, Boolean, DateTime, JSON, ForeignKey, Text
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

    # 2FA
    totp_secret = Column(String(64), nullable=True)
    totp_enabled = Column(Boolean, default=False, nullable=False)
    backup_codes = Column(JSON, nullable=True)


class UserSession(BaseModel):
    """Sesiones activas de un usuario."""
    __tablename__ = "user_sessions"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    device_label = Column(String(100))
    last_active_at = Column(DateTime(timezone=True))
    is_current = Column(Boolean, default=False)
