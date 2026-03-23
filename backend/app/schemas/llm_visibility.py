"""Schemas Pydantic para LLM Visibility."""
from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LLMVisibilityQueryCreate(BaseModel):
    query_text: str
    category: str = "brand"
    brand_keywords: Optional[list[str]] = None
    competitor_keywords: Optional[list[str]] = None
    is_active: bool = True
    run_frequency: str = "weekly"
    providers: Optional[list[str]] = None
    notes: Optional[str] = None


class LLMVisibilityQueryUpdate(BaseModel):
    query_text: Optional[str] = None
    category: Optional[str] = None
    brand_keywords: Optional[list[str]] = None
    competitor_keywords: Optional[list[str]] = None
    is_active: Optional[bool] = None
    run_frequency: Optional[str] = None
    providers: Optional[list[str]] = None
    notes: Optional[str] = None


class LLMVisibilityQueryResponse(BaseModel):
    id: UUID
    query_text: str
    category: str
    brand_keywords: Optional[list[str]] = None
    competitor_keywords: Optional[list[str]] = None
    is_active: bool
    run_frequency: str
    providers: Optional[list[str]] = None
    notes: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LLMVisibilityResultResponse(BaseModel):
    id: UUID
    query_id: UUID
    provider: str
    model: Optional[str] = None
    response_text: Optional[str] = None
    brand_mentioned: bool = False
    brand_sentiment: Optional[str] = None
    competitor_mentions: Optional[dict] = None
    position_rank: Optional[int] = None
    mention_context: Optional[str] = None
    tokens_input: int = 0
    tokens_output: int = 0
    duration_ms: int = 0
    error: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
