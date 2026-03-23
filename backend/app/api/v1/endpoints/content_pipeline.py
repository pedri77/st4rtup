"""Content Pipeline — 4 agentes IA para generacion de contenido."""
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user

router = APIRouter()


@router.post("/run")
async def run_content_pipeline(
    topic: str = Query(..., description="Tema del articulo"),
    target_audience: str = Query("CISOs y responsables de compliance en España"),
    word_count: int = Query(1500, ge=500, le=5000),
    current_user: dict = Depends(get_current_user),
):
    """Ejecuta el pipeline completo: Keywords → Borrador → SEO → Meta."""
    from app.services.content_pipeline import run_full_pipeline
    try:
        result = await run_full_pipeline(topic, target_audience, word_count)
        return result
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.post("/keywords")
async def generate_keywords(
    topic: str = Query(...),
    target_audience: str = Query("CISOs y responsables de compliance en España"),
    current_user: dict = Depends(get_current_user),
):
    """Agente 1: Keyword research."""
    from app.services.content_pipeline import agent_keywords
    return await agent_keywords(topic, target_audience)


@router.post("/draft")
async def generate_draft(
    topic: str = Query(...),
    keywords: str = Query(""),
    word_count: int = Query(1500),
    current_user: dict = Depends(get_current_user),
):
    """Agente 2: Genera borrador."""
    from app.services.content_pipeline import agent_draft
    return await agent_draft(topic, keywords, word_count)


@router.post("/seo")
async def optimize_seo(
    draft: str = Query(...),
    primary_keyword: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Agente 3: Optimiza para SEO."""
    from app.services.content_pipeline import agent_seo
    return await agent_seo(draft, primary_keyword)


@router.post("/meta")
async def generate_meta(
    article: str = Query(...),
    primary_keyword: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Agente 4: Genera meta tags."""
    from app.services.content_pipeline import agent_meta
    return await agent_meta(article, primary_keyword)
