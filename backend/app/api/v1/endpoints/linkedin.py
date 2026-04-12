"""MOD-LINKEDIN-001 — LinkedIn Studio endpoints.

Generacion de contenido, publicacion directa, templates, analytics, OAuth.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, extract

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.social import SocialPost
from app.schemas.linkedin import (
    LinkedInGenerateRequest,
    LinkedInGenerateResponse,
    LinkedInPublishRequest,
    LinkedInPublishResponse,
    LinkedInOAuthCallback,
    LinkedInProfileResponse,
    LinkedInAnalyticsResponse,
    LinkedInTemplateResponse,
    BestTimeResponse,
)

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# Content Generation
# ═══════════════════════════════════════════════════════════════


@router.post("/generate", response_model=LinkedInGenerateResponse)
async def generate_post(
    data: LinkedInGenerateRequest,
    _current_user: dict = Depends(require_write_access),
):
    """Genera un post de LinkedIn usando un framework especifico."""
    from app.services.linkedin_content_service import generate_linkedin_post

    result = await generate_linkedin_post(
        topic=data.topic,
        framework=data.framework,
        tone=data.tone,
        language=data.language,
        include_hashtags=data.include_hashtags,
        include_emoji=data.include_emoji,
        max_words=data.max_words,
        context=data.context,
    )
    return result


@router.post("/generate-and-save", status_code=201)
async def generate_and_save(
    data: LinkedInGenerateRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Genera un post y lo guarda como draft en social_posts."""
    from app.services.linkedin_content_service import generate_linkedin_post

    result = await generate_linkedin_post(
        topic=data.topic,
        framework=data.framework,
        tone=data.tone,
        language=data.language,
        include_hashtags=data.include_hashtags,
        include_emoji=data.include_emoji,
        max_words=data.max_words,
        context=data.context,
    )

    if not result.get("generated"):
        raise HTTPException(status_code=500, detail=result.get("error", "Error generando contenido"))

    post = SocialPost(
        platform="linkedin",
        content=result["content"],
        status="draft",
        tags=[data.framework, data.tone],
        metadata_={
            "framework": data.framework,
            "tone": data.tone,
            "topic": data.topic,
            "hook": result.get("hook"),
            "hashtags": result.get("hashtags", []),
            "model": result.get("model"),
            "module": "MOD-LINKEDIN-001",
        },
    )
    db.add(post)
    await db.commit()

    return {
        "created": True,
        "post_id": str(post.id),
        "content_preview": result["content"][:200],
        "framework": data.framework,
        "hashtags": result.get("hashtags", []),
    }


# ═══════════════════════════════════════════════════════════════
# Publish
# ═══════════════════════════════════════════════════════════════


@router.post("/publish", response_model=LinkedInPublishResponse)
async def publish_post(
    data: LinkedInPublishRequest,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Publica un post directamente en LinkedIn."""
    from app.services.linkedin_api_service import publish_post as li_publish, _get_linkedin_config

    # Get post
    result = await db.execute(select(SocialPost).where(SocialPost.id == data.post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    if post.platform != "linkedin":
        raise HTTPException(status_code=400, detail="El post no es de LinkedIn")
    if post.status == "published":
        raise HTTPException(status_code=400, detail="El post ya esta publicado")

    # Get LinkedIn config
    config = await _get_linkedin_config(db)
    access_token = config.get("access_token")
    author_urn = config.get("author_urn")

    if not access_token or not author_urn:
        raise HTTPException(
            status_code=400,
            detail="LinkedIn no conectado. Ve a Configuracion > LinkedIn para conectar tu cuenta.",
        )

    # Publish
    pub_result = await li_publish(
        access_token=access_token,
        author_urn=author_urn,
        content=post.content,
        media_url=post.media_url,
    )

    if pub_result.get("published"):
        from datetime import datetime, timezone
        post.status = "published"
        post.published_at = datetime.now(timezone.utc)
        post.external_id = pub_result.get("external_id")
        post.external_url = pub_result.get("external_url")
        await db.commit()

    return pub_result


# ═══════════════════════════════════════════════════════════════
# Templates & Best Times
# ═══════════════════════════════════════════════════════════════


@router.get("/templates")
async def list_templates(
    _current_user: dict = Depends(get_current_user),
):
    """Lista todos los frameworks/templates de LinkedIn."""
    from app.services.linkedin_content_service import get_templates
    return {"templates": get_templates()}


@router.get("/best-times", response_model=BestTimeResponse)
async def best_posting_times(
    _current_user: dict = Depends(get_current_user),
):
    """Devuelve los mejores horarios para publicar en LinkedIn."""
    from app.services.linkedin_content_service import get_best_times
    return {
        "recommended_times": get_best_times(),
        "timezone": "Europe/Madrid",
        "source": "aggregate_data",
    }


# ═══════════════════════════════════════════════════════════════
# Analytics
# ═══════════════════════════════════════════════════════════════


@router.get("/analytics", response_model=LinkedInAnalyticsResponse)
async def linkedin_analytics(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Analytics de posts de LinkedIn desde la BD local."""
    from datetime import datetime, timedelta, timezone

    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Aggregate stats
    q = select(
        func.count(SocialPost.id),
        func.coalesce(func.sum(SocialPost.impressions), 0),
        func.coalesce(func.sum(SocialPost.likes), 0),
        func.coalesce(func.sum(SocialPost.comments), 0),
        func.coalesce(func.sum(SocialPost.shares), 0),
        func.coalesce(func.sum(SocialPost.clicks), 0),
    ).where(
        SocialPost.platform == "linkedin",
        SocialPost.created_at >= since,
    )
    row = (await db.execute(q)).one()

    posts_count = row[0]
    total_impressions = int(row[1])
    total_likes = int(row[2])
    total_comments = int(row[3])
    total_shares = int(row[4])

    total_engagement = total_likes + total_comments + total_shares
    avg_engagement_rate = (total_engagement / total_impressions * 100) if total_impressions > 0 else 0

    # Best day of week
    day_q = select(
        extract("dow", SocialPost.published_at).label("dow"),
        func.sum(SocialPost.likes + SocialPost.comments + SocialPost.shares).label("eng"),
    ).where(
        SocialPost.platform == "linkedin",
        SocialPost.published_at.isnot(None),
        SocialPost.created_at >= since,
    ).group_by("dow").order_by(desc("eng")).limit(1)
    day_row = (await db.execute(day_q)).first()

    day_names = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
    best_day = day_names[int(day_row[0])] if day_row else None

    # Best hour
    hour_q = select(
        extract("hour", SocialPost.published_at).label("hr"),
        func.sum(SocialPost.likes + SocialPost.comments + SocialPost.shares).label("eng"),
    ).where(
        SocialPost.platform == "linkedin",
        SocialPost.published_at.isnot(None),
        SocialPost.created_at >= since,
    ).group_by("hr").order_by(desc("eng")).limit(1)
    hour_row = (await db.execute(hour_q)).first()
    best_hour = int(hour_row[0]) if hour_row else None

    # Top hashtags from metadata
    posts_q = select(SocialPost.metadata_).where(
        SocialPost.platform == "linkedin",
        SocialPost.metadata_.isnot(None),
        SocialPost.created_at >= since,
    )
    posts_result = await db.execute(posts_q)
    hashtag_counts: dict[str, int] = {}
    for (meta,) in posts_result:
        if isinstance(meta, dict):
            for tag in meta.get("hashtags", []):
                hashtag_counts[tag] = hashtag_counts.get(tag, 0) + 1

    top_hashtags = [
        {"tag": tag, "count": count}
        for tag, count in sorted(hashtag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    ]

    return {
        "posts_count": posts_count,
        "total_impressions": total_impressions,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_shares": total_shares,
        "avg_engagement_rate": round(avg_engagement_rate, 2),
        "best_day": best_day,
        "best_hour": best_hour,
        "top_hashtags": top_hashtags,
        "weekly_trend": [],
    }


# ═══════════════════════════════════════════════════════════════
# OAuth
# ═══════════════════════════════════════════════════════════════


@router.get("/oauth/url")
async def get_oauth_url(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Genera la URL de autorizacion OAuth de LinkedIn."""
    from app.services.linkedin_api_service import get_oauth_url, _get_linkedin_config

    config = await _get_linkedin_config(db)
    client_id = config.get("client_id", "")
    redirect_uri = config.get("redirect_uri", "")

    if not client_id:
        raise HTTPException(
            status_code=400,
            detail="LinkedIn client_id no configurado en SystemSettings.linkedin_config",
        )

    url = get_oauth_url(client_id=client_id, redirect_uri=redirect_uri)
    return {"url": url}


@router.post("/oauth/callback")
async def oauth_callback(
    data: LinkedInOAuthCallback,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Intercambia el code OAuth por token y guarda en config."""
    from app.services.linkedin_api_service import (
        exchange_code_for_token,
        get_profile,
        _get_linkedin_config,
        _save_linkedin_config,
    )

    config = await _get_linkedin_config(db)
    client_id = config.get("client_id", "")
    client_secret = config.get("client_secret", "")
    redirect_uri = config.get("redirect_uri", "")

    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="LinkedIn OAuth no configurado")

    token_result = await exchange_code_for_token(
        code=data.code,
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
    )

    if "error" in token_result:
        raise HTTPException(status_code=400, detail=token_result["error"])

    access_token = token_result["access_token"]

    # Get profile to store author URN
    profile = await get_profile(access_token)
    author_urn = f"urn:li:person:{profile.get('sub', '')}" if profile.get("connected") else ""

    await _save_linkedin_config(db, {
        "access_token": access_token,
        "token_expires_in": token_result.get("expires_in"),
        "token_obtained_at": token_result.get("obtained_at"),
        "author_urn": author_urn,
        "profile_name": profile.get("name"),
        "profile_email": profile.get("email"),
    })

    return {
        "connected": True,
        "profile_name": profile.get("name"),
        "author_urn": author_urn,
    }


@router.get("/oauth/status", response_model=LinkedInProfileResponse)
async def oauth_status(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Verifica si LinkedIn esta conectado."""
    from app.services.linkedin_api_service import _get_linkedin_config

    config = await _get_linkedin_config(db)
    access_token = config.get("access_token")

    if not access_token:
        return {"connected": False}

    return {
        "connected": True,
        "name": config.get("profile_name"),
        "profile_url": f"https://www.linkedin.com/in/{config.get('author_urn', '').split(':')[-1]}/",
    }


# ═══════════════════════════════════════════════════════════════
# Sync metrics from LinkedIn API
# ═══════════════════════════════════════════════════════════════


@router.post("/sync-metrics")
async def sync_metrics(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Sincroniza metricas de posts publicados desde LinkedIn API."""
    from app.services.linkedin_api_service import get_post_stats, _get_linkedin_config

    config = await _get_linkedin_config(db)
    access_token = config.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="LinkedIn no conectado")

    # Get published posts with external_id
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.platform == "linkedin",
            SocialPost.status == "published",
            SocialPost.external_id.isnot(None),
        ).order_by(desc(SocialPost.published_at)).limit(20)
    )
    posts = result.scalars().all()

    synced = 0
    for post in posts:
        stats = await get_post_stats(access_token, post.external_id)
        if "error" not in stats:
            post.impressions = stats.get("impressions", post.impressions)
            post.likes = stats.get("likes", post.likes)
            post.comments = stats.get("comments", post.comments)
            post.shares = stats.get("shares", post.shares)
            post.clicks = stats.get("clicks", post.clicks)
            synced += 1

    if synced:
        await db.commit()

    return {"synced": synced, "total": len(posts)}
