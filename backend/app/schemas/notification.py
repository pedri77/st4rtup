from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import Optional

from app.models.notification import NotificationType, NotificationPriority


# Base schemas
class NotificationBase(BaseModel):
    """Base notification schema"""
    model_config = ConfigDict(populate_by_name=True)

    type: NotificationType
    priority: NotificationPriority = NotificationPriority.MEDIUM
    title: str = Field(..., max_length=255)
    message: str
    event_metadata: Optional[str] = Field(None, validation_alias="metadata")  # Alias for input only, avoids SQLAlchemy Base.metadata conflict
    action_url: Optional[str] = Field(None, max_length=500)


class NotificationCreate(NotificationBase):
    """Schema para crear notificación"""
    user_id: UUID


class NotificationUpdate(BaseModel):
    """Schema para actualizar notificación (principalmente marcar como leída)"""
    is_read: Optional[bool] = None


class NotificationInDB(NotificationBase):
    """Notification en DB"""
    id: UUID
    user_id: UUID
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    # Override to remove alias — avoids SQLAlchemy Base.metadata conflict with from_attributes
    event_metadata: Optional[str] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class NotificationResponse(NotificationInDB):
    """Response para API"""
    pass


class NotificationStats(BaseModel):
    """Estadísticas de notificaciones"""
    total: int
    unread: int
    by_type: dict[str, int]
    by_priority: dict[str, int]
