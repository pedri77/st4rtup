"""Tests para el servicio de email."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock


@pytest.fixture
def email_svc():
    from app.services.email_service import EmailService
    return EmailService()


class TestEmailServiceProvider:
    """Tests de configuración de proveedor."""

    def test_default_provider(self, email_svc):
        assert email_svc.provider in ("resend", "zoho", "brevo", "ses", "mailgun", "smtp")

    def test_set_provider(self, email_svc):
        email_svc.set_provider("zoho")
        assert email_svc.provider == "zoho"

    def test_set_invalid_provider(self, email_svc):
        original = email_svc.provider
        email_svc.set_provider("nonexistent")
        # Should still have some provider set
        assert email_svc.provider is not None


class TestEmailServiceSend:
    """Tests de envío de email (con mock HTTP)."""

    @pytest.mark.asyncio
    async def test_send_email_resend_success(self, email_svc):
        email_svc.set_provider("resend")
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "msg_123"}

        with patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post.return_value = mock_response
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            result = await email_svc.send_email(
                to="test@example.com",
                subject="Test Email",
                html_body="<p>Hello</p>",
                provider_config={"resend_api_key": "re_test_key", "from_email": "test@st4rtup.app"},
            )

        assert isinstance(result, dict)
        assert result.get("success") is True

    @pytest.mark.asyncio
    async def test_send_email_missing_to(self, email_svc):
        result = await email_svc.send_email(
            to="",
            subject="Test",
            html_body="<p>Test</p>",
        )
        assert result.get("success") is False or result.get("error") is not None

    @pytest.mark.asyncio
    async def test_test_connection(self, email_svc):
        """test_connection debería retornar un dict con success."""
        result = await email_svc.test_connection({"provider": "resend"})
        assert isinstance(result, dict)
        assert "success" in result


class TestEmailServiceProviders:
    """Tests para diferentes proveedores de email."""

    @pytest.mark.asyncio
    async def test_send_with_zoho(self, email_svc):
        email_svc.set_provider("zoho")
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": [{"messageId": "zoho_123"}]}

        with patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post.return_value = mock_response
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            result = await email_svc.send_email(
                to="test@example.com",
                subject="Zoho Test",
                html_body="<p>Test via Zoho</p>",
                provider_config={"account_id": "123", "auth_token": "tok"},
            )
        assert isinstance(result, dict)
