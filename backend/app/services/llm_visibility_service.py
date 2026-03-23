"""Service for LLM Visibility: queries multiple LLMs and analyzes brand mentions."""
import logging
import time
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm_visibility import LLMVisibilityQuery, LLMVisibilityResult
from app.services.ai_chat_service import AIChatService

logger = logging.getLogger(__name__)

ai_service = AIChatService()

ANALYSIS_SYSTEM_PROMPT = (
    "You are analyzing an AI response for brand visibility monitoring. "
    "Your task is to evaluate whether certain brands/products are mentioned, "
    "their sentiment, and ranking position. Be precise and factual."
)


async def run_query(
    db: AsyncSession,
    query: LLMVisibilityQuery,
    provider_configs: Optional[dict] = None,
) -> list[LLMVisibilityResult]:
    """Execute a visibility query against all configured providers."""
    providers = query.providers or ["openai", "anthropic", "google"]
    brand_keywords = query.brand_keywords or []
    competitor_keywords = query.competitor_keywords or []
    results = []

    for provider in providers:
        start = time.time()
        try:
            config = (provider_configs or {}).get(provider, {})
            response = await ai_service.chat(
                provider=provider,
                messages=[{"role": "user", "content": query.query_text}],
                config=config,
                temperature=0.3,
                max_tokens=1500,
            )

            response_text = response.get("content", "")
            error = response.get("error")
            duration = int((time.time() - start) * 1000)

            # Analyze response
            analysis = _analyze_response(
                response_text,
                brand_keywords,
                competitor_keywords,
            )

            result = LLMVisibilityResult(
                query_id=query.id,
                provider=provider,
                model=response.get("model", ""),
                response_text=response_text,
                brand_mentioned=analysis["brand_mentioned"],
                brand_sentiment=analysis["brand_sentiment"],
                competitor_mentions=analysis["competitor_mentions"],
                position_rank=analysis["position_rank"],
                mention_context=analysis["mention_context"],
                tokens_input=response.get("tokens_input", 0),
                tokens_output=response.get("tokens_output", 0),
                duration_ms=duration,
                error=error,
            )
            db.add(result)
            results.append(result)

        except Exception as e:
            logger.error(f"LLM Visibility error ({provider}): {e}")
            result = LLMVisibilityResult(
                query_id=query.id,
                provider=provider,
                model="",
                response_text="",
                brand_mentioned=False,
                brand_sentiment="not_mentioned",
                competitor_mentions={},
                position_rank=0,
                duration_ms=int((time.time() - start) * 1000),
                error=str(e),
            )
            db.add(result)
            results.append(result)

    await db.flush()
    return results


def _analyze_response(
    text: str,
    brand_keywords: list[str],
    competitor_keywords: list[str],
) -> dict:
    """Analyze LLM response for brand mentions, sentiment, and competitor presence."""
    text_lower = text.lower()

    # Brand detection
    brand_mentioned = False
    brand_positions = []
    for kw in brand_keywords:
        kw_lower = kw.lower()
        if kw_lower in text_lower:
            brand_mentioned = True
            pos = text_lower.index(kw_lower)
            brand_positions.append(pos)

    # Competitor detection
    competitor_mentions = {}
    all_mentions = []  # (position, name, is_brand)

    for kw in competitor_keywords:
        kw_lower = kw.lower()
        found = kw_lower in text_lower
        competitor_mentions[kw] = found
        if found:
            pos = text_lower.index(kw_lower)
            all_mentions.append((pos, kw, False))

    if brand_mentioned and brand_positions:
        all_mentions.append((min(brand_positions), "brand", True))

    # Position rank: order of first mention
    all_mentions.sort(key=lambda x: x[0])
    position_rank = 0
    for i, (_, name, is_brand) in enumerate(all_mentions):
        if is_brand:
            position_rank = i + 1
            break

    # Extract mention context (snippet around first brand mention)
    mention_context = None
    if brand_mentioned and brand_positions:
        pos = min(brand_positions)
        start = max(0, pos - 100)
        end = min(len(text), pos + 200)
        mention_context = text[start:end].strip()
        if start > 0:
            mention_context = "..." + mention_context
        if end < len(text):
            mention_context = mention_context + "..."

    # Simple sentiment analysis based on context
    brand_sentiment = "not_mentioned"
    if brand_mentioned and mention_context:
        ctx_lower = mention_context.lower()
        positive_words = ["recommend", "leading", "best", "excellent", "top", "strong",
                         "recomiend", "líder", "mejor", "excelente", "destacad", "robust"]
        negative_words = ["issue", "problem", "weak", "poor", "lack", "limited",
                         "problema", "débil", "pobre", "limitad", "carece"]

        pos_count = sum(1 for w in positive_words if w in ctx_lower)
        neg_count = sum(1 for w in negative_words if w in ctx_lower)

        if pos_count > neg_count:
            brand_sentiment = "positive"
        elif neg_count > pos_count:
            brand_sentiment = "negative"
        else:
            brand_sentiment = "neutral"

    return {
        "brand_mentioned": brand_mentioned,
        "brand_sentiment": brand_sentiment,
        "competitor_mentions": competitor_mentions,
        "position_rank": position_rank,
        "mention_context": mention_context,
    }
