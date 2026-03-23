"""Schemas para el módulo de chat con IA."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=50000)
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(0.7, ge=0, le=2)
    max_tokens: Optional[int] = Field(2048, ge=1, le=32000)


class ChatMessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    provider: Optional[str] = None
    model: Optional[str] = None
    tokens_input: int = 0
    tokens_output: int = 0
    duration_ms: Optional[int] = None
    error: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    title: Optional[str] = "Nueva conversación"
    provider: str = "openai"
    model: Optional[str] = None
    system_prompt: Optional[str] = None


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None
    is_archived: Optional[bool] = None


class ConversationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    provider: str
    model: str
    system_prompt: Optional[str] = None
    is_archived: bool = False
    message_count: int = 0
    total_tokens: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationWithMessages(ConversationResponse):
    messages: List[ChatMessageResponse] = []


class ChatSendRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=50000)
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(0.7, ge=0, le=2)
    max_tokens: Optional[int] = Field(2048, ge=1, le=32000)


class ChatSendResponse(BaseModel):
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
    conversation: ConversationResponse


class AIProviderInfo(BaseModel):
    id: str
    name: str
    models: List[str]
    configured: bool = False
