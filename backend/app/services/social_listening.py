"""
Social Listening service — monitoriza menciones de marca, competidores y keywords
en redes sociales y web. Utiliza APIs de busqueda + LLM para analisis de sentimiento.
"""
import httpx
import logging
from typing import Optional
from datetime import datetime, timezone

from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)
TIMEOUT = 20.0

# Keywords to monitor
DEFAULT_KEYWORDS = [
    "st4rtup", "ENS alto", "NIS2 cumplimiento", "DORA compliance",
    "growth tecnología España", "SaaS Best Practices plataforma",
]

DEFAULT_COMPETITORS = [
    "OneTrust", "ServiceNow growth", "LogicGate", "Archer growth",
    "Diligent", "Navex Global", "MetricStream", "Qualys",
]


async def search_mentions(
    keywords: list[str] = None,
    max_results: int = 20,
) -> list[dict]:
    """Busca menciones en web usando Google Custom Search o fallback a serper.dev."""
    if not keywords:
        keywords = DEFAULT_KEYWORDS

    results = []
    # Try serper.dev (Google SERP API)
    serper_key = getattr(app_settings, "SERPER_API_KEY", "")
    if serper_key:
        for kw in keywords[:5]:
            try:
                async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                    r = await client.post(
                        "https://google.serper.dev/search",
                        headers={"X-API-KEY": serper_key},
                        json={"q": kw, "num": max_results // len(keywords), "gl": "es", "hl": "es"},
                    )
                    if r.status_code == 200:
                        for item in r.json().get("organic", []):
                            results.append({
                                "keyword": kw,
                                "title": item.get("title", ""),
                                "url": item.get("link", ""),
                                "snippet": item.get("snippet", ""),
                                "source": "google",
                                "date": item.get("date"),
                            })
            except Exception:
                logger.warning("Serper search failed for %s", kw)
    else:
        # Fallback: mock data for demo
        for kw in keywords[:3]:
            results.append({
                "keyword": kw,
                "title": f"Resultado de busqueda para '{kw}'",
                "url": f"https://example.com/search?q={kw}",
                "snippet": f"Contenido relevante sobre {kw} encontrado en la web...",
                "source": "mock",
                "date": datetime.now(timezone.utc).isoformat(),
            })

    return results


async def analyze_sentiment(mentions: list[dict]) -> dict:
    """Analiza sentimiento de las menciones usando LLM."""
    if not mentions:
        return {"positive": 0, "neutral": 0, "negative": 0, "mentions": []}

    texts = "\n".join([f"- {m['title']}: {m['snippet']}" for m in mentions[:10]])
    prompt = (
        f"Analiza el sentimiento de estas menciones sobre St4rtup y ventas B2B:\n\n{texts}\n\n"
        "Clasifica cada una como positive, neutral o negative.\n"
        "Devuelve un resumen con conteos y los 3 insights mas relevantes."
    )

    try:
        from app.agents.lead_intelligence import _call_llm
        result = await _call_llm(
            "Eres un analista de social listening especializado en tecnología B2B.",
            prompt,
        )
        return {
            "analysis": result.get("content", ""),
            "model": result.get("model"),
            "total_mentions": len(mentions),
        }
    except Exception as e:
        return {"error": str(e), "total_mentions": len(mentions)}


async def monitor_competitors(competitors: list[str] = None) -> list[dict]:
    """Monitoriza menciones de competidores."""
    if not competitors:
        competitors = DEFAULT_COMPETITORS

    results = []
    for comp in competitors[:5]:
        mentions = await search_mentions([comp], max_results=5)
        results.append({
            "competitor": comp,
            "mentions_count": len(mentions),
            "mentions": mentions[:3],
        })

    return results


async def get_listening_dashboard() -> dict:
    """Dashboard completo de social listening."""
    brand_mentions = await search_mentions(["st4rtup", "st4rtup CRM"], max_results=10)
    competitor_data = await monitor_competitors()
    sentiment = await analyze_sentiment(brand_mentions)

    return {
        "brand_mentions": brand_mentions,
        "competitors": competitor_data,
        "sentiment": sentiment,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
