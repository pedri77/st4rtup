"""Tests for webhook subscriptions CRUD + generic inbound webhook."""
import pytest


@pytest.mark.asyncio
async def test_list_subscriptions_empty(client):
    """Initially no subscriptions exist."""
    resp = await client.get("/api/v1/webhooks/subscriptions")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_subscription(client):
    """Create a webhook subscription."""
    resp = await client.post("/api/v1/webhooks/subscriptions", json={
        "name": "Test Zapier",
        "url": "https://hooks.zapier.com/test",
        "events": ["lead.created", "opportunity.won"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Zapier"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_subscriptions_after_create(client):
    """List returns created subscription."""
    await client.post("/api/v1/webhooks/subscriptions", json={
        "name": "Test Sub",
        "url": "https://example.com/hook",
        "events": ["lead.created"],
    })
    resp = await client.get("/api/v1/webhooks/subscriptions")
    assert resp.status_code == 200
    subs = resp.json()
    assert len(subs) >= 1
    assert subs[0]["name"] == "Test Sub"


@pytest.mark.asyncio
async def test_delete_subscription(client):
    """Delete a subscription."""
    create_resp = await client.post("/api/v1/webhooks/subscriptions", json={
        "name": "To Delete",
        "url": "https://example.com/hook",
        "events": [],
    })
    sub_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/webhooks/subscriptions/{sub_id}")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True


@pytest.mark.asyncio
async def test_available_events(client):
    """List available webhook events."""
    resp = await client.get("/api/v1/webhooks/subscriptions/events")
    assert resp.status_code == 200
    data = resp.json()
    assert "events" in data
    assert "lead.created" in data["events"]
    assert "opportunity.won" in data["events"]


@pytest.mark.asyncio
async def test_generic_webhook_creates_lead(client):
    """Generic inbound webhook creates lead from JSON payload."""
    resp = await client.post("/api/v1/webhooks/generic", json={
        "empresa": "Webhook Corp",
        "email": "test@webhook.com",
        "nombre": "Juan Test",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["lead_created"] is True
    assert "company_name" in data.get("parsed_fields", [])


@pytest.mark.asyncio
async def test_generic_webhook_idempotency(client):
    """Generic webhook with same ID is idempotent."""
    payload = {"id": "unique-123", "empresa": "Idempotent Corp", "email": "a@b.com"}
    resp1 = await client.post("/api/v1/webhooks/generic", json=payload)
    assert resp1.json()["status"] == "ok"

    resp2 = await client.post("/api/v1/webhooks/generic", json=payload)
    assert resp2.json()["status"] == "already_processed"
