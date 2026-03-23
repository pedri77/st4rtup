"""MOD-DEALROOM-001 — Deal Room via Microsoft Graph.

Gestiona carpetas compartidas en SharePoint/OneDrive para cada deal.
Cada oportunidad puede tener un Deal Room con documentos, propuestas y contratos.

API: Microsoft Graph v1.0
Auth: OAuth2 (client_credentials or delegated)
"""
import logging
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.system import SystemSettings

logger = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


async def _get_graph_config(db: AsyncSession) -> dict | None:
    result = await db.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        return None
    cfg = settings.general_config or {}
    graph_cfg = cfg.get("microsoft_graph", {})
    if not graph_cfg.get("access_token") and not graph_cfg.get("client_id"):
        return None
    return graph_cfg


async def _get_access_token(cfg: dict) -> str | None:
    """Obtiene access_token via client_credentials si no hay uno válido."""
    if cfg.get("access_token"):
        return cfg["access_token"]

    client_id = cfg.get("client_id", "")
    client_secret = cfg.get("client_secret", "")
    tenant_id = cfg.get("tenant_id", "")

    if not all([client_id, client_secret, tenant_id]):
        return None

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "scope": "https://graph.microsoft.com/.default",
                "grant_type": "client_credentials",
            },
            timeout=10,
        )

    if resp.status_code != 200:
        logger.warning("Graph token error %d: %s", resp.status_code, resp.text[:200])
        return None

    return resp.json().get("access_token")


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ─── Deal Room CRUD ───────────────────────────────────────────────

async def create_deal_room(
    db: AsyncSession,
    opportunity_id: UUID,
    opportunity_name: str,
    company_name: str,
) -> dict:
    """Crea una carpeta de Deal Room en SharePoint/OneDrive."""
    cfg = await _get_graph_config(db)
    if not cfg:
        return {"error": "Microsoft Graph no configurado", "connected": False}

    token = await _get_access_token(cfg)
    if not token:
        return {"error": "No se pudo obtener access token", "connected": True}

    site_id = cfg.get("site_id", "")
    drive_id = cfg.get("drive_id", "")
    root_folder = cfg.get("dealroom_root", "Deal Rooms")

    if not site_id or not drive_id:
        return {"error": "site_id y drive_id no configurados", "connected": True}

    # Create folder structure: Deal Rooms / CompanyName - OpportunityName
    folder_name = f"{company_name} - {opportunity_name}"

    async with httpx.AsyncClient() as client:
        # Create main folder
        await client.post(
            f"{GRAPH_BASE}/sites/{site_id}/drives/{drive_id}/root:/{root_folder}/{folder_name}:/children",
            json={"name": "Propuestas", "folder": {}, "@microsoft.graph.conflictBehavior": "rename"},
            headers=_headers(token),
            timeout=15,
        )

        # Create subfolders
        for subfolder in ["Propuestas", "Contratos", "Presentaciones", "Documentación"]:
            await client.post(
                f"{GRAPH_BASE}/sites/{site_id}/drives/{drive_id}/root:/{root_folder}/{folder_name}/{subfolder}",
                json={"name": subfolder, "folder": {}, "@microsoft.graph.conflictBehavior": "rename"},
                headers=_headers(token),
                timeout=10,
            )

    # Get folder web URL
    async with httpx.AsyncClient() as client:
        folder_resp = await client.get(
            f"{GRAPH_BASE}/sites/{site_id}/drives/{drive_id}/root:/{root_folder}/{folder_name}",
            headers=_headers(token),
            timeout=10,
        )

    folder_url = ""
    folder_id = ""
    if folder_resp.status_code == 200:
        folder_data = folder_resp.json()
        folder_url = folder_data.get("webUrl", "")
        folder_id = folder_data.get("id", "")

    return {
        "connected": True,
        "created": True,
        "folder_name": folder_name,
        "folder_id": folder_id,
        "folder_url": folder_url,
        "opportunity_id": str(opportunity_id),
        "subfolders": ["Propuestas", "Contratos", "Presentaciones", "Documentación"],
    }


async def list_deal_room_files(
    db: AsyncSession,
    folder_path: str,
) -> dict:
    """Lista archivos en una carpeta del Deal Room."""
    cfg = await _get_graph_config(db)
    if not cfg:
        return {"error": "Microsoft Graph no configurado", "connected": False}

    token = await _get_access_token(cfg)
    if not token:
        return {"error": "No se pudo obtener access token", "connected": True}

    site_id = cfg.get("site_id", "")
    drive_id = cfg.get("drive_id", "")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GRAPH_BASE}/sites/{site_id}/drives/{drive_id}/root:/{folder_path}:/children",
            headers=_headers(token),
            params={"$select": "id,name,size,lastModifiedDateTime,webUrl,file,folder"},
            timeout=15,
        )

    if resp.status_code != 200:
        return {"error": f"Graph API error: {resp.status_code}", "connected": True}

    items = resp.json().get("value", [])
    files = [
        {
            "id": item["id"],
            "name": item["name"],
            "size": item.get("size", 0),
            "modified": item.get("lastModifiedDateTime"),
            "url": item.get("webUrl"),
            "is_folder": "folder" in item,
            "mime_type": item.get("file", {}).get("mimeType"),
        }
        for item in items
    ]

    return {"connected": True, "files": files, "path": folder_path}


async def upload_to_deal_room(
    db: AsyncSession,
    folder_path: str,
    file_name: str,
    content: bytes,
) -> dict:
    """Sube un archivo al Deal Room."""
    cfg = await _get_graph_config(db)
    if not cfg:
        return {"error": "Microsoft Graph no configurado", "connected": False}

    token = await _get_access_token(cfg)
    if not token:
        return {"error": "No se pudo obtener access token", "connected": True}

    site_id = cfg.get("site_id", "")
    drive_id = cfg.get("drive_id", "")

    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{GRAPH_BASE}/sites/{site_id}/drives/{drive_id}/root:/{folder_path}/{file_name}:/content",
            content=content,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/octet-stream",
            },
            timeout=30,
        )

    if resp.status_code in (200, 201):
        data = resp.json()
        return {
            "connected": True,
            "uploaded": True,
            "file_id": data.get("id"),
            "web_url": data.get("webUrl"),
            "size": data.get("size"),
        }

    return {"error": f"Upload error: {resp.status_code}", "connected": True}


async def create_sharing_link(
    db: AsyncSession,
    item_id: str,
    link_type: str = "view",  # view, edit
    password: str | None = None,
    expiration: str | None = None,
) -> dict:
    """Crea un enlace compartido para un archivo del Deal Room."""
    cfg = await _get_graph_config(db)
    if not cfg:
        return {"error": "Microsoft Graph no configurado", "connected": False}

    token = await _get_access_token(cfg)
    if not token:
        return {"error": "No se pudo obtener access token", "connected": True}

    site_id = cfg.get("site_id", "")
    drive_id = cfg.get("drive_id", "")

    body = {"type": link_type, "scope": "anonymous"}
    if password:
        body["password"] = password
    if expiration:
        body["expirationDateTime"] = expiration

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GRAPH_BASE}/sites/{site_id}/drives/{drive_id}/items/{item_id}/createLink",
            json=body,
            headers=_headers(token),
            timeout=10,
        )

    if resp.status_code in (200, 201):
        data = resp.json()
        return {
            "connected": True,
            "link": data.get("link", {}).get("webUrl"),
            "type": link_type,
            "expires": expiration,
        }

    return {"error": f"Sharing link error: {resp.status_code}", "connected": True}
