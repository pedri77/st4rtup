"""Endpoints de integración YouTube — canal, vídeos, analytics."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.services import youtube_service

router = APIRouter()


@router.get("/status")
async def youtube_status(current_user: dict = Depends(get_current_user)):
    """Estado de configuración YouTube."""
    return {
        "configured": youtube_service.is_configured(),
        "channel_id": youtube_service.CHANNEL_ID,
    }


@router.get("/channel")
async def channel_info(current_user: dict = Depends(get_current_user)):
    """Información del canal: nombre, suscriptores, vídeos, views."""
    if not youtube_service.is_configured():
        return {"configured": False, "name": "", "subscribers": 0, "videos": 0, "views": 0}
    result = await youtube_service.get_channel_info()
    if result.get("error"):
        return {"configured": False, "error": result["error"], "name": "", "subscribers": 0, "videos": 0, "views": 0}
    return result


@router.get("/videos")
async def list_videos(
    max_results: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    """Lista vídeos recientes del canal."""
    result = await youtube_service.list_videos(max_results)
    if result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])
    return result


@router.get("/videos/{video_id}")
async def video_detail(video_id: str, current_user: dict = Depends(get_current_user)):
    """Analytics de un vídeo específico."""
    result = await youtube_service.get_video_analytics(video_id)
    if result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])
    return result


@router.get("/analytics")
async def channel_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
):
    """Analytics del canal (últimos N días)."""
    result = await youtube_service.get_channel_analytics(days)
    if result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])
    return result


@router.get("/search")
async def search_videos(
    q: str = Query(..., max_length=200),
    max_results: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    """Busca vídeos en el canal."""
    result = await youtube_service.search_videos(q, max_results)
    if result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])
    return result
