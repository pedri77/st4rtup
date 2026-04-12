"""Endpoint de tracking pixel para emails abiertos."""
import base64
import logging
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models.crm import Email

logger = logging.getLogger(__name__)

router = APIRouter()

RATE_PIXEL = "300/minute"

# 1x1 transparent GIF
PIXEL = base64.b64decode(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
)


@router.get("/pixel/{email_id}.gif")
@limiter.limit(RATE_PIXEL)
async def tracking_pixel(
    email_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Devuelve 1x1 GIF y registra apertura del email."""
    try:
        result = await db.execute(select(Email).where(Email.id == email_id))
        email = result.scalar_one_or_none()
        if email:
            opens = (email.metadata_ or {}).get("opens", 0) if isinstance(email.metadata_, dict) else 0
            meta = dict(email.metadata_) if isinstance(email.metadata_, dict) else {}
            meta["opens"] = opens + 1
            meta["last_opened_at"] = datetime.now(timezone.utc).isoformat()
            meta["last_opened_ip"] = request.client.host if request.client else None
            meta["last_opened_ua"] = request.headers.get("user-agent", "")[:200]
            if opens == 0:
                meta["first_opened_at"] = meta["last_opened_at"]

            await db.execute(
                update(Email).where(Email.id == email_id).values(metadata_=meta)
            )
            await db.commit()

            # Dispatch to workflow engine (EM-02 score update)
            if opens == 0 and email.lead_id:
                try:
                    from app.core.workflow_engine import dispatch_event
                    await dispatch_event("email.opened", {"lead_id": str(email.lead_id), "email_id": str(email_id)}, db)
                except Exception:
                    pass
    except Exception:
        logger.warning("Error tracking email open for %s", email_id, exc_info=True)

    return Response(
        content=PIXEL,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.get("/click/{email_id}")
@limiter.limit(RATE_PIXEL)
async def track_click(
    email_id: UUID,
    url: str = Query(..., description="URL original del link"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Registra click en un link del email y redirige a la URL original."""
    from fastapi.responses import RedirectResponse

    try:
        result = await db.execute(select(Email).where(Email.id == email_id))
        email = result.scalar_one_or_none()
        if email:
            meta = dict(email.metadata_) if isinstance(email.metadata_, dict) else {}
            clicks = meta.get("clicks", [])
            clicks.append({
                "url": url[:500],
                "clicked_at": datetime.now(timezone.utc).isoformat(),
                "ip": request.client.host if request and request.client else None,
            })
            meta["clicks"] = clicks[-50:]  # Keep last 50 clicks
            meta["total_clicks"] = meta.get("total_clicks", 0) + 1

            await db.execute(
                update(Email).where(Email.id == email_id).values(metadata_=meta)
            )
            await db.commit()

            if email.lead_id:
                try:
                    from app.core.workflow_engine import dispatch_event
                    await dispatch_event("email.clicked", {
                        "lead_id": str(email.lead_id),
                        "email_id": str(email_id),
                        "url": url[:500],
                    }, db)
                except Exception:
                    pass
    except Exception:
        logger.warning("Error tracking click for %s", email_id, exc_info=True)

    return RedirectResponse(url=url, status_code=302)


def inject_tracking_pixel(html_body: str, email_id: str, base_url: str = "https://api.st4rtup.com") -> str:
    """Inyecta pixel de tracking en el HTML del email."""
    pixel_url = f"{base_url}/api/v1/tracking/pixel/{email_id}.gif"
    pixel_tag = f'<img src="{pixel_url}" width="1" height="1" style="display:none" alt="" />'
    if "</body>" in html_body.lower():
        idx = html_body.lower().rfind("</body>")
        return html_body[:idx] + pixel_tag + html_body[idx:]
    return html_body + pixel_tag


def wrap_links_for_tracking(html_body: str, email_id: str, base_url: str = "https://api.st4rtup.com") -> str:
    """Reemplaza links en el HTML para pasar por el tracker de clicks."""
    import re
    from urllib.parse import quote

    def replace_link(match):
        original_url = match.group(1)
        # Don't wrap tracking pixel, mailto, or anchor links
        if any(skip in original_url for skip in ["tracking/pixel", "mailto:", "#", "unsubscribe"]):
            return match.group(0)
        tracked_url = f"{base_url}/api/v1/tracking/click/{email_id}?url={quote(original_url, safe='')}"
        return f'href="{tracked_url}"'

    return re.sub(r'href="(https?://[^"]+)"', replace_link, html_body, flags=re.IGNORECASE)
