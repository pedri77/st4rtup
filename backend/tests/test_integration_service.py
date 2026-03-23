"""Tests para el servicio de integraciones externas."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.services.integration_service import IntegrationService


@pytest.fixture
def svc():
    return IntegrationService()


class TestIntegrationServiceDispatch:
    """Tests del dispatch genérico de test_connection."""

    @pytest.mark.asyncio
    async def test_unknown_integration(self, svc):
        result = await svc.test_connection("nonexistent_service_xyz", {})
        assert result["success"] is False
        assert "desconocida" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_timeout_handling(self, svc):
        """Timeout en la llamada HTTP debería ser capturado."""
        import httpx
        with patch.object(svc, "_test_linkedin", side_effect=httpx.TimeoutException("timeout")):
            result = await svc.test_connection("linkedin", {"access_token": "tok"})
        assert result["success"] is False
        assert "timeout" in result["error"].lower()

    @pytest.mark.asyncio
    async def test_connect_error_handling(self, svc):
        import httpx
        with patch.object(svc, "_test_linkedin", side_effect=httpx.ConnectError("refused")):
            result = await svc.test_connection("linkedin", {"access_token": "tok"})
        assert result["success"] is False
        assert "conexión" in result["error"].lower()


class TestLinkedIn:
    @pytest.mark.asyncio
    async def test_missing_token(self, svc):
        result = await svc._test_linkedin({})
        assert result["success"] is False
        assert "access_token" in result["error"]

    @pytest.mark.asyncio
    async def test_success(self, svc):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"localizedFirstName": "John", "localizedLastName": "Doe"}

        with patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get.return_value = mock_resp
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            result = await svc._test_linkedin({"access_token": "valid_token"})
        assert result["success"] is True
        assert "John Doe" in result["message"]


class TestGA4:
    @pytest.mark.asyncio
    async def test_missing_fields(self, svc):
        result = await svc._test_ga4({"client_id": "id"})
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_success(self, svc):
        token_resp = MagicMock()
        token_resp.status_code = 200
        token_resp.json.return_value = {"access_token": "at_123"}

        property_resp = MagicMock()
        property_resp.status_code = 200
        property_resp.json.return_value = {"displayName": "Mi Propiedad"}

        with patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post.return_value = token_resp
            instance.get.return_value = property_resp
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            result = await svc._test_ga4({
                "client_id": "cid",
                "client_secret": "cs",
                "refresh_token": "rt",
                "property_id": "123",
            })
        assert result["success"] is True
        assert "Mi Propiedad" in result["message"]


class TestGSC:
    @pytest.mark.asyncio
    async def test_missing_fields(self, svc):
        result = await svc._test_google_search_console({})
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_success(self, svc):
        token_resp = MagicMock()
        token_resp.status_code = 200
        token_resp.json.return_value = {"access_token": "at_gsc"}

        sites_resp = MagicMock()
        sites_resp.status_code = 200
        sites_resp.json.return_value = {"siteEntry": [{"siteUrl": "https://st4rtup.app"}]}

        with patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post.return_value = token_resp
            instance.get.return_value = sites_resp
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            result = await svc._test_google_search_console({
                "client_id": "cid",
                "client_secret": "cs",
                "refresh_token": "rt",
                "site_url": "https://st4rtup.app",
            })
        assert result["success"] is True
        assert "1 sitio" in result["message"]


class TestYouTube:
    @pytest.mark.asyncio
    async def test_missing_api_key(self, svc):
        result = await svc._test_youtube({})
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_success(self, svc):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "items": [{
                "snippet": {"title": "St4rtup Channel"},
                "statistics": {"subscriberCount": "500"},
            }]
        }

        with patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get.return_value = mock_resp
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            result = await svc._test_youtube({
                "api_key": "AIza_test",
                "channel_id": "UC123",
            })
        assert result["success"] is True
        assert "St4rtup Channel" in result["message"]


class TestTelegram:
    @pytest.mark.asyncio
    async def test_success(self, svc):
        with patch("app.services.telegram_service.test_connection", new_callable=AsyncMock) as mock_test:
            mock_test.return_value = {"bot_username": "st4rtup_bot"}
            result = await svc._test_telegram({"bot_token": "123:abc", "chat_id": "-100"})
        assert result["success"] is True
        assert "st4rtup_bot" in result["message"]
