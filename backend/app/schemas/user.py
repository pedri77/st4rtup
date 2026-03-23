"""Schemas de usuario."""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import EmailStr

from app.models.enums import UserRole
from app.schemas.base import BaseSchema, TimestampSchema


class UserCreate(BaseSchema):
    """Schema para crear un nuevo usuario (invitar)."""
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.VIEWER
    phone: Optional[str] = None
    notes: Optional[str] = None


class UserUpdate(BaseSchema):
    """Schema para actualizar un usuario existente."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None
    preferences: Optional[dict] = None
    notes: Optional[str] = None


class UserResponse(TimestampSchema):
    """Schema de respuesta de usuario."""
    id: UUID
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    preferences: Optional[dict] = None
    last_login_at: Optional[datetime] = None
    invited_at: Optional[datetime] = None
    invited_by: Optional[UUID] = None
    notes: Optional[str] = None


class UserListItem(BaseSchema):
    """Schema simplificado para listar usuarios."""
    id: UUID
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: UserRole
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
