from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import MonthlyReview, Lead
from app.schemas import MonthlyReviewCreate, MonthlyReviewResponse, PaginatedResponse

router = APIRouter()


@router.get("/", response_model=PaginatedResponse)
async def list_reviews(
    lead_id: Optional[UUID] = None,
    year: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Listar todos los reviews mensuales con filtros opcionales."""
    query = select(MonthlyReview, Lead.company_name).join(
        Lead, MonthlyReview.lead_id == Lead.id, isouter=True
    ).order_by(
        MonthlyReview.review_year.desc(), MonthlyReview.review_month.desc()
    )
    if lead_id:
        query = query.where(MonthlyReview.lead_id == lead_id)
    if year:
        query = query.where(MonthlyReview.review_year == year)

    # Count
    count_query = select(func.count()).select_from(
        select(MonthlyReview.id).where(
            *([MonthlyReview.lead_id == lead_id] if lead_id else []),
            *([MonthlyReview.review_year == year] if year else []),
        ).subquery()
    )
    total = (await db.execute(count_query)).scalar()

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    items = []
    for review, company_name in result:
        data = MonthlyReviewResponse.model_validate(review)
        data.lead_name = company_name
        items.append(data)

    return PaginatedResponse(
        items=items, total=total, page=page,
        page_size=page_size, pages=(total + page_size - 1) // page_size,
    )


@router.post("/", response_model=MonthlyReviewResponse, status_code=201)
async def create_review(
    data: MonthlyReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Crear un nuevo review mensual."""
    # Verify lead exists
    lead_result = await db.execute(select(Lead).where(Lead.id == data.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    review = MonthlyReview(**data.model_dump())
    db.add(review)
    await db.commit()
    await db.refresh(review)

    response = MonthlyReviewResponse.model_validate(review)
    response.lead_name = lead.company_name
    return response


@router.get("/{review_id}", response_model=MonthlyReviewResponse)
async def get_review(
    review_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtener detalle de un review mensual."""
    result = await db.execute(select(MonthlyReview).where(MonthlyReview.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    response = MonthlyReviewResponse.model_validate(review)
    lead_result = await db.execute(select(Lead.company_name).where(Lead.id == review.lead_id))
    response.lead_name = lead_result.scalar_one_or_none()
    return response
