"""Servicio de integración con Google Drive API v3."""
import json
import logging
from typing import Optional
import io

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload
    HAS_GOOGLE_DRIVE = True
except ImportError:
    HAS_GOOGLE_DRIVE = False

from app.core.config import settings

logger = logging.getLogger(__name__)

# Folder mapping to Google Drive folder IDs (configured via env vars)
FOLDER_DRIVE_MAP = {
    "templates": settings.GOOGLE_DRIVE_FOLDER_TEMPLATES,
    "campaigns": settings.GOOGLE_DRIVE_FOLDER_CAMPAIGNS,
    "content": settings.GOOGLE_DRIVE_FOLDER_CONTENT,
    "battlecards": settings.GOOGLE_DRIVE_FOLDER_BATTLECARDS,
    "legal": settings.GOOGLE_DRIVE_FOLDER_LEGAL,
}

MIME_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "svg": "image/svg+xml",
    "csv": "text/csv",
    "txt": "text/plain",
    "md": "text/markdown",
}


async def _get_oauth_credentials_from_db():
    """Load OAuth2 credentials from system_settings.gdrive_config (set via frontend OAuth flow)."""
    try:
        from sqlalchemy import select as sa_select
        from app.core.database import AsyncSessionLocal
        from app.models.system import SystemSettings

        async with AsyncSessionLocal() as session:
            result = await session.execute(sa_select(SystemSettings).limit(1))
            sys_settings = result.scalar_one_or_none()
            if not sys_settings or not sys_settings.gdrive_config:
                return None

            cfg = sys_settings.gdrive_config
            access_token = cfg.get("access_token")
            refresh_token = cfg.get("refresh_token")

            if not access_token and not refresh_token:
                return None

            # Refresh if needed
            import time
            expires_at = cfg.get("expires_at", 0)
            if time.time() > expires_at - 60 and refresh_token:
                import httpx
                client_id = cfg.get("client_id") or getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
                client_secret = cfg.get("client_secret") or getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "")
                if client_id and client_secret:
                    async with httpx.AsyncClient(timeout=10) as client:
                        r = await client.post("https://oauth2.googleapis.com/token", data={
                            "client_id": client_id, "client_secret": client_secret,
                            "refresh_token": refresh_token, "grant_type": "refresh_token",
                        })
                        if r.status_code == 200:
                            data = r.json()
                            access_token = data["access_token"]
                            cfg["access_token"] = access_token
                            cfg["expires_at"] = time.time() + data.get("expires_in", 3600)
                            sys_settings.gdrive_config = cfg
                            await session.commit()

            if access_token:
                from google.oauth2.credentials import Credentials
                return Credentials(token=access_token)
    except Exception as e:
        logger.debug(f"OAuth Drive credentials load failed: {e}")
    return None


def _get_drive_service_sync(credentials=None):
    """Build Drive service with given credentials."""
    if not HAS_GOOGLE_DRIVE:
        logger.warning("Google Drive libraries not installed (pip install google-api-python-client google-auth)")
        return None
    try:
        return build("drive", "v3", credentials=credentials)
    except Exception as e:
        logger.error(f"Failed to build Drive service: {e}")
        return None


def _get_drive_service():
    """Inicializa el servicio de Google Drive con Service Account credentials."""
    if not HAS_GOOGLE_DRIVE:
        return None

    scopes = ["https://www.googleapis.com/auth/drive"]

    try:
        # Option 1: JSON credentials from env var (for containerized deployments)
        credentials_json = settings.GOOGLE_SERVICE_ACCOUNT_KEY_JSON
        if credentials_json:
            info = json.loads(credentials_json)
            credentials = service_account.Credentials.from_service_account_info(
                info, scopes=scopes,
            )
            return build("drive", "v3", credentials=credentials)

        # Option 2: File path (for local development)
        credentials_file = settings.GOOGLE_SERVICE_ACCOUNT_KEY_FILE
        if credentials_file:
            credentials = service_account.Credentials.from_service_account_file(
                credentials_file, scopes=scopes,
            )
            return build("drive", "v3", credentials=credentials)

        return None
    except Exception as e:
        logger.error(f"Failed to initialize Google Drive service: {e}")
        return None


async def get_drive_service_auto():
    """Get Drive service — tries OAuth2 from DB first, then Service Account fallback."""
    # Try OAuth2 (from frontend Settings)
    oauth_creds = await _get_oauth_credentials_from_db()
    if oauth_creds:
        svc = _get_drive_service_sync(oauth_creds)
        if svc:
            return svc

    # Fallback to Service Account
    return _get_drive_service()


async def upload_to_drive(
    file_content: bytes,
    filename: str,
    folder: str,
    mime_type: Optional[str] = None,
    language: str = "es",
) -> Optional[dict]:
    """
    Sube un archivo a Google Drive.

    Returns dict con drive_file_id, drive_url, file_size o None si Drive no está configurado.
    """
    service = _get_drive_service()
    if not service:
        logger.info("Google Drive not configured, skipping upload")
        return None

    # Determine target folder
    parent_folder_id = FOLDER_DRIVE_MAP.get(folder)
    if not parent_folder_id:
        parent_folder_id = settings.GOOGLE_DRIVE_FOLDER_ID_MARKETING
    if not parent_folder_id:
        logger.warning(f"No Drive folder configured for '{folder}'")
        return None

    # For language subfolders (templates/es, templates/en)
    if folder == "templates" and language in ("en", "pt"):
        subfolder_id = _get_or_create_subfolder(service, parent_folder_id, language)
        if subfolder_id:
            parent_folder_id = subfolder_id

    # Determine MIME type
    if not mime_type:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        mime_type = MIME_TYPES.get(ext, "application/octet-stream")

    try:
        file_metadata = {
            "name": filename,
            "parents": [parent_folder_id],
        }
        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype=mime_type,
            resumable=True,
        )
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id,webViewLink,size",
        ).execute()

        return {
            "drive_file_id": file["id"],
            "drive_url": file.get("webViewLink", f"https://drive.google.com/file/d/{file['id']}/view"),
            "file_size": int(file.get("size", len(file_content))),
        }
    except Exception as e:
        logger.error(f"Failed to upload file to Google Drive: {e}")
        return None


async def delete_from_drive(drive_file_id: str) -> bool:
    """Elimina un archivo de Google Drive."""
    service = _get_drive_service()
    if not service or not drive_file_id:
        return False

    try:
        service.files().delete(fileId=drive_file_id).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to delete file from Google Drive: {e}")
        return False


async def get_drive_file_info(drive_file_id: str) -> Optional[dict]:
    """Obtiene información de un archivo en Google Drive."""
    service = _get_drive_service()
    if not service or not drive_file_id:
        return None

    try:
        file = service.files().get(
            fileId=drive_file_id,
            fields="id,name,webViewLink,size,mimeType,modifiedTime",
        ).execute()
        return {
            "drive_file_id": file["id"],
            "name": file["name"],
            "drive_url": file.get("webViewLink"),
            "file_size": int(file.get("size", 0)),
            "mime_type": file.get("mimeType"),
            "modified_at": file.get("modifiedTime"),
        }
    except Exception as e:
        logger.error(f"Failed to get file info from Google Drive: {e}")
        return None


async def list_drive_files(folder: str = "content", max_results: int = 50) -> list:
    """Lista archivos en una carpeta de Google Drive."""
    service = await get_drive_service_auto()
    if not service:
        return []

    parent_folder_id = FOLDER_DRIVE_MAP.get(folder)
    if not parent_folder_id:
        parent_folder_id = settings.GOOGLE_DRIVE_FOLDER_ID_MARKETING
    if not parent_folder_id:
        return []

    try:
        query = f"'{parent_folder_id}' in parents and trashed=false"
        results = service.files().list(
            q=query,
            fields="files(id,name,webViewLink,size,mimeType,modifiedTime,iconLink)",
            pageSize=max_results,
            orderBy="modifiedTime desc",
        ).execute()
        return [
            {
                "id": f["id"],
                "name": f["name"],
                "url": f.get("webViewLink", f"https://drive.google.com/file/d/{f['id']}/view"),
                "size": int(f.get("size", 0)),
                "mime_type": f.get("mimeType", ""),
                "modified_at": f.get("modifiedTime", ""),
                "icon": f.get("iconLink", ""),
            }
            for f in results.get("files", [])
        ]
    except Exception as e:
        logger.error(f"Failed to list Drive files: {e}")
        return []


def _get_or_create_subfolder(service, parent_id: str, name: str) -> Optional[str]:
    """Obtiene o crea una subcarpeta en Drive."""
    try:
        # Check if subfolder exists
        query = f"'{parent_id}' in parents and name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(q=query, fields="files(id)").execute()
        files = results.get("files", [])
        if files:
            return files[0]["id"]

        # Create subfolder
        folder_metadata = {
            "name": name,
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [parent_id],
        }
        folder = service.files().create(body=folder_metadata, fields="id").execute()
        return folder["id"]
    except Exception as e:
        logger.error(f"Failed to get/create subfolder '{name}': {e}")
        return None
