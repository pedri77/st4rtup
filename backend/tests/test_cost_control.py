"""Tests para MOD-COST-001 Cost Control."""
import pytest


@pytest.mark.asyncio
async def test_cost_summary(client):
    """GET /costs/summary — resumen mensual."""
    resp = await client.get("/api/v1/costs/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "month" in data
    assert "total_spent" in data
    assert "total_cap" in data
    assert "tools" in data


@pytest.mark.asyncio
async def test_list_caps(client):
    """GET /costs/caps — lista topes de presupuesto."""
    resp = await client.get("/api/v1/costs/caps")
    assert resp.status_code == 200
    data = resp.json()
    assert "caps" in data


@pytest.mark.asyncio
async def test_evaluate_guardrail_unknown_tool(client):
    """GET /costs/evaluate/unknown — OK con no_cap flag."""
    resp = await client.get("/api/v1/costs/evaluate/unknown_tool")
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "ok"


@pytest.mark.asyncio
async def test_record_cost(client):
    """POST /costs/record — registra un coste."""
    resp = await client.post("/api/v1/costs/record", json={
        "tool_id": "test_tool",
        "amount": 5.50,
        "category": "test",
        "description": "Test cost event",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["recorded"] is True
    assert "guardrail" in data


@pytest.mark.asyncio
async def test_create_and_evaluate_cap(client):
    """PUT /costs/caps + GET /costs/evaluate — crea cap y evalúa."""
    # Create cap
    resp = await client.put("/api/v1/costs/caps/test_cap_tool", json={
        "tool_name": "Test Tool",
        "monthly_cap": 100.0,
        "warn_pct": 70,
        "cut_pct": 90,
    })
    assert resp.status_code == 200
    assert resp.json()["updated"] is True

    # Evaluate with 0 cost
    resp = await client.get("/api/v1/costs/evaluate/test_cap_tool")
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == "ok"
    assert data["cap"] == 100.0


@pytest.mark.asyncio
async def test_guardrail_log(client):
    """GET /costs/log — audit trail."""
    resp = await client.get("/api/v1/costs/log")
    assert resp.status_code == 200
    data = resp.json()
    assert "entries" in data


@pytest.mark.asyncio
async def test_update_cap(client):
    """PUT /costs/caps/{tool} — actualiza un tope existente."""
    # Create
    await client.put("/api/v1/costs/caps/update_test", json={
        "tool_name": "Update Test",
        "monthly_cap": 50.0,
    })
    # Update
    resp = await client.put("/api/v1/costs/caps/update_test", json={
        "monthly_cap": 75.0,
        "warn_pct": 80,
    })
    assert resp.status_code == 200
    assert resp.json()["updated"] is True
