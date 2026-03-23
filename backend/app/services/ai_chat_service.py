"""
Servicio de chat con IA multi-proveedor.
Soporta: OpenAI, Anthropic Claude, Google Gemini, Mistral, Groq, Ollama, DeepSeek.
Todos usan el formato OpenAI-compatible excepto Anthropic y Google que tienen API propia.
"""
import time
from typing import Dict, Any, List, Optional, AsyncGenerator
from urllib.parse import urlparse
import ipaddress
import socket

import httpx

from app.core.config import settings


def _validate_base_url(url: str) -> str:
    """Validate that a base URL does not point to internal/private networks (SSRF protection)."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"URL scheme not allowed: {parsed.scheme}")

    hostname = parsed.hostname or ""

    # Block obvious internal hostnames
    blocked = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"}
    if hostname.lower() in blocked:
        raise ValueError("URLs pointing to localhost are not allowed")

    # Block cloud metadata endpoints
    if hostname in ("169.254.169.254", "metadata.google.internal"):
        raise ValueError("Cloud metadata endpoints are not allowed")

    # Resolve hostname and check for private IPs
    try:
        resolved = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for _, _, _, _, addr in resolved:
            ip = ipaddress.ip_address(addr[0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                raise ValueError(f"URL resolves to private/internal IP: {ip}")
    except socket.gaierror:
        pass  # Allow unresolvable hosts (may work at runtime in different network)

    return url

TIMEOUT = 60.0


class AIChatService:
    """Multi-provider AI chat service."""

    # Provider registry with their API details
    PROVIDERS = {
        "openai": {
            "name": "OpenAI",
            "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini"],
            "api_type": "openai",
        },
        "anthropic": {
            "name": "Anthropic Claude",
            "models": ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-4-5-20251001", "claude-3-5-sonnet-20241022"],
            "api_type": "anthropic",
        },
        "google": {
            "name": "Google Gemini",
            "models": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.0-pro"],
            "api_type": "google",
        },
        "mistral": {
            "name": "Mistral AI",
            "models": ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "open-mixtral-8x22b"],
            "api_type": "openai",  # Mistral uses OpenAI-compatible API
        },
        "groq": {
            "name": "Groq",
            "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
            "api_type": "openai",  # Groq uses OpenAI-compatible API
        },
        "ollama": {
            "name": "Ollama (Local)",
            "models": ["llama3", "llama3:70b", "mistral", "codellama", "phi3"],
            "api_type": "openai",  # Ollama has OpenAI-compatible endpoint
        },
        "deepseek": {
            "name": "DeepSeek",
            "models": ["deepseek-chat", "deepseek-reasoner"],
            "api_type": "openai",  # DeepSeek uses OpenAI-compatible API
        },
    }

    def get_provider_config(self, provider: str, config: Optional[dict] = None) -> dict:
        """Get API configuration for a provider, merging DB config with env vars."""
        cfg = config or {}

        if provider == "openai":
            base_url = cfg.get("base_url") or settings.OPENAI_BASE_URL
            if base_url and base_url != "https://api.openai.com/v1":
                _validate_base_url(base_url)
            return {
                "api_key": cfg.get("api_key") or settings.OPENAI_API_KEY or getattr(settings, "OPEN_API_KEY", ""),
                "model": cfg.get("model") or settings.OPENAI_MODEL,
                "base_url": base_url,
            }
        elif provider == "anthropic":
            return {
                "api_key": cfg.get("api_key") or settings.ANTHROPIC_API_KEY,
                "model": cfg.get("model") or settings.ANTHROPIC_MODEL,
            }
        elif provider == "google":
            return {
                "api_key": cfg.get("api_key") or settings.GOOGLE_AI_API_KEY,
                "model": cfg.get("model") or settings.GOOGLE_AI_MODEL,
            }
        elif provider == "mistral":
            return {
                "api_key": cfg.get("api_key") or settings.MISTRAL_API_KEY,
                "model": cfg.get("model") or settings.MISTRAL_MODEL,
                "base_url": "https://api.mistral.ai/v1",
            }
        elif provider == "groq":
            return {
                "api_key": cfg.get("api_key") or settings.GROQ_API_KEY,
                "model": cfg.get("model") or settings.GROQ_MODEL,
                "base_url": "https://api.groq.com/openai/v1",
            }
        elif provider == "ollama":
            ollama_base = cfg.get("base_url") or settings.OLLAMA_BASE_URL
            if ollama_base:
                _validate_base_url(ollama_base)
            return {
                "api_key": "ollama",  # Ollama doesn't need auth
                "model": cfg.get("model") or settings.OLLAMA_MODEL,
                "base_url": ollama_base + "/v1",
            }
        elif provider == "deepseek":
            return {
                "api_key": cfg.get("api_key") or settings.DEEPSEEK_API_KEY,
                "model": cfg.get("model") or settings.DEEPSEEK_MODEL,
                "base_url": "https://api.deepseek.com",
            }
        else:
            raise ValueError(f"Proveedor desconocido: {provider}")

    async def chat(
        self,
        provider: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        config: Optional[dict] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> Dict[str, Any]:
        """
        Send a chat completion request to the specified provider.
        Returns: {content, provider, model, tokens_input, tokens_output, duration_ms, error}
        """
        start = time.time()
        provider_info = self.PROVIDERS.get(provider)
        if not provider_info:
            return {"content": "", "error": f"Proveedor desconocido: {provider}", "duration_ms": 0}

        cfg = self.get_provider_config(provider, config)
        if model:
            cfg["model"] = model

        # Add system prompt
        full_messages = list(messages)
        if system_prompt:
            if provider_info["api_type"] == "anthropic":
                pass  # Anthropic handles system prompt separately
            else:
                full_messages = [{"role": "system", "content": system_prompt}] + full_messages

        try:
            if provider_info["api_type"] == "openai":
                result = await self._chat_openai(cfg, full_messages, temperature, max_tokens)
            elif provider_info["api_type"] == "anthropic":
                result = await self._chat_anthropic(cfg, full_messages, system_prompt, temperature, max_tokens)
            elif provider_info["api_type"] == "google":
                result = await self._chat_google(cfg, full_messages, system_prompt, temperature, max_tokens)
            else:
                return {"content": "", "error": "Tipo de API no soportado", "duration_ms": 0}

            result["provider"] = provider
            result["model"] = cfg["model"]
            result["duration_ms"] = int((time.time() - start) * 1000)
            return result

        except Exception as e:
            return {
                "content": "",
                "provider": provider,
                "model": cfg.get("model", ""),
                "error": str(e),
                "duration_ms": int((time.time() - start) * 1000),
                "tokens_input": 0,
                "tokens_output": 0,
            }

    async def _chat_openai(
        self, cfg: dict, messages: list, temperature: float, max_tokens: int
    ) -> dict:
        """OpenAI-compatible API (also used by Mistral, Groq, Ollama, DeepSeek)."""
        api_key = cfg["api_key"]
        base_url = cfg.get("base_url", "https://api.openai.com/v1")

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": cfg["model"],
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )

            if r.status_code != 200:
                return {"content": "", "error": f"API error {r.status_code}: {r.text[:300]}", "tokens_input": 0, "tokens_output": 0}

            data = r.json()
            choice = data.get("choices", [{}])[0]
            usage = data.get("usage", {})

            return {
                "content": choice.get("message", {}).get("content", ""),
                "tokens_input": usage.get("prompt_tokens", 0),
                "tokens_output": usage.get("completion_tokens", 0),
            }

    async def _chat_anthropic(
        self, cfg: dict, messages: list, system_prompt: Optional[str], temperature: float, max_tokens: int
    ) -> dict:
        """Anthropic Messages API."""
        api_key = cfg["api_key"]

        # Filter out system messages (Anthropic uses separate system field)
        user_messages = [m for m in messages if m["role"] != "system"]

        body = {
            "model": cfg["model"],
            "messages": user_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if system_prompt:
            body["system"] = system_prompt

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json=body,
            )

            if r.status_code != 200:
                return {"content": "", "error": f"API error {r.status_code}: {r.text[:300]}", "tokens_input": 0, "tokens_output": 0}

            data = r.json()
            content_blocks = data.get("content", [])
            text = "".join(b.get("text", "") for b in content_blocks if b.get("type") == "text")
            usage = data.get("usage", {})

            return {
                "content": text,
                "tokens_input": usage.get("input_tokens", 0),
                "tokens_output": usage.get("output_tokens", 0),
            }

    async def _chat_google(
        self, cfg: dict, messages: list, system_prompt: Optional[str], temperature: float, max_tokens: int
    ) -> dict:
        """Google Gemini API."""
        api_key = cfg["api_key"]
        model = cfg["model"]

        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            if msg["role"] == "system":
                continue
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        body = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_prompt:
            body["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json=body,
            )

            if r.status_code != 200:
                return {"content": "", "error": f"API error {r.status_code}: {r.text[:300]}", "tokens_input": 0, "tokens_output": 0}

            data = r.json()
            candidates = data.get("candidates", [])
            text = ""
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts)

            usage = data.get("usageMetadata", {})

            return {
                "content": text,
                "tokens_input": usage.get("promptTokenCount", 0),
                "tokens_output": usage.get("candidatesTokenCount", 0),
            }

    async def stream_chat(
        self,
        provider: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        config: Optional[dict] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response using SSE. Yields text chunks.
        Currently supports OpenAI-compatible providers and Anthropic.
        """
        provider_info = self.PROVIDERS.get(provider)
        if not provider_info:
            yield f"[Error: Proveedor desconocido: {provider}]"
            return

        cfg = self.get_provider_config(provider, config)
        if model:
            cfg["model"] = model

        full_messages = list(messages)
        if system_prompt and provider_info["api_type"] != "anthropic":
            full_messages = [{"role": "system", "content": system_prompt}] + full_messages

        try:
            if provider_info["api_type"] == "openai":
                async for chunk in self._stream_openai(cfg, full_messages, temperature, max_tokens):
                    yield chunk
            elif provider_info["api_type"] == "anthropic":
                async for chunk in self._stream_anthropic(cfg, full_messages, system_prompt, temperature, max_tokens):
                    yield chunk
            else:
                # Fall back to non-streaming for Google
                result = await self._chat_google(cfg, full_messages, system_prompt, temperature, max_tokens)
                if result.get("error"):
                    yield f"[Error: {result['error']}]"
                else:
                    yield result["content"]
        except Exception as e:
            yield f"[Error: {str(e)}]"

    async def _stream_openai(self, cfg: dict, messages: list, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
        """Stream from OpenAI-compatible API."""
        base_url = cfg.get("base_url", "https://api.openai.com/v1")
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            async with client.stream(
                "POST",
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {cfg['api_key']}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": cfg["model"],
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": True,
                },
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            import json
                            chunk = json.loads(data)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            text = delta.get("content", "")
                            if text:
                                yield text
                        except Exception:
                            continue

    async def _stream_anthropic(self, cfg: dict, messages: list, system_prompt: Optional[str], temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
        """Stream from Anthropic Messages API."""
        user_messages = [m for m in messages if m["role"] != "system"]
        body = {
            "model": cfg["model"],
            "messages": user_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if system_prompt:
            body["system"] = system_prompt

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            async with client.stream(
                "POST",
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": cfg["api_key"],
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json=body,
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            import json
                            data = json.loads(line[6:])
                            if data.get("type") == "content_block_delta":
                                text = data.get("delta", {}).get("text", "")
                                if text:
                                    yield text
                        except Exception:
                            continue

    async def test_connection(self, provider: str, config: Optional[dict] = None) -> Dict[str, Any]:
        """Test connection to an AI provider."""
        try:
            result = await self.chat(
                provider=provider,
                messages=[{"role": "user", "content": "Di 'hola' en una palabra."}],
                config=config,
                max_tokens=10,
            )
            if result.get("error"):
                return {"success": False, "error": result["error"]}
            return {
                "success": True,
                "message": f"{self.PROVIDERS[provider]['name']} conectado. Modelo: {result['model']}. Respuesta: {result['content'][:50]}",
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_available_providers(self) -> List[dict]:
        """Return list of all available providers with their models."""
        return [
            {"id": pid, "name": p["name"], "models": p["models"]}
            for pid, p in self.PROVIDERS.items()
        ]


ai_chat_service = AIChatService()
