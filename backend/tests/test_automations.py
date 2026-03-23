"""Tests para el endpoint de automatizaciones."""
import pytest


AUTOMATION_DATA = {
    "code": "TEST-01",
    "name": "Test Automation",
    "description": "Automation for testing",
    "category": "email_automation",
    "trigger_type": "webhook",
    "priority": "high",
    "complexity": "low",
    "status": "draft",
    "impl_status": "pending",
    "is_enabled": False,
}


class TestListAutomations:
    """Tests para GET /api/v1/automations/"""

    async def test_list_automations_empty(self, client):
        response = await client.get("/api/v1/automations/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    async def test_list_automations_with_data(self, client):
        await client.post("/api/v1/automations/", json=AUTOMATION_DATA)

        response = await client.get("/api/v1/automations/")
        assert response.status_code == 200
        data = response.json()
        if isinstance(data, list):
            assert len(data) >= 1
        else:
            assert data.get("total", len(data.get("items", []))) >= 1


class TestAutomationStats:
    """Tests para GET /api/v1/automations/stats"""

    async def test_get_stats_empty(self, client):
        response = await client.get("/api/v1/automations/stats")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    async def test_get_stats_with_data(self, client):
        await client.post("/api/v1/automations/", json=AUTOMATION_DATA)

        response = await client.get("/api/v1/automations/stats")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)


class TestCreateAutomation:
    """Tests para POST /api/v1/automations/"""

    async def test_create_automation_success(self, client):
        response = await client.post("/api/v1/automations/", json=AUTOMATION_DATA)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Automation"
        assert data["code"] == "TEST-01"
        assert data["category"] == "email_automation"
        assert data["is_enabled"] is False
        assert "id" in data

    async def test_create_automation_missing_name(self, client):
        incomplete = {"code": "TEST-02", "category": "email_automation"}
        response = await client.post("/api/v1/automations/", json=incomplete)
        assert response.status_code == 422


class TestGetAutomation:
    """Tests para GET /api/v1/automations/{id}"""

    async def test_get_automation_success(self, client):
        create_resp = await client.post("/api/v1/automations/", json=AUTOMATION_DATA)
        automation_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/automations/{automation_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == automation_id
        assert data["name"] == "Test Automation"

    async def test_get_automation_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/automations/{fake_id}")
        assert response.status_code == 404


class TestUpdateAutomation:
    """Tests para PUT /api/v1/automations/{id}"""

    async def test_update_automation_success(self, client):
        create_resp = await client.post("/api/v1/automations/", json=AUTOMATION_DATA)
        automation_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/automations/{automation_id}", json={
            "name": "Updated Automation",
            "priority": "critical",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Automation"
        assert data["priority"] == "critical"

    async def test_update_automation_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.put(f"/api/v1/automations/{fake_id}", json={
            "name": "No existe",
        })
        assert response.status_code == 404


class TestDeleteAutomation:
    """Tests para DELETE /api/v1/automations/{id}"""

    async def test_delete_automation_success(self, client):
        create_resp = await client.post("/api/v1/automations/", json=AUTOMATION_DATA)
        automation_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/automations/{automation_id}")
        assert response.status_code == 204

        # Verify deleted
        get_resp = await client.get(f"/api/v1/automations/{automation_id}")
        assert get_resp.status_code == 404

    async def test_delete_automation_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(f"/api/v1/automations/{fake_id}")
        assert response.status_code == 404


class TestToggleAutomation:
    """Tests para POST /api/v1/automations/{id}/toggle"""

    async def test_toggle_automation_enable(self, client):
        create_resp = await client.post("/api/v1/automations/", json=AUTOMATION_DATA)
        automation_id = create_resp.json()["id"]
        assert create_resp.json()["is_enabled"] is False

        response = await client.post(f"/api/v1/automations/{automation_id}/toggle")
        assert response.status_code == 200
        data = response.json()
        assert data["is_enabled"] is True

    async def test_toggle_automation_disable(self, client):
        create_resp = await client.post("/api/v1/automations/", json=AUTOMATION_DATA)
        automation_id = create_resp.json()["id"]

        # Enable first
        await client.post(f"/api/v1/automations/{automation_id}/toggle")
        # Then disable
        response = await client.post(f"/api/v1/automations/{automation_id}/toggle")
        assert response.status_code == 200
        assert response.json()["is_enabled"] is False

    async def test_toggle_automation_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.post(f"/api/v1/automations/{fake_id}/toggle")
        assert response.status_code == 404


class TestSeedAutomations:
    """Tests para POST /api/v1/automations/seed"""

    async def test_seed_automations(self, client):
        response = await client.post("/api/v1/automations/seed")
        assert response.status_code in (200, 201)
        data = response.json()
        assert isinstance(data, (list, dict))
