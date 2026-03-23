"""Tests para el endpoint de usuarios."""
import pytest


class TestGetMyProfile:
    """Tests para GET /api/v1/users/me/profile"""

    async def test_get_profile_auto_creates(self, client):
        """El perfil se crea automáticamente en la primera petición."""
        response = await client.get("/api/v1/users/me/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@st4rtup.app"
        assert data["is_active"] is True
        assert "id" in data

    async def test_get_profile_idempotent(self, client):
        """Llamar dos veces no crea duplicados."""
        resp1 = await client.get("/api/v1/users/me/profile")
        resp2 = await client.get("/api/v1/users/me/profile")
        assert resp1.json()["id"] == resp2.json()["id"]


class TestListUsers:
    """Tests para GET /api/v1/users"""

    async def test_list_users_has_test_user(self, client):
        """The test user is pre-seeded in conftest, so list is never empty."""
        response = await client.get("/api/v1/users")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    async def test_list_users_with_data(self, client, user_data):
        # Crear un usuario primero
        await client.post("/api/v1/users", json=user_data)

        response = await client.get("/api/v1/users")
        data = response.json()
        assert data["total"] >= 1

    async def test_list_users_pagination(self, client):
        response = await client.get("/api/v1/users?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data


class TestCreateUser:
    """Tests para POST /api/v1/users"""

    async def test_create_user_success(self, client, user_data):
        response = await client.post("/api/v1/users", json=user_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "nuevo@st4rtup.app"
        assert data["full_name"] == "Nuevo Usuario"
        assert data["role"] == "viewer"
        assert data["is_active"] is True
        assert "id" in data

    async def test_create_user_duplicate_email(self, client, user_data):
        await client.post("/api/v1/users", json=user_data)
        response = await client.post("/api/v1/users", json=user_data)
        assert response.status_code == 400

    async def test_create_user_missing_email(self, client):
        response = await client.post("/api/v1/users", json={
            "full_name": "Sin Email",
        })
        assert response.status_code == 422


class TestUpdateUser:
    """Tests para PUT /api/v1/users/{id}"""

    async def test_update_user_success(self, client, user_data):
        create_resp = await client.post("/api/v1/users", json=user_data)
        user_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/users/{user_id}", json={
            "full_name": "Nombre Actualizado",
            "phone": "+34 600 999 888",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Nombre Actualizado"
        assert data["phone"] == "+34 600 999 888"

    async def test_update_user_role(self, client, user_data):
        create_resp = await client.post("/api/v1/users", json=user_data)
        user_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/users/{user_id}", json={
            "role": "comercial",
        })
        assert response.status_code == 200
        assert response.json()["role"] == "comercial"

    async def test_update_user_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.put(f"/api/v1/users/{fake_id}", json={
            "full_name": "No existe",
        })
        assert response.status_code == 404


class TestDeleteUser:
    """Tests para DELETE /api/v1/users/{id}"""

    async def test_delete_user_success(self, client, user_data):
        create_resp = await client.post("/api/v1/users", json=user_data)
        user_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/users/{user_id}")
        assert response.status_code == 204

    async def test_delete_user_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(f"/api/v1/users/{fake_id}")
        assert response.status_code == 404
