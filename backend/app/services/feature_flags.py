"""
Feature flags service — soporta GrowthBook SDK o configuracion local.
"""
import httpx
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings
from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)
TIMEOUT = 10.0

# Local feature flags (fallback when GrowthBook not configured)
LOCAL_FLAGS = {
    "inline_editing": True,
    "activity_heatmap": True,
    "email_tracking_pixel": True,
    "hunter_verification": True,
    "social_recurrence": True,
    "whatsapp_channel": False,
    "google_calendar_sync": False,
    "ai_content_pipeline": False,
    "dark_mode": False,
    "pwa_mobile": False,
}

_cached_features = None
_cache_ts = 0


async def get_features(db: Optional[AsyncSession] = None) -> dict:
    """Obtiene feature flags desde GrowthBook o fallback local."""
    import time
    global _cached_features, _cache_ts

    # Cache for 60 seconds
    if _cached_features and (time.time() - _cache_ts) < 60:
        return _cached_features

    # Try GrowthBook
    gb_key = getattr(app_settings, "GROWTHBOOK_CLIENT_KEY", "")
    gb_url = getattr(app_settings, "GROWTHBOOK_API_HOST", "https://cdn.growthbook.io")

    if gb_key:
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                r = await client.get(f"{gb_url}/api/features/{gb_key}")
                if r.status_code == 200:
                    data = r.json()
                    features = {}
                    for key, feat in data.get("features", {}).items():
                        features[key] = feat.get("defaultValue", False)
                    _cached_features = {**LOCAL_FLAGS, **features}
                    _cache_ts = time.time()
                    return _cached_features
        except Exception:
            logger.warning("GrowthBook fetch failed, using local flags")

    # Fallback: local flags + DB overrides
    if db:
        try:
            result = await db.execute(select(SystemSettings).limit(1))
            sys_settings = result.scalar_one_or_none()
            if sys_settings and sys_settings.general_config:
                overrides = sys_settings.general_config.get("feature_flags", {})
                _cached_features = {**LOCAL_FLAGS, **overrides}
                _cache_ts = time.time()
                return _cached_features
        except Exception:
            pass

    _cached_features = LOCAL_FLAGS.copy()
    _cache_ts = time.time()
    return _cached_features


def is_enabled(features: dict, flag: str) -> bool:
    """Verifica si un feature flag esta habilitado."""
    return features.get(flag, False)
