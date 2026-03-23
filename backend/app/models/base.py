import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class TimestampMixin:
    """Mixin for created_at and updated_at fields."""
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class BaseModel(Base, TimestampMixin):
    """Abstract base model with UUID primary key and timestamps."""
    __abstract__ = True

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
