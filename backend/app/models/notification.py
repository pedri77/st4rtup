from sqlalchemy import Column, String, Boolean, Text, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class NotificationType(str, enum.Enum):
    """Tipos de notificaciones"""
    SYSTEM = "system"  # Actualizaciones del sistema, mantenimiento
    LEAD = "lead"  # Nuevo lead, cambio de estado
    ACTION = "action"  # Nueva acción, recordatorio, vencida
    OPPORTUNITY = "opportunity"  # Nueva opp, cambio de etapa, cierre
    VISIT = "visit"  # Visita programada, recordatorio
    EMAIL = "email"  # Email enviado, rebote, respuesta
    REVIEW = "review"  # Monthly review generada
    AUTOMATION = "automation"  # Ejecución de automatización


class NotificationPriority(str, enum.Enum):
    """Prioridad de la notificación"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Notification(Base):
    """
    Notificaciones del sistema para alertar a los usuarios sobre eventos importantes.
    """
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # FK a users (por implementar)

    type = Column(SQLEnum(NotificationType, name="notification_type"), nullable=False, index=True)
    priority = Column(SQLEnum(NotificationPriority, name="notification_priority"), default=NotificationPriority.MEDIUM)

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # Metadata adicional (JSON con info del evento)
    # Ejemplo: {"lead_id": "uuid", "lead_name": "Acme Corp", "old_status": "new", "new_status": "contacted"}
    # Usamos 'event_metadata' en Python pero 'metadata' en la DB (metadata es reservado en SQLAlchemy)
    event_metadata = Column("metadata", Text)  # JSON string

    # URL de acción (ej: /leads/uuid, /actions/uuid)
    action_url = Column(String(500))

    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    def __repr__(self):
        return f"<Notification {self.title} ({self.type})>"
