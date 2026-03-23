"""Schemas Pydantic para Llamadas con IA."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# ─── Call Prompts ────────────────────────────────────────────

class CallPromptCreate(BaseModel):
    nombre: str
    objetivo: str
    persona_target: Optional[list[str]] = None
    regulatory_focus: Optional[list[str]] = None
    idioma: str = "es"
    voz_id: Optional[str] = None
    system_prompt: str
    primer_mensaje: str
    variables_dinamicas: Optional[list[str]] = None
    fallback_responses: Optional[list] = None
    objetivo_llamada: Optional[str] = None
    duracion_objetivo_min: int = 5
    max_duracion_min: int = 15
    activo: bool = True


class CallPromptUpdate(BaseModel):
    nombre: Optional[str] = None
    objetivo: Optional[str] = None
    persona_target: Optional[list[str]] = None
    regulatory_focus: Optional[list[str]] = None
    idioma: Optional[str] = None
    voz_id: Optional[str] = None
    system_prompt: Optional[str] = None
    primer_mensaje: Optional[str] = None
    variables_dinamicas: Optional[list[str]] = None
    fallback_responses: Optional[list] = None
    objetivo_llamada: Optional[str] = None
    duracion_objetivo_min: Optional[int] = None
    max_duracion_min: Optional[int] = None
    activo: Optional[bool] = None


class CallPromptResponse(BaseModel):
    id: UUID
    nombre: str
    objetivo: str
    persona_target: Optional[list[str]] = None
    regulatory_focus: Optional[list[str]] = None
    idioma: str
    voz_id: Optional[str] = None
    system_prompt: str
    primer_mensaje: str
    variables_dinamicas: Optional[list[str]] = None
    fallback_responses: Optional[list] = None
    objetivo_llamada: Optional[str] = None
    duracion_objetivo_min: int
    max_duracion_min: int
    activo: bool
    version: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CallPromptVersionResponse(BaseModel):
    id: UUID
    prompt_id: UUID
    version: int
    snapshot: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Call Records ────────────────────────────────────────────

class CallInitiateRequest(BaseModel):
    lead_id: UUID
    prompt_id: UUID
    to_number: Optional[str] = None  # Override, default from lead
    consent: bool = False  # RGPD consent for recording


class CallCompleteRequest(BaseModel):
    resultado: str  # interesado | no_interesado | callback | demo_agendada | propuesta_solicitada | sin_respuesta
    siguiente_accion: Optional[str] = None
    fecha_siguiente: Optional[datetime] = None
    notas_agente: Optional[str] = None


class CallRecordResponse(BaseModel):
    id: UUID
    lead_id: UUID
    prompt_id: Optional[UUID] = None
    prompt_version: Optional[int] = None
    initiated_by: Optional[UUID] = None
    retell_call_id: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    duracion_segundos: Optional[int] = None
    estado: str
    resultado: Optional[str] = None
    transcripcion: Optional[str] = None
    resumen_ia: Optional[str] = None
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    siguiente_accion: Optional[str] = None
    fecha_siguiente: Optional[datetime] = None
    notas_agente: Optional[str] = None
    interrupciones: Optional[int] = None
    turnos_conversacion: Optional[int] = None
    latencia_media_ms: Optional[int] = None
    minutos_facturados: Optional[float] = None
    coste_eur: Optional[float] = None
    score_antes: Optional[int] = None
    score_despues: Optional[int] = None
    consentimiento_grabacion: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Call Queues (Fase 2) ────────────────────────────────────

class CallQueueCreate(BaseModel):
    name: str
    prompt_id: UUID
    lead_ids: List[UUID] = Field(..., min_length=1, max_length=200)
    scheduled_at: Optional[datetime] = None
    concurrency_limit: int = Field(default=1, ge=1, le=5)
    delay_between_calls_s: int = Field(default=30, ge=5, le=300)
    max_retries: int = Field(default=2, ge=0, le=5)
    notes: Optional[str] = None


class CallQueueUpdate(BaseModel):
    name: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    concurrency_limit: Optional[int] = None
    delay_between_calls_s: Optional[int] = None
    max_retries: Optional[int] = None
    notes: Optional[str] = None


class CallQueueItemResponse(BaseModel):
    id: UUID
    queue_id: UUID
    lead_id: UUID
    call_record_id: Optional[UUID] = None
    position: int
    status: str
    retry_count: int
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CallQueueResponse(BaseModel):
    id: UUID
    name: str
    status: str
    prompt_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    total_leads: int
    completed_calls: int
    failed_calls: int
    estimated_cost_eur: float
    actual_cost_eur: float
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    concurrency_limit: int
    delay_between_calls_s: int
    max_retries: int
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CallQueueDetailResponse(CallQueueResponse):
    items: List[CallQueueItemResponse] = []


class CallQueueStatsResponse(BaseModel):
    total_queues: int = 0
    active_queues: int = 0
    total_calls_queued: int = 0
    total_calls_completed: int = 0
    total_calls_failed: int = 0
    total_cost_eur: float = 0.0
