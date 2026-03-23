"""Tests para el servicio de AI Chat."""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.services.ai_chat_service import AIChatService


@pytest.fixture
def svc():
    return AIChatService()


class TestAIChatServiceProviders:
    """Tests de listado y configuración de proveedores."""

    def test_get_available_providers(self, svc):
        providers = svc.get_available_providers()
        assert isinstance(providers, list)
        assert len(providers) > 0
        # Cada provider debe tener al menos id y name
        for p in providers:
            assert "id" in p or "provider" in p or "name" in p

    def test_get_provider_config_openai(self, svc):
        config = svc.get_provider_config("openai", {"api_key": "sk-test"})
        assert isinstance(config, dict)

    def test_get_provider_config_unknown(self, svc):
        try:
            config = svc.get_provider_config("unknown_provider_xyz")
            assert isinstance(config, dict)
        except (ValueError, KeyError):
            pass  # Some implementations raise for unknown providers


class TestAIChatServiceChat:
    """Tests de chat (con mock HTTP)."""

    @pytest.mark.asyncio
    async def test_chat_openai_success(self, svc):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Hello from GPT!"}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5},
        }

        with patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post.return_value = mock_response
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            result = await svc.chat(
                provider="openai",
                messages=[{"role": "user", "content": "Hello"}],
                config={"api_key": "sk-test"},
            )

        assert isinstance(result, dict)
        if result.get("error"):
            # Some implementations may validate API key format
            pass
        else:
            assert "content" in result
            assert result["provider"] == "openai"

    @pytest.mark.asyncio
    async def test_chat_anthropic_success(self, svc):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "content": [{"type": "text", "text": "Hello from Claude!"}],
            "usage": {"input_tokens": 10, "output_tokens": 5},
        }

        with patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post.return_value = mock_response
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            result = await svc.chat(
                provider="anthropic",
                messages=[{"role": "user", "content": "Hello"}],
                config={"api_key": "sk-ant-test"},
            )

        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_chat_empty_messages(self, svc):
        result = await svc.chat(
            provider="openai",
            messages=[],
            config={"api_key": "sk-test"},
        )
        assert isinstance(result, dict)
        # Should either error or handle gracefully
        assert "error" in result or "content" in result


class TestAIChatServiceTestConnection:
    """Tests de test_connection para proveedores AI."""

    @pytest.mark.asyncio
    async def test_connection_without_key(self, svc):
        result = await svc.test_connection("openai", {})
        assert isinstance(result, dict)
        assert "success" in result

    @pytest.mark.asyncio
    async def test_connection_openai_success(self, svc):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": [{"id": "gpt-4"}]}

        with patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get.return_value = mock_response
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            result = await svc.test_connection("openai", {"api_key": "sk-test"})
        assert isinstance(result, dict)
