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


# ═══════════════════════════════════════════════════════════════
# Telegram: send post preview to Telegram for review/approval
# ═══════════════════════════════════════════════════════════════


@router.post("/send-to-telegram")
async def send_to_telegram(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Envia un post de LinkedIn a Telegram para revision antes de publicar."""
    import html as html_lib
    from app.services.telegram_service import send_message

    result = await db.execute(select(SocialPost).where(SocialPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    meta = post.metadata_ or {}
    framework = meta.get("framework", "—")
    hashtags = " ".join(meta.get("hashtags", []))

    telegram_text = (
        f"<b>📝 LinkedIn Studio — Post para revisar</b>\n\n"
        f"<b>Framework:</b> {html_lib.escape(framework)}\n"
        f"<b>Estado:</b> {html_lib.escape(post.status)}\n\n"
        f"<pre>{html_lib.escape(post.content[:1500])}</pre>\n\n"
        f"{html_lib.escape(hashtags)}\n\n"
        f"<i>Responde con ✅ para aprobar o ❌ para descartar.</i>"
    )

    try:
        result = await send_message(telegram_text, db=db)
        return {"sent": True, "message_id": result.get("message_id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enviando a Telegram: {e}")


# ═══════════════════════════════════════════════════════════════
# Seed: LinkedIn posts de ejemplo
# ═══════════════════════════════════════════════════════════════


@router.post("/seed")
async def seed_linkedin_posts(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Precarga posts LinkedIn de ejemplo para poblar analytics."""
    from datetime import timedelta

    existing = (await db.execute(
        select(func.count(SocialPost.id)).where(SocialPost.platform == "linkedin")
    )).scalar() or 0

    if existing >= 10:
        return {"seeded": 0, "message": "Ya hay suficientes posts LinkedIn"}

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    seeds = [
        {
            "content": "El 90% de los founders que conozco cometen el mismo error.\n\nPasan 6 meses construyendo el producto perfecto.\n\nSin hablar con un solo cliente.\n\nYo lo hice en 2024. Perdi 4 meses y 15K EUR.\n\nAhora mi regla es simple:\n→ Semana 1: 20 entrevistas\n→ Semana 2: MVP feo pero funcional\n→ Semana 3: Primeros pagos\n\n¿Cual fue tu error mas caro como founder?\n\n#Startup #Founder #B2B #SaaS",
            "status": "published", "impressions": 3420, "likes": 127, "comments": 34, "shares": 28, "clicks": 89,
            "published_at": now - timedelta(days=2),
            "metadata_": {"framework": "hook_story_cta", "tone": "expert", "hashtags": ["#Startup", "#Founder", "#B2B"], "module": "MOD-LINKEDIN-001"},
        },
        {
            "content": "Las empresas espanolas pierden 4.200M EUR al ano por ciberataques.\n\nEl 73% no tienen un plan de respuesta a incidentes.\n\nCon ENS Alto + NIS2, la multa puede ser del 2% de facturacion.\n\nEn Riskitera automatizamos el cumplimiento en 90 dias.\n\n→ DM para una demo sin compromiso.\n\n#Ciberseguridad #ENS #NIS2 #Compliance",
            "status": "published", "impressions": 1890, "likes": 67, "comments": 12, "shares": 19, "clicks": 45,
            "published_at": now - timedelta(days=5),
            "metadata_": {"framework": "aida", "tone": "expert", "hashtags": ["#Ciberseguridad", "#ENS", "#NIS2"], "module": "MOD-LINKEDIN-001"},
        },
        {
            "content": "Unpopular opinion: Las certificaciones ISO 27001 no te protegen.\n\nSon un checklist. Un documento. Un sello.\n\nPero un atacante no lee tu SGSI antes de entrar.\n\nLo que realmente protege:\n→ Deteccion en <15 min\n→ Respuesta automatizada\n→ Cultura de seguridad real\n\nLa certificacion es el minimo. No el objetivo.\n\n¿Estais de acuerdo?\n\n#InfoSec #ISO27001 #CISO",
            "status": "published", "impressions": 5210, "likes": 203, "comments": 67, "shares": 42, "clicks": 134,
            "published_at": now - timedelta(days=8),
            "metadata_": {"framework": "contrarian", "tone": "provocative", "hashtags": ["#InfoSec", "#ISO27001", "#CISO"], "module": "MOD-LINKEDIN-001"},
        },
        {
            "content": "7 herramientas que uso a diario como founder:\n\n1. Claude Code → desarrollo con IA\n2. Linear → gestion de producto\n3. Supabase → backend + auth\n4. Hetzner → infra soberana EU\n5. n8n → automatizaciones\n6. Figma → diseno\n7. Notion → documentacion\n\nCoste total: <200 EUR/mes.\n\n¿Cual anadiriais?\n\n#Startup #Tools #Productividad",
            "status": "published", "impressions": 4150, "likes": 156, "comments": 89, "shares": 51, "clicks": 78,
            "published_at": now - timedelta(days=12),
            "metadata_": {"framework": "listicle", "tone": "casual", "hashtags": ["#Startup", "#Tools", "#Productividad"], "module": "MOD-LINKEDIN-001"},
        },
        {
            "content": "En marzo de 2025 nos quedamos sin runway.\n\n2 meses de caja. 3 personas dependiendo del proyecto.\n\nHabia dos opciones:\nA) Buscar inversion (3-6 meses)\nB) Vender antes de estar listos\n\nElegimos B.\n\nPrimera demo: un desastre. Se cayo el backend en directo.\n\nPero el cliente dijo: \"Me gusta la vision. ¿Cuando empezamos?\"\n\nLeccion: Tu MVP nunca estara listo. Pero tu mercado no espera.\n\n#Founder #Startup #Emprendimiento",
            "status": "published", "impressions": 6780, "likes": 289, "comments": 73, "shares": 65, "clicks": 201,
            "published_at": now - timedelta(days=15),
            "metadata_": {"framework": "personal_story", "tone": "inspirational", "hashtags": ["#Founder", "#Startup", "#Emprendimiento"], "module": "MOD-LINKEDIN-001"},
        },
        {
            "content": "El mercado de ciberseguridad en Espana crecera un 12.4% en 2026 (IDC).\n\nPero aqui esta el dato que nadie comenta:\n\n→ El 67% de ese gasto ira a compliance, no a proteccion real\n→ Solo el 23% de las pymes tienen un CISO (INCIBE)\n→ El coste medio de un breach en Espana: 3.6M EUR (IBM)\n\nTraduccion: Las empresas gastan en papeles, no en defensas.\n\n¿Vuestras empresas invierten en cumplir o en proteger?\n\n#Ciberseguridad #B2B #CISO",
            "status": "published", "impressions": 2340, "likes": 98, "comments": 23, "shares": 31, "clicks": 56,
            "published_at": now - timedelta(days=20),
            "metadata_": {"framework": "data_driven", "tone": "expert", "hashtags": ["#Ciberseguridad", "#B2B", "#CISO"], "module": "MOD-LINKEDIN-001"},
        },
        {
            "content": "NIS2 entra en vigor en octubre 2026.\n\n¿Tu empresa esta preparada?\n\n3 acciones inmediatas:\n1️⃣ Identifica si tu sector esta afectado\n2️⃣ Evalua tu nivel de madurez actual\n3️⃣ Implementa un plan de cumplimiento\n\n→ Guia gratuita en comentarios.\n\n#NIS2 #Compliance #DORA",
            "status": "draft",
            "metadata_": {"framework": "listicle", "tone": "expert", "hashtags": ["#NIS2", "#Compliance", "#DORA"], "module": "MOD-LINKEDIN-001"},
        },
        {
            "content": "Pregunta seria para founders B2B:\n\n¿Cual es vuestro canal de captacion principal?\n\nA) LinkedIn outbound\nB) Referidos/boca a boca\nC) SEO/contenido\nD) Cold email\n\nYo: 80% referidos. El mejor marketing es un cliente contento.\n\n¿Y vosotros?\n\n#B2B #Sales #Founder",
            "status": "scheduled",
            "metadata_": {"framework": "poll", "tone": "casual", "hashtags": ["#B2B", "#Sales", "#Founder"], "module": "MOD-LINKEDIN-001"},
        },
    ]

    created = 0
    for s in seeds:
        post = SocialPost(platform="linkedin", **s)
        db.add(post)
        created += 1

    await db.commit()
    return {"seeded": created}


# ═══════════════════════════════════════════════════════════════
# Fase 2: Schedule to Google Calendar
# ═══════════════════════════════════════════════════════════════


@router.post("/schedule-to-calendar")
async def schedule_to_calendar(
    post_id: str,
    scheduled_at: str = Query(..., description="ISO datetime para publicar (Europe/Madrid)"),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Programa un post y crea un recordatorio en Google Calendar."""
    from datetime import datetime, timezone, timedelta

    result = await db.execute(select(SocialPost).where(SocialPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    # Parse and set scheduled_at
    try:
        dt = datetime.fromisoformat(scheduled_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha invalido. Usar ISO 8601.")

    post.scheduled_at = dt
    post.status = "scheduled"

    # Try to create calendar event (non-blocking)
    calendar_result = None
    try:
        from app.services.gcalendar_service import create_calendar_event
        meta = post.metadata_ or {}
        framework = meta.get("framework", "")
        calendar_result = await create_calendar_event(
            db=db,
            summary=f"LinkedIn: Publicar post ({framework})",
            description=f"Post programado via LinkedIn Studio:\n\n{post.content[:500]}",
            start_dt=dt,
            end_dt=dt + timedelta(minutes=15),
        )
        # Store calendar event ID in metadata
        meta["calendar_event_id"] = calendar_result.get("id")
        post.metadata_ = meta
    except Exception as e:
        calendar_result = {"error": str(e)}

    await db.commit()
    return {
        "scheduled": True,
        "post_id": str(post.id),
        "scheduled_at": dt.isoformat(),
        "calendar": calendar_result,
    }


# ═══════════════════════════════════════════════════════════════
# Fase 3: Carousel outline to structured slides
# ═══════════════════════════════════════════════════════════════


@router.post("/generate-carousel")
async def generate_carousel(
    topic: str = Query(..., min_length=3),
    slides: int = Query(8, ge=4, le=15),
    language: str = Query("es"),
    _current_user: dict = Depends(require_write_access),
):
    """Genera un guion de carousel estructurado slide por slide."""
    from app.services.linkedin_content_service import FRAMEWORKS

    system_prompt = (
        "Eres un experto en carousels de LinkedIn que generan alto engagement. "
        "Genera el contenido slide por slide en formato JSON."
    )

    lang_note = "Escribe en espanol de Espana." if language == "es" else "Write in English."

    user_prompt = (
        f"Genera un carousel de LinkedIn sobre: {topic}\n\n"
        f"Numero de slides: {slides}\n"
        f"{lang_note}\n\n"
        f"Responde SOLO con JSON valido, sin explicaciones. Formato:\n"
        f'{{"title": "Titulo del carousel", "slides": ['
        f'{{"slide": 1, "type": "cover", "headline": "...", "subheadline": "..."}}, '
        f'{{"slide": 2, "type": "content", "headline": "...", "body": "...", "icon": "emoji"}}, '
        f'..., '
        f'{{"slide": {slides}, "type": "cta", "headline": "...", "body": "...", "profile": "@davidmoya"}}'
        f"]}}\n\n"
        f"Types validos: cover, content, stat, quote, cta\n"
        f"Cada slide debe tener headline (max 8 palabras) y body (max 20 palabras)."
    )

    try:
        from app.agents.lead_intelligence import _call_llm
        result = await _call_llm(system_prompt, user_prompt)
        content = result.get("content", "")

        # Try to parse JSON from response
        import json as json_lib
        import re
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            carousel_data = json_lib.loads(json_match.group())
            return {
                "generated": True,
                "carousel": carousel_data,
                "slides_count": len(carousel_data.get("slides", [])),
                "model": result.get("model"),
            }
        # Fallback: return raw content
        return {
            "generated": True,
            "carousel": {"title": topic, "raw_content": content},
            "slides_count": 0,
            "model": result.get("model"),
        }
    except Exception as e:
        return {"generated": False, "error": str(e)}


# ═══════════════════════════════════════════════════════════════
# Fase 4: Performance charts data
# ═══════════════════════════════════════════════════════════════


@router.get("/charts/engagement-over-time")
async def chart_engagement_over_time(
    days: int = Query(30, ge=7, le=180),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Datos para grafico de engagement a lo largo del tiempo."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import cast, Date

    since = datetime.now(timezone.utc) - timedelta(days=days)

    q = select(
        cast(SocialPost.published_at, Date).label("date"),
        func.count(SocialPost.id).label("posts"),
        func.coalesce(func.sum(SocialPost.impressions), 0).label("impressions"),
        func.coalesce(func.sum(SocialPost.likes), 0).label("likes"),
        func.coalesce(func.sum(SocialPost.comments), 0).label("comments"),
        func.coalesce(func.sum(SocialPost.shares), 0).label("shares"),
    ).where(
        SocialPost.platform == "linkedin",
        SocialPost.published_at.isnot(None),
        SocialPost.published_at >= since,
    ).group_by("date").order_by("date")

    rows = (await db.execute(q)).all()

    return {
        "period_days": days,
        "data": [
            {
                "date": str(r.date),
                "posts": r.posts,
                "impressions": int(r.impressions),
                "likes": int(r.likes),
                "comments": int(r.comments),
                "shares": int(r.shares),
                "engagement": int(r.likes) + int(r.comments) + int(r.shares),
            }
            for r in rows
        ],
    }


@router.get("/charts/framework-performance")
async def chart_framework_performance(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Rendimiento por framework de escritura."""
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.platform == "linkedin",
            SocialPost.metadata_.isnot(None),
        )
    )
    posts = result.scalars().all()

    framework_stats: dict = {}
    for post in posts:
        meta = post.metadata_ or {}
        fw = meta.get("framework", "unknown")
        if fw not in framework_stats:
            framework_stats[fw] = {"posts": 0, "impressions": 0, "likes": 0, "comments": 0, "shares": 0}
        s = framework_stats[fw]
        s["posts"] += 1
        s["impressions"] += post.impressions or 0
        s["likes"] += post.likes or 0
        s["comments"] += post.comments or 0
        s["shares"] += post.shares or 0

    return {
        "frameworks": [
            {
                "framework": fw,
                "posts": s["posts"],
                "impressions": s["impressions"],
                "likes": s["likes"],
                "comments": s["comments"],
                "shares": s["shares"],
                "engagement": s["likes"] + s["comments"] + s["shares"],
                "avg_engagement": round((s["likes"] + s["comments"] + s["shares"]) / max(s["posts"], 1), 1),
            }
            for fw, s in sorted(framework_stats.items(), key=lambda x: x[1]["likes"] + x[1]["comments"] + x[1]["shares"], reverse=True)
        ]
    }


@router.get("/charts/posting-heatmap")
async def chart_posting_heatmap(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Heatmap de engagement por dia/hora para optimizar publicacion."""
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.platform == "linkedin",
            SocialPost.published_at.isnot(None),
        )
    )
    posts = result.scalars().all()

    heatmap: dict = {}
    for post in posts:
        if not post.published_at:
            continue
        dow = post.published_at.weekday()  # 0=Mon
        hour = post.published_at.hour
        key = f"{dow}_{hour}"
        if key not in heatmap:
            heatmap[key] = {"count": 0, "engagement": 0}
        heatmap[key]["count"] += 1
        heatmap[key]["engagement"] += (post.likes or 0) + (post.comments or 0) + (post.shares or 0)

    days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
    return {
        "heatmap": [
            {
                "day": days[int(k.split("_")[0])],
                "day_index": int(k.split("_")[0]),
                "hour": int(k.split("_")[1]),
                "posts": v["count"],
                "total_engagement": v["engagement"],
                "avg_engagement": round(v["engagement"] / max(v["count"], 1), 1),
            }
            for k, v in sorted(heatmap.items())
        ]
    }


# ═══════════════════════════════════════════════════════════════
# Fase 5: RSS watchers — content inspiration from feeds
# ═══════════════════════════════════════════════════════════════


@router.get("/rss/feeds")
async def list_rss_feeds(
    _current_user: dict = Depends(get_current_user),
):
    """Lista los feeds RSS monitorizados para inspiracion de contenido."""
    feeds = _get_rss_feeds()
    return {"feeds": feeds, "total": len(feeds)}


@router.post("/rss/fetch")
async def fetch_rss_articles(
    feed_id: Optional[str] = Query(None, description="ID del feed. Si no se pasa, fetches todos."),
    max_per_feed: int = Query(5, ge=1, le=20),
    _current_user: dict = Depends(require_write_access),
):
    """Fetches articulos recientes de los feeds RSS configurados."""
    import httpx as httpx_lib

    feeds = _get_rss_feeds()
    if feed_id:
        feeds = [f for f in feeds if f["id"] == feed_id]
        if not feeds:
            raise HTTPException(status_code=404, detail=f"Feed '{feed_id}' no encontrado")

    all_articles = []
    for feed in feeds:
        try:
            async with httpx_lib.AsyncClient(timeout=10.0) as client:
                resp = await client.get(feed["url"], headers={"User-Agent": "St4rtup-LinkedIn-Studio/1.0"})
                if resp.status_code != 200:
                    continue

            articles = _parse_rss(resp.text, max_per_feed)
            for a in articles:
                a["feed_id"] = feed["id"]
                a["feed_name"] = feed["name"]
                a["category"] = feed["category"]
            all_articles.extend(articles)
        except Exception as e:
            logger.warning("RSS fetch error for %s: %s", feed["id"], e)

    return {
        "articles": all_articles,
        "total": len(all_articles),
        "feeds_checked": len(feeds),
    }


@router.post("/rss/inspire")
async def inspire_from_article(
    title: str = Query(..., min_length=5),
    summary: str = Query(""),
    framework: str = Query("hook_story_cta"),
    _current_user: dict = Depends(require_write_access),
):
    """Genera un post de LinkedIn inspirado en un articulo RSS."""
    from app.services.linkedin_content_service import generate_linkedin_post

    context = f"Inspirado en este articulo: '{title}'"
    if summary:
        context += f"\n\nResumen: {summary[:500]}"

    result = await generate_linkedin_post(
        topic=title,
        framework=framework,
        tone="expert",
        language="es",
        context=context,
    )
    return result


def _get_rss_feeds() -> list[dict]:
    """Feeds RSS configurados para inspiracion de contenido LinkedIn."""
    return [
        {"id": "incibe", "name": "INCIBE Avisos", "url": "https://www.incibe.es/incibe-cert/alerta-temprana/avisos/feed", "category": "ciberseguridad"},
        {"id": "ccn_cert", "name": "CCN-CERT", "url": "https://www.ccn-cert.cni.es/component/obrss/rss-noticias.feed", "category": "ciberseguridad"},
        {"id": "boe", "name": "BOE Disposiciones", "url": "https://www.boe.es/rss/boe.php?s=1", "category": "regulacion"},
        {"id": "enisa", "name": "ENISA News", "url": "https://www.enisa.europa.eu/rss.xml", "category": "eu_cyber"},
        {"id": "krebs", "name": "Krebs on Security", "url": "https://krebsonsecurity.com/feed/", "category": "infosec"},
        {"id": "schneier", "name": "Schneier on Security", "url": "https://www.schneier.com/feed/", "category": "infosec"},
        {"id": "techcrunch_sec", "name": "TechCrunch Security", "url": "https://techcrunch.com/category/security/feed/", "category": "tech"},
        {"id": "hacker_news", "name": "Hacker News Best", "url": "https://hnrss.org/best", "category": "tech"},
        {"id": "eu_ai_act", "name": "EU AI Act News", "url": "https://artificialintelligenceact.eu/feed/", "category": "regulacion"},
        {"id": "dark_reading", "name": "Dark Reading", "url": "https://www.darkreading.com/rss.xml", "category": "infosec"},
    ]


def _parse_rss(xml_text: str, max_items: int = 5) -> list[dict]:
    """Parser RSS/Atom ligero sin dependencias externas."""
    import re
    articles = []

    # Try RSS <item> format
    items = re.findall(r'<item>(.*?)</item>', xml_text, re.DOTALL)
    if not items:
        # Try Atom <entry> format
        items = re.findall(r'<entry>(.*?)</entry>', xml_text, re.DOTALL)

    for item in items[:max_items]:
        title = _extract_tag(item, "title")
        link = _extract_tag(item, "link")
        if not link:
            # Atom uses <link href="..."/>
            link_match = re.search(r'<link[^>]+href=["\']([^"\']+)', item)
            link = link_match.group(1) if link_match else ""
        pub_date = _extract_tag(item, "pubDate") or _extract_tag(item, "published") or _extract_tag(item, "updated")
        description = _extract_tag(item, "description") or _extract_tag(item, "summary") or ""
        # Strip HTML tags from description
        description = re.sub(r'<[^>]+>', '', description)[:300]

        if title:
            articles.append({
                "title": title,
                "link": link,
                "published": pub_date,
                "summary": description,
            })

    return articles


def _extract_tag(xml: str, tag: str) -> str:
    """Extrae contenido de un tag XML."""
    import re
    # Handle CDATA
    match = re.search(rf'<{tag}[^>]*>\s*<!\[CDATA\[(.*?)\]\]>\s*</{tag}>', xml, re.DOTALL)
    if match:
        return match.group(1).strip()
    match = re.search(rf'<{tag}[^>]*>(.*?)</{tag}>', xml, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ""
