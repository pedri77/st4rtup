"""Tests para endpoints GTM (dashboard, brand, pricing, competitors, playbook, OKR, contracts)."""
import pytest


# ─── GTM Dashboard ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_gtm_dashboard(client):
    resp = await client.get("/api/v1/gtm/")
    assert resp.status_code == 200
    data = resp.json()
    assert "kpis" in data
    assert "summary" in data
    assert "budget" in data
    assert len(data["kpis"]) == 20


@pytest.mark.asyncio
async def test_gtm_targets_list(client):
    resp = await client.get("/api/v1/gtm/targets")
    assert resp.status_code == 200
    assert "targets" in resp.json()


@pytest.mark.asyncio
async def test_gtm_update_target(client):
    resp = await client.put("/api/v1/gtm/targets/arr", json={"target_value": 300000, "target_label": "€300k"})
    assert resp.status_code == 200
    assert resp.json()["updated"] is True


@pytest.mark.asyncio
async def test_gtm_forecast(client):
    resp = await client.get("/api/v1/gtm/forecast")
    assert resp.status_code == 200
    data = resp.json()
    assert "current_arr" in data
    assert "forecast" in data
    assert len(data["forecast"]) == 12


@pytest.mark.asyncio
async def test_gtm_poc_tracker(client):
    resp = await client.get("/api/v1/gtm/poc-tracker")
    assert resp.status_code == 200
    assert "pocs" in resp.json()


@pytest.mark.asyncio
async def test_gtm_seed_all(client):
    resp = await client.post("/api/v1/gtm/seed-all")
    assert resp.status_code == 200
    data = resp.json()
    assert "seeded" in data
    assert "total" in data


# ─── Brand ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_brand_get(client):
    resp = await client.get("/api/v1/brand/")
    assert resp.status_code == 200
    data = resp.json()
    assert "company_name" in data


@pytest.mark.asyncio
async def test_brand_update(client):
    resp = await client.put("/api/v1/brand/", json={"company_name": "St4rtup Test"})
    assert resp.status_code == 200
    assert resp.json()["updated"] is True


# ─── Pricing ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_pricing_list(client):
    resp = await client.get("/api/v1/pricing/")
    assert resp.status_code == 200
    assert "tiers" in resp.json()


@pytest.mark.asyncio
async def test_pricing_calculate(client):
    # First seed
    await client.post("/api/v1/gtm/seed-all")
    resp = await client.get("/api/v1/pricing/calculate?tier_slug=pilot_poc&duration_months=3")
    assert resp.status_code == 200
    data = resp.json()
    assert "final_price" in data
    assert "gross_margin" in data


# ─── Competitors ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_competitors_list(client):
    resp = await client.get("/api/v1/competitors/")
    assert resp.status_code == 200
    assert "competitors" in resp.json()


@pytest.mark.asyncio
async def test_competitors_seed(client):
    resp = await client.post("/api/v1/competitors/seed")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_competitors_create(client):
    resp = await client.post("/api/v1/competitors/", json={
        "name": "Test Competitor",
        "price_range": "€10k-€50k",
        "region": "local",
        "tier": "medium",
        "scope": "GRC test",
        "maturity_score": 40,
    })
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_competitors_stats(client):
    resp = await client.get("/api/v1/competitors/stats")
    assert resp.status_code == 200
    assert "by_competitor" in resp.json()


# ─── Playbook ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_playbook_list(client):
    resp = await client.get("/api/v1/playbook/")
    assert resp.status_code == 200
    assert "tactics" in resp.json()


@pytest.mark.asyncio
async def test_playbook_stats(client):
    resp = await client.get("/api/v1/playbook/stats")
    assert resp.status_code == 200
    assert "stats" in resp.json()


@pytest.mark.asyncio
async def test_playbook_seed(client):
    resp = await client.post("/api/v1/playbook/seed")
    assert resp.status_code == 200


# ─── OKR ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_okr_list(client):
    resp = await client.get("/api/v1/okr/")
    assert resp.status_code == 200
    assert "objectives" in resp.json()


@pytest.mark.asyncio
async def test_okr_create(client):
    resp = await client.post("/api/v1/okr/", json={
        "title": "Test OKR",
        "quarter": "2026-Q2",
        "category": "revenue",
    })
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_okr_seed(client):
    resp = await client.post("/api/v1/okr/seed")
    assert resp.status_code == 200


# ─── Media ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_media_trifecta(client):
    resp = await client.get("/api/v1/media/trifecta")
    assert resp.status_code == 200
    data = resp.json()
    assert "owned" in data
    assert "earned" in data
    assert "paid" in data


@pytest.mark.asyncio
async def test_media_paid_campaigns(client):
    resp = await client.get("/api/v1/media/paid/campaigns")
    assert resp.status_code == 200
    assert "campaigns" in resp.json()


@pytest.mark.asyncio
async def test_media_earned_mentions(client):
    resp = await client.get("/api/v1/media/earned/mentions")
    assert resp.status_code == 200
    assert "mentions" in resp.json()
