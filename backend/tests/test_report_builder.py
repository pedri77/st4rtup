"""Tests for Report Builder endpoints."""
import pytest


@pytest.mark.asyncio
async def test_report_types(client):
    """List available report types."""
    resp = await client.get("/api/v1/report-builder/types")
    assert resp.status_code == 200
    data = resp.json()
    assert "types" in data
    assert "pipeline" in data["types"]
    assert "activity" in data["types"]
    assert "leads" in data["types"]
    assert "revenue" in data["types"]


@pytest.mark.asyncio
async def test_generate_pipeline_report(client, lead_data):
    """Generate pipeline report."""
    resp = await client.post("/api/v1/report-builder/generate", json={
        "name": "Test Pipeline",
        "report_type": "pipeline",
        "date_range": "year",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["report_type"] == "pipeline"
    assert "rows" in data
    assert "summary" in data


@pytest.mark.asyncio
async def test_generate_activity_report(client):
    """Generate activity report (optimized GROUP BY)."""
    resp = await client.post("/api/v1/report-builder/generate", json={
        "name": "Test Activity",
        "report_type": "activity",
        "date_range": "week",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["report_type"] == "activity"
    assert "summary" in data
    assert "emails" in data["summary"]


@pytest.mark.asyncio
async def test_generate_leads_report(client, lead_data):
    """Generate leads report with data."""
    # Create a lead first
    await client.post("/api/v1/leads", json=lead_data)

    resp = await client.post("/api/v1/report-builder/generate", json={
        "name": "Leads Report",
        "report_type": "leads",
        "date_range": "year",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["report_type"] == "leads"
    assert len(data["rows"]) >= 1
    assert data["summary"]["total"] >= 1


@pytest.mark.asyncio
async def test_generate_revenue_report(client):
    """Generate revenue report."""
    resp = await client.post("/api/v1/report-builder/generate", json={
        "name": "Revenue",
        "report_type": "revenue",
        "date_range": "quarter",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["report_type"] == "revenue"


@pytest.mark.asyncio
async def test_invalid_report_type(client):
    """Invalid report type returns 400."""
    resp = await client.post("/api/v1/report-builder/generate", json={
        "name": "Bad",
        "report_type": "nonexistent",
        "date_range": "month",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_feature_flags_endpoint(client):
    """Feature flags endpoint returns dict."""
    resp = await client.get("/api/v1/settings/feature-flags")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "inline_editing" in data
    assert "activity_heatmap" in data
