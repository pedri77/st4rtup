"""Modelos para el módulo de Llamadas con IA (MOD-AICALLS-001)."""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, JSON, ForeignKey,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import BaseModel

# ─── Call Queue (Fase 2) ─────────────────────────────────────


class CallQueue(BaseModel):
    """Cola de llamadas para batch calling."""
    __tablename__ = "call_queues"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    name = Column(String(255), nullable=False)
    status = Column(String(30), nullable=False, default="pending", index=True)
    # pending | running | paused | completed | failed | cancelled
    prompt_id = Column(
        UUID(as_uuid=True),
        ForeignKey("call_prompts.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    total_leads = Column(Integer, default=0)
    completed_calls = Column(Integer, default=0)
    failed_calls = Column(Integer, default=0)
    estimated_cost_eur = Column(Float, default=0.0)
    actual_cost_eur = Column(Float, default=0.0)

    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    concurrency_limit = Column(Integer, default=1)
    delay_between_calls_s = Column(Integer, default=30)
    max_retries = Column(Integer, default=2)
    notes = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSON, default={})

    # Relationships
    prompt = relationship("CallPrompt")
    items = relationship(
        "CallQueueItem", back_populates="queue",
        cascade="all, delete-orphan", order_by="CallQueueItem.position",
    )


class CallQueueItem(BaseModel):
    """Item individual dentro de una cola de llamadas."""
    __tablename__ = "call_queue_items"

    queue_id = Column(
        UUID(as_uuid=True),
        ForeignKey("call_queues.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    lead_id = Column(
        UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
    )
    call_record_id = Column(
        UUID(as_uuid=True),
        ForeignKey("call_records.id", ondelete="SET NULL"),
        nullable=True,
    )
    position = Column(Integer, default=0)
    status = Column(String(30), nullable=False, default="pending", index=True)
    # pending | calling | completed | failed | skipped
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    # Relationships
    queue = relationship("CallQueue", back_populates="items")
    lead = relationship("Lead")
    call_record = relationship("CallRecord")


class CallPrompt(BaseModel):
    """Prompt/guión para llamadas con IA."""
    __tablename__ = "call_prompts"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)

    nombre = Column(String(255), nullable=False)
    objetivo = Column(String(50), nullable=False, index=True)
    # prospecting | followup_demo | closing | reactivation | qualification
    persona_target = Column(ARRAY(String))  # CEO, DPO, CTO, MSSP
    regulatory_focus = Column(ARRAY(String))  # ENS, NIS2, DORA, ISO27001, any
    idioma = Column(String(5), default="es")
    voz_id = Column(String(100))
    system_prompt = Column(Text, nullable=False)
    primer_mensaje = Column(Text, nullable=False)
    variables_dinamicas = Column(ARRAY(String))
    fallback_responses = Column(JSON, default=[])
    objetivo_llamada = Column(Text)
    duracion_objetivo_min = Column(Integer, default=5)
    max_duracion_min = Column(Integer, default=15)
    activo = Column(Boolean, default=True, index=True)
    version = Column(Integer, default=1)

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    versions = relationship(
        "CallPromptVersion", back_populates="prompt",
        cascade="all, delete-orphan", order_by="CallPromptVersion.version.desc()",
    )


class CallPromptVersion(BaseModel):
    """Snapshot histórico de un prompt."""
    __tablename__ = "call_prompt_versions"

    prompt_id = Column(
        UUID(as_uuid=True),
        ForeignKey("call_prompts.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    version = Column(Integer, nullable=False)
    snapshot = Column(JSON, nullable=False)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    prompt = relationship("CallPrompt", back_populates="versions")


class CallRecord(BaseModel):
    """Registro de una llamada con IA."""
    __tablename__ = "call_records"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)

    # Relaciones
    lead_id = Column(
        UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    prompt_id = Column(
        UUID(as_uuid=True),
        ForeignKey("call_prompts.id", ondelete="SET NULL"),
        nullable=True,
    )
    prompt_version = Column(Integer)
    initiated_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Datos Retell
    retell_call_id = Column(String(255), unique=True)
    retell_agent_id = Column(String(255))

    # Metadatos de la llamada
    fecha_inicio = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha_fin = Column(DateTime(timezone=True))
    duracion_segundos = Column(Integer)

    # Estado y resultado
    estado = Column(String(30), nullable=False, default="iniciando", index=True)
    # iniciando | conectando | activa | finalizada | fallida | no_contesta | buzon
    resultado = Column(String(30), index=True)
    # interesado | no_interesado | callback | demo_agendada | propuesta_solicitada | sin_respuesta

    # Contenido
    transcripcion = Column(Text)
    resumen_ia = Column(Text)
    sentiment = Column(String(20))  # positivo | neutral | negativo
    sentiment_score = Column(Float)  # -1.0 a 1.0

    # Acciones derivadas
    siguiente_accion = Column(Text)
    fecha_siguiente = Column(DateTime(timezone=True))
    notas_agente = Column(Text)

    # Métricas IA
    interrupciones = Column(Integer, default=0)
    turnos_conversacion = Column(Integer, default=0)
    latencia_media_ms = Column(Integer)

    # Coste
    minutos_facturados = Column(Float)
    coste_eur = Column(Float)

    # Scoring impact
    score_antes = Column(Integer)
    score_despues = Column(Integer)

    # RGPD
    consentimiento_grabacion = Column(Boolean, default=False)

    # Relationships
    lead = relationship("Lead", backref="call_records")
    prompt = relationship("CallPrompt")
