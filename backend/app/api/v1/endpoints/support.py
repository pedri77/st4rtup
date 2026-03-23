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
