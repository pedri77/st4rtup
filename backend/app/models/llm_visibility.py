"""Modelos para LLM Visibility: monitorización de menciones en LLMs."""
from sqlalchemy import Column, String, Text, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class LLMVisibilityQuery(BaseModel):
    """Query predefinida para monitorizar en distintos LLMs."""
    __tablename__ = "llm_visibility_queries"

    query_text = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)  # brand, competitor, product, regulation
    brand_keywords = Column(JSON)  # ["st4rtup", "st4rtup.app"]
    competitor_keywords = Column(JSON)  # ["onetrust", "vanta", "drata"]
    is_active = Column(Boolean, default=True, index=True)
    run_frequency = Column(String(20), default="weekly")  # daily, weekly, monthly
    providers = Column(JSON)  # ["openai", "anthropic", "google"] — which LLMs to query
    notes = Column(Text)

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    results = relationship("LLMVisibilityResult", back_populates="query", cascade="all, delete-orphan")


class LLMVisibilityResult(BaseModel):
    """Resultado de ejecutar una query de visibilidad en un LLM."""
    __tablename__ = "llm_visibility_results"

    query_id = Column(
        UUID(as_uuid=True),
        ForeignKey("llm_visibility_queries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = Column(String(30), nullable=False, index=True)  # openai, anthropic, google
    model = Column(String(50))
    response_text = Column(Text)

    # Analysis
    brand_mentioned = Column(Boolean, default=False)
    brand_sentiment = Column(String(20))  # positive, neutral, negative, not_mentioned
    competitor_mentions = Column(JSON)  # {"onetrust": true, "vanta": false, ...}
    position_rank = Column(Integer)  # 1=first mentioned, 2=second, 0=not mentioned
    mention_context = Column(Text)  # Extracted snippet where brand appears

    # Meta
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    error = Column(Text)

    # Relationships
    query = relationship("LLMVisibilityQuery", back_populates="results")
