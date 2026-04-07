"""Tests for Public API endpoints (/api/v1/public/*)."""
import pytest
from unittest.mock import patch

from tests.conftest import TEST_ORG_ID

# API key format: "org_uuid:key" — debe coincidir con la org del test user
_TEST_API_KEY = f"{TEST_ORG_ID}:test-key-123"


@pytest.mark.asyncio
async def test_public_leads_no_key(client):
    """Public API requires X-API-Key header."""
    resp = await client.get("/api/v1/public/leads")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_public_leads_invalid_key(client):
    """Public API rejects invalid key."""
    resp = await client.get("/api/v1/public/leads", headers={"X-API-Key": "bad-key"})
    assert resp.status_code in (401, 503)  # 503 if PUBLIC_API_KEYS not configured


@pytest.mark.asyncio
@patch("app.core.config.settings.PUBLIC_API_KEYS", _TEST_API_KEY)
async def test_public_leads_valid_key(client, lead_data):
    """Public API returns leads with valid key."""
    # Create a lead first
    await client.post("/api/v1/leads", json=lead_data)

    resp = await client.get("/api/v1/public/leads", headers={"X-API-Key": "test-key-123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    assert "pagination" in data


@pytest.mark.asyncio
@patch("app.core.config.settings.PUBLIC_API_KEYS", _TEST_API_KEY)
async def test_public_create_lead(client):
    """Public API can create leads."""
    resp = await client.post(
        "/api/v1/public/leads",
        params={"company_name": "Public API Lead"},
        headers={"X-API-Key": "test-key-123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["company_name"] == "Public API Lead"
    assert data["status"] == "created"


@pytest.mark.asyncio
@patch("app.core.config.settings.PUBLIC_API_KEYS", _TEST_API_KEY)
async def test_public_pipeline_summary(client):
    """Public API returns pipeline summary."""
    resp = await client.get("/api/v1/public/pipeline/summary", headers={"X-API-Key": "test-key-123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "total_opportunities" in data
    assert "total_pipeline_value" in data
