"""MOD-LINKEDIN-001 — LinkedIn API Service.

OAuth 2.0 + publicacion directa + pull de metricas.
Usa LinkedIn API v2 (REST API).
"""
import logging
from typing import Optional
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings

logger = logging.getLogger(__name__)

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_API_BASE = "https://api.linkedin.com/v2"
LINKEDIN_REST_BASE = "https://api.linkedin.com/rest"
TIMEOUT = 15.0


async def _get_linkedin_config(db: AsyncSession) -> dict:
    """Obtiene la config de LinkedIn de SystemSettings."""
    result = await db.execute(select(SystemSettings).limit(1))
    sys_settings = result.scalar_one_or_none()
    if not sys_settings or not sys_settings.linkedin_config:
        return {}
    return sys_settings.linkedin_config


async def _save_linkedin_config(db: AsyncSession, config: dict):
    """Guarda la config de LinkedIn en SystemSettings."""
    result = await db.execute(select(SystemSettings).limit(1))
    sys_settings = result.scalar_one_or_none()
    if sys_settings:
        existing = sys_settings.linkedin_config or {}
        existing.update(config)
        sys_settings.linkedin_config = existing
        await db.commit()


def get_oauth_url(client_id: str, redirect_uri: str, state: str = "") -> str:
    """Genera la URL de autorizacion OAuth 2.0 de LinkedIn."""
    scopes = "openid profile email w_member_social"
    params = (
        f"response_type=code"
        f"&client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scopes}"
    )
    if state:
        params += f"&state={state}"
    return f"{LINKEDIN_AUTH_URL}?{params}"


async def exchange_code_for_token(
    code: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
) -> dict:
    """Intercambia el code OAuth por un access_token."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            LINKEDIN_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code == 200:
            data = resp.json()
            return {
                "access_token": data["access_token"],
                "expires_in": data.get("expires_in", 5184000),
                "obtained_at": datetime.now(timezone.utc).isoformat(),
            }
        logger.error("LinkedIn token exchange failed: %s %s", resp.status_code, resp.text[:200])
        return {"error": f"Token exchange failed: {resp.status_code}"}


async def get_profile(access_token: str) -> dict:
    """Obtiene el perfil del usuario autenticado."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(
            f"{LINKEDIN_API_BASE}/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code == 200:
            data = resp.json()
            return {
                "connected": True,
                "sub": data.get("sub"),
                "name": data.get("name"),
                "email": data.get("email"),
                "picture": data.get("picture"),
            }
        return {"connected": False, "error": f"Profile fetch failed: {resp.status_code}"}


async def publish_post(
    access_token: str,
    author_urn: str,
    content: str,
    media_url: Optional[str] = None,
) -> dict:
    """Publica un post en LinkedIn via REST API."""
    post_body = {
        "author": author_urn,
        "lifecycleState": "PUBLISHED",
        "visibility": "PUBLIC",
        "commentary": content,
        "distribution": {
            "feedDistribution": "MAIN_FEED",
        },
    }

    if media_url:
        post_body["content"] = {
            "article": {
                "source": media_url,
                "title": content[:100],
            }
        }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202401",
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            f"{LINKEDIN_REST_BASE}/posts",
            json=post_body,
            headers=headers,
        )
        if resp.status_code in (200, 201):
            post_id = resp.headers.get("x-restli-id", "")
            return {
                "published": True,
                "external_id": post_id,
                "external_url": f"https://www.linkedin.com/feed/update/{post_id}/" if post_id else None,
            }
        logger.error("LinkedIn publish failed: %s %s", resp.status_code, resp.text[:300])
        return {"published": False, "error": f"Publish failed: {resp.status_code} - {resp.text[:200]}"}


async def get_post_stats(access_token: str, post_urn: str) -> dict:
    """Obtiene las metricas de un post publicado."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(
            f"{LINKEDIN_REST_BASE}/socialMetadata/{post_urn}",
            headers=headers,
        )
        if resp.status_code == 200:
            data = resp.json()
            return {
                "likes": data.get("totalShareStatistics", {}).get("likeCount", 0),
                "comments": data.get("totalShareStatistics", {}).get("commentCount", 0),
                "shares": data.get("totalShareStatistics", {}).get("shareCount", 0),
                "impressions": data.get("totalShareStatistics", {}).get("impressionCount", 0),
                "clicks": data.get("totalShareStatistics", {}).get("clickCount", 0),
            }
        return {"error": f"Stats fetch failed: {resp.status_code}"}
