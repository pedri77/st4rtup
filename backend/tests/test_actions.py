"""Tests para el endpoint de acciones/tareas."""
import pytest


class TestListActions:
    """Tests para GET /api/v1/actions/"""

    async def test_list_actions_empty(self, client):
        response = await client.get("/api/v1/actions/")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []

    async def test_list_actions_with_data(self, client, created_lead, action_data):
        action_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/actions/", json=action_data)

        response = await client.get("/api/v1/actions/")
        data = response.json()
        assert len(data["items"]) >= 1

    async def test_list_actions_filter_by_status(self, client, created_lead, action_data):
        action_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/actions/", json=action_data)

        response = await client.get("/api/v1/actions/?status=pending")
        data = response.json()
        assert len(data["items"]) >= 1
        for action in data["items"]:
            assert action["status"] == "pending"

    async def test_list_actions_filter_by_lead(self, client, created_lead, action_data):
        action_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/actions/", json=action_data)

        response = await client.get(f"/api/v1/actions/?lead_id={created_lead['id']}")
        data = response.json()
        assert len(data["items"]) >= 1


class TestCreateAction:
    """Tests para POST /api/v1/actions/"""

    async def test_create_action_success(self, client, created_lead, action_data):
        action_data["lead_id"] = created_lead["id"]
        response = await client.post("/api/v1/actions/", json=action_data)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Enviar propuesta GRC"
        assert data["priority"] == "high"
        assert data["status"] == "pending"
        assert "id" in data

    async def test_create_action_missing_title(self, client, created_lead):
        """Creating an action without required title should return 422."""
        response = await client.post("/api/v1/actions/", json={
            "lead_id": created_lead["id"],
            "due_date": "2026-04-01",
        })
        assert response.status_code == 422


class TestUpdateAction:
    """Tests para PUT /api/v1/actions/{id}"""

    async def test_update_action_success(self, client, created_lead, action_data):
        action_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/actions/", json=action_data)
        action_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/actions/{action_id}", json={
            "title": "Propuesta actualizada",
            "priority": "critical",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Propuesta actualizada"
        assert data["priority"] == "critical"

    async def test_update_action_status(self, client, created_lead, action_data):
        action_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/actions/", json=action_data)
        action_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/actions/{action_id}", json={
            "status": "completed",
        })
        assert response.status_code == 200
        assert response.json()["status"] == "completed"

    async def test_update_action_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.put(f"/api/v1/actions/{fake_id}", json={
            "title": "No existe",
        })
        assert response.status_code == 404


class TestDeleteAction:
    """Tests para DELETE /api/v1/actions/{id}"""

    async def test_delete_action_success(self, client, created_lead, action_data):
        action_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/actions/", json=action_data)
        action_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/actions/{action_id}")
        assert response.status_code == 204

    async def test_delete_action_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(f"/api/v1/actions/{fake_id}")
        assert response.status_code == 404
