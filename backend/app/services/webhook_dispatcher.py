"""
Servicio para despachar webhooks salientes a suscriptores externos (Zapier, Make, n8n, custom).
"""
import asyncio
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.webhook_subscription import WebhookSubscription

logger = logging.getLogger(__name__)
TIMEOUT = 15.0
MAX_RETRIES = 3

# Supported events
EVENTS = [
    "lead.created", "lead.updated", "lead.status_changed",
    "opportunity.created", "opportunity.stage_changed", "opportunity.won", "opportunity.lost",
    "action.created", "action.completed", "action.overdue",
    "email.sent", "email.bounced",
    "offer.created", "offer.signed",
    "visit.scheduled",
    "contact.created",
]


def _sign_payload(payload: str, secret: str) -> str:
    """Genera HMAC-SHA256 signature."""
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


async def dispatch_webhook_with_retry(url: str, payload: str, headers: dict, max_retries: int = MAX_RETRIES) -> dict:
    """Dispatch a single webhook with exponential backoff retry.

    Retries up to *max_retries* times with backoff delays of 1 s, 4 s, 16 s (4^attempt).
    After all attempts are exhausted the result is flagged as dead_letter.
    """
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                r = await client.post(url, content=payload, headers=headers)
            if r.status_code < 400:
                return {"success": True, "status_code": r.status_code, "attempts": attempt + 1}
            # Server returned 4xx/5xx — log and potentially retry
            logger.warning(
                "Webhook attempt %d/%d to %s returned %d",
                attempt + 1, max_retries, url, r.status_code,
            )
        except Exception as e:
            logger.warning(
                "Webhook attempt %d/%d to %s failed: %s",
                attempt + 1, max_retries, url, str(e),
            )
            if attempt == max_retries - 1:
                return {
                    "success": False,
                    "error": str(e)[:500],
                    "attempts": max_retries,
                    "dead_letter": True,
                }

        # Exponential backoff: 4^0=1s, 4^1=4s, 4^2=16s
        if attempt < max_retries - 1:
            await asyncio.sleep(4 ** attempt)

    return {
        "success": False,
        "error": "Max retries exceeded",
        "attempts": max_retries,
        "dead_letter": True,
    }


async def dispatch_event(
    db: AsyncSession,
    event: str,
    data: dict,
):
    """Envia el evento a todos los suscriptores activos que lo escuchen.

    Each delivery is attempted up to MAX_RETRIES times with exponential backoff.
    Failed deliveries after all retries are stored as dead-letter entries in the
    subscription's ``last_error`` JSON field.
    """
    result = await db.execute(
        select(WebhookSubscription).where(
            WebhookSubscription.is_active.is_(True)
        )
    )
    subscriptions = result.scalars().all()

    for sub in subscriptions:
        if event not in (sub.events or []):
            continue

        payload = json.dumps({
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }, default=str)

        headers = {"Content-Type": "application/json"}
        if sub.headers:
            headers.update(sub.headers)
        if sub.secret:
            headers["X-Webhook-Signature"] = _sign_payload(payload, sub.secret)

        dispatch_result = await dispatch_webhook_with_retry(sub.url, payload, headers)

        if dispatch_result.get("success"):
            await db.execute(
                update(WebhookSubscription)
                .where(WebhookSubscription.id == sub.id)
                .values(
                    last_status="success",
                    last_error=None,
                    total_sent=str(int(sub.total_sent or "0") + 1),
                )
            )
        else:
            error_info = dispatch_result.get("error", "Unknown error")
            dead_letter_payload = None
            if dispatch_result.get("dead_letter"):
                dead_letter_payload = json.dumps({
                    "dead_letter": True,
                    "event": event,
                    "url": sub.url,
                    "error": error_info,
                    "attempts": dispatch_result.get("attempts", MAX_RETRIES),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "payload_preview": payload[:500],
                })
                logger.error(
                    "Webhook dead-lettered for %s → %s after %d attempts: %s",
                    event, sub.url, dispatch_result.get("attempts", MAX_RETRIES), error_info,
                )

            await db.execute(
                update(WebhookSubscription)
                .where(WebhookSubscription.id == sub.id)
                .values(
                    last_status="dead_letter" if dispatch_result.get("dead_letter") else "error",
                    last_error=dead_letter_payload or error_info[:500],
                    total_errors=str(int(sub.total_errors or "0") + 1),
                )
            )

    await db.commit()


async def test_subscription(sub_url: str, secret: Optional[str] = None, headers: Optional[dict] = None) -> dict:
    """Envia un evento de test a la URL del suscriptor."""
    payload = json.dumps({
        "event": "test.ping",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {"message": "St4rtup CRM webhook test"},
    })

    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    if secret:
        req_headers["X-Webhook-Signature"] = _sign_payload(payload, secret)

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(sub_url, content=payload, headers=req_headers)
            return {"success": r.status_code < 400, "status_code": r.status_code, "body": r.text[:500]}
    except Exception as e:
        return {"success": False, "error": str(e)}
