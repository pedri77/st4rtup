"""Notion integration service for marketing calendar sync."""
import logging
import httpx
from datetime import datetime
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

NOTION_API_URL = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"

# Mapping our event types to Notion select options
EVENT_TYPE_LABELS = {
    "seo_article": "Artículo SEO",
    "campaign_launch": "Lanzamiento",
    "email_newsletter": "Newsletter",
    "youtube_video": "Vídeo YouTube",
    "webinar_event": "Webinar",
    "social_post": "Social Post",
}

# Cache for DB-loaded config
_db_notion_config = None


async def _load_config_from_db():
    """Load Notion config from system_settings (set via frontend)."""
    global _db_notion_config
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.system import SystemSettings
        from sqlalchemy import select
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(SystemSettings).limit(1))
            sys_settings = result.scalar_one_or_none()
            if sys_settings and sys_settings.notion_config:
                _db_notion_config = sys_settings.notion_config
                return _db_notion_config
    except Exception:
        pass
    return None


def _get_api_key() -> str:
    """Get API key from env vars or DB config."""
    if settings.NOTION_API_KEY:
        return settings.NOTION_API_KEY
    if _db_notion_config and _db_notion_config.get("api_key"):
        return _db_notion_config["api_key"]
    return ""


def _get_database_id() -> str:
    """Get database ID from env vars or DB config."""
    if settings.NOTION_DATABASE_ID:
        return settings.NOTION_DATABASE_ID
    if _db_notion_config and _db_notion_config.get("database_id"):
        return _db_notion_config["database_id"]
    return ""


def _get_headers() -> dict:
    return {
        "Authorization": f"Bearer {_get_api_key()}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def is_configured() -> bool:
    return bool(_get_api_key() and _get_database_id())


async def push_event(
    title: str,
    event_type: str,
    start_date: datetime,
    end_date: Optional[datetime] = None,
    description: Optional[str] = None,
    channel: Optional[str] = None,
) -> Optional[dict]:
    """Push a calendar event to Notion database. Returns Notion page or None."""
    await _load_config_from_db()
    if not is_configured():
        logger.debug("Notion not configured, skipping push")
        return None

    date_prop = {"start": start_date.strftime("%Y-%m-%d")}
    if end_date:
        date_prop["end"] = end_date.strftime("%Y-%m-%d")

    properties = {
        "Name": {"title": [{"text": {"content": title}}]},
        "Tipo": {"select": {"name": EVENT_TYPE_LABELS.get(event_type, event_type)}},
        "Fecha": {"date": date_prop},
    }

    if channel:
        properties["Canal"] = {"rich_text": [{"text": {"content": channel}}]}

    body = {
        "parent": {"database_id": _get_database_id()},
        "properties": properties,
    }

    if description:
        body["children"] = [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": description}}]
                },
            }
        ]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{NOTION_API_URL}/pages",
                headers=_get_headers(),
                json=body,
            )
            resp.raise_for_status()
            result = resp.json()
            logger.info(f"Notion: pushed event '{title}' → {result.get('id')}")
            return result
    except Exception as e:
        logger.error(f"Notion push error: {e}")
        return None


async def pull_events(
    start_after: Optional[str] = None,
    start_before: Optional[str] = None,
) -> list[dict]:
    """Pull events from Notion database. Returns list of parsed events."""
    await _load_config_from_db()
    if not is_configured():
        return []

    filter_obj = {"and": []}
    if start_after:
        filter_obj["and"].append({
            "property": "Fecha",
            "date": {"on_or_after": start_after},
        })
    if start_before:
        filter_obj["and"].append({
            "property": "Fecha",
            "date": {"on_or_before": start_before},
        })

    body = {
        "sorts": [{"property": "Fecha", "direction": "ascending"}],
    }
    if filter_obj["and"]:
        body["filter"] = filter_obj

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{NOTION_API_URL}/databases/{_get_database_id()}/query",
                headers=_get_headers(),
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()

        events = []
        for page in data.get("results", []):
            props = page.get("properties", {})
            title_parts = props.get("Name", {}).get("title", [])
            title = title_parts[0]["plain_text"] if title_parts else "Sin título"

            tipo_select = props.get("Tipo", {}).get("select")
            event_type = "seo_article"
            if tipo_select:
                label = tipo_select.get("name", "")
                for k, v in EVENT_TYPE_LABELS.items():
                    if v == label:
                        event_type = k
                        break

            date_prop = props.get("Fecha", {}).get("date", {})
            start_date = date_prop.get("start") if date_prop else None
            end_date = date_prop.get("end") if date_prop else None

            canal_parts = props.get("Canal", {}).get("rich_text", [])
            channel = canal_parts[0]["plain_text"] if canal_parts else None

            events.append({
                "notion_id": page["id"],
                "title": title,
                "event_type": event_type,
                "start_date": start_date,
                "end_date": end_date,
                "channel": channel,
            })

        logger.info(f"Notion: pulled {len(events)} events")
        return events
    except Exception as e:
        logger.error(f"Notion pull error: {e}")
        return []


async def test_connection() -> dict:
    """Test Notion API connection."""
    await _load_config_from_db()
    if not is_configured():
        return {"connected": False, "error": "NOTION_API_KEY or NOTION_DATABASE_ID not configured"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{NOTION_API_URL}/databases/{_get_database_id()}",
                headers=_get_headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            title_parts = data.get("title", [])
            db_title = title_parts[0]["plain_text"] if title_parts else "Untitled"
            return {
                "connected": True,
                "database": db_title,
                "database_id": _get_database_id(),
            }
    except httpx.HTTPStatusError as e:
        return {"connected": False, "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}"}
    except Exception as e:
        return {"connected": False, "error": str(e)}
