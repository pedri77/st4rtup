"""Modelo de conversaciones WhatsApp."""
from sqlalchemy import Column, String, Text, Integer, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.models.base import BaseModel


class WAConversation(BaseModel):
    __tablename__ = "wa_conversations"

    phone = Column(String(30), nullable=False, index=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    lead_name = Column(String(255))
    status = Column(String(20), default="active", index=True)  # active, archived, bot, escalated
    last_message_at = Column(DateTime(timezone=True))
    unread_count = Column(Integer, default=0)
    bot_enabled = Column(Boolean, default=True)
    metadata_ = Column("metadata", JSON, default={})


class WAMessage(BaseModel):
    __tablename__ = "wa_messages"

    conversation_id = Column(UUID(as_uuid=True), ForeignKey("wa_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    direction = Column(String(10), nullable=False)  # inbound | outbound
    message_type = Column(String(20), default="text")  # text, template, image, document, audio
    content = Column(Text)
    wa_message_id = Column(String(255))  # WhatsApp message ID
    status = Column(String(20), default="sent")  # sent, delivered, read, failed
    sender_phone = Column(String(30))
    sender_name = Column(String(255))
    media_url = Column(String(1000))
    metadata_ = Column("metadata", JSON, default={})
