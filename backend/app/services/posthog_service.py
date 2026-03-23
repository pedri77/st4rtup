"""PostHog service — product analytics para señales de upsell/churn.

Self-hosted en Hetzner o cloud. Captura eventos del CRM y los usa
para alimentar AGENT-CS-001.

Eventos tracked:
- deal_created, deal_stage_changed, deal_closed
- proposal_opened, proposal_sent
- call_completed, call_scored
- login, feature_used
"""
import logging
from datetime import datetime, timezone

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_config() -> tuple[str, str] | None:
    """Obtiene PostHog host y API key."""
    host = getattr(settings, "POSTHOG_HOST", "") or ""
    key = getattr(settings, "POSTHOG_API_KEY", "") or ""
    if not host or not key:
        return None
    return host, key


async def capture_event(
    distinct_id: str,
    event: str,
    properties: dict | None = None,
) -> bool:
    """Envía un evento a PostHog."""
    cfg = _get_config()
    if not cfg:
        return False

    host, api_key = cfg

    body = {
        "api_key": api_key,
        "event": event,
        "distinct_id": distinct_id,
        "properties": {
            **(properties or {}),
            "$current_url": "https://app.st4rtup.app",
            "source": "backend",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{host}/capture/",
                json=body,
                timeout=5,
            )
        return resp.status_code == 200
    except Exception as e:
        logger.warning("PostHog capture error: %s", e)
        return False


async def get_person_events(
    distinct_id: str,
    event_name: str | None = None,
    days: int = 30,
) -> dict:
    """Obtiene eventos recientes de una persona."""
    cfg = _get_config()
    if not cfg:
        return {"error": "PostHog no configurado"}

    host, api_key = cfg
    project_id = getattr(settings, "POSTHOG_PROJECT_ID", "1")

    params = {
        "distinct_id": distinct_id,
        "limit": 100,
    }
    if event_name:
        params["event"] = event_name

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{host}/api/projects/{project_id}/events/",
                params=params,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10,
            )

        if resp.status_code != 200:
            return {"error": f"PostHog API error: {resp.status_code}"}

        data = resp.json()
        events = [
            {
                "event": e.get("event"),
                "timestamp": e.get("timestamp"),
                "properties": e.get("properties", {}),
            }
            for e in data.get("results", [])
        ]
        return {"events": events, "count": len(events)}

    except Exception as e:
        return {"error": str(e)}


async def get_churn_signals(distinct_id: str) -> dict:
    """Detecta señales de churn para un cliente/lead.

    Señales:
    - 0 eventos en 14 días → churn flag
    - proposal_opened > 3 en 48h → hot lead (upsell)
    - Disminución de logins → engagement drop
    """
    cfg = _get_config()
    if not cfg:
        return {"error": "PostHog no configurado"}

    events_data = await get_person_events(distinct_id, days=30)
    if "error" in events_data:
        return events_data

    events = events_data.get("events", [])
    now = datetime.now(timezone.utc)

    # Analyze
    recent_14d = [e for e in events if _within_days(e.get("timestamp"), now, 14)]
    recent_48h = [e for e in events if _within_days(e.get("timestamp"), now, 2)]

    proposal_opens_48h = len([e for e in recent_48h if e["event"] == "proposal_opened"])
    total_events_14d = len(recent_14d)
    logins_14d = len([e for e in recent_14d if e["event"] == "login"])

    signals = []
    risk_score = 0

    if total_events_14d == 0:
        signals.append("🔴 Sin actividad en 14 días — posible churn")
        risk_score += 40

    if logins_14d < 2:
        signals.append("🟡 Menos de 2 logins en 14 días — engagement bajo")
        risk_score += 20

    if proposal_opens_48h >= 3:
        signals.append("🟢 3+ propuestas abiertas en 48h — señal de upsell")
        risk_score -= 30  # Positive signal

    return {
        "distinct_id": distinct_id,
        "total_events_14d": total_events_14d,
        "logins_14d": logins_14d,
        "proposal_opens_48h": proposal_opens_48h,
        "signals": signals,
        "churn_risk": max(0, min(100, risk_score)),
        "recommendation": "upsell" if proposal_opens_48h >= 3 else ("churn_risk" if risk_score >= 40 else "healthy"),
    }


def _within_days(timestamp_str: str | None, now: datetime, days: int) -> bool:
    if not timestamp_str:
        return False
    try:
        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        return (now - dt).days <= days
    except (ValueError, TypeError):
        return False
