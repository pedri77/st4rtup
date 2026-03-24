"""Internal analytics — usage tracking endpoints."""
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.core.usage_tracker import get_usage_summary

router = APIRouter()


@router.get("/usage")
async def usage_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
):
    return await get_usage_summary(days=days)


@router.get("/usage/me")
async def my_usage(
    days: int = Query(30, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
):
    return await get_usage_summary(user_id=current_user["user_id"], days=days)
