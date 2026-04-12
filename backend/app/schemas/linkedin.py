"""Pydantic schemas para MOD-LINKEDIN-001."""
from typing import Optional
from pydantic import BaseModel, Field


class LinkedInGenerateRequest(BaseModel):
    """Request para generar un post de LinkedIn."""
    topic: str = Field(..., min_length=3, max_length=500, description="Tema del post")
    framework: str = Field(
        "hook_story_cta",
        description="Framework de escritura: hook_story_cta, aida, listicle, contrarian, personal_story, data_driven, poll, carousel",
    )
    tone: str = Field("expert", description="Tono: expert, casual, inspirational, provocative")
    language: str = Field("es", description="Idioma: es, en")
    include_hashtags: bool = True
    include_emoji: bool = True
    max_words: int = Field(250, ge=50, le=500)
    context: Optional[str] = Field(None, description="Contexto extra para el LLM")


class LinkedInGenerateResponse(BaseModel):
    generated: bool
    content: Optional[str] = None
    hook: Optional[str] = None
    framework: str
    hashtags: list[str] = []
    estimated_reading_time: Optional[int] = None
    model: Optional[str] = None
    error: Optional[str] = None


class LinkedInPublishRequest(BaseModel):
    """Request para publicar un post directamente en LinkedIn."""
    post_id: str = Field(..., description="ID del SocialPost en la BD")


class LinkedInPublishResponse(BaseModel):
    published: bool
    external_id: Optional[str] = None
    external_url: Optional[str] = None
    error: Optional[str] = None


class LinkedInOAuthCallback(BaseModel):
    code: str
    state: Optional[str] = None


class LinkedInProfileResponse(BaseModel):
    connected: bool
    name: Optional[str] = None
    headline: Optional[str] = None
    profile_url: Optional[str] = None
    followers: Optional[int] = None
    error: Optional[str] = None


class LinkedInAnalyticsResponse(BaseModel):
    posts_count: int = 0
    total_impressions: int = 0
    total_likes: int = 0
    total_comments: int = 0
    total_shares: int = 0
    avg_engagement_rate: float = 0.0
    best_day: Optional[str] = None
    best_hour: Optional[int] = None
    top_hashtags: list[dict] = []
    weekly_trend: list[dict] = []


class LinkedInTemplateResponse(BaseModel):
    id: str
    name: str
    framework: str
    description: str
    template: str
    example: str
    best_for: list[str]


class BestTimeResponse(BaseModel):
    recommended_times: list[dict]
    timezone: str = "Europe/Madrid"
    source: str = "aggregate_data"
