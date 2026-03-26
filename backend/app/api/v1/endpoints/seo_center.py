"""SEO Command Center — Content Hub, Dashboard, Repurposer, Site Health, Brand Monitor."""
import re
import logging
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import require_write_access
from app.models.article import Article, ArticleStatus, ArticleType
from app.models.seo import SEOKeyword, SEORanking
from app.models.backlink import Backlink
from app.models.publication import Publication, PublicationPlatform, PublicationStatus
from app.models.marketing import MarketingAsset
from app.models.enums import MarketingAssetType, MarketingAssetStatus, AssetLanguage
from app.schemas.article import ArticleCreate, ArticleUpdate, ArticleResponse
from app.schemas.base import PaginatedResponse
from fastapi.responses import PlainTextResponse

logger = logging.getLogger(__name__)
router = APIRouter()


async def _sync_article_to_asset(db: AsyncSession, article: Article):
    """Crea o actualiza un MarketingAsset tipo blog_post vinculado al artículo."""
    # Buscar asset existente por URL (slug-based)
    canonical = article.canonical_url or f"https://st4rtup.app/blog/{article.slug}"
    result = await db.execute(
        select(MarketingAsset).where(MarketingAsset.url == canonical)
    )
    asset = result.scalar_one_or_none()

    if asset:
        asset.name = article.title
        asset.status = MarketingAssetStatus.ACTIVE if article.status == ArticleStatus.PUBLISHED else MarketingAssetStatus.DRAFT
        asset.seo_title = article.meta_title
        asset.seo_description = article.meta_description
        asset.target_keywords = [article.primary_keyword] + (article.secondary_keywords or []) if article.primary_keyword else article.secondary_keywords
    else:
        asset = MarketingAsset(
            type=MarketingAssetType.BLOG_POST,
            name=article.title,
            url=canonical,
            status=MarketingAssetStatus.ACTIVE if article.status == ArticleStatus.PUBLISHED else MarketingAssetStatus.DRAFT,
            language=AssetLanguage.ES,
            seo_title=article.meta_title,
            seo_description=article.meta_description,
            target_keywords=[article.primary_keyword] + (article.secondary_keywords or []) if article.primary_keyword else article.secondary_keywords,
        )
        db.add(asset)

    await db.flush()


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[áàä]', 'a', text)
    text = re.sub(r'[éèë]', 'e', text)
    text = re.sub(r'[íìï]', 'i', text)
    text = re.sub(r'[óòö]', 'o', text)
    text = re.sub(r'[úùü]', 'u', text)
    text = re.sub(r'[ñ]', 'n', text)
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')[:200]


# ─── AI Providers ────────────────────────────────────────────

@router.get("/providers")
async def list_providers(current_user: dict = Depends(get_current_user)):
    """Lista proveedores IA disponibles para generación de contenido."""
    from app.services.ai_chat_service import AIChatService
    service = AIChatService()
    return {"providers": service.get_available_providers()}


# ─── Content Hub (Articles CRUD) ─────────────────────────────

@router.get("/articles", response_model=PaginatedResponse)
async def list_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    article_type: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    query = select(Article)
    query = query.where(Article.org_id == org_id)
    if status:
        query = query.where(Article.status == status)
    if article_type:
        query = query.where(Article.article_type == article_type)
    if search:
        query = query.where(Article.title.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(desc(Article.updated_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    articles = result.scalars().all()

    return {
        "items": [ArticleResponse.model_validate(a) for a in articles],
        "total": total, "page": page, "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 0,
    }


@router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    return ArticleResponse.model_validate(article)


@router.post("/articles", response_model=ArticleResponse)
async def create_article(
    data: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    article = Article(
        **data.model_dump(exclude_unset=True),
        slug=data.slug or _slugify(data.title),
        author_id=UUID(current_user["user_id"]),
        word_count=len(data.content.split()),
        reading_time_min=max(1, len(data.content.split()) // 200),
    )
    db.add(article)
    await db.commit()
    await db.refresh(article)
    return ArticleResponse.model_validate(article)


@router.put("/articles/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: UUID,
    data: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(article, field, value)

    if data.content:
        article.word_count = len(data.content.split())
        article.reading_time_min = max(1, len(data.content.split()) // 200)

    await db.commit()
    await db.refresh(article)
    return ArticleResponse.model_validate(article)


@router.delete("/articles/{article_id}")
async def delete_article(article_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_write_access)):
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    await db.delete(article)
    await db.commit()
    return {"detail": "Artículo eliminado"}


# ─── Workflow transitions ────────────────────────────────────

@router.post("/articles/{article_id}/publish", response_model=ArticleResponse)
async def publish_article(article_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_write_access)):
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    article.status = ArticleStatus.PUBLISHED
    article.published_at = datetime.now(timezone.utc)
    await _sync_article_to_asset(db, article)
    await db.commit()
    await db.refresh(article)
    return ArticleResponse.model_validate(article)


@router.post("/articles/{article_id}/archive", response_model=ArticleResponse)
async def archive_article(article_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_write_access)):
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    article.status = ArticleStatus.ARCHIVED
    await _sync_article_to_asset(db, article)
    await db.commit()
    await db.refresh(article)
    return ArticleResponse.model_validate(article)


# ─── Generate from Content Pipeline ─────────────────────────

@router.post("/articles/generate", response_model=ArticleResponse)
async def generate_article(
    topic: str = Query(..., max_length=500),
    audience: str = Query("CEO, DPO, CTO de empresas españolas", max_length=300),
    word_count: int = Query(1500, ge=500, le=5000),
    article_type: str = Query("blog"),
    provider: Optional[str] = Query(None, max_length=30),
    model: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Genera un artículo completo usando el Content Pipeline IA (4 agentes)."""
    try:
        from app.services.content_pipeline import run_full_pipeline
        result = await run_full_pipeline(topic=topic, audience=audience, word_count=word_count, provider=provider, model=model)

        if result.get("error"):
            raise HTTPException(status_code=502, detail=result["error"])

        content = result.get("seo_optimized", result.get("draft", ""))
        meta = result.get("meta", {})

        article = Article(
            title=meta.get("title_tag", topic)[:500],
            slug=_slugify(meta.get("slug", topic)),
            excerpt=meta.get("meta_description", "")[:500],
            content=content,
            meta_title=meta.get("title_tag", "")[:70],
            meta_description=meta.get("meta_description", "")[:160],
            canonical_url=meta.get("canonical_url", ""),
            article_type=article_type,
            status=ArticleStatus.DRAFT,
            primary_keyword=result.get("keywords", {}).get("primary", ""),
            secondary_keywords=result.get("keywords", {}).get("secondary", []),
            seo_score=result.get("seo_score", 0),
            keyword_density=result.get("keyword_density", 0),
            author_id=UUID(current_user["user_id"]),
            word_count=len(content.split()),
            reading_time_min=max(1, len(content.split()) // 200),
            pipeline_output=result,
        )
        db.add(article)
        await db.commit()
        await db.refresh(article)
        return ArticleResponse.model_validate(article)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error generating article: %s", e)
        raise HTTPException(status_code=502, detail=f"Error generando artículo: {str(e)}")


# ─── Content Repurposer ─────────────────────────────────────

@router.post("/articles/{article_id}/repurpose")
async def repurpose_article(
    article_id: UUID,
    formats: str = Query("linkedin,twitter,email,video_script", max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Repurpose un artículo a múltiples formatos con IA."""
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    try:
        from app.services.ai_chat_service import AIChatService
        service = AIChatService()

        requested = [f.strip() for f in formats.split(",")]
        content_preview = article.content[:3000]
        repurposed = {}

        format_prompts = {
            "linkedin": f"Convierte este artículo en un post de LinkedIn profesional (máx 1300 chars). Usa emojis con moderación, incluye CTA. Tema: {article.title}\n\n{content_preview}",
            "twitter": f"Crea un hilo de Twitter/X (5-7 tweets) sobre este artículo. Cada tweet máx 280 chars. Tema: {article.title}\n\n{content_preview}",
            "email": f"Crea un snippet de newsletter (3-4 párrafos) para promocionar este artículo. Incluye subject line, preview text y CTA. Tema: {article.title}\n\n{content_preview}",
            "video_script": f"Crea un guión de vídeo corto (2-3 min) basado en este artículo. Incluye intro, puntos clave, CTA. Tema: {article.title}\n\n{content_preview}",
            "infografia": f"Extrae los datos clave de este artículo para una infografía. Lista: título, 5-7 puntos con datos/cifras, conclusión, fuente. Tema: {article.title}\n\n{content_preview}",
        }

        for fmt in requested:
            if fmt in format_prompts:
                try:
                    resp = await service.chat(
                        messages=[{"role": "user", "content": format_prompts[fmt]}],
                        system_prompt="Eres un content marketer experto en ventas B2B para el mercado español. Responde directamente con el contenido solicitado.",
                    )
                    repurposed[fmt] = resp.get("content", "")
                except Exception as e:
                    repurposed[fmt] = f"Error: {str(e)}"

        article.repurposed = {**(article.repurposed or {}), **repurposed}
        await db.commit()
        return {"repurposed": repurposed, "formats": list(repurposed.keys())}

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error repurposing: {str(e)}")


# ─── Site Health Audit ───────────────────────────────────────

@router.post("/articles/{article_id}/audit")
async def audit_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Audita un artículo: SEO checklist, estructura, keywords."""
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    issues = []
    score = 100

    # Title checks
    if not article.meta_title:
        issues.append({"type": "meta", "severity": "high", "message": "Falta meta title"})
        score -= 15
    elif len(article.meta_title) > 60:
        issues.append({"type": "meta", "severity": "medium", "message": f"Meta title demasiado largo ({len(article.meta_title)} chars, max 60)"})
        score -= 5

    # Meta description
    if not article.meta_description:
        issues.append({"type": "meta", "severity": "high", "message": "Falta meta description"})
        score -= 15
    elif len(article.meta_description) > 155:
        issues.append({"type": "meta", "severity": "medium", "message": f"Meta description demasiado larga ({len(article.meta_description)} chars, max 155)"})
        score -= 5

    # Content length
    if article.word_count < 300:
        issues.append({"type": "content", "severity": "high", "message": f"Contenido muy corto ({article.word_count} palabras, min 300)"})
        score -= 20
    elif article.word_count < 800:
        issues.append({"type": "content", "severity": "medium", "message": f"Contenido corto ({article.word_count} palabras, recomendado 800+)"})
        score -= 5

    # Headings
    h2_count = article.content.count("## ") if article.content else 0
    if h2_count == 0:
        issues.append({"type": "structure", "severity": "high", "message": "Sin encabezados H2 — mejora estructura"})
        score -= 10

    # Keywords
    if not article.primary_keyword:
        issues.append({"type": "keywords", "severity": "high", "message": "Sin keyword principal definida"})
        score -= 10
    elif article.content and article.primary_keyword.lower() not in article.content.lower():
        issues.append({"type": "keywords", "severity": "medium", "message": "Keyword principal no aparece en el contenido"})
        score -= 10

    # Slug
    if not article.slug:
        issues.append({"type": "url", "severity": "medium", "message": "Sin slug definido"})
        score -= 5

    # Canonical
    if not article.canonical_url:
        issues.append({"type": "meta", "severity": "low", "message": "Sin canonical URL"})
        score -= 3

    # Images (check for markdown images)
    if article.content and "![" not in article.content and "<img" not in article.content:
        issues.append({"type": "content", "severity": "medium", "message": "Sin imágenes — mejora engagement"})
        score -= 5

    # Internal links
    if article.content and "[" not in article.content and "<a" not in article.content:
        issues.append({"type": "seo", "severity": "medium", "message": "Sin enlaces internos"})
        score -= 5

    score = max(0, score)
    article.audit_score = score
    article.audit_issues = issues
    article.last_audit_at = datetime.now(timezone.utc)
    await db.commit()

    return {"score": score, "issues": issues, "total_issues": len(issues)}


# ─── SEO Dashboard ──────────────────────────────────────────

@router.get("/dashboard")
async def seo_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Dashboard unificado SEO: artículos, keywords, rankings, health."""
    # Articles stats
    total_articles = await db.scalar(select(func.count(Article.id))) or 0
    published = await db.scalar(select(func.count(Article.id)).where(Article.status == ArticleStatus.PUBLISHED)) or 0
    drafts = await db.scalar(select(func.count(Article.id)).where(Article.status == ArticleStatus.DRAFT)) or 0
    avg_seo_score = await db.scalar(select(func.avg(Article.seo_score)).where(Article.seo_score.isnot(None))) or 0
    total_views = await db.scalar(select(func.coalesce(func.sum(Article.views), 0))) or 0
    avg_word_count = await db.scalar(select(func.avg(Article.word_count)).where(Article.word_count > 0)) or 0

    # Keywords stats
    total_keywords = await db.scalar(select(func.count(SEOKeyword.id))) or 0
    avg_position = await db.scalar(select(func.avg(SEORanking.position)).where(SEORanking.position.isnot(None))) or 0

    # Top articles by views
    top_articles_q = await db.execute(
        select(Article.title, Article.views, Article.seo_score, Article.status)
        .order_by(desc(Article.views))
        .limit(5)
    )
    top_articles = [{"title": r[0], "views": r[1], "seo_score": r[2], "status": r[3].value if r[3] else "draft"} for r in top_articles_q.all()]

    # Articles by type
    type_q = await db.execute(
        select(Article.article_type, func.count(Article.id))
        .group_by(Article.article_type)
    )
    by_type = {str(r[0].value) if r[0] else "other": r[1] for r in type_q.all()}

    # Articles by regulatory focus
    reg_counts = {}
    reg_articles = await db.execute(select(Article.regulatory_focus).where(Article.regulatory_focus.isnot(None)))
    for (focus,) in reg_articles.all():
        if focus:
            for f in focus:
                reg_counts[f] = reg_counts.get(f, 0) + 1

    return {
        "articles": {
            "total": total_articles,
            "published": published,
            "drafts": drafts,
            "avg_seo_score": round(float(avg_seo_score), 1),
            "total_views": total_views,
            "avg_word_count": round(float(avg_word_count)),
        },
        "keywords": {
            "total": total_keywords,
            "avg_position": round(float(avg_position), 1) if avg_position else 0,
        },
        "top_articles": top_articles,
        "by_type": by_type,
        "by_regulatory_focus": reg_counts,
    }


# ─── Brand & SERP Monitor ───────────────────────────────────

@router.get("/brand-monitor")
async def brand_monitor(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Métricas de marca: keywords de marca, rankings, share of voice."""
    # Brand keywords
    brand_kws = await db.execute(
        select(SEOKeyword).where(SEOKeyword.category == "brand")
    )
    brand_keywords = brand_kws.scalars().all()

    # Get latest ranking for each brand keyword
    brand_rankings = []
    for kw in brand_keywords:
        latest = await db.execute(
            select(SEORanking)
            .where(SEORanking.keyword_id == kw.id)
            .order_by(desc(SEORanking.check_date))
            .limit(1)
        )
        ranking = latest.scalar_one_or_none()
        brand_rankings.append({
            "keyword": kw.keyword,
            "search_volume": kw.search_volume,
            "position": ranking.position if ranking else None,
            "url": ranking.url_found if ranking else None,
        })

    # Total tracked keywords and avg position
    total_kws = await db.scalar(select(func.count(SEOKeyword.id))) or 0
    ranked_kws = await db.scalar(
        select(func.count(SEORanking.id))
        .where(SEORanking.position <= 10)
    ) or 0

    return {
        "brand_keywords": brand_rankings,
        "total_keywords": total_kws,
        "top10_count": ranked_kws,
        "share_of_voice_pct": round((ranked_kws / total_kws * 100), 1) if total_kws > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════
# EXPORT ARTICLES
# ═══════════════════════════════════════════════════════════════

@router.get("/articles/{article_id}/export/markdown", response_class=PlainTextResponse)
async def export_markdown(article_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Exporta artículo como Markdown."""
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    frontmatter = f"""---
title: "{article.title}"
slug: "{article.slug}"
type: {article.article_type.value if article.article_type else 'blog'}
status: {article.status.value if article.status else 'draft'}
keyword: "{article.primary_keyword or ''}"
tags: {article.tags or []}
date: {article.published_at.isoformat() if article.published_at else article.created_at.isoformat()}
seo_score: {article.seo_score or 0}
meta_title: "{article.meta_title or ''}"
meta_description: "{article.meta_description or ''}"
---

"""
    return PlainTextResponse(frontmatter + (article.content or ""), media_type="text/markdown",
                             headers={"Content-Disposition": f'attachment; filename="{article.slug or "article"}.md"'})


@router.get("/articles/{article_id}/export/html")
async def export_html(article_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Exporta artículo como HTML con meta tags."""
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    # Simple markdown to HTML (basic)
    content = article.content or ""
    import re as re_mod
    html_content = content
    html_content = re_mod.sub(r'^### (.+)$', r'<h3>\1</h3>', html_content, flags=re_mod.MULTILINE)
    html_content = re_mod.sub(r'^## (.+)$', r'<h2>\1</h2>', html_content, flags=re_mod.MULTILINE)
    html_content = re_mod.sub(r'^# (.+)$', r'<h1>\1</h1>', html_content, flags=re_mod.MULTILINE)
    html_content = re_mod.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html_content)
    html_content = re_mod.sub(r'^- (.+)$', r'<li>\1</li>', html_content, flags=re_mod.MULTILINE)
    html_content = html_content.replace('\n\n', '</p><p>').replace('\n', '<br>')

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>{article.meta_title or article.title}</title>
<meta name="description" content="{article.meta_description or ''}">
<meta name="keywords" content="{', '.join(article.secondary_keywords or [])}">
<link rel="canonical" href="{article.canonical_url or ''}">
<meta property="og:title" content="{article.meta_title or article.title}">
<meta property="og:description" content="{article.meta_description or ''}">
<meta property="og:type" content="article">
</head>
<body>
<article>
<p>{html_content}</p>
</article>
</body>
</html>"""
    return PlainTextResponse(html, media_type="text/html",
                             headers={"Content-Disposition": f'attachment; filename="{article.slug or "article"}.html"'})


@router.post("/articles/{article_id}/export/drive")
async def export_to_drive(article_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_write_access)):
    """Exporta artículo a Google Drive como documento."""
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    try:
        from app.services.gdrive_service import upload_text_to_drive
        result = await upload_text_to_drive(
            db=db,
            filename=f"{article.slug or 'article'}.md",
            content=article.content or "",
            folder="content",
            mime_type="text/markdown",
        )
        return {"drive_url": result.get("webViewLink", ""), "file_id": result.get("id", ""), "message": "Exportado a Google Drive"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error exportando a Drive: {str(e)}")


# ═══════════════════════════════════════════════════════════════
# KEYWORD STUDIO
# ═══════════════════════════════════════════════════════════════

@router.post("/keywords/research")
async def keyword_research(
    topic: str = Query(..., max_length=500),
    audience: str = Query("CEOs y responsables de compliance en España", max_length=300),
    provider: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    save: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Ejecuta solo el Agente 1 (Keyword Research) y opcionalmente guarda en SEOKeyword."""
    from app.services.content_pipeline import agent_keywords
    result = await agent_keywords(topic, audience, provider=provider, model=model)

    saved_count = 0
    if save and result.get("output"):
        # Intentar parsear keywords del output y guardar
        lines = result["output"].split("\n")
        for line in lines:
            line = line.strip().lstrip("- ").strip()
            if line and len(line) > 3 and len(line) < 200 and not line.startswith("#") and not line.startswith("|"):
                # Verificar si ya existe
                exists = await db.scalar(
                    select(func.count(SEOKeyword.id)).where(SEOKeyword.keyword == line.lower())
                )
                if not exists:
                    kw = SEOKeyword(keyword=line.lower(), category="research", language="es", location="Spain")
                    db.add(kw)
                    saved_count += 1
        if saved_count:
            await db.commit()

    return {"output": result.get("output", ""), "model": result.get("model"), "saved_keywords": saved_count}


@router.get("/keywords/suggestions")
async def keyword_suggestions(
    article_id: Optional[UUID] = None,
    topic: Optional[str] = Query(None, max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Sugiere keywords basadas en un artículo existente o topic."""
    if article_id:
        article = await db.get(Article, article_id)
        if article and article.pipeline_output:
            kw_output = article.pipeline_output.get("keywords", {})
            if isinstance(kw_output, dict):
                return {"suggestions": kw_output.get("output", ""), "source": "pipeline"}

    # Buscar keywords existentes relacionadas
    query = select(SEOKeyword)
    if topic:
        query = query.where(SEOKeyword.keyword.ilike(f"%{topic}%"))
    query = query.order_by(desc(SEOKeyword.search_volume)).limit(20)
    result = await db.execute(query)
    keywords = result.scalars().all()

    return {
        "suggestions": [
            {"keyword": k.keyword, "volume": k.search_volume, "difficulty": k.difficulty, "category": k.category}
            for k in keywords
        ],
        "source": "database",
    }


# ═══════════════════════════════════════════════════════════════
# BACKLINK MANAGER
# ═══════════════════════════════════════════════════════════════

@router.get("/backlinks", response_model=PaginatedResponse)
async def list_backlinks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = select(Backlink)
    if status:
        query = query.where(Backlink.status == status)
    if category:
        query = query.where(Backlink.category == category)
    if search:
        query = query.where(Backlink.source_domain.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(desc(Backlink.created_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    backlinks = result.scalars().all()

    return {
        "items": [
            {
                "id": str(b.id), "source_url": b.source_url, "source_domain": b.source_domain,
                "target_url": b.target_url, "anchor_text": b.anchor_text,
                "link_type": b.link_type, "domain_authority": b.domain_authority,
                "page_authority": b.page_authority, "status": b.status,
                "first_seen": b.first_seen.isoformat() if b.first_seen else None,
                "category": b.category, "outreach_status": b.outreach_status,
                "notes": b.notes, "created_at": b.created_at.isoformat(),
            }
            for b in backlinks
        ],
        "total": total, "page": page, "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 0,
    }


@router.post("/backlinks")
async def create_backlink(
    source_url: str = Query(..., max_length=1000),
    target_url: str = Query("https://st4rtup.app", max_length=1000),
    anchor_text: Optional[str] = Query(None),
    link_type: str = Query("dofollow"),
    category: Optional[str] = Query(None),
    domain_authority: Optional[int] = Query(None),
    notes: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    from urllib.parse import urlparse
    domain = urlparse(source_url).netloc or source_url
    bl = Backlink(
        source_url=source_url, source_domain=domain, target_url=target_url,
        anchor_text=anchor_text, link_type=link_type, category=category,
        domain_authority=domain_authority, notes=notes,
    )
    db.add(bl)
    await db.commit()
    await db.refresh(bl)
    return {"id": str(bl.id), "source_domain": bl.source_domain, "status": bl.status}


@router.put("/backlinks/{backlink_id}")
async def update_backlink(
    backlink_id: UUID,
    status: Optional[str] = Query(None),
    outreach_status: Optional[str] = Query(None),
    domain_authority: Optional[int] = Query(None),
    notes: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    bl = await db.get(Backlink, backlink_id)
    if not bl:
        raise HTTPException(status_code=404, detail="Backlink no encontrado")
    if status:
        bl.status = status
    if outreach_status:
        bl.outreach_status = outreach_status
    if domain_authority is not None:
        bl.domain_authority = domain_authority
    if notes is not None:
        bl.notes = notes
    await db.commit()
    return {"id": str(bl.id), "status": bl.status, "outreach_status": bl.outreach_status}


@router.delete("/backlinks/{backlink_id}")
async def delete_backlink(backlink_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_write_access)):
    bl = await db.get(Backlink, backlink_id)
    if not bl:
        raise HTTPException(status_code=404, detail="Backlink no encontrado")
    await db.delete(bl)
    await db.commit()
    return {"detail": "Backlink eliminado"}


@router.post("/backlinks/check")
async def check_backlinks(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Verifica si los backlinks activos siguen existiendo."""
    import httpx

    result = await db.execute(
        select(Backlink).where(Backlink.status == "active").limit(50)
    )
    backlinks = result.scalars().all()

    checked = 0
    still_active = 0
    now_lost = 0
    errors = 0

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        for bl in backlinks:
            try:
                resp = await client.get(bl.source_url, headers={"User-Agent": "St4rtupBot/1.0"})
                bl.last_checked = datetime.now(timezone.utc)

                if resp.status_code == 200:
                    # Check if our target URL is in the page
                    page_text = resp.text[:50000]  # Limit scan
                    target_domain = bl.target_url.split("//")[-1].split("/")[0] if bl.target_url else "st4rtup"
                    if target_domain in page_text:
                        bl.status = "active"
                        still_active += 1
                    else:
                        bl.status = "lost"
                        now_lost += 1
                else:
                    bl.status = "broken"
                    now_lost += 1
                checked += 1
            except Exception:
                errors += 1

    await db.commit()
    return {"checked": checked, "active": still_active, "lost": now_lost, "errors": errors}


@router.get("/backlinks/stats")
async def backlink_stats(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    total = await db.scalar(select(func.count(Backlink.id))) or 0
    active = await db.scalar(select(func.count(Backlink.id)).where(Backlink.status == "active")) or 0
    lost = await db.scalar(select(func.count(Backlink.id)).where(Backlink.status == "lost")) or 0
    domains = await db.scalar(select(func.count(func.distinct(Backlink.source_domain)))) or 0
    avg_da = await db.scalar(select(func.avg(Backlink.domain_authority)).where(Backlink.domain_authority.isnot(None))) or 0
    dofollow = await db.scalar(select(func.count(Backlink.id)).where(Backlink.link_type == "dofollow")) or 0

    by_category_q = await db.execute(
        select(Backlink.category, func.count(Backlink.id)).where(Backlink.category.isnot(None)).group_by(Backlink.category)
    )
    by_category = {r[0]: r[1] for r in by_category_q.all()}

    return {
        "total": total, "active": active, "lost": lost,
        "unique_domains": domains, "avg_domain_authority": round(float(avg_da), 1),
        "dofollow_pct": round(dofollow / total * 100, 1) if total else 0,
        "by_category": by_category,
    }


# ═══════════════════════════════════════════════════════════════
# INTERNAL LINKING AUDIT
# ═══════════════════════════════════════════════════════════════

@router.get("/internal-links")
async def internal_links_audit(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Analyzes internal linking between articles."""
    articles = await db.execute(
        select(Article).where(Article.status == ArticleStatus.PUBLISHED)
    )
    all_articles = articles.scalars().all()

    link_map = []
    for art in all_articles:
        content = art.content or ""
        # Count existing internal links (markdown links containing st4rtup)
        internal_links = re.findall(r'\[([^\]]+)\]\(([^)]*st4rtup[^)]*)\)', content)
        link_markers = re.findall(r'\[ENLACE INTERNO:\s*([^\]]+)\]', content)

        # Find articles with shared keywords for suggestions
        suggestions = []
        if art.primary_keyword:
            for other in all_articles:
                if other.id == art.id:
                    continue
                other_kws = [other.primary_keyword] + (other.secondary_keywords or [])
                if art.primary_keyword in other_kws or any(
                    k in (art.secondary_keywords or []) for k in other_kws if k
                ):
                    suggestions.append({
                        "id": str(other.id),
                        "title": other.title,
                        "shared_keyword": art.primary_keyword,
                    })

        link_map.append({
            "id": str(art.id),
            "title": art.title,
            "internal_links_count": len(internal_links),
            "internal_links": [{"text": l[0], "url": l[1]} for l in internal_links],
            "link_markers": link_markers,
            "suggested_links": suggestions[:5],
        })

    orphan_count = sum(1 for a in link_map if a["internal_links_count"] == 0)
    return {"articles": link_map, "total": len(link_map), "orphan_articles": orphan_count}


# ═══════════════════════════════════════════════════════════════
# COMPETITOR SEO CONNECT
# ═══════════════════════════════════════════════════════════════

@router.get("/competitor-analysis")
async def competitor_seo_analysis(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Compares our keyword rankings vs competitors."""
    from app.models.competitor import Competitor

    # Get our keywords
    our_kws = await db.execute(select(SEOKeyword))
    our_keywords = our_kws.scalars().all()

    # Get competitors
    competitors_q = await db.execute(select(Competitor).limit(10))
    competitors = competitors_q.scalars().all()

    # Get our latest rankings
    keyword_data = []
    for kw in our_keywords:
        latest = await db.execute(
            select(SEORanking).where(SEORanking.keyword_id == kw.id)
            .order_by(desc(SEORanking.check_date)).limit(1)
        )
        ranking = latest.scalar_one_or_none()
        keyword_data.append({
            "keyword": kw.keyword,
            "our_position": ranking.position if ranking else None,
            "volume": kw.search_volume,
            "difficulty": kw.difficulty,
            "category": kw.category,
        })

    # Content gap: keywords where we don't rank in top 20
    content_gap = [k for k in keyword_data if not k["our_position"] or k["our_position"] > 20]
    winning = [k for k in keyword_data if k["our_position"] and k["our_position"] <= 10]

    return {
        "total_keywords": len(keyword_data),
        "ranking_top10": len(winning),
        "content_gap": len(content_gap),
        "keywords": keyword_data,
        "content_gap_keywords": content_gap[:20],
        "winning_keywords": winning[:20],
        "competitors": [
            {"id": str(c.id), "name": c.name, "domain": c.domain if hasattr(c, 'domain') else ""}
            for c in competitors
        ],
    }


# ═══════════════════════════════════════════════════════════════
# SITE AUDIT DASHBOARD
# ═══════════════════════════════════════════════════════════════

@router.get("/site-audit")
async def site_audit_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Technical SEO audit summary across all content."""
    articles = await db.execute(select(Article))
    all_articles = articles.scalars().all()

    issues_summary = {"high": 0, "medium": 0, "low": 0}
    missing_meta_title = 0
    missing_meta_desc = 0
    missing_keyword = 0
    short_content = 0
    no_headings = 0
    no_images = 0
    no_links = 0
    total_words = 0
    scores = []

    for art in all_articles:
        content = art.content or ""
        if not art.meta_title:
            missing_meta_title += 1
        if not art.meta_description:
            missing_meta_desc += 1
        if not art.primary_keyword:
            missing_keyword += 1
        if art.word_count and art.word_count < 800:
            short_content += 1
        if "## " not in content:
            no_headings += 1
        if "![" not in content and "<img" not in content:
            no_images += 1
        if "[" not in content and "<a" not in content:
            no_links += 1
        total_words += art.word_count or 0
        if art.audit_score is not None:
            scores.append(art.audit_score)
        if art.audit_issues:
            for issue in art.audit_issues:
                sev = issue.get("severity", "medium")
                issues_summary[sev] = issues_summary.get(sev, 0) + 1

    avg_score = sum(scores) / len(scores) if scores else 0
    total = len(all_articles)

    checklist = [
        {"item": "Meta title", "ok": total - missing_meta_title, "total": total, "severity": "high"},
        {"item": "Meta description", "ok": total - missing_meta_desc, "total": total, "severity": "high"},
        {"item": "Primary keyword", "ok": total - missing_keyword, "total": total, "severity": "high"},
        {"item": "Content >= 800 words", "ok": total - short_content, "total": total, "severity": "medium"},
        {"item": "H2 headings", "ok": total - no_headings, "total": total, "severity": "medium"},
        {"item": "Images", "ok": total - no_images, "total": total, "severity": "medium"},
        {"item": "Internal links", "ok": total - no_links, "total": total, "severity": "low"},
    ]

    return {
        "total_articles": total,
        "avg_audit_score": round(avg_score, 1),
        "total_words": total_words,
        "issues_by_severity": issues_summary,
        "checklist": checklist,
        "health_score": round(avg_score) if avg_score else 0,
    }


# ═══════════════════════════════════════════════════════════════
# GRAPH VISUALIZATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/topic-graph")
async def topic_cluster_graph(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Network graph of articles connected by shared keywords."""
    articles = await db.execute(
        select(Article).where(Article.status != ArticleStatus.ARCHIVED)
    )
    all_articles = articles.scalars().all()

    nodes = []
    links = []

    for art in all_articles:
        nodes.append({
            "id": str(art.id),
            "label": art.title[:40],
            "type": "article",
            "size": max(10, min(40, (art.word_count or 500) / 100)),
            "score": art.seo_score or 0,
        })
        # Add keyword nodes
        if art.primary_keyword:
            kw_id = f"kw_{art.primary_keyword}"
            if not any(n["id"] == kw_id for n in nodes):
                nodes.append({"id": kw_id, "label": art.primary_keyword, "type": "keyword", "size": 15})
            links.append({"source": str(art.id), "target": kw_id, "strength": 1.0})

        for sk in (art.secondary_keywords or [])[:3]:
            kw_id = f"kw_{sk}"
            if not any(n["id"] == kw_id for n in nodes):
                nodes.append({"id": kw_id, "label": sk, "type": "keyword", "size": 10})
            links.append({"source": str(art.id), "target": kw_id, "strength": 0.5})

    return {"nodes": nodes, "links": links}


@router.get("/backlinks/graph")
async def backlinks_radial_graph(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Radial graph: st4rtup.app at center, linking domains around."""
    result = await db.execute(
        select(
            Backlink.source_domain,
            func.count(Backlink.id).label("count"),
            func.avg(Backlink.domain_authority).label("avg_da"),
            Backlink.status,
        )
        .group_by(Backlink.source_domain, Backlink.status)
    )

    domains = {}
    for domain, count, avg_da, status in result.all():
        if domain not in domains:
            domains[domain] = {"domain": domain, "links": 0, "da": 0, "active": 0, "lost": 0}
        domains[domain]["links"] += count
        domains[domain]["da"] = round(float(avg_da or 0))
        if status == "active":
            domains[domain]["active"] += count
        else:
            domains[domain]["lost"] += count

    nodes = [{"id": "st4rtup", "label": "st4rtup.app", "type": "center", "size": 50}]
    links_data = []

    for d in sorted(domains.values(), key=lambda x: x["links"], reverse=True)[:30]:
        nodes.append({
            "id": d["domain"],
            "label": d["domain"],
            "type": "domain",
            "size": max(8, min(35, d["da"] or 10)),
            "da": d["da"],
            "links": d["links"],
        })
        links_data.append({"source": d["domain"], "target": "st4rtup", "value": d["links"]})

    return {"nodes": nodes, "links": links_data}


@router.get("/competitors/bubble")
async def competitors_bubble(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Bubble chart: competitors by keywords and estimated traffic."""
    from app.models.competitor import Competitor

    competitors = await db.execute(select(Competitor).limit(20))
    all_comps = competitors.scalars().all()

    # Also add St4rtup as reference
    our_kw_count = (await db.execute(select(func.count(SEOKeyword.id)))).scalar() or 0

    bubbles = [{"name": "St4rtup", "keywords": our_kw_count, "size": 40, "color": "hsl(185,72%,48%)", "is_us": True}]

    for comp in all_comps:
        bubbles.append({
            "name": comp.name,
            "keywords": getattr(comp, 'estimated_keywords', 0) or 0,
            "size": max(15, min(35, (getattr(comp, 'estimated_traffic', 0) or 0) // 100)),
            "domain": getattr(comp, 'domain', '') or comp.website or '',
            "color": "hsl(220,10%,55%)",
            "is_us": False,
        })

    return {"bubbles": bubbles}


@router.get("/keywords/{keyword_id}/history")
async def keyword_ranking_history(
    keyword_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Historial de rankings de una keyword."""
    keyword = await db.get(SEOKeyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword no encontrada")

    rankings = await db.execute(
        select(SEORanking)
        .where(SEORanking.keyword_id == keyword_id)
        .order_by(SEORanking.check_date.asc())
    )

    history = [
        {
            "date": r.check_date.isoformat() if r.check_date else r.created_at.isoformat(),
            "position": r.position,
            "url": r.url_found,
        }
        for r in rankings.scalars().all()
    ]

    return {"keyword": keyword.keyword, "keyword_id": str(keyword_id), "history": history, "total_checks": len(history)}


@router.get("/keywords/rankings-overview")
async def keywords_rankings_overview(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Overview de rankings: todas las keywords con última posición."""
    keywords = await db.execute(select(SEOKeyword).order_by(SEOKeyword.keyword))
    all_kws = keywords.scalars().all()

    overview = []
    for kw in all_kws:
        latest = await db.execute(
            select(SEORanking).where(SEORanking.keyword_id == kw.id)
            .order_by(desc(SEORanking.check_date)).limit(1)
        )
        ranking = latest.scalar_one_or_none()

        # Previous ranking for trend
        prev = await db.execute(
            select(SEORanking).where(SEORanking.keyword_id == kw.id)
            .order_by(desc(SEORanking.check_date)).offset(1).limit(1)
        )
        prev_ranking = prev.scalar_one_or_none()

        current_pos = ranking.position if ranking else None
        prev_pos = prev_ranking.position if prev_ranking else None
        trend = (prev_pos - current_pos) if current_pos and prev_pos else 0

        overview.append({
            "keyword_id": str(kw.id),
            "keyword": kw.keyword,
            "category": kw.category,
            "volume": kw.search_volume,
            "difficulty": kw.difficulty,
            "position": current_pos,
            "prev_position": prev_pos,
            "trend": trend,  # positive = improving
        })

    return {"keywords": overview, "total": len(overview)}


# ═══════════════════════════════════════════════════════════════
# CONTENT CALENDAR HEATMAP
# ═══════════════════════════════════════════════════════════════

@router.get("/content-calendar")
async def content_calendar_heatmap(
    months: int = Query(6, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Heatmap de publicación de artículos por día."""
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=months * 30)

    result = await db.execute(
        select(func.date(Article.published_at), func.count(Article.id))
        .where(Article.published_at.isnot(None), Article.published_at >= since)
        .group_by(func.date(Article.published_at))
    )

    heatmap = {str(r[0]): r[1] for r in result.all()}

    # Also get drafts by creation date
    drafts = await db.execute(
        select(func.date(Article.created_at), func.count(Article.id))
        .where(Article.status == ArticleStatus.DRAFT, Article.created_at >= since)
        .group_by(func.date(Article.created_at))
    )
    drafts_map = {str(r[0]): r[1] for r in drafts.all()}

    return {"published": heatmap, "drafts": drafts_map, "months": months}


# ═══════════════════════════════════════════════════════════════
# CONTENT TRACKER (External Publications)
# ═══════════════════════════════════════════════════════════════

@router.get("/publications", response_model=PaginatedResponse)
async def list_publications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    platform: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = select(Publication)
    if platform:
        query = query.where(Publication.platform == platform)
    if status:
        query = query.where(Publication.status == status)
    if search:
        query = query.where(Publication.title.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(desc(Publication.published_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    pubs = result.scalars().all()

    return {
        "items": [
            {
                "id": str(p.id), "url": p.url, "title": p.title,
                "platform": p.platform.value if p.platform else "other",
                "status": p.status.value if p.status else "active",
                "author": p.author, "published_at": p.published_at.isoformat() if p.published_at else None,
                "description": p.description, "thumbnail_url": p.thumbnail_url,
                "keywords": p.keywords, "tags": p.tags,
                "views": p.views, "likes": p.likes, "shares": p.shares,
                "comments": p.comments, "clicks": p.clicks,
                "engagement_rate": p.engagement_rate,
                "article_id": str(p.article_id) if p.article_id else None,
                "notes": p.notes, "created_at": p.created_at.isoformat(),
            }
            for p in pubs
        ],
        "total": total, "page": page, "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 0,
    }


@router.post("/publications")
async def create_publication(
    url: str = Query(..., max_length=1000),
    title: str = Query(..., max_length=500),
    platform: str = Query("blog", max_length=30),
    author: Optional[str] = Query(None),
    published_at: Optional[str] = Query(None),
    description: Optional[str] = Query(None),
    keywords: Optional[str] = Query(None),
    article_id: Optional[UUID] = Query(None),
    notes: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    try:
        plat = PublicationPlatform(platform)
    except ValueError:
        plat = PublicationPlatform.OTHER

    pub_date = None
    if published_at:
        try:
            from dateutil.parser import parse
            pub_date = parse(published_at)
        except Exception:
            pub_date = datetime.now(timezone.utc)

    kw_list = [k.strip() for k in keywords.split(",")] if keywords else None

    pub = Publication(
        url=url, title=title, platform=plat,
        author=author, published_at=pub_date or datetime.now(timezone.utc),
        description=description, keywords=kw_list,
        article_id=article_id, notes=notes,
        created_by=UUID(current_user["user_id"]),
    )
    db.add(pub)
    await db.commit()
    await db.refresh(pub)
    return {"id": str(pub.id), "title": pub.title, "platform": pub.platform.value}


@router.put("/publications/{pub_id}")
async def update_publication(
    pub_id: UUID,
    title: Optional[str] = Query(None),
    views: Optional[int] = Query(None),
    likes: Optional[int] = Query(None),
    shares: Optional[int] = Query(None),
    comments: Optional[int] = Query(None),
    clicks: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    pub = await db.get(Publication, pub_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    if title: pub.title = title
    if views is not None: pub.views = views
    if likes is not None: pub.likes = likes
    if shares is not None: pub.shares = shares
    if comments is not None: pub.comments = comments
    if clicks is not None: pub.clicks = clicks
    if status:
        try:
            pub.status = PublicationStatus(status)
        except ValueError:
            pass
    if notes is not None: pub.notes = notes
    pub.last_checked = datetime.now(timezone.utc)

    # Calculate engagement rate
    total_interactions = (pub.likes or 0) + (pub.shares or 0) + (pub.comments or 0)
    if pub.views and pub.views > 0:
        pub.engagement_rate = round(total_interactions / pub.views * 100, 2)

    await db.commit()
    return {"id": str(pub.id), "updated": True}


@router.delete("/publications/{pub_id}")
async def delete_publication(pub_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_write_access)):
    pub = await db.get(Publication, pub_id)
    if not pub:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    await db.delete(pub)
    await db.commit()
    return {"detail": "Publicación eliminada"}


@router.get("/publications/stats")
async def publication_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    total = await db.scalar(select(func.count(Publication.id))) or 0
    active = await db.scalar(select(func.count(Publication.id)).where(Publication.status == PublicationStatus.ACTIVE)) or 0
    total_views = await db.scalar(select(func.coalesce(func.sum(Publication.views), 0))) or 0
    total_likes = await db.scalar(select(func.coalesce(func.sum(Publication.likes), 0))) or 0
    avg_engagement = await db.scalar(select(func.avg(Publication.engagement_rate)).where(Publication.engagement_rate > 0)) or 0

    by_platform_q = await db.execute(
        select(Publication.platform, func.count(Publication.id))
        .group_by(Publication.platform)
    )
    by_platform = {str(r[0].value) if r[0] else "other": r[1] for r in by_platform_q.all()}

    return {
        "total": total, "active": active,
        "total_views": int(total_views), "total_likes": int(total_likes),
        "avg_engagement_rate": round(float(avg_engagement), 2),
        "by_platform": by_platform,
    }
