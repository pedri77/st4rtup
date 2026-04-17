"""Social Media endpoints — programar, publicar y trackear posts."""
from typing import Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.social import SocialPost, SocialRecurrence

router = APIRouter()


class PostCreate(BaseModel):
    platform: str
    content: str
    media_url: str = ""
    scheduled_at: Optional[datetime] = None
    tags: list[str] = []


class PostUpdate(BaseModel):
    content: Optional[str] = None
    status: Optional[str] = None
    impressions: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None
    clicks: Optional[int] = None
    external_url: Optional[str] = None


@router.get("/")
async def list_posts(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    q = select(SocialPost).order_by(desc(SocialPost.created_at)).limit(limit)
    if platform:
        q = q.where(SocialPost.platform == platform)
    if status:
        q = q.where(SocialPost.status == status)
    result = await db.execute(q)
    return {"posts": [
        {
            "id": str(p.id), "platform": p.platform, "content": p.content[:200],
            "status": p.status, "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
            "published_at": p.published_at.isoformat() if p.published_at else None,
            "external_url": p.external_url, "impressions": p.impressions,
            "likes": p.likes, "comments": p.comments, "shares": p.shares, "clicks": p.clicks,
            "tags": p.tags or [],
        }
        for p in result.scalars().all()
    ]}


@router.post("/", status_code=201)
async def create_post(
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    post = SocialPost(
        platform=data.platform, content=data.content,
        media_url=data.media_url, scheduled_at=data.scheduled_at,
        status="scheduled" if data.scheduled_at else "draft",
        tags=data.tags,
    )
    db.add(post)
    await db.commit()
    return {"created": True, "id": str(post.id)}


@router.put("/{post_id}")
async def update_post(
    post_id: UUID,
    data: PostUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    result = await db.execute(select(SocialPost).where(SocialPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(post, field, value)
    await db.commit()
    return {"updated": True}


@router.get("/stats")
async def social_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Stats de redes sociales por plataforma."""
    q = select(
        SocialPost.platform,
        func.count(SocialPost.id),
        func.coalesce(func.sum(SocialPost.impressions), 0),
        func.coalesce(func.sum(SocialPost.likes), 0),
        func.coalesce(func.sum(SocialPost.comments), 0),
        func.coalesce(func.sum(SocialPost.shares), 0),
        func.coalesce(func.sum(SocialPost.clicks), 0),
    ).group_by(SocialPost.platform)
    result = (await db.execute(q)).all()

    return {
        "by_platform": [
            {
                "platform": r[0], "posts": r[1], "impressions": int(r[2]),
                "likes": int(r[3]), "comments": int(r[4]),
                "shares": int(r[5]), "clicks": int(r[6]),
                "engagement": int(r[3]) + int(r[4]) + int(r[5]),
            }
            for r in result
        ],
        "total_posts": sum(r[1] for r in result),
        "total_engagement": sum(int(r[3]) + int(r[4]) + int(r[5]) for r in result),
    }


@router.post("/seed")
async def seed_social_posts(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Precarga posts de ejemplo para cada plataforma."""
    defaults = [
        {"platform": "linkedin", "content": "🔐 ¿Tu empresa cumple con el Enterprise?\n\nEl 80% de las empresas españolas reguladas necesitan actualizar su estrategia de tecnología antes de 2027.\n\nSt4rtup ofrece una plataforma growth completa con:\n✅ Enterprise nativo\n✅ NIS2 y DORA integrados\n✅ SOC 24x7 con Detection Engineering\n✅ IA para automatización de compliance\n\nPoC de 90 días por €19.500.\n\n#Ciberseguridad #growth #ENS #NIS2 #DORA",
         "status": "published", "impressions": 1250, "likes": 45, "comments": 8, "shares": 12, "tags": ["ENS", "tecnología"]},
        {"platform": "linkedin", "content": "📊 NIS2 entra en vigor en octubre 2026.\n\n¿Está tu empresa preparada?\n\n3 acciones inmediatas:\n1️⃣ Identifica si tu sector está afectado\n2️⃣ Evalúa tu nivel de madurez actual\n3️⃣ Implementa un plan de cumplimiento\n\n#NIS2 #Ciberseguridad #Compliance",
         "status": "published", "impressions": 890, "likes": 32, "comments": 5, "shares": 8, "tags": ["NIS2"]},
        {"platform": "twitter", "content": "🚀 Enterprise + NIS2 + DORA en una sola plataforma. Soberanía 100% EU. PoC 90 días → st4rtup.app #Ciberseguridad #growth #ENS",
         "status": "published", "impressions": 450, "likes": 18, "comments": 3, "shares": 6, "tags": ["ENS", "growth"]},
        {"platform": "youtube", "content": "🎥 Cómo implementar Enterprise en 90 días | Demo St4rtup\n\n⏱️ 00:00 Intro · 01:30 Qué es ENS · 03:00 Demo · 08:00 Controles · 12:00 SOC · 15:00 Pricing",
         "status": "published", "impressions": 320, "likes": 15, "comments": 4, "shares": 2, "tags": ["ENS", "demo"]},
        {"platform": "linkedin", "content": "💡 DORA obligatorio para entidades financieras UE desde enero 2025.\n\nSt4rtup ayuda a banca, seguros y fintech a mapear riesgos TIC, documentar incidentes y reportar al regulador.\n\n#DORA #Fintech #Banca #RegTech",
         "status": "draft", "tags": ["DORA", "banca"]},
    ]
    created = 0
    for d in defaults:
        existing = (await db.execute(select(SocialPost).limit(10))).scalars().all()
        if len(existing) < 10:  # Only seed if < 10 posts exist
            db.add(SocialPost(**d))
            created += 1
        else:
            break
    await db.commit()
    return {"seeded": created}


@router.post("/generate")
async def generate_social_post(
    platform: str = Query("linkedin"),
    topic: str = Query(""),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Genera contenido para redes sociales con IA."""
    if not topic:
        topic = "ventas B2B para empresas españolas"

    prompts = {
        "linkedin": f"Crea un post de LinkedIn profesional en español sobre {topic}. Incluye emojis, hashtags (#Ciberseguridad #growth #ENS #NIS2), CTA. Máximo 300 palabras. Tono: experto pero accesible.",
        "twitter": f"Crea un tweet en español sobre {topic}. Máximo 280 caracteres. Incluye hashtags relevantes. Directo y con gancho.",
        "youtube": f"Crea un título + descripción para un vídeo de YouTube sobre {topic}. Título SEO (max 60 chars). Descripción con timestamps, keywords y CTA. En español.",
    }

    prompt = prompts.get(platform, prompts["linkedin"])

    try:
        from app.agents.lead_intelligence import _call_llm
        result = await _call_llm(
            "Eres un experto en marketing B2B de tecnología para St4rtup. Genera contenido para redes sociales.",
            prompt,
        )
        content = result.get("content", "")
        if content:
            return {"generated": True, "content": content, "platform": platform, "model": result.get("model")}
        return {"generated": False, "error": result.get("error", "Sin respuesta")}
    except Exception as e:
        return {"generated": False, "error": str(e)}


# ═══════════════════════════════════════════════════════════════
# Recurrence (auto-programacion recurrente)
# ═══════════════════════════════════════════════════════════════


class RecurrenceCreate(BaseModel):
    name: str
    platform: str
    content_template: str
    media_url: str = ""
    tags: list[str] = []
    frequency: str  # daily, weekly, biweekly, monthly
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time_of_day: str = "10:00"


class RecurrenceUpdate(BaseModel):
    name: Optional[str] = None
    content_template: Optional[str] = None
    media_url: Optional[str] = None
    tags: Optional[list[str]] = None
    frequency: Optional[str] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time_of_day: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/recurrences")
async def list_recurrences(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(SocialRecurrence).order_by(desc(SocialRecurrence.created_at))
    )
    return {"recurrences": [
        {
            "id": str(r.id), "name": r.name, "platform": r.platform,
            "content_template": r.content_template[:200], "frequency": r.frequency,
            "day_of_week": r.day_of_week, "day_of_month": r.day_of_month,
            "time_of_day": r.time_of_day, "is_active": r.is_active,
            "total_generated": r.total_generated, "tags": r.tags or [],
            "next_run": r.next_run.isoformat() if r.next_run else None,
        }
        for r in result.scalars().all()
    ]}


@router.post("/recurrences", status_code=201)
async def create_recurrence(
    data: RecurrenceCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    from datetime import timedelta, timezone
    rec = SocialRecurrence(
        name=data.name, platform=data.platform,
        content_template=data.content_template, media_url=data.media_url,
        tags=data.tags, frequency=data.frequency,
        day_of_week=data.day_of_week, day_of_month=data.day_of_month,
        time_of_day=data.time_of_day,
    )
    # Calculate next_run
    now = datetime.now(timezone.utc)
    h, m = map(int, data.time_of_day.split(":"))
    next_run = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if next_run <= now:
        next_run += timedelta(days=1)
    rec.next_run = next_run

    db.add(rec)
    await db.commit()
    return {"created": True, "id": str(rec.id)}


@router.put("/recurrences/{rec_id}")
async def update_recurrence(
    rec_id: UUID,
    data: RecurrenceUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    result = await db.execute(select(SocialRecurrence).where(SocialRecurrence.id == rec_id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recurrence not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rec, field, value)
    await db.commit()
    return {"updated": True}


@router.delete("/recurrences/{rec_id}", status_code=204)
async def delete_recurrence(
    rec_id: UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    result = await db.execute(select(SocialRecurrence).where(SocialRecurrence.id == rec_id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recurrence not found")
    await db.delete(rec)
    await db.commit()


@router.post("/recurrences/{rec_id}/generate-now")
async def generate_from_recurrence(
    rec_id: UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Genera un post ahora a partir de una recurrencia."""
    result = await db.execute(select(SocialRecurrence).where(SocialRecurrence.id == rec_id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recurrence not found")

    now = datetime.now()
    content = rec.content_template.replace("{date}", now.strftime("%d/%m/%Y"))
    content = content.replace("{week}", str(now.isocalendar()[1]))
    content = content.replace("{month}", now.strftime("%B"))

    post = SocialPost(
        platform=rec.platform, content=content,
        media_url=rec.media_url, status="draft",
        tags=rec.tags, recurrence_id=str(rec.id),
    )
    db.add(post)
    rec.total_generated = (rec.total_generated or 0) + 1
    await db.commit()
    return {"created": True, "post_id": str(post.id), "content_preview": content[:200]}


# ═══════════════════════════════════════════════════════════════
# Social Listening
# ═══════════════════════════════════════════════════════════════


@router.get("/listening/dashboard")
async def social_listening_dashboard(
    _current_user: dict = Depends(get_current_user),
):
    """Dashboard de social listening: menciones, competidores, sentimiento."""
    from app.services.social_listening import get_listening_dashboard
    return await get_listening_dashboard()


@router.post("/listening/search")
async def social_listening_search(
    keywords: list[str] = Query(default=[]),
    max_results: int = Query(20, ge=1, le=100),
    _current_user: dict = Depends(get_current_user),
):
    """Busca menciones de keywords especificas."""
    from app.services.social_listening import search_mentions
    mentions = await search_mentions(keywords or None, max_results)
    return {"mentions": mentions, "total": len(mentions)}


@router.get("/listening/competitors")
async def social_listening_competitors(
    _current_user: dict = Depends(get_current_user),
):
    """Monitoriza menciones de competidores."""
    from app.services.social_listening import monitor_competitors
    return {"competitors": await monitor_competitors()}
