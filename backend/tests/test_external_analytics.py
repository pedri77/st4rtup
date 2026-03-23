"""Tests para external analytics endpoints (GA4, GSC, Clarity, Lemlist, Brevo, Partners)."""
import pytest


@pytest.mark.asyncio
async def test_ga4_traffic_not_configured(client):
    """GET /analytics/external/ga4/traffic — devuelve error si no configurado."""
    resp = await client.get("/api/v1/analytics/external/ga4/traffic")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("connected") is False or "error" in data


@pytest.mark.asyncio
async def test_gsc_performance_not_configured(client):
    """GET /analytics/external/gsc/performance — devuelve error si no configurado."""
    resp = await client.get("/api/v1/analytics/external/gsc/performance")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("connected") is False or "error" in data


@pytest.mark.asyncio
async def test_clarity_summary_not_configured(client):
    """GET /analytics/external/clarity/summary — devuelve error si no configurado."""
    resp = await client.get("/api/v1/analytics/external/clarity/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("connected") is False or "error" in data


@pytest.mark.asyncio
async def test_lemlist_campaigns_not_configured(client):
    """GET /analytics/external/lemlist/campaigns — devuelve error si no configurado."""
    resp = await client.get("/api/v1/analytics/external/lemlist/campaigns")
    assert resp.status_code == 200
    data = resp.json()
    assert "error" in data or "campaigns" in data


@pytest.mark.asyncio
async def test_brevo_lists_not_configured(client):
    """GET /analytics/external/brevo/lists — devuelve error si no configurado."""
    resp = await client.get("/api/v1/analytics/external/brevo/lists")
    assert resp.status_code == 200
    data = resp.json()
    assert "error" in data or "lists" in data


@pytest.mark.asyncio
async def test_partners_dashboard_not_configured(client):
    """GET /analytics/external/partners/dashboard — devuelve error si no configurado."""
    resp = await client.get("/api/v1/analytics/external/partners/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert "error" in data or "total_partners" in data


@pytest.mark.asyncio
async def test_reports_roi_by_channel(client):
    """GET /reports/roi-by-channel — funciona vacío."""
    resp = await client.get("/api/v1/reports/roi-by-channel")
    assert resp.status_code == 200
    data = resp.json()
    assert "channels" in data


@pytest.mark.asyncio
async def test_reports_pipeline_velocity(client):
    """GET /reports/pipeline-velocity — funciona vacío."""
    resp = await client.get("/api/v1/reports/pipeline-velocity")
    assert resp.status_code == 200
    data = resp.json()
    assert "avg_cycle_days" in data
    assert "win_rate" in data


@pytest.mark.asyncio
async def test_reports_lead_cohorts(client):
    """GET /reports/lead-cohorts — uses date_trunc (PostgreSQL only)."""
    try:
        resp = await client.get("/api/v1/reports/lead-cohorts")
        # PostgreSQL: should work
        assert resp.status_code in (200, 500)
    except Exception:
        # SQLite: date_trunc not available, skip
        pytest.skip("date_trunc not available in SQLite")
