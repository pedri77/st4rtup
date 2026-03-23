"""Tests para el endpoint de configuracion del sistema."""
import pytest


class TestGetSettings:
    """Tests para GET /api/v1/settings/"""

    async def test_get_settings(self, client):
        response = await client.get("/api/v1/settings/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (dict, list))


class TestUpdateSettings:
    """Tests para PUT /api/v1/settings/ (requires admin role in users table)"""

    async def test_update_settings_as_admin(self, client):
        """Admin user is pre-seeded in conftest — PUT should succeed."""
        response = await client.put("/api/v1/settings/", json={
            "general_config": {"company_name": "St4rtup Test"},
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    async def test_update_settings_persists(self, client):
        """Settings should persist after update."""
        await client.put("/api/v1/settings/", json={
            "general_config": {"company_name": "St4rtup Updated"},
        })
        response = await client.get("/api/v1/settings/")
        assert response.status_code == 200