"""Endpoints para LLM Visibility: query bank y ejecución."""
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, Integer

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.llm_visibility import LLMVisibilityQuery, LLMVisibilityResult
from app.schemas.llm_visibility import (
    LLMVisibilityQueryCreate, LLMVisibilityQueryUpdate,
    LLMVisibilityQueryResponse, LLMVisibilityResultResponse,
)
from app.schemas.base import PaginatedResponse
from app.services import llm_visibility_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Queries CRUD ─────────────────────────────────────────────


@router.get("", response_model=PaginatedResponse)
async def list_queries(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista queries de visibilidad LLM."""
    query = select(LLMVisibilityQuery).order_by(desc(LLMVisibilityQuery.created_at))
    if category:
        query = query.where(LLMVisibilityQuery.category == category)
    if is_active is not None:
        query = query.where(LLMVisibilityQuery.is_active.is_(is_active))

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[LLMVisibilityQueryResponse.model_validate(q) for q in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=LLMVisibilityQueryResponse, status_code=201)
async def create_query(
    data: LLMVisibilityQueryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea una query de visibilidad LLM."""
    q = LLMVisibilityQuery(
        **data.model_dump(),
        created_by=UUID(current_user["user_id"]),
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return LLMVisibilityQueryResponse.model_validate(q)


@router.post("/seed")
async def seed_queries(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Genera queries predefinidas para monitorización GRC."""
    seeds = [
        {
            "query_text": "What are the best GRC platforms for cybersecurity compliance in Europe?",
            "category": "brand",
            "brand_keywords": ["st4rtup", "st4rtup.app"],
            "competitor_keywords": ["onetrust", "vanta", "drata", "pirani", "globalsuite", "isotools"],
            "providers": ["openai", "anthropic", "google"],
        },
        {
            "query_text": "¿Cuáles son las mejores plataformas GRC para cumplimiento de ENS y NIS2 en España?",
            "category": "brand",
            "brand_keywords": ["st4rtup"],
            "competitor_keywords": ["onetrust", "pirani", "globalsuite", "isotools", "audidat"],
            "providers": ["openai", "anthropic", "google"],
        },
        {
            "query_text": "Compare GRC tools for ISO 27001, DORA and NIS2 compliance",
            "category": "competitor",
            "brand_keywords": ["st4rtup"],
            "competitor_keywords": ["onetrust", "vanta", "drata", "archer", "servicenow", "diligent"],
            "providers": ["openai", "anthropic", "google"],
        },
        {
            "query_text": "What software should a CISO use to manage cybersecurity risk and compliance?",
            "category": "product",
            "brand_keywords": ["st4rtup"],
            "competitor_keywords": ["onetrust", "vanta", "drata", "rapid7", "qualys", "tenable"],
            "providers": ["openai", "anthropic", "google"],
        },
        {
            "query_text": "¿Qué herramientas recomiendas para gestionar el cumplimiento del Esquema Nacional de Seguridad?",
            "category": "regulation",
            "brand_keywords": ["st4rtup"],
            "competitor_keywords": ["pirani", "globalsuite", "isotools", "audidat", "nettaro"],
            "providers": ["openai", "anthropic", "google"],
        },
        {
            "query_text": "Best platforms for EU AI Act compliance and risk assessment",
            "category": "regulation",
            "brand_keywords": ["st4rtup"],
            "competitor_keywords": ["onetrust", "vanta", "holistic ai", "credo ai", "monitaur"],
            "providers": ["openai", "anthropic", "google"],
        },
    ]

    created = 0
    for seed in seeds:
        # Check if already exists
        existing = await db.execute(
            select(LLMVisibilityQuery).where(
                LLMVisibilityQuery.query_text == seed["query_text"]
            )
        )
        if existing.scalar_one_or_none():
            continue

        q = LLMVisibilityQuery(
            **seed,
            is_active=True,
            run_frequency="weekly",
            created_by=UUID(current_user["user_id"]),
        )
        db.add(q)
        created += 1

    if created > 0:
        await db.commit()

    return {"created": created, "total_seeds": len(seeds)}


# ─── Execute queries ──────────────────────────────────────────


@router.post("/run/{query_id}")
async def run_single_query(
    query_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Ejecuta una query contra todos sus providers configurados."""
    result = await db.execute(
        select(LLMVisibilityQuery).where(LLMVisibilityQuery.id == query_id)
    )
    query = result.scalar_one_or_none()
    if not query:
        raise HTTPException(status_code=404, detail="Query no encontrada")

    results = await llm_visibility_service.run_query(db, query)
    await db.commit()

    return {
        "query_id": str(query_id),
        "results": len(results),
        "by_provider": {
            r.provider: {
                "brand_mentioned": r.brand_mentioned,
                "sentiment": r.brand_sentiment,
                "position": r.position_rank,
                "error": r.error,
            }
            for r in results
        },
    }


@router.post("/run-all")
async def run_all_active(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Ejecuta todas las queries activas."""
    result = await db.execute(
        select(LLMVisibilityQuery).where(LLMVisibilityQuery.is_active.is_(True))
    )
    queries = result.scalars().all()

    total_results = 0
    for query in queries:
        results = await llm_visibility_service.run_query(db, query)
        total_results += len(results)

    await db.commit()

    return {
        "queries_executed": len(queries),
        "total_results": total_results,
    }


# ─── Results ──────────────────────────────────────────────────


@router.get("/results", response_model=PaginatedResponse)
async def list_results(
    query_id: Optional[UUID] = None,
    provider: Optional[str] = None,
    brand_mentioned: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista resultados de visibilidad LLM."""
    query = select(LLMVisibilityResult).order_by(desc(LLMVisibilityResult.created_at))
    if query_id:
        query = query.where(LLMVisibilityResult.query_id == query_id)
    if provider:
        query = query.where(LLMVisibilityResult.provider == provider)
    if brand_mentioned is not None:
        query = query.where(LLMVisibilityResult.brand_mentioned.is_(brand_mentioned))

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[LLMVisibilityResultResponse.model_validate(r) for r in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=max(1, (total + page_size - 1) // page_size),
    )


# ─── Stats & Dashboard ───────────────────────────────────────


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estadísticas de visibilidad LLM."""
    total_queries = await db.scalar(
        select(func.count()).select_from(LLMVisibilityQuery)
    ) or 0
    active_queries = await db.scalar(
        select(func.count()).select_from(LLMVisibilityQuery)
        .where(LLMVisibilityQuery.is_active.is_(True))
    ) or 0
    total_results = await db.scalar(
        select(func.count()).select_from(LLMVisibilityResult)
    ) or 0
    brand_mentions = await db.scalar(
        select(func.count()).select_from(LLMVisibilityResult)
        .where(LLMVisibilityResult.brand_mentioned.is_(True))
    ) or 0

    # By provider
    provider_q = await db.execute(
        select(
            LLMVisibilityResult.provider,
            func.count(LLMVisibilityResult.id),
            func.sum(func.cast(LLMVisibilityResult.brand_mentioned, Integer)),
        ).group_by(LLMVisibilityResult.provider)
    )
    by_provider = {
        row[0]: {"total": row[1], "brand_mentions": int(row[2] or 0)}
        for row in provider_q.all()
    }

    # By sentiment
    sentiment_q = await db.execute(
        select(LLMVisibilityResult.brand_sentiment, func.count(LLMVisibilityResult.id))
        .where(LLMVisibilityResult.brand_sentiment.isnot(None))
        .group_by(LLMVisibilityResult.brand_sentiment)
    )
    by_sentiment = {row[0]: row[1] for row in sentiment_q.all()}

    # By category
    category_q = await db.execute(
        select(LLMVisibilityQuery.category, func.count(LLMVisibilityQuery.id))
        .group_by(LLMVisibilityQuery.category)
    )
    by_category = {row[0]: row[1] for row in category_q.all()}

    # Mention rate
    mention_rate = round((brand_mentions / total_results * 100), 1) if total_results > 0 else 0

    return {
        "queries": {"total": total_queries, "active": active_queries},
        "results": {"total": total_results, "brand_mentions": brand_mentions, "mention_rate": mention_rate},
        "by_provider": by_provider,
        "by_sentiment": by_sentiment,
        "by_category": by_category,
    }


# ─── CRUD by ID ───────────────────────────────────────────────


@router.get("/{query_id}", response_model=LLMVisibilityQueryResponse)
async def get_query(
    query_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene una query por ID."""
    result = await db.execute(
        select(LLMVisibilityQuery).where(LLMVisibilityQuery.id == query_id)
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Query no encontrada")
    return LLMVisibilityQueryResponse.model_validate(q)


@router.put("/{query_id}", response_model=LLMVisibilityQueryResponse)
async def update_query(
    query_id: UUID,
    data: LLMVisibilityQueryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza una query de visibilidad."""
    result = await db.execute(
        select(LLMVisibilityQuery).where(LLMVisibilityQuery.id == query_id)
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Query no encontrada")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(q, key, value)

    await db.commit()
    await db.refresh(q)
    return LLMVisibilityQueryResponse.model_validate(q)


@router.delete("/{query_id}", status_code=204)
async def delete_query(
    query_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina una query y sus resultados."""
    result = await db.execute(
        select(LLMVisibilityQuery).where(LLMVisibilityQuery.id == query_id)
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Query no encontrada")
    await db.delete(q)
    await db.commit()
