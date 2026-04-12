"""Tests for MOD-LINKEDIN-001 — LinkedIn Studio endpoints."""
import pytest


# ═══════════════════════════════════════════════════════════════
# Templates
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_list_templates(client):
    """GET /linkedin/templates returns all 8 frameworks."""
    resp = await client.get("/api/v1/linkedin/templates")
    assert resp.status_code == 200
    templates = resp.json()["templates"]
    assert len(templates) == 8
    ids = {t["id"] for t in templates}
    assert "hook_story_cta" in ids
    assert "aida" in ids
    assert "carousel" in ids
    assert "poll" in ids
    for t in templates:
        assert "name" in t
        assert "description" in t
        assert "example" in t
        assert "best_for" in t
        assert isinstance(t["best_for"], list)


# ═══════════════════════════════════════════════════════════════
# Best Times
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_best_times(client):
    """GET /linkedin/best-times returns sorted times."""
    resp = await client.get("/api/v1/linkedin/best-times")
    assert resp.status_code == 200
    data = resp.json()
    assert data["timezone"] == "Europe/Madrid"
    times = data["recommended_times"]
    assert len(times) > 0
    # Verify sorted by score descending
    scores = [t["score"] for t in times]
    assert scores == sorted(scores, reverse=True)
    for t in times:
        assert "day" in t
        assert "hour" in t
        assert "score" in t
        assert "reason" in t


# ═══════════════════════════════════════════════════════════════
# Analytics
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_analytics_empty(client):
    """GET /linkedin/analytics returns zeros when no posts exist."""
    resp = await client.get("/api/v1/linkedin/analytics", params={"days": 30})
    assert resp.status_code == 200
    data = resp.json()
    assert data["posts_count"] == 0
    assert data["total_impressions"] == 0
    assert data["total_likes"] == 0
    assert data["avg_engagement_rate"] == 0.0


# ═══════════════════════════════════════════════════════════════
# OAuth Status
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_oauth_status_not_connected(client):
    """GET /linkedin/oauth/status returns not connected by default."""
    resp = await client.get("/api/v1/linkedin/oauth/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["connected"] is False


# ═══════════════════════════════════════════════════════════════
# Generate (requires LLM — test error path gracefully)
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_generate_missing_topic(client):
    """POST /linkedin/generate rejects empty topic."""
    resp = await client.post("/api/v1/linkedin/generate", json={
        "topic": "",
        "framework": "hook_story_cta",
    })
    assert resp.status_code == 422  # Pydantic validation (min_length=3)


@pytest.mark.asyncio
async def test_generate_invalid_framework(client):
    """POST /linkedin/generate with unknown framework returns error."""
    resp = await client.post("/api/v1/linkedin/generate", json={
        "topic": "Test topic for LinkedIn",
        "framework": "nonexistent_framework",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["generated"] is False
    assert "nonexistent_framework" in data["error"]


@pytest.mark.asyncio
async def test_generate_and_save_missing_topic(client):
    """POST /linkedin/generate-and-save rejects empty topic."""
    resp = await client.post("/api/v1/linkedin/generate-and-save", json={
        "topic": "ab",  # too short (min_length=3)
        "framework": "aida",
    })
    assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════
# Publish (requires OAuth — test error path)
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_publish_not_connected(client):
    """POST /linkedin/publish fails when OAuth not configured."""
    # Create a draft post first
    post_resp = await client.post("/api/v1/social/", json={
        "platform": "linkedin",
        "content": "Test post for publish endpoint",
    })
    assert post_resp.status_code == 201
    post_id = post_resp.json()["id"]

    resp = await client.post("/api/v1/linkedin/publish", json={
        "post_id": post_id,
    })
    assert resp.status_code == 400
    assert "no conectado" in resp.json()["detail"].lower() or "conectar" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_publish_nonexistent_post(client):
    """POST /linkedin/publish with fake post_id returns 404."""
    import uuid
    resp = await client.post("/api/v1/linkedin/publish", json={
        "post_id": str(uuid.uuid4()),
    })
    assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════
# Sync Metrics (requires OAuth)
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_sync_metrics_not_connected(client):
    """POST /linkedin/sync-metrics fails when not connected."""
    resp = await client.post("/api/v1/linkedin/sync-metrics")
    assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════
# Content Service Unit Tests
# ═══════════════════════════════════════════════════════════════


def test_select_hashtags():
    """Hashtag selection based on topic keywords."""
    from app.services.linkedin_content_service import _select_hashtags
    tags = _select_hashtags("ciberseguridad y compliance ENS")
    assert len(tags) > 0
    assert all(t.startswith("#") for t in tags)


def test_select_hashtags_fallback():
    """Fallback hashtags when topic has no matching keywords."""
    from app.services.linkedin_content_service import _select_hashtags
    tags = _select_hashtags("tema completamente generico sin keywords")
    assert len(tags) > 0
    assert "#B2B" in tags


def test_estimate_reading_time():
    """Reading time estimation."""
    from app.services.linkedin_content_service import _estimate_reading_time
    short = _estimate_reading_time("Hola mundo")
    long = _estimate_reading_time("Esta es una frase " * 50)
    assert short >= 15
    assert long > short


def test_extract_hook():
    """Hook extraction from content."""
    from app.services.linkedin_content_service import _extract_hook
    assert _extract_hook("Primera linea\n\nSegunda linea") == "Primera linea"
    assert _extract_hook("") is None


def test_get_templates():
    """All 8 templates available."""
    from app.services.linkedin_content_service import get_templates
    templates = get_templates()
    assert len(templates) == 8
    names = {t["framework"] for t in templates}
    assert "hook_story_cta" in names
    assert "carousel" in names


def test_get_best_times():
    """Best times sorted by score."""
    from app.services.linkedin_content_service import get_best_times
    times = get_best_times()
    assert len(times) > 0
    scores = [t["score"] for t in times]
    assert scores == sorted(scores, reverse=True)
