"""
Endpoints CRUD para gestión de contactos/stakeholders.
Permite gestionar el mapa de poder (power map) de cada lead/empresa.
"""
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import apply_lead_row_filter
from app.models.models import (
    Contact, Lead, User,
    ContactRoleType, ContactInfluenceLevel, ContactRelationship,
)
from app.schemas.schemas import (
    ContactCreate, ContactUpdate, ContactResponse, PaginatedResponse,
)

router = APIRouter()


def _contact_response(contact: Contact) -> ContactResponse:
    """Construir ContactResponse incluyendo lead_name si la relación está cargada."""
    data = ContactResponse.model_validate(contact)
    if contact.lead:
        data.lead_name = contact.lead.company_name
    return data


@router.get("", response_model=PaginatedResponse)
async def list_contacts(
    lead_id: Optional[UUID] = None,
    role_type: Optional[ContactRoleType] = None,
    influence_level: Optional[ContactInfluenceLevel] = None,
    relationship_status: Optional[ContactRelationship] = None,
    is_primary: Optional[bool] = None,
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Listar contactos con filtros opcionales."""
    query = select(Contact).options(selectinload(Contact.lead))
    query = query.where(Contact.org_id == org_id)
    query = apply_lead_row_filter(query, current_user, Contact.lead_id)
    count_query = select(func.count(Contact.id))
    count_query = apply_lead_row_filter(count_query, current_user, Contact.lead_id)

    if lead_id:
        query = query.where(Contact.lead_id == lead_id)
        count_query = count_query.where(Contact.lead_id == lead_id)
    if role_type:
        query = query.where(Contact.role_type == role_type)
        count_query = count_query.where(Contact.role_type == role_type)
    if influence_level:
        query = query.where(Contact.influence_level == influence_level)
        count_query = count_query.where(Contact.influence_level == influence_level)
    if relationship_status:
        query = query.where(Contact.relationship_status == relationship_status)
        count_query = count_query.where(Contact.relationship_status == relationship_status)
    if is_primary is not None:
        query = query.where(Contact.is_primary == is_primary)
        count_query = count_query.where(Contact.is_primary == is_primary)
    if search:
        search_filter = f"%{search}%"
        search_cond = Contact.full_name.ilike(search_filter) | Contact.email.ilike(search_filter) | Contact.job_title.ilike(search_filter)
        query = query.where(search_cond)
        count_query = count_query.where(search_cond)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Contact.is_primary.desc(), Contact.full_name)
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    contacts = result.scalars().all()

    return PaginatedResponse(
        items=[_contact_response(c) for c in contacts],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.get("/by-lead/{lead_id}", response_model=list[ContactResponse])
async def get_contacts_by_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Obtener todos los contactos de un lead (sin paginación, para power map)."""
    lead_result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.org_id == org_id))
    if not lead_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    result = await db.execute(
        select(Contact)
        .options(selectinload(Contact.lead))
        .where(Contact.lead_id == lead_id, Contact.org_id == org_id)
        .order_by(Contact.is_primary.desc(), Contact.influence_level, Contact.full_name)
    )
    contacts = result.scalars().all()
    return [_contact_response(c) for c in contacts]


@router.get("/stats")
async def get_contacts_stats(
    lead_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Estadísticas de contactos (global o por lead)."""
    base = select(func.count(Contact.id)).where(Contact.org_id == org_id)
    if lead_id:
        base = base.where(Contact.lead_id == lead_id)

    total_result = await db.execute(base)
    total = total_result.scalar()

    # By role_type
    role_query = select(Contact.role_type, func.count(Contact.id)).where(Contact.org_id == org_id).group_by(Contact.role_type)
    if lead_id:
        role_query = role_query.where(Contact.lead_id == lead_id)
    role_result = await db.execute(role_query)
    by_role = {str(r[0].value) if r[0] else "unknown": r[1] for r in role_result.all()}

    # By influence_level
    inf_query = select(Contact.influence_level, func.count(Contact.id)).where(Contact.org_id == org_id).group_by(Contact.influence_level)
    if lead_id:
        inf_query = inf_query.where(Contact.lead_id == lead_id)
    inf_result = await db.execute(inf_query)
    by_influence = {str(r[0].value) if r[0] else "unknown": r[1] for r in inf_result.all()}

    # By relationship
    rel_query = select(Contact.relationship_status, func.count(Contact.id)).where(Contact.org_id == org_id).group_by(Contact.relationship_status)
    if lead_id:
        rel_query = rel_query.where(Contact.lead_id == lead_id)
    rel_result = await db.execute(rel_query)
    by_relationship = {str(r[0].value) if r[0] else "unknown": r[1] for r in rel_result.all()}

    return {
        "total": total,
        "by_role": by_role,
        "by_influence": by_influence,
        "by_relationship": by_relationship,
    }


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Obtener un contacto por ID."""
    result = await db.execute(
        select(Contact).options(selectinload(Contact.lead)).where(Contact.id == contact_id, Contact.org_id == org_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    return _contact_response(contact)


@router.post("", response_model=ContactResponse, status_code=201)
async def create_contact(
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Crear un nuevo contacto/stakeholder."""
    # Verificar que el lead existe
    lead_result = await db.execute(select(Lead).where(Lead.id == data.lead_id))
    if not lead_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    # Si es primary, quitar primary de otros contactos del mismo lead
    if data.is_primary:
        from sqlalchemy import update
        await db.execute(
            update(Contact)
            .where(and_(Contact.lead_id == data.lead_id, Contact.is_primary == True))  # noqa: E712
            .values(is_primary=False)
        )

    contact = Contact(**data.model_dump())
    contact.org_id = org_id
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    # Re-fetch with lead to populate lead_name
    result = await db.execute(
        select(Contact).options(selectinload(Contact.lead)).where(Contact.id == contact.id)
    )
    contact = result.scalar_one()
    return _contact_response(contact)


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: UUID,
    data: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Actualizar un contacto existente."""
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.org_id == org_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    # Si se marca como primary, quitar primary de otros
    if update_data.get("is_primary"):
        from sqlalchemy import update
        await db.execute(
            update(Contact)
            .where(and_(
                Contact.lead_id == contact.lead_id,
                Contact.is_primary == True,  # noqa: E712
                Contact.id != contact_id,
            ))
            .values(is_primary=False)
        )

    for field, value in update_data.items():
        setattr(contact, field, value)

    await db.commit()
    await db.refresh(contact)
    result = await db.execute(
        select(Contact).options(selectinload(Contact.lead)).where(Contact.id == contact_id)
    )
    contact = result.scalar_one()
    return _contact_response(contact)


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Eliminar un contacto."""
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.org_id == org_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    await db.delete(contact)
    await db.commit()
