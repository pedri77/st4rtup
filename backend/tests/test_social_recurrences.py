"""Tests for Social Media recurrence endpoints."""
import pytest


@pytest.mark.asyncio
async def test_list_recurrences_empty(client):
    """Initially no recurrences exist."""
    resp = await client.get("/api/v1/social/recurrences")
    assert resp.status_code == 200
    assert resp.json()["recurrences"] == []


@pytest.mark.asyncio
async def test_create_recurrence(client):
    """Create a social recurrence."""
    resp = await client.post("/api/v1/social/recurrences", json={
        "name": "Weekly ENS Tips",
        "platform": "linkedin",
        "content_template": "Tip semanal de ENS: semana {week} de {month}",
        "frequency": "weekly",
        "day_of_week": 1,
        "time_of_day": "10:00",
        "tags": ["ENS", "tips"],
    })
    assert resp.status_code == 201
    assert resp.json()["created"] is True


@pytest.mark.asyncio
async def test_list_recurrences_after_create(client):
    """List returns created recurrence."""
    await client.post("/api/v1/social/recurrences", json={
        "name": "Monthly Report",
        "platform": "twitter",
        "content_template": "Resumen mensual {month}",
        "frequency": "monthly",
    })
    resp = await client.get("/api/v1/social/recurrences")
    assert resp.status_code == 200
    recs = resp.json()["recurrences"]
    assert len(recs) >= 1


@pytest.mark.asyncio
async def test_generate_from_recurrence(client):
    """Generate a post from recurrence."""
    create_resp = await client.post("/api/v1/social/recurrences", json={
        "name": "Auto Post",
        "platform": "linkedin",
        "content_template": "Post auto del {date}",
        "frequency": "daily",
    })
    rec_id = create_resp.json()["id"]

    resp = await client.post(f"/api/v1/social/recurrences/{rec_id}/generate-now")
    assert resp.status_code == 200
    data = resp.json()
    assert data["created"] is True
    assert "post_id" in data


@pytest.mark.asyncio
async def test_delete_recurrence(client):
    """Delete a recurrence."""
    create_resp = await client.post("/api/v1/social/recurrences", json={
        "name": "To Delete",
        "platform": "linkedin",
        "content_template": "Delete me",
        "frequency": "weekly",
    })
    rec_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/social/recurrences/{rec_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_heatmap_endpoint(client):
    """Dashboard heatmap returns data."""
    resp = await client.get("/api/v1/dashboard/heatmap", params={"months": 3})
    assert resp.status_code == 200
    data = resp.json()
    assert "heatmap" in data
    assert "breakdown" in data
    assert "max_activity" in data
