"""Models for Deal Room documents and page analytics."""
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class DealRoom(BaseModel):
    __tablename__ = "deal_rooms"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    opportunity_id = Column(UUID(as_uuid=True), nullable=True)
    name = Column(String(255))
    token = Column(UUID(as_uuid=True))
    nda_required = Column(Boolean, default=True)
    nda_template_id = Column(String(255))
    nda_custom_text = Column(Text)


class DealRoomDocument(BaseModel):
    __tablename__ = "deal_room_documents"

    room_id = Column(UUID(as_uuid=True), ForeignKey("deal_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    original_name = Column(String(500), nullable=False)
    storage_path = Column(Text)
    watermarked = Column(Boolean, default=True)
    recipient_email = Column(String(255))
    file_size_bytes = Column(Integer)
    page_count = Column(Integer)
    uploaded_by = Column(String(255))
    is_active = Column(Boolean, default=True)


class DealRoomPageEvent(BaseModel):
    __tablename__ = "deal_room_page_events"

    document_id = Column(UUID(as_uuid=True), ForeignKey("deal_room_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(UUID(as_uuid=True), ForeignKey("deal_rooms.id", ondelete="CASCADE"), nullable=False)
    visitor_email = Column(String(255))
    visitor_token = Column(String(64), nullable=False)
    page_number = Column(Integer, nullable=False)
    entered_at = Column(DateTime(timezone=True), nullable=False)
    exited_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    session_id = Column(String(64), nullable=False, index=True)
    ip_hash = Column(String(64))
    user_agent_hash = Column(String(64))
