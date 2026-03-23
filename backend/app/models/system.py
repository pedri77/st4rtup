"""Modelos de sistema: configuración, chat."""
from sqlalchemy import Column, String, Text, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class SystemSettings(BaseModel):
    """Configuración global del sistema (singleton - una sola fila)."""
    __tablename__ = "system_settings"

    # Email provider config
    email_provider = Column(String(50), default="resend")
    email_from = Column(String(255), default="hello@st4rtup.app")
    email_config = Column(JSON)
    gmail_oauth_config = Column(JSON)

    # Integration configs - Automatizaciones y Notificaciones
    telegram_config = Column(JSON)
    n8n_config = Column(JSON)
    apollo_config = Column(JSON)
    webhook_config = Column(JSON)

    # Integration configs - Prospección y Enriquecimiento
    linkedin_config = Column(JSON)
    clearbit_config = Column(JSON)
    hunter_config = Column(JSON)
    lusha_config = Column(JSON)
    zoominfo_config = Column(JSON)
    phantombuster_config = Column(JSON)

    # Integration configs - Comunicación y Reuniones
    gcalendar_config = Column(JSON)
    outlook_config = Column(JSON)
    calendly_config = Column(JSON)
    zoom_config = Column(JSON)
    whatsapp_config = Column(JSON)
    slack_config = Column(JSON)
    teams_config = Column(JSON)

    # Integration configs - Marketing y Captación
    google_ads_config = Column(JSON)
    linkedin_ads_config = Column(JSON)
    ga4_config = Column(JSON)
    gsc_config = Column(JSON)  # Google Search Console OAuth
    youtube_config = Column(JSON)  # YouTube Data API OAuth
    hubspot_config = Column(JSON)
    typeform_config = Column(JSON)

    # Integration configs - Encuestas
    surveymonkey_config = Column(JSON)
    tally_config = Column(JSON)
    jotform_config = Column(JSON)
    survicate_config = Column(JSON)
    hotjar_config = Column(JSON)
    google_forms_config = Column(JSON)

    # Integration configs - Documentos y Propuestas
    pandadoc_config = Column(JSON)
    docusign_config = Column(JSON)
    yousign_config = Column(JSON)
    gdrive_config = Column(JSON)
    onedrive_config = Column(JSON)
    notion_config = Column(JSON)

    # Integration configs - Datos y Compliance
    einforma_config = Column(JSON)
    cnae_config = Column(JSON)

    # Integration configs - Facturación y Post-venta
    stripe_config = Column(JSON)
    holded_config = Column(JSON)
    facturama_config = Column(JSON)
    intercom_config = Column(JSON)
    freshdesk_config = Column(JSON)

    # AI Providers
    ai_config = Column(JSON)

    # General settings
    general_config = Column(JSON)


class ChatConversation(BaseModel):
    """Conversación de chat con IA."""
    __tablename__ = "chat_conversations"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="Nueva conversación")
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    system_prompt = Column(Text)
    is_archived = Column(Boolean, default=False)
    message_count = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)

    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(BaseModel):
    """Mensaje individual en una conversación de chat."""
    __tablename__ = "chat_messages"

    conversation_id = Column(UUID(as_uuid=True), ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    provider = Column(String(50))
    model = Column(String(100))
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    duration_ms = Column(Integer)
    error = Column(Text)
    metadata_ = Column("metadata", JSON)

    conversation = relationship("ChatConversation", back_populates="messages")
