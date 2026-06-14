"""Support endpoints — tawk.to webhook + ticket tracking."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.services import tawkto_service

router = APIRouter()


@router.post("/tawkto/webhook")
async def tawkto_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Webhook receptor de tawk.to (sin auth — público)."""
    return await tawkto_service.handle_webhook(db, payload)


@router.get("/tawkto/script")
async def tawkto_script(
    _current_user: dict = Depends(get_current_user),
):
    """Obtiene el script de tawk.to para embed."""
    from app.core.config import settings
    property_id = getattr(settings, "TAWKTO_PROPERTY_ID", "") or ""
    if not property_id:
        return {"configured": False, "script": ""}
    return {"configured": True, "script": tawkto_service.get_widget_script(property_id)}


@router.post("/tickets")
async def create_ticket(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create support ticket via LaunchPad API."""
    import httpx
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "http://localhost:8002/api/v1/tickets",
            json={
                "project": "st4rtup",
                "email": current_user.get("email", ""),
                "name": current_user.get("name", ""),
                "subject": payload.get("subject", ""),
                "message": payload.get("message", ""),
                "category": payload.get("category", "general"),
            },
        )
        return resp.json()


@router.get("/tickets")
async def list_tickets(
    current_user: dict = Depends(get_current_user),
):
    """List user's tickets from LaunchPad."""
    import httpx
    email = current_user.get("email", "")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"http://localhost:8002/api/v1/tickets?email={email}&project=st4rtup"
        )
        return resp.json()
