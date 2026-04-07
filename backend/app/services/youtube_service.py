"""Servicio de integración con YouTube Data API v3 + Analytics API.
Usa las mismas credenciales OAuth que Google Drive (mismo proyecto GCP).
"""
import logging
import time
from typing import Optional

import httpx
from sqlalchemy import select as sa_select

from app.core.config import settings

logger = logging.getLogger(__name__)

YOUTUBE_DATA_API = "https://www.googleapis.com/youtube/v3"
YOUTUBE_ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2"

CHANNEL_ID = settings.YOUTUBE_CHANNEL_ID or "UCe_cKWVMFtl1xKrdzwMYqbQ"


async def _get_access_token() -> Optional[str]:
    """Get OAuth access token from youtube_config or gdrive_config (same GCP project)."""
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.system import SystemSettings

        async with AsyncSessionLocal() as session:
            result = await session.execute(sa_select(SystemSettings).limit(1))
            sys_settings = result.scalar_one_or_none()
            if not sys_settings:
                return None

            # Try youtube_config first, fallback to gdrive_config (same OAuth)
            from app.core.credential_store import credential_store, SENSITIVE_KEYS
            source = "youtube_config" if sys_settings.youtube_config else "gdrive_config"
            raw_cfg = sys_settings.youtube_config or sys_settings.gdrive_config
            if not raw_cfg:
                return None
            cfg = credential_store.decrypt_config(
                raw_cfg, SENSITIVE_KEYS.get(source, ["access_token", "refresh_token", "client_secret"])
            )

            access_token = cfg.get("access_token")
            refresh_token = cfg.get("refresh_token")

            if not access_token and not refresh_token:
                return None

            # Refresh if expired
            expires_at = cfg.get("expires_at", 0)
            if time.time() > expires_at - 60 and refresh_token:
                client_id = cfg.get("client_id") or settings.GOOGLE_OAUTH_CLIENT_ID
                client_secret = cfg.get("client_secret") or settings.GOOGLE_OAUTH_CLIENT_SECRET
                if client_id and client_secret:
                    async with httpx.AsyncClient(timeout=10) as client:
                        r = await client.post("https://oauth2.googleapis.com/token", data={
                            "client_id": client_id, "client_secret": client_secret,
                            "refresh_token": refresh_token, "grant_type": "refresh_token",
                        })
                        if r.status_code == 200:
                            data = r.json()
                            access_token = data["access_token"]
                            cfg["access_token"] = access_token
                            cfg["expires_at"] = time.time() + data.get("expires_in", 3600)
                            # Save back to whichever config we loaded from — re-cifrado
                            sensitive = SENSITIVE_KEYS.get(source, ["access_token", "refresh_token", "client_secret"])
                            encrypted_cfg = credential_store.encrypt_config(cfg, sensitive)
                            if sys_settings.youtube_config:
                                sys_settings.youtube_config = encrypted_cfg
                            else:
                                sys_settings.gdrive_config = encrypted_cfg
                            await session.commit()

            return access_token
    except Exception as e:
        logger.error("YouTube OAuth token error: %s", e)
        return None


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def is_configured() -> bool:
    return bool(settings.GOOGLE_OAUTH_CLIENT_ID and settings.GOOGLE_OAUTH_CLIENT_SECRET)


# ─── Channel Info ────────────────────────────────────────────

async def get_channel_info() -> dict:
    """Get channel details: name, subscribers, videos, views."""
    token = await _get_access_token()
    if not token:
        return {"error": "YouTube OAuth no configurado. Conecta Google OAuth en Integraciones."}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{YOUTUBE_DATA_API}/channels",
            headers=_headers(token),
            params={"part": "snippet,statistics,brandingSettings", "id": CHANNEL_ID},
        )
        if resp.status_code != 200:
            return {"error": f"YouTube API {resp.status_code}: {resp.text[:200]}"}

        data = resp.json()
        items = data.get("items", [])
        if not items:
            return {"error": f"Canal no encontrado: {CHANNEL_ID}"}

        ch = items[0]
        snippet = ch.get("snippet", {})
        stats = ch.get("statistics", {})

        return {
            "channel_id": CHANNEL_ID,
            "title": snippet.get("title", ""),
            "description": snippet.get("description", "")[:300],
            "thumbnail": snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
            "subscribers": int(stats.get("subscriberCount", 0)),
            "total_videos": int(stats.get("videoCount", 0)),
            "total_views": int(stats.get("viewCount", 0)),
            "published_at": snippet.get("publishedAt", ""),
        }


# ─── List Videos ─────────────────────────────────────────────

async def list_videos(max_results: int = 20) -> dict:
    """List recent videos from the channel."""
    token = await _get_access_token()
    if not token:
        return {"error": "YouTube OAuth no configurado"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Get upload playlist ID
        ch_resp = await client.get(
            f"{YOUTUBE_DATA_API}/channels",
            headers=_headers(token),
            params={"part": "contentDetails", "id": CHANNEL_ID},
        )
        if ch_resp.status_code != 200:
            return {"error": f"API error: {ch_resp.status_code}"}

        uploads_playlist = ch_resp.json().get("items", [{}])[0].get(
            "contentDetails", {}
        ).get("relatedPlaylists", {}).get("uploads")

        if not uploads_playlist:
            return {"videos": [], "total": 0}

        # Get videos from uploads playlist
        pl_resp = await client.get(
            f"{YOUTUBE_DATA_API}/playlistItems",
            headers=_headers(token),
            params={"part": "snippet", "playlistId": uploads_playlist, "maxResults": max_results},
        )
        if pl_resp.status_code != 200:
            return {"error": f"API error: {pl_resp.status_code}"}

        items = pl_resp.json().get("items", [])
        video_ids = [item["snippet"]["resourceId"]["videoId"] for item in items if item.get("snippet", {}).get("resourceId")]

        if not video_ids:
            return {"videos": [], "total": 0}

        # Get video statistics
        stats_resp = await client.get(
            f"{YOUTUBE_DATA_API}/videos",
            headers=_headers(token),
            params={"part": "statistics,snippet,contentDetails", "id": ",".join(video_ids)},
        )

        videos = []
        if stats_resp.status_code == 200:
            for v in stats_resp.json().get("items", []):
                snippet = v.get("snippet", {})
                stats = v.get("statistics", {})
                videos.append({
                    "id": v["id"],
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", "")[:200],
                    "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
                    "published_at": snippet.get("publishedAt", ""),
                    "duration": v.get("contentDetails", {}).get("duration", ""),
                    "views": int(stats.get("viewCount", 0)),
                    "likes": int(stats.get("likeCount", 0)),
                    "comments": int(stats.get("commentCount", 0)),
                    "url": f"https://youtube.com/watch?v={v['id']}",
                })

        return {"videos": videos, "total": len(videos)}


# ─── Video Analytics ─────────────────────────────────────────

async def get_video_analytics(video_id: str) -> dict:
    """Get detailed analytics for a specific video."""
    token = await _get_access_token()
    if not token:
        return {"error": "YouTube OAuth no configurado"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Basic stats via Data API
        resp = await client.get(
            f"{YOUTUBE_DATA_API}/videos",
            headers=_headers(token),
            params={"part": "statistics,snippet,contentDetails", "id": video_id},
        )
        if resp.status_code != 200:
            return {"error": f"API error: {resp.status_code}"}

        items = resp.json().get("items", [])
        if not items:
            return {"error": "Video no encontrado"}

        v = items[0]
        snippet = v.get("snippet", {})
        stats = v.get("statistics", {})

        return {
            "id": video_id,
            "title": snippet.get("title", ""),
            "views": int(stats.get("viewCount", 0)),
            "likes": int(stats.get("likeCount", 0)),
            "comments": int(stats.get("commentCount", 0)),
            "favorites": int(stats.get("favoriteCount", 0)),
            "duration": v.get("contentDetails", {}).get("duration", ""),
            "published_at": snippet.get("publishedAt", ""),
            "tags": snippet.get("tags", [])[:10],
            "category_id": snippet.get("categoryId", ""),
        }


# ─── Channel Analytics Summary ───────────────────────────────

async def get_channel_analytics(days: int = 30) -> dict:
    """Get channel-level analytics for the last N days."""
    token = await _get_access_token()
    if not token:
        return {"error": "YouTube OAuth no configurado"}

    from datetime import datetime, timezone, timedelta
    end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{YOUTUBE_ANALYTICS_API}/reports",
            headers=_headers(token),
            params={
                "ids": f"channel=={CHANNEL_ID}",
                "startDate": start_date,
                "endDate": end_date,
                "metrics": "views,estimatedMinutesWatched,averageViewDuration,likes,subscribersGained,subscribersLost",
                "dimensions": "",
            },
        )

        if resp.status_code != 200:
            # Analytics API might not be authorized yet — return basic stats
            channel = await get_channel_info()
            return {
                "period_days": days,
                "analytics_available": False,
                "channel": channel if not channel.get("error") else None,
                "message": "YouTube Analytics API no autorizada. Usa los datos básicos del canal.",
            }

        data = resp.json()
        rows = data.get("rows", [[0, 0, 0, 0, 0, 0]])
        row = rows[0] if rows else [0, 0, 0, 0, 0, 0]

        return {
            "period_days": days,
            "analytics_available": True,
            "views": row[0],
            "watch_time_minutes": row[1],
            "avg_view_duration_seconds": row[2],
            "likes": row[3],
            "subscribers_gained": row[4],
            "subscribers_lost": row[5],
            "net_subscribers": row[4] - row[5],
        }


# ─── Search Videos ───────────────────────────────────────────

async def search_videos(query: str, max_results: int = 10) -> dict:
    """Search videos on the channel."""
    token = await _get_access_token()
    if not token:
        return {"error": "YouTube OAuth no configurado"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{YOUTUBE_DATA_API}/search",
            headers=_headers(token),
            params={
                "part": "snippet",
                "channelId": CHANNEL_ID,
                "q": query,
                "type": "video",
                "maxResults": max_results,
                "order": "relevance",
            },
        )
        if resp.status_code != 200:
            return {"error": f"API error: {resp.status_code}"}

        items = resp.json().get("items", [])
        return {
            "results": [
                {
                    "id": item["id"]["videoId"],
                    "title": item["snippet"]["title"],
                    "description": item["snippet"]["description"][:150],
                    "thumbnail": item["snippet"]["thumbnails"]["medium"]["url"],
                    "published_at": item["snippet"]["publishedAt"],
                    "url": f"https://youtube.com/watch?v={item['id']['videoId']}",
                }
                for item in items
            ],
            "total": len(items),
        }
