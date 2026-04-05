"""Microsoft Clarity API service — behavioral analytics para lead enrichment."""
import logging

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.system import SystemSettings

logger = logging.getLogger(__name__)

# Clarity API (requires project ID and API key)
API_BASE = "https://www.clarity.ms/api/v1"


async def _get_clarity_config(db: AsyncSession) -> dict | None:
    result = await db.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        return None
    # Clarity config stored in general_config or a dedicated field
    cfg = settings.general_config or {}
    clarity_cfg = cfg.get("clarity", {})
    if not clarity_cfg.get("project_id"):
        return None
    return clarity_cfg


async def get_project_summary(db: AsyncSession, days: int = 30) -> dict:
    """Obtiene resumen del proyecto Clarity: sessions, pages/session, scroll depth."""
    cfg = await _get_clarity_config(db)
    if not cfg:
        return {"error": "Clarity no configurado", "connected": False}

    project_id = cfg["project_id"]
    api_key = cfg.get("api_key", "")

    if not api_key:
        return {
            "connected": True,
            "note": "Clarity tracking activo (script JS). API key necesaria para consultas.",
            "project_id": project_id,
            "tracking_script": f'<script type="text/javascript">(function(c,l,a,r,i,t,y){{c[a]=c[a]||function(){{(c[a].q=c[a].q||[]).push(arguments)}};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)}})(window,document,"clarity","script","{project_id}");</script>',
        }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/projects/{project_id}/summary",
            params={"days": days},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )

    if resp.status_code != 200:
        logger.warning("Clarity API error %d: %s", resp.status_code, resp.text[:200])
        return {"error": f"Clarity API error: {resp.status_code}", "connected": True}

    return {"connected": True, **resp.json()}


async def get_engaged_sessions(db: AsyncSession, min_product_views: int = 2, days: int = 7) -> dict:
    """Obtiene sessions con ≥N vistas a páginas de producto (pricing, features, demo).
    Retorna emails identificados para enriquecer scoring de leads.
    """
    cfg = await _get_clarity_config(db)
    if not cfg or not cfg.get("api_key"):
        return {"connected": False, "sessions": []}

    project_id = cfg["project_id"]
    api_key = cfg["api_key"]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{API_BASE}/projects/{project_id}/sessions",
                params={
                    "days": days,
                    "pageFilter": "/pricing,/features,/demo,/product",
                    "minPageViews": min_product_views,
                },
                headers={"Authorization": f"Bearer {api_key}"},
            )

        if resp.status_code != 200:
            logger.warning("Clarity sessions API error %d", resp.status_code)
            return {"connected": True, "sessions": [], "error": f"API error {resp.status_code}"}

        data = resp.json()
        sessions = []
        for s in data.get("sessions", data.get("results", [])):
            email = s.get("email") or s.get("userEmail") or s.get("customUserId", "")
            if email and "@" in str(email):
                sessions.append({
                    "email": email,
                    "page_views": s.get("pageViews", 0),
                    "pages": s.get("pages", []),
                    "duration": s.get("duration", 0),
                })

        return {"connected": True, "sessions": sessions, "total": len(sessions)}
    except Exception as e:
        logger.error(f"Clarity engaged sessions error: {e}")
        return {"connected": True, "sessions": [], "error": str(e)}


def get_tracking_script(project_id: str) -> str:
    """Genera el script de tracking de Clarity para insertar en el frontend."""
    return f"""<!-- Microsoft Clarity -->
<script type="text/javascript">
(function(c,l,a,r,i,t,y){{
    c[a]=c[a]||function(){{(c[a].q=c[a].q||[]).push(arguments)}};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)
}})(window, document, "clarity", "script", "{project_id}");
</script>"""
