"""Tests para el endpoint de notificaciones."""
import uuid
import pytest

from tests.conftest import TEST_USER_ID


@pytest.fixture
def notification_data():
    """Datos base para crear una notificación."""
    return {
        "user_id": TEST_USER_ID,
        "type": "lead",
        "priority": "high",
        "title": "Nuevo lead asignado",
        "message": "Se te ha asignado el lead Empresa Test S.L.",
        "action_url": "/leads/123",
    }


class TestListNotifications:
    """Tests para GET /api/v1/notifications/"""

    async def test_list_empty(self, client):
        response = await client.get("/api/v1/notifications")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_with_data(self, client, notification_data):
        await client.post("/api/v1/notifications", json=notification_data)

        response = await client.get("/api/v1/notifications")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Nuevo lead asignado"

    async def test_list_filter_by_type(self, client, notification_data):
        await client.post("/api/v1/notifications", json=notification_data)
        await client.post("/api/v1/notifications", json={
            **notification_data, "type": "action", "title": "Acción vencida",
        })

        response = await client.get("/api/v1/notifications?type=lead")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["type"] == "lead"

    async def test_list_filter_by_priority(self, client, notification_data):
        await client.post("/api/v1/notifications", json=notification_data)
        await client.post("/api/v1/notifications", json={
            **notification_data, "priority": "low", "title": "Info",
        })

        response = await client.get("/api/v1/notifications?priority=high")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1

    async def test_list_pagination(self, client, notification_data):
        response = await client.get("/api/v1/notifications?page=1&page_size=5")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data


class TestNotificationStats:
    """Tests para GET /api/v1/notifications/stats"""

    async def test_stats_empty(self, client):
        response = await client.get("/api/v1/notifications/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["unread"] == 0

    async def test_stats_with_data(self, client, notification_data):
        await client.post("/api/v1/notifications", json=notification_data)
        await client.post("/api/v1/notifications", json={
            **notification_data, "type": "action", "title": "Otra",
        })

        response = await client.get("/api/v1/notifications/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert data["unread"] == 2


class TestGetNotification:
    """Tests para GET /api/v1/notifications/{id}"""

    async def test_get_notification(self, client, notification_data):
        create_resp = await client.post("/api/v1/notifications", json=notification_data)
        notif_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/notifications/{notif_id}")
        assert response.status_code == 200
        assert response.json()["title"] == "Nuevo lead asignado"

    async def test_get_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/notifications/{fake_id}")
        assert response.status_code == 404


class TestCreateNotification:
    """Tests para POST /api/v1/notifications/"""

    async def test_create_success(self, client, notification_data):
        response = await client.post("/api/v1/notifications", json=notification_data)
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["title"] == "Nuevo lead asignado"
        assert data["type"] == "lead"
        assert data["priority"] == "high"
        assert data["is_read"] is False
        assert "id" in data

    async def test_create_with_metadata(self, client, notification_data):
        notification_data["metadata"] = '{"lead_id": "abc-123"}'
        response = await client.post("/api/v1/notifications", json=notification_data)
        assert response.status_code in (200, 201)

    async def test_create_missing_title(self, client):
        response = await client.post("/api/v1/notifications", json={
            "user_id": TEST_USER_ID,
            "type": "system",
            "message": "No title",
        })
        assert response.status_code == 422


class TestUpdateNotification:
    """Tests para PATCH /api/v1/notifications/{id}"""

    async def test_mark_as_read(self, client, notification_data):
        create_resp = await client.post("/api/v1/notifications", json=notification_data)
        notif_id = create_resp.json()["id"]

        response = await client.patch(f"/api/v1/notifications/{notif_id}", json={
            "is_read": True,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["is_read"] is True
        assert data["read_at"] is not None

    async def test_mark_as_unread(self, client, notification_data):
        create_resp = await client.post("/api/v1/notifications", json=notification_data)
        notif_id = create_resp.json()["id"]

        # Mark read first
        await client.patch(f"/api/v1/notifications/{notif_id}", json={"is_read": True})
        # Then unread
        response = await client.patch(f"/api/v1/notifications/{notif_id}", json={
            "is_read": False,
        })
        assert response.status_code == 200
        assert response.json()["is_read"] is False

    async def test_update_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.patch(f"/api/v1/notifications/{fake_id}", json={
            "is_read": True,
        })
        assert response.status_code == 404


class TestMarkAllRead:
    """Tests para POST /api/v1/notifications/mark-all-read"""

    async def test_mark_all_read(self, client, notification_data):
        await client.post("/api/v1/notifications", json=notification_data)
        await client.post("/api/v1/notifications", json={
            **notification_data, "title": "Segunda",
        })

        response = await client.post("/api/v1/notifications/mark-all-read")
        assert response.status_code == 200
        assert "message" in response.json()

        # Verify all are read
        stats = await client.get("/api/v1/notifications/stats")
        assert stats.json()["unread"] == 0

    async def test_mark_all_read_empty(self, client):
        response = await client.post("/api/v1/notifications/mark-all-read")
        assert response.status_code == 200


class TestDeleteNotification:
    """Tests para DELETE /api/v1/notifications/{id}"""

    async def test_delete_success(self, client, notification_data):
        create_resp = await client.post("/api/v1/notifications", json=notification_data)
        notif_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/notifications/{notif_id}")
        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/notifications/{notif_id}")
        assert get_resp.status_code == 404

    async def test_delete_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(f"/api/v1/notifications/{fake_id}")
        assert response.status_code == 404
