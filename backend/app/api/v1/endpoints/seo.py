"""Endpoints para SEO Organic y Geo-SEO."""
import logging
from typing import Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.seo import SEOKeyword, SEORanking, GeoPage, NAPAudit, GeoKeywordRanking
from app.schemas.seo import (
    SEOKeywordCreate, SEOKeywordUpdate, SEOKeywordResponse,
    SEORankingCreate, SEORankingResponse,
    GeoPageCreate, GeoPageUpdate, GeoPageResponse,
    NAPAuditCreate, NAPAuditResponse,
    GeoKeywordRankingCreate, GeoKeywordRankingResponse,
)
from app.schemas.base import PaginatedResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# SEO Keywords
# ═══════════════════════════════════════════════════════════════


@router.get("/keywords", response_model=PaginatedResponse)
async def list_keywords(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista keywords SEO monitorizadas."""
    query = select(SEOKeyword).order_by(desc(SEOKeyword.created_at))
    if category:
        query = query.where(SEOKeyword.category == category)
    if is_active is not None:
        query = query.where(SEOKeyword.is_active.is_(is_active))
    if search:
        query = query.where(SEOKeyword.keyword.ilike(f"%{search}%"))

    count_q = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_q) or 0
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[SEOKeywordResponse.model_validate(k) for k in result.scalars().all()],
        total=total, page=page, page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("/keywords", response_model=SEOKeywordResponse, status_code=201)
async def create_keyword(
    data: SEOKeywordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea una keyword SEO para monitorizar."""
    kw = SEOKeyword(**data.model_dump(), created_by=UUID(current_user["user_id"]))
    db.add(kw)
    await db.commit()
    await db.refresh(kw)
    return SEOKeywordResponse.model_validate(kw)


@router.post("/keywords/seed")
async def seed_keywords(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Genera keywords predefinidas para GRC/cybersecurity en España."""
    seeds = [
        {"keyword": "plataforma grc", "category": "grc", "search_volume": 390},
        {"keyword": "software cumplimiento normativo", "category": "compliance", "search_volume": 320},
        {"keyword": "esquema nacional de seguridad", "category": "ens", "search_volume": 1900},
        {"keyword": "cumplimiento ens", "category": "ens", "search_volume": 480},
        {"keyword": "nis2 españa", "category": "nis2", "search_volume": 720},
        {"keyword": "directiva nis2 cumplimiento", "category": "nis2", "search_volume": 590},
        {"keyword": "dora reglamento", "category": "dora", "search_volume": 880},
        {"keyword": "iso 27001 software", "category": "iso27001", "search_volume": 1300},
        {"keyword": "gestión de riesgos ciberseguridad", "category": "grc", "search_volume": 720},
        {"keyword": "herramienta análisis de riesgos", "category": "grc", "search_volume": 480},
        {"keyword": "eu ai act compliance", "category": "ai_act", "language": "en", "search_volume": 2400},
        {"keyword": "grc platform europe", "category": "grc", "language": "en", "search_volume": 880},
        {"keyword": "cybersecurity compliance software", "category": "compliance", "language": "en", "search_volume": 1600},
        {"keyword": "st4rtup", "category": "brand", "search_volume": 10},
        {"keyword": "auditoría de seguridad informática", "category": "grc", "search_volume": 590},
    ]

    created = 0
    for s in seeds:
        existing = await db.execute(
            select(SEOKeyword).where(SEOKeyword.keyword == s["keyword"])
        )
        if existing.scalar_one_or_none():
            continue
        kw = SEOKeyword(
            keyword=s["keyword"],
            category=s.get("category", "grc"),
            language=s.get("language", "es"),
            location="Spain",
            search_volume=s.get("search_volume"),
            is_active=True,
            created_by=UUID(current_user["user_id"]),
        )
        db.add(kw)
        created += 1

    if created > 0:
        await db.commit()
    return {"created": created, "total_seeds": len(seeds)}


@router.put("/keywords/{keyword_id}", response_model=SEOKeywordResponse)
async def update_keyword(
    keyword_id: UUID,
    data: SEOKeywordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza una keyword SEO."""
    result = await db.execute(select(SEOKeyword).where(SEOKeyword.id == keyword_id))
    kw = result.scalar_one_or_none()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword no encontrada")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(kw, key, value)
    await db.commit()
    await db.refresh(kw)
    return SEOKeywordResponse.model_validate(kw)


@router.delete("/keywords/{keyword_id}", status_code=204)
async def delete_keyword(
    keyword_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina una keyword y sus rankings."""
    result = await db.execute(select(SEOKeyword).where(SEOKeyword.id == keyword_id))
    kw = result.scalar_one_or_none()
    if not kw:
        raise HTTPException(status_code=404, detail="Keyword no encontrada")
    await db.delete(kw)
    await db.commit()


# ═══════════════════════════════════════════════════════════════
# SEO Rankings
# ═══════════════════════════════════════════════════════════════


@router.get("/rankings", response_model=PaginatedResponse)
async def list_rankings(
    keyword_id: Optional[UUID] = None,
    country: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista rankings SEO con filtros."""
    query = select(SEORanking).order_by(desc(SEORanking.check_date))
    if keyword_id:
        query = query.where(SEORanking.keyword_id == keyword_id)
    if country:
        query = query.where(SEORanking.country == country)
    if date_from:
        query = query.where(SEORanking.check_date >= date_from)
    if date_to:
        query = query.where(SEORanking.check_date <= date_to)

    count_q = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_q) or 0
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[SEORankingResponse.model_validate(r) for r in result.scalars().all()],
        total=total, page=page, page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("/rankings", response_model=SEORankingResponse, status_code=201)
async def create_ranking(
    data: SEORankingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Registra un ranking (manual o automático)."""
    ranking = SEORanking(**data.model_dump())
    db.add(ranking)
    await db.commit()
    await db.refresh(ranking)
    return SEORankingResponse.model_validate(ranking)


@router.post("/rankings/bulk", status_code=201)
async def create_rankings_bulk(
    items: list[SEORankingCreate],
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Registra rankings en bulk (para crons/n8n)."""
    created = 0
    for item in items:
        ranking = SEORanking(**item.model_dump())
        db.add(ranking)
        created += 1
    await db.commit()
    return {"created": created}


# ═══════════════════════════════════════════════════════════════
# Geo Pages
# ═══════════════════════════════════════════════════════════════


@router.get("/geo/pages", response_model=PaginatedResponse)
async def list_geo_pages(
    country: Optional[str] = None,
    region: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista páginas geo-localizadas."""
    query = select(GeoPage).order_by(desc(GeoPage.created_at))
    if country:
        query = query.where(GeoPage.country == country)
    if region:
        query = query.where(GeoPage.region == region)
    if status:
        query = query.where(GeoPage.status == status)

    count_q = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_q) or 0
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[GeoPageResponse.model_validate(p) for p in result.scalars().all()],
        total=total, page=page, page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("/geo/pages", response_model=GeoPageResponse, status_code=201)
async def create_geo_page(
    data: GeoPageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea una página geo-localizada."""
    page_obj = GeoPage(**data.model_dump(), created_by=UUID(current_user["user_id"]))
    db.add(page_obj)
    await db.commit()
    await db.refresh(page_obj)
    return GeoPageResponse.model_validate(page_obj)


@router.put("/geo/pages/{page_id}", response_model=GeoPageResponse)
async def update_geo_page(
    page_id: UUID,
    data: GeoPageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza una página geo-localizada."""
    result = await db.execute(select(GeoPage).where(GeoPage.id == page_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Geo page no encontrada")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(p, key, value)
    await db.commit()
    await db.refresh(p)
    return GeoPageResponse.model_validate(p)


@router.delete("/geo/pages/{page_id}", status_code=204)
async def delete_geo_page(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina una página geo-localizada."""
    result = await db.execute(select(GeoPage).where(GeoPage.id == page_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Geo page no encontrada")
    await db.delete(p)
    await db.commit()


# ═══════════════════════════════════════════════════════════════
# NAP Audits
# ═══════════════════════════════════════════════════════════════


@router.get("/geo/nap", response_model=PaginatedResponse)
async def list_nap_audits(
    is_consistent: Optional[bool] = None,
    country: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista auditorías NAP."""
    query = select(NAPAudit).order_by(desc(NAPAudit.check_date))
    if is_consistent is not None:
        query = query.where(NAPAudit.is_consistent.is_(is_consistent))
    if country:
        query = query.where(NAPAudit.country == country)

    count_q = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_q) or 0
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[NAPAuditResponse.model_validate(a) for a in result.scalars().all()],
        total=total, page=page, page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("/geo/nap", response_model=NAPAuditResponse, status_code=201)
async def create_nap_audit(
    data: NAPAuditCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Registra una auditoría NAP."""
    audit = NAPAudit(**data.model_dump(), created_by=UUID(current_user["user_id"]))
    db.add(audit)
    await db.commit()
    await db.refresh(audit)
    return NAPAuditResponse.model_validate(audit)


@router.delete("/geo/nap/{audit_id}", status_code=204)
async def delete_nap_audit(
    audit_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina una auditoría NAP."""
    result = await db.execute(select(NAPAudit).where(NAPAudit.id == audit_id))
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(status_code=404, detail="NAP audit no encontrada")
    await db.delete(a)
    await db.commit()


# ═══════════════════════════════════════════════════════════════
# Geo Keyword Rankings
# ═══════════════════════════════════════════════════════════════


@router.get("/geo/rankings", response_model=PaginatedResponse)
async def list_geo_rankings(
    keyword: Optional[str] = None,
    location: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista rankings geo-localizados."""
    query = select(GeoKeywordRanking).order_by(desc(GeoKeywordRanking.check_date))
    if keyword:
        query = query.where(GeoKeywordRanking.keyword.ilike(f"%{keyword}%"))
    if location:
        query = query.where(GeoKeywordRanking.location == location)

    count_q = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_q) or 0
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[GeoKeywordRankingResponse.model_validate(r) for r in result.scalars().all()],
        total=total, page=page, page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("/geo/rankings", response_model=GeoKeywordRankingResponse, status_code=201)
async def create_geo_ranking(
    data: GeoKeywordRankingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Registra un ranking geo-localizado."""
    ranking = GeoKeywordRanking(**data.model_dump())
    db.add(ranking)
    await db.commit()
    await db.refresh(ranking)
    return GeoKeywordRankingResponse.model_validate(ranking)


@router.post("/geo/rankings/bulk", status_code=201)
async def create_geo_rankings_bulk(
    items: list[GeoKeywordRankingCreate],
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Registra rankings geo en bulk (para crons/n8n)."""
    created = 0
    for item in items:
        ranking = GeoKeywordRanking(**item.model_dump())
        db.add(ranking)
        created += 1
    await db.commit()
    return {"created": created}


# ═══════════════════════════════════════════════════════════════
# Stats (unified dashboard)
# ═══════════════════════════════════════════════════════════════


@router.get("/stats")
async def get_seo_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estadísticas unificadas SEO + Geo-SEO."""
    total_keywords = await db.scalar(select(func.count()).select_from(SEOKeyword)) or 0
    active_keywords = await db.scalar(
        select(func.count()).select_from(SEOKeyword).where(SEOKeyword.is_active.is_(True))
    ) or 0
    total_rankings = await db.scalar(select(func.count()).select_from(SEORanking)) or 0

    # Keywords by category
    cat_q = await db.execute(
        select(SEOKeyword.category, func.count(SEOKeyword.id))
        .where(SEOKeyword.category.isnot(None))
        .group_by(SEOKeyword.category)
    )
    by_category = {row[0]: row[1] for row in cat_q.all()}

    # Avg position from latest rankings
    avg_pos = await db.scalar(
        select(func.avg(SEORanking.position)).where(SEORanking.position.isnot(None))
    )

    # Geo stats
    total_geo_pages = await db.scalar(select(func.count()).select_from(GeoPage)) or 0
    total_nap = await db.scalar(select(func.count()).select_from(NAPAudit)) or 0
    nap_consistent = await db.scalar(
        select(func.count()).select_from(NAPAudit).where(NAPAudit.is_consistent.is_(True))
    ) or 0
    total_geo_rankings = await db.scalar(select(func.count()).select_from(GeoKeywordRanking)) or 0

    # Geo pages by country
    geo_country_q = await db.execute(
        select(GeoPage.country, func.count(GeoPage.id)).group_by(GeoPage.country)
    )
    geo_by_country = {row[0]: row[1] for row in geo_country_q.all()}

    return {
        "seo": {
            "keywords_total": total_keywords,
            "keywords_active": active_keywords,
            "rankings_total": total_rankings,
            "avg_position": round(float(avg_pos), 1) if avg_pos else None,
            "by_category": by_category,
        },
        "geo": {
            "pages_total": total_geo_pages,
            "nap_total": total_nap,
            "nap_consistent": nap_consistent,
            "nap_rate": round((nap_consistent / total_nap * 100), 1) if total_nap > 0 else None,
            "rankings_total": total_geo_rankings,
            "by_country": geo_by_country,
        },
    }
