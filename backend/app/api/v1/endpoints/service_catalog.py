"""Service Catalog CRUD endpoints."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user

require_write_access = get_current_user  # alias until roles are implemented
from app.models.service_catalog import ServiceCatalogItem

router = APIRouter()


@router.get("")
async def list_services(
    active: bool = Query(None),
    category: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = select(ServiceCatalogItem).order_by(ServiceCatalogItem.sort_order)
    if active is not None:
        query = query.where(ServiceCatalogItem.is_active == active)
    if category:
        query = query.where(ServiceCatalogItem.category == category)
    result = await db.execute(query)
    items = result.scalars().all()
    return {
        "items": [{
            "id": str(i.id), "name": i.name, "description": i.description,
            "price": i.price, "currency": i.currency, "billing_type": i.billing_type,
            "category": i.category, "is_active": i.is_active, "sort_order": i.sort_order,
        } for i in items],
        "total": len(items),
    }


@router.post("")
async def create_service(
    name: str = Query(...), description: str = Query(""),
    price: float = Query(0), currency: str = Query("EUR"),
    billing_type: str = Query("one_time"), category: str = Query(""),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    item = ServiceCatalogItem(
        name=name, description=description, price=price,
        currency=currency, billing_type=billing_type, category=category,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": str(item.id), "name": item.name}


@router.put("/{item_id}")
async def update_service(
    item_id: UUID,
    name: str = Query(None), description: str = Query(None),
    price: float = Query(None), billing_type: str = Query(None),
    category: str = Query(None), is_active: bool = Query(None),
    sort_order: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    item = await db.get(ServiceCatalogItem, item_id)
    if not item:
        raise HTTPException(404, "Servicio no encontrado")
    if name is not None: item.name = name
    if description is not None: item.description = description
    if price is not None: item.price = price
    if billing_type is not None: item.billing_type = billing_type
    if category is not None: item.category = category
    if is_active is not None: item.is_active = is_active
    if sort_order is not None: item.sort_order = sort_order
    await db.commit()
    return {"id": str(item.id), "updated": True}


@router.delete("/{item_id}")
async def delete_service(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    item = await db.get(ServiceCatalogItem, item_id)
    if not item:
        raise HTTPException(404, "Servicio no encontrado")
    await db.delete(item)
    await db.commit()
    return {"deleted": True}


@router.post("/seed")
async def seed_catalog(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    seeds = [
        {"name": "Consultoría", "description": "Sesión de consultoría estratégica", "price": 150, "billing_type": "one_time", "category": "Servicios"},
        {"name": "Licencia SaaS", "description": "Licencia mensual de la plataforma", "price": 49, "billing_type": "monthly", "category": "Software"},
        {"name": "Implementación", "description": "Setup y configuración inicial", "price": 500, "billing_type": "one_time", "category": "Servicios"},
        {"name": "Soporte Premium", "description": "Soporte prioritario con SLA 4h", "price": 99, "billing_type": "monthly", "category": "Soporte"},
        {"name": "Formación", "description": "Programa de formación para el equipo", "price": 300, "billing_type": "one_time", "category": "Formación"},
    ]
    created = 0
    for s in seeds:
        existing = await db.execute(select(ServiceCatalogItem).where(ServiceCatalogItem.name == s["name"]))
        if not existing.scalar_one_or_none():
            db.add(ServiceCatalogItem(**s))
            created += 1
    await db.commit()
    return {"seeded": created}
