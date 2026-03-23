"""RAG service — Retrieval Augmented Generation con Qdrant.

Almacena embeddings de emails, notas, transcripciones y documentos
para dar contexto a los agentes LLM.

Requiere: QDRANT_URL, QDRANT_API_KEY (opcional si local)
"""
import logging

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "st4rtup_context"
EMBEDDING_DIM = 1024  # Mistral embed dimension


def _get_qdrant_config() -> tuple[str, str] | None:
    url = getattr(settings, "QDRANT_URL", "") or ""
    if not url:
        return None
    api_key = getattr(settings, "QDRANT_API_KEY", "") or ""
    return url, api_key


def _headers(api_key: str) -> dict:
    h = {"Content-Type": "application/json"}
    if api_key:
        h["api-key"] = api_key
    return h


async def _get_embedding(text: str) -> list[float] | None:
    """Genera embedding usando vLLM, Mistral API u OpenAI."""
    # Try vLLM
    vllm_url = getattr(settings, "VLLM_BASE_URL", "") or ""
    if vllm_url:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{vllm_url}/v1/embeddings",
                    json={"model": "mistral-embed", "input": text},
                )
                if resp.status_code == 200:
                    return resp.json()["data"][0]["embedding"]
        except Exception:
            pass

    # Try Mistral API
    mistral_key = getattr(settings, "MISTRAL_API_KEY", "") or ""
    if mistral_key:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://api.mistral.ai/v1/embeddings",
                    json={"model": "mistral-embed", "input": [text]},
                    headers={"Authorization": f"Bearer {mistral_key}"},
                )
                if resp.status_code == 200:
                    return resp.json()["data"][0]["embedding"]
        except Exception:
            pass

    # Try OpenAI
    openai_key = getattr(settings, "OPENAI_API_KEY", "") or ""
    if openai_key:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    json={"model": "text-embedding-3-small", "input": text},
                    headers={"Authorization": f"Bearer {openai_key}"},
                )
                if resp.status_code == 200:
                    data = resp.json()["data"][0]["embedding"]
                    # OpenAI returns 1536 dim, pad/truncate to match
                    return data[:EMBEDDING_DIM] + [0.0] * max(0, EMBEDDING_DIM - len(data))
        except Exception:
            pass

    return None


async def ensure_collection() -> bool:
    """Crea la colección en Qdrant si no existe."""
    cfg = _get_qdrant_config()
    if not cfg:
        return False

    url, api_key = cfg

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Check if exists
            resp = await client.get(
                f"{url}/collections/{COLLECTION_NAME}",
                headers=_headers(api_key),
            )
            if resp.status_code == 200:
                return True

            # Create
            resp = await client.put(
                f"{url}/collections/{COLLECTION_NAME}",
                json={
                    "vectors": {"size": EMBEDDING_DIM, "distance": "Cosine"},
                },
                headers=_headers(api_key),
            )
            return resp.status_code in (200, 201)
    except Exception as e:
        logger.warning("Qdrant collection error: %s", e)
        return False


async def index_document(
    doc_id: str,
    text: str,
    metadata: dict | None = None,
    doc_type: str = "note",  # email, note, transcript, document
    lead_id: str | None = None,
) -> bool:
    """Indexa un documento en Qdrant."""
    cfg = _get_qdrant_config()
    if not cfg:
        return False

    url, api_key = cfg
    embedding = await _get_embedding(text[:8000])  # Truncate for embedding
    if not embedding:
        logger.warning("Could not generate embedding")
        return False

    point = {
        "id": doc_id,
        "vector": embedding,
        "payload": {
            "text": text[:2000],  # Store truncated for retrieval
            "type": doc_type,
            "lead_id": lead_id,
            **(metadata or {}),
        },
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.put(
                f"{url}/collections/{COLLECTION_NAME}/points",
                json={"points": [point]},
                headers=_headers(api_key),
            )
            return resp.status_code in (200, 201)
    except Exception as e:
        logger.warning("Qdrant index error: %s", e)
        return False


async def search_context(
    query: str,
    lead_id: str | None = None,
    doc_type: str | None = None,
    limit: int = 5,
) -> list[dict]:
    """Busca contexto relevante para un query."""
    cfg = _get_qdrant_config()
    if not cfg:
        return []

    url, api_key = cfg
    embedding = await _get_embedding(query)
    if not embedding:
        return []

    body = {
        "vector": embedding,
        "limit": limit,
        "with_payload": True,
    }

    # Filters
    conditions = []
    if lead_id:
        conditions.append({"key": "lead_id", "match": {"value": lead_id}})
    if doc_type:
        conditions.append({"key": "type", "match": {"value": doc_type}})
    if conditions:
        body["filter"] = {"must": conditions}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{url}/collections/{COLLECTION_NAME}/points/search",
                json=body,
                headers=_headers(api_key),
            )
            if resp.status_code != 200:
                return []

            results = resp.json().get("result", [])
            return [
                {
                    "id": r.get("id"),
                    "score": r.get("score"),
                    "text": r.get("payload", {}).get("text", ""),
                    "type": r.get("payload", {}).get("type", ""),
                    "lead_id": r.get("payload", {}).get("lead_id"),
                }
                for r in results
            ]
    except Exception as e:
        logger.warning("Qdrant search error: %s", e)
        return []


async def get_lead_context(lead_id: str, query: str = "", limit: int = 5) -> str:
    """Obtiene contexto RAG para un lead específico. Usado por agentes."""
    if not query:
        query = "información relevante del cliente"

    results = await search_context(query, lead_id=lead_id, limit=limit)
    if not results:
        return ""

    context_parts = []
    for r in results:
        context_parts.append(f"[{r['type']}] {r['text']}")

    return "\n\n---\n\n".join(context_parts)
