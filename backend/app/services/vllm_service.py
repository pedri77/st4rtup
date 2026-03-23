"""
vLLM service — self-hosted LLM inference on Hetzner GPU server.
Trigger: API cost > 50 EUR/month.
Soporta Mistral, Llama, y otros modelos open-source via vLLM OpenAI-compatible API.
"""
import httpx
import logging
from typing import Optional

from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)
TIMEOUT = 60.0


def _get_vllm_url() -> str:
    """Obtiene URL del servidor vLLM."""
    url = getattr(app_settings, "VLLM_API_URL", "")
    if not url:
        raise ValueError(
            "vLLM no configurado. Establecer VLLM_API_URL "
            "(ej: http://gpu.hetzner.internal:8000/v1)"
        )
    return url


async def chat_completion(
    messages: list[dict],
    model: str = "mistralai/Mistral-7B-Instruct-v0.2",
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> dict:
    """Llama al servidor vLLM con API compatible con OpenAI."""
    base_url = _get_vllm_url()

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{base_url}/chat/completions",
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        if r.status_code == 200:
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            return {
                "content": content,
                "model": model,
                "provider": "vllm",
                "tokens_input": usage.get("prompt_tokens", 0),
                "tokens_output": usage.get("completion_tokens", 0),
            }
        raise ValueError(f"vLLM error: {r.status_code} {r.text[:300]}")


async def list_models() -> list:
    """Lista modelos disponibles en el servidor vLLM."""
    base_url = _get_vllm_url()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{base_url}/models")
        if r.status_code == 200:
            return [m["id"] for m in r.json().get("data", [])]
        return []


async def health_check() -> dict:
    """Verifica el estado del servidor vLLM."""
    try:
        base_url = _get_vllm_url()
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{base_url}/models")
            if r.status_code == 200:
                models = [m["id"] for m in r.json().get("data", [])]
                return {"status": "healthy", "models": models, "url": base_url}
            return {"status": "error", "code": r.status_code}
    except ValueError as e:
        return {"status": "not_configured", "error": str(e)}
    except Exception as e:
        return {"status": "unreachable", "error": str(e)}
