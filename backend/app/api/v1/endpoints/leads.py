from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, cast, String

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import require_write_access
from app.models import Lead, LeadStatus
from app.models.models import Contact, ContactRoleType, ContactInfluenceLevel, ContactRelationship
from app.schemas import LeadCreate, LeadUpdate, LeadResponse, LeadDetail, PaginatedResponse
from app.services.notification_service import notification_service

import logging
logger = logging.getLogger(__name__)


def _apply_row_level_filter(query, current_user: dict):
    """Filtra leads según rol: admin ve todo, comercial solo los asignados."""
    role = current_user.get("role", "viewer")
    if role == "admin":
        return query
    # Comerciales y viewers solo ven leads asignados a ellos
    email = current_user.get("email", "")
    return query.where(Lead.assigned_to == email)


async def _sync_lead_contact(db: AsyncSession, lead):
    """Sincroniza el contacto principal del lead con la tabla contacts."""
    if not lead.contact_name:
        return

    # Buscar contacto principal existente para este lead
    result = await db.execute(
        select(Contact).where(
            Contact.lead_id == lead.id,
            Contact.is_primary == True,  # noqa: E712
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Actualizar datos del contacto existente
        existing.full_name = lead.contact_name
        existing.email = lead.contact_email
        existing.phone = lead.contact_phone
        existing.linkedin_url = lead.contact_linkedin
        existing.job_title = lead.contact_title
    else:
        # Crear nuevo contacto principal
        contact = Contact(
            lead_id=lead.id,
            full_name=lead.contact_name,
            email=lead.contact_email,
            phone=lead.contact_phone,
            linkedin_url=lead.contact_linkedin,
            job_title=lead.contact_title,
            is_primary=True,
            role_type=ContactRoleType.OTHER,
            influence_level=ContactInfluenceLevel.UNKNOWN,
            relationship_status=ContactRelationship.UNKNOWN,
        )
        db.add(contact)

    await db.commit()

router = APIRouter()


@router.get("/", response_model=PaginatedResponse)
async def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[LeadStatus] = None,
    search: Optional[str] = Query(None, max_length=100),
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """List leads with filtering, search and pagination."""
    query = select(Lead)
    query = query.where(Lead.org_id == org_id)
    query = _apply_row_level_filter(query, current_user)

    if status:
        query = query.where(Lead.status == status)
    if search:
        query = query.where(
            Lead.company_name.ilike(f"%{search}%") |
            Lead.contact_name.ilike(f"%{search}%") |
            Lead.contact_email.ilike(f"%{search}%")
        )
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Sort
    ALLOWED_SORT_FIELDS = {"created_at", "updated_at", "company_name", "status", "source", "contact_name"}
    sort_col = getattr(Lead, sort_by, None) if sort_by in ALLOWED_SORT_FIELDS else Lead.created_at
    query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())
    
    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    leads = result.scalars().all()
    
    return PaginatedResponse(
        items=[LeadResponse.model_validate(lead) for lead in leads],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.get("/favorites")
async def list_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista los leads marcados como favoritos por el usuario actual."""
    uid = current_user["user_id"]
    result = await db.execute(
        select(Lead).where(
            cast(Lead.metadata_["favorited_by"], String).contains(uid)
        ).order_by(desc(Lead.updated_at)).limit(20)
    )
    leads = result.scalars().all()
    return {
        "items": [
            {
                "id": str(l.id),
                "company": l.company_name,
                "score": l.score,
                "status": l.status.value if l.status else "new",
            }
            for l in leads
        ]
    }


@router.get("/{lead_id}", response_model=LeadDetail)
async def get_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Get lead details."""
    query = select(Lead).where(Lead.id == lead_id)
    query = query.where(Lead.org_id == org_id)
    query = _apply_row_level_filter(query, current_user)
    result = await db.execute(query)
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadDetail.model_validate(lead)


@router.post("/", response_model=LeadResponse, status_code=201)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Create a new lead."""
    lead = Lead(**data.model_dump())
    lead.org_id = org_id
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    # Notificaciones (no bloquean la operación principal)
    user_id = UUID(current_user["user_id"])
    try:
        await notification_service.notify_lead_created(
            db=db,
            user_id=user_id,
            lead_id=lead.id,
            company_name=lead.company_name,
            source=lead.source,
        )

        if lead.score and lead.score >= 80:
            await notification_service.notify_high_score_lead(
                db=db,
                user_id=user_id,
                lead_id=lead.id,
                company_name=lead.company_name,
                score=lead.score,
            )
    except Exception:
        logger.warning("Failed to send lead creation notifications", exc_info=True)

    # Dispatch to workflow engine
    try:
        from app.core.workflow_engine import dispatch_event
        await dispatch_event("lead.created", {
            "lead_id": str(lead.id), "company_name": lead.company_name,
            "title": f"Nuevo lead: {lead.company_name}", "message": f"Fuente: {lead.source}",
        }, db)
    except Exception:
        pass

    # Sincronizar contacto principal con tabla contacts
    await _sync_lead_contact(db, lead)

    # Auto-scoring ICP con AGENT-LEAD-001 (no bloquea respuesta)
    try:
        from app.agents.lead_intelligence import score_lead
        scoring_result = await score_lead(db, lead.id, user_id)
        if scoring_result.get("icp_score"):
            await db.refresh(lead)
            # HITL notification si score 40-70
            if scoring_result.get("hitl_required"):
                from app.models.notification import NotificationType, NotificationPriority
                await notification_service.create_notification(
                    db=db, user_id=user_id,
                    type=NotificationType.LEAD,
                    priority=NotificationPriority.HIGH,
                    title=f"HITL: Lead {lead.company_name} requiere revisión",
                    message=f"Score ICP: {scoring_result['icp_score']}/100 — {scoring_result.get('hitl_reason', '')}",
                )
    except Exception:
        logger.debug("Auto-scoring skipped (no LLM configured)", exc_info=False)

    return LeadResponse.model_validate(lead)


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Update a lead."""
    query = select(Lead).where(Lead.id == lead_id)
    query = query.where(Lead.org_id == org_id)
    query = _apply_row_level_filter(query, current_user)
    result = await db.execute(query)
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Guardar estado anterior para notificar cambios
    old_status = lead.status
    old_score = lead.score

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lead, key, value)

    await db.commit()
    await db.refresh(lead)

    # Notificaciones (no bloquean la operación principal)
    user_id = UUID(current_user["user_id"])
    try:
        if "status" in update_data and old_status != lead.status:
            await notification_service.notify_lead_status_changed(
                db=db,
                user_id=user_id,
                lead_id=lead.id,
                company_name=lead.company_name,
                old_status=old_status,
                new_status=lead.status,
            )

        if "score" in update_data and lead.score >= 80 and (not old_score or old_score < 80):
            await notification_service.notify_high_score_lead(
                db=db,
                user_id=user_id,
                lead_id=lead.id,
                company_name=lead.company_name,
                score=lead.score,
            )
    except Exception:
        logger.warning("Failed to send lead update notifications", exc_info=True)

    # Sincronizar contacto principal si cambió algún campo de contacto
    contact_fields = {"contact_name", "contact_email", "contact_phone", "contact_title", "contact_linkedin"}
    if contact_fields & set(update_data.keys()):
        await _sync_lead_contact(db, lead)

    return LeadResponse.model_validate(lead)


@router.post("/{lead_id}/enrich")
async def enrich_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Enriquece un lead usando Apollo.io (org + persona)."""
    # Verificar acceso al lead
    query = select(Lead).where(Lead.id == lead_id)
    query = query.where(Lead.org_id == org_id)
    query = _apply_row_level_filter(query, current_user)
    result = await db.execute(query)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Lead not found")
    from app.services.apollo_service import enrich_lead as do_enrich
    return await do_enrich(db, lead_id)


@router.post("/{lead_id}/auto-tag")
async def auto_tag_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Auto-clasifica un lead por sector/normativa usando IA."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    context = f"Empresa: {lead.company_name}, Sector: {lead.company_sector or 'desconocido'}, Tamaño: {lead.company_size or 'desconocido'}, País: {lead.company_country or 'España'}"

    try:
        from app.services.ai_chat_service import AIChatService
        from app.core.config import settings
        import json
        service = AIChatService()
        result = await service.chat(
            provider=settings.AI_DEFAULT_PROVIDER,
            messages=[{"role": "user", "content": f"Clasifica esta empresa para growth. Responde SOLO en JSON:\n{context}\n\nFormato: {{\"sector\": \"...\", \"regulatory_frameworks\": [\"ENS\", \"NIS2\", ...], \"company_size_category\": \"pyme|mediana|gran_empresa\", \"risk_level\": \"bajo|medio|alto\", \"tags\": [\"tag1\", \"tag2\"]}}"}],
            system_prompt="Eres un clasificador de empresas para ventas B2B en España. Responde SOLO en JSON.",
        )
        text = result.get("content", "{}")
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        tags = json.loads(text.strip())

        if tags.get("sector") and not lead.company_sector:
            lead.company_sector = tags["sector"]
        if tags.get("regulatory_frameworks"):
            lead.regulatory_frameworks = tags["regulatory_frameworks"]
        if tags.get("company_size_category") and not lead.company_size:
            lead.company_size = tags["company_size_category"]

        await db.commit()
        return {"tags": tags, "lead_id": str(lead_id)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error: {str(e)}")


@router.post("/import-linkedin")
async def import_from_linkedin(
    linkedin_url: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Crea lead desde URL de perfil LinkedIn."""
    import re
    match = re.search(r'linkedin\.com/in/([^/]+)', linkedin_url)
    if not match:
        raise HTTPException(status_code=400, detail="URL LinkedIn no válida")
    name = match.group(1).replace('-', ' ').title()
    lead = Lead(contact_name=name, contact_linkedin=linkedin_url, acquisition_channel="linkedin", score=20,
                notes=f"Importado desde LinkedIn: {linkedin_url}")
    db.add(lead)
    await db.commit()
    return {"created": True, "lead_id": str(lead.id), "name": name}


@router.post("/bulk-action")
async def bulk_action_leads(
    action: str = Query(..., description="score, delete, assign_status"),
    lead_ids: str = Query(..., description="UUIDs separados por coma"),
    value: str = Query("", description="Valor para assign_status"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Ejecuta acción en batch sobre múltiples leads."""
    ids = [UUID(lid.strip()) for lid in lead_ids.split(",") if lid.strip()]
    if not ids:
        raise HTTPException(status_code=400, detail="No lead IDs provided")

    results = {"processed": 0, "errors": 0}

    if action == "score":
        from app.agents.lead_intelligence import score_lead
        for lid in ids:
            try:
                await score_lead(db, lid)
                results["processed"] += 1
            except Exception:
                results["errors"] += 1

    elif action == "delete":
        for lid in ids:
            lead = await db.scalar(select(Lead).where(Lead.id == lid))
            if lead:
                await db.delete(lead)
                results["processed"] += 1
        await db.commit()

    elif action == "assign_status":
        if not value:
            raise HTTPException(status_code=400, detail="Value required for assign_status")
        for lid in ids:
            lead = await db.scalar(select(Lead).where(Lead.id == lid))
            if lead:
                try:
                    from app.models.enums import LeadStatus
                    lead.status = LeadStatus(value)
                    results["processed"] += 1
                except (ValueError, KeyError):
                    results["errors"] += 1
        await db.commit()

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    return {"action": action, **results, "total": len(ids)}


@router.post("/import-csv")
async def import_leads_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Importa leads desde CSV. Soporta formatos St4rtup, HubSpot y Salesforce."""
    import csv
    import io
    content = await file.read()
    text = content.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(text))

    # Smart column mapping for HubSpot / Salesforce / generic CSVs
    COL_MAP = {
        # company
        'company name': 'company_name', 'company': 'company_name', 'empresa': 'company_name',
        'organization': 'company_name', 'account name': 'company_name', 'associated company': 'company_name',
        # contact
        'first name': 'first_name', 'firstname': 'first_name', 'nombre': 'first_name',
        'last name': 'last_name', 'lastname': 'last_name', 'apellido': 'last_name',
        'full name': 'contact_name', 'contact name': 'contact_name', 'name': 'contact_name',
        # email
        'email': 'contact_email', 'email address': 'contact_email', 'correo': 'contact_email',
        'e-mail': 'contact_email',
        # phone
        'phone': 'contact_phone', 'phone number': 'contact_phone', 'telefono': 'contact_phone',
        'mobile phone': 'contact_phone', 'mobilephone': 'contact_phone',
        # title
        'job title': 'contact_title', 'title': 'contact_title', 'cargo': 'contact_title',
        'jobtitle': 'contact_title',
        # company details
        'website': 'company_website', 'web': 'company_website', 'sitio web': 'company_website',
        'industry': 'company_sector', 'sector': 'company_sector', 'industria': 'company_sector',
        'city': 'company_city', 'ciudad': 'company_city',
        'country': 'company_country', 'pais': 'company_country',
        'number of employees': 'company_size', 'employees': 'company_size',
        # meta
        'lead source': 'source', 'source': 'source', 'origen': 'source',
        'lead score': 'score', 'score': 'score', 'hubspot score': 'score',
        'notes': 'notes', 'description': 'notes', 'notas': 'notes',
    }

    def _map_row(raw_row):
        mapped = {}
        for col, val in raw_row.items():
            key = COL_MAP.get(col.strip().lower(), col.strip().lower().replace(' ', '_'))
            mapped[key] = (val or '').strip()
        # Merge first_name + last_name if no contact_name
        if not mapped.get('contact_name') and (mapped.get('first_name') or mapped.get('last_name')):
            mapped['contact_name'] = f"{mapped.get('first_name', '')} {mapped.get('last_name', '')}".strip()
        return mapped

    created, skipped, errors = 0, 0, []
    for i, raw_row in enumerate(reader, 1):
        row = _map_row(raw_row)
        try:
            company = row.get('company_name', '')
            email = row.get('contact_email', '')
            if not company and not email:
                skipped += 1
                continue
            # Check duplicate
            if email:
                existing = await db.scalar(select(Lead).where(Lead.contact_email == email))
                if existing:
                    skipped += 1
                    continue
            lead = Lead(
                company_name=company or None,
                contact_name=row.get('contact_name', '').strip() or None,
                contact_email=email or None,
                contact_title=row.get('contact_title', '').strip() or None,
                company_sector=row.get('sector', '').strip() or row.get('company_sector', '').strip() or None,
                company_country=row.get('country', '').strip() or row.get('company_country', '').strip() or 'ES',
                company_website=row.get('company_website', '') or row.get('website', '') or None,
                company_city=row.get('company_city', '') or None,
                company_size=row.get('company_size', '') or None,
                score=int(row.get('score', 0) or 0),
                notes=row.get('notes', '').strip() or None,
            )
            # Source
            source = row.get('source', '').strip().lower()
            if source:
                try:
                    from app.models.enums import LeadSource
                    lead.source = LeadSource(source)
                except (ValueError, KeyError):
                    pass
            db.add(lead)
            created += 1
        except Exception as e:
            errors.append(f"Fila {i}: {str(e)[:100]}")
            if len(errors) > 10:
                break

    await db.commit()
    return {"created": created, "skipped": skipped, "errors": errors, "total_rows": created + skipped + len(errors)}


@router.post("/deduplicate")
async def deduplicate_leads(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Detecta leads duplicados por email o empresa."""
    from sqlalchemy import func as sqlfunc

    # By email
    email_dupes = (await db.execute(
        select(Lead.contact_email, sqlfunc.count(Lead.id).label('cnt'))
        .where(Lead.contact_email.isnot(None), Lead.contact_email != '')
        .group_by(Lead.contact_email)
        .having(sqlfunc.count(Lead.id) > 1)
    )).all()

    # By company name
    company_dupes = (await db.execute(
        select(Lead.company_name, sqlfunc.count(Lead.id).label('cnt'))
        .where(Lead.company_name.isnot(None), Lead.company_name != '')
        .group_by(Lead.company_name)
        .having(sqlfunc.count(Lead.id) > 1)
    )).all()

    return {
        "email_duplicates": [{"email": r[0], "count": r[1]} for r in email_dupes],
        "company_duplicates": [{"company": r[0], "count": r[1]} for r in company_dupes],
        "total_duplicates": len(email_dupes) + len(company_dupes),
    }


@router.post("/search/prospects")
async def search_prospects(
    title_keywords: Optional[str] = Query(None, description="Cargos separados por coma: CEO,CTO,DPO"),
    industries: Optional[str] = Query(None, description="Sectores separados por coma"),
    employee_ranges: Optional[str] = Query(None, description="Rangos: 51-200,201-1000"),
    countries: Optional[str] = Query(None, description="Países ISO: ES,DE,FR"),
    limit: int = Query(25, ge=1, le=100),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Busca prospectos en Apollo.io por ICP (cargos, sector, tamaño, país)."""
    from app.services.apollo_service import search_prospects as do_search
    return await do_search(
        title_keywords=title_keywords.split(",") if title_keywords else None,
        industries=industries.split(",") if industries else None,
        employee_ranges=employee_ranges.split(",") if employee_ranges else None,
        countries=countries.split(",") if countries else None,
        limit=limit,
    )


@router.get("/{lead_id}/abm-view")
async def lead_abm_view(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Vista ABM completa de una cuenta: lead + contacts + opportunities + activity + scoring."""
    from app.models.crm import Visit, Email, Action
    from app.models.pipeline import Opportunity
    from app.models.enums import OpportunityStage
    from app.models.contact import Contact
    from sqlalchemy import func

    # Lead
    lead_result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Contacts
    contacts = (await db.execute(
        select(Contact).where(Contact.lead_id == lead_id)
    )).scalars().all()

    # Opportunities
    opps = (await db.execute(
        select(Opportunity).where(Opportunity.lead_id == lead_id).order_by(Opportunity.created_at.desc())
    )).scalars().all()

    pipeline_value = sum(o.value or 0 for o in opps)
    won_value = sum(o.value or 0 for o in opps if o.stage == OpportunityStage.CLOSED_WON)

    # Activity counts
    email_count = await db.scalar(select(func.count()).select_from(Email).where(Email.lead_id == lead_id)) or 0
    visit_count = await db.scalar(select(func.count()).select_from(Visit).where(Visit.lead_id == lead_id)) or 0
    action_count = await db.scalar(select(func.count()).select_from(Action).where(Action.lead_id == lead_id)) or 0

    # Scoring
    scoring = (lead.enrichment_data or {}).get("agent_scoring", {})

    return {
        "lead": {
            "id": str(lead.id), "company_name": lead.company_name, "contact_name": lead.contact_name,
            "contact_email": lead.contact_email, "contact_title": lead.contact_title,
            "status": lead.status.value if lead.status else None, "score": lead.score,
            "source": lead.source.value if lead.source else None,
            "company_sector": lead.company_sector, "company_size": lead.company_size,
            "company_country": lead.company_country, "company_website": lead.company_website,
            "acquisition_channel": lead.acquisition_channel,
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
        },
        "scoring": scoring,
        "contacts": [
            {"id": str(c.id), "name": c.name, "email": c.email, "title": c.title, "is_primary": c.is_primary}
            for c in contacts
        ],
        "opportunities": [
            {"id": str(o.id), "name": o.name, "stage": o.stage.value if o.stage else None,
             "value": o.value, "pricing_tier": o.pricing_tier, "competitor": o.competitor,
             "probability": o.probability, "expected_close": str(o.expected_close_date) if o.expected_close_date else None}
            for o in opps
        ],
        "activity": {
            "emails": email_count, "visits": visit_count, "actions": action_count,
            "total": email_count + visit_count + action_count,
        },
        "pipeline": {
            "total_value": pipeline_value, "won_value": won_value,
            "active_deals": len([o for o in opps if o.stage not in [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]]),
        },
    }


@router.get("/{lead_id}/timeline")
async def lead_timeline(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Timeline unificado de actividad de un lead: emails, visitas, acciones, llamadas, oportunidades."""
    from app.models.crm import Visit, Email, Action
    from app.models.pipeline import Opportunity

    events = []

    # Emails
    emails = (await db.execute(
        select(Email).where(Email.lead_id == lead_id).order_by(Email.created_at.desc()).limit(20)
    )).scalars().all()
    for e in emails:
        events.append({"type": "email", "date": e.created_at.isoformat(), "title": e.subject or "Email", "detail": e.status if hasattr(e, 'status') else ""})

    # Visits
    visits = (await db.execute(
        select(Visit).where(Visit.lead_id == lead_id).order_by(Visit.created_at.desc()).limit(20)
    )).scalars().all()
    for v in visits:
        events.append({"type": "visit", "date": v.created_at.isoformat(), "title": v.title or "Visita", "detail": v.result.value if v.result else ""})

    # Actions
    actions = (await db.execute(
        select(Action).where(Action.lead_id == lead_id).order_by(Action.created_at.desc()).limit(20)
    )).scalars().all()
    for a in actions:
        events.append({"type": "action", "date": a.created_at.isoformat(), "title": a.title or "Acción", "detail": a.status.value if a.status else ""})

    # Opportunities
    opps = (await db.execute(
        select(Opportunity).where(Opportunity.lead_id == lead_id).order_by(Opportunity.created_at.desc())
    )).scalars().all()
    for o in opps:
        events.append({"type": "opportunity", "date": o.created_at.isoformat(), "title": o.name, "detail": f"{o.stage.value} · €{o.value or 0:,.0f}"})

    # Sort by date desc
    events.sort(key=lambda x: x["date"], reverse=True)

    return {"lead_id": str(lead_id), "events": events, "total": len(events)}


@router.post("/{lead_id}/verify-email")
async def verify_lead_email(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Verifica el email del lead con Hunter.io."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.contact_email:
        raise HTTPException(status_code=400, detail="Lead no tiene email")

    try:
        from app.services.hunter_service import verify_email
        verification = await verify_email(lead.contact_email, db)
        meta = (lead.metadata_ or {}) if isinstance(lead.metadata_, dict) else {}
        meta["email_verification"] = verification
        lead.metadata_ = meta
        await db.commit()
        return verification
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Hunter.io error: {str(e)}")


@router.post("/verify-email-bulk")
async def verify_emails_bulk(
    batch_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Verifica emails de leads no verificados (max batch_size por llamada)."""
    from app.services.hunter_service import verify_email

    result = await db.execute(
        select(Lead).where(Lead.contact_email.isnot(None)).where(Lead.contact_email != "").limit(batch_size * 3)
    )
    leads = result.scalars().all()
    results = []
    for lead in leads:
        if len(results) >= batch_size:
            break
        meta = (lead.metadata_ or {}) if isinstance(lead.metadata_, dict) else {}
        if meta.get("email_verification"):
            continue  # Already verified
        try:
            verification = await verify_email(lead.contact_email, db)
            meta["email_verification"] = verification
            lead.metadata_ = meta
            results.append({"lead_id": str(lead.id), "email": lead.contact_email, **verification})
        except Exception as e:
            results.append({"lead_id": str(lead.id), "email": lead.contact_email, "error": str(e)})
            break  # Stop on API errors (likely rate limit)

    await db.commit()
    return {"verified": len(results), "results": results}


@router.post("/hunter-domain-search")
async def hunter_domain_search(
    domain: str = Query(..., description="Dominio a buscar"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Busca emails de un dominio con Hunter.io Domain Search."""
    try:
        from app.services.hunter_service import find_emails
        return await find_emails(domain, db)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Hunter.io error: {str(e)}")


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    """Delete a lead."""
    query = select(Lead).where(Lead.id == lead_id)
    query = query.where(Lead.org_id == org_id)
    query = _apply_row_level_filter(query, current_user)
    result = await db.execute(query)
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.commit()


@router.post("/{lead_id}/favorite")
async def toggle_favorite(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Toggle favorito de un lead para el usuario actual."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    meta = dict(lead.metadata_ or {}) if isinstance(lead.metadata_, dict) else {}
    favorites = meta.get("favorited_by", [])
    uid = current_user["user_id"]
    if uid in favorites:
        favorites.remove(uid)
    else:
        favorites.append(uid)
    meta["favorited_by"] = favorites
    lead.metadata_ = meta
    await db.commit()
    return {"favorited": uid in favorites}


@router.get("/{lead_id}/journey")
async def lead_journey(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Timeline del recorrido completo de un lead."""
    from app.models.crm import Email, Visit, Action
    from app.models.call import CallRecord
    from app.models.pipeline import Opportunity

    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    events = []

    # Lead creation
    events.append({
        "type": "lead_created",
        "date": lead.created_at.isoformat(),
        "title": "Lead creado",
        "detail": f"Score: {lead.score or 0}",
        "color": "cyan",
    })

    # Emails
    emails = await db.execute(
        select(Email).where(Email.lead_id == lead_id).order_by(Email.created_at)
    )
    for e in emails.scalars().all():
        events.append({
            "type": "email",
            "date": (e.sent_at or e.created_at).isoformat(),
            "title": f"Email: {e.subject or 'Sin asunto'}",
            "detail": e.status or "",
            "color": "purple",
        })

    # Visits
    visits = await db.execute(
        select(Visit).where(Visit.lead_id == lead_id).order_by(Visit.visit_date)
    )
    for v in visits.scalars().all():
        events.append({
            "type": "visit",
            "date": (v.visit_date or v.created_at).isoformat() if v.visit_date else v.created_at.isoformat(),
            "title": "Visita",
            "detail": v.summary[:100] if v.summary else "",
            "color": "success",
        })

    # Actions
    actions = await db.execute(
        select(Action).where(Action.lead_id == lead_id).order_by(Action.created_at)
    )
    for a in actions.scalars().all():
        events.append({
            "type": "action",
            "date": a.created_at.isoformat(),
            "title": f"Acción: {a.title}",
            "detail": a.status.value if a.status else "",
            "color": "warning",
        })

    # Calls
    calls = await db.execute(
        select(CallRecord).where(CallRecord.lead_id == lead_id).order_by(CallRecord.fecha_inicio)
    )
    for c in calls.scalars().all():
        events.append({
            "type": "call",
            "date": c.fecha_inicio.isoformat() if c.fecha_inicio else c.created_at.isoformat(),
            "title": "Llamada IA",
            "detail": f"{c.resultado or c.estado}",
            "color": "destructive",
        })

    # Opportunities
    opps = await db.execute(
        select(Opportunity).where(Opportunity.lead_id == lead_id).order_by(Opportunity.created_at)
    )
    for o in opps.scalars().all():
        events.append({
            "type": "opportunity",
            "date": o.created_at.isoformat(),
            "title": f"Oportunidad: {o.name}",
            "detail": f"{o.stage.value if o.stage else ''} — {o.value or 0:,.0f} EUR",
            "color": "cyan",
        })

    # Sort by date
    events.sort(key=lambda x: x["date"])

    return {"lead_id": str(lead_id), "company": lead.company_name, "events": events, "total": len(events)}
