"""Endpoints de encuestas de satisfacción (NPS, CSAT, etc.)."""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
import json
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.rate_limit import limiter, RATE_WEBHOOK
from app.core.webhook_verify import verify_webhook_signature
from app.models import Survey, Lead
from app.schemas import SurveyCreate, SurveyUpdate, SurveyResponse, PaginatedResponse

router = APIRouter()


def _generate_token() -> str:
    """Genera un token seguro para acceso público a la encuesta."""
    return secrets.token_hex(32)


@router.get("/", response_model=PaginatedResponse)
async def list_surveys(
    lead_id: Optional[UUID] = None,
    status: Optional[str] = None,
    survey_type: Optional[str] = None,
    external_provider: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Listar encuestas con filtros opcionales."""
    query = select(Survey).order_by(Survey.created_at.desc())
    query = query.where(Survey.org_id == org_id)
    if lead_id:
        query = query.where(Survey.lead_id == lead_id)
    if status:
        query = query.where(Survey.status == status)
    if survey_type:
        query = query.where(Survey.survey_type == survey_type)
    if external_provider:
        query = query.where(Survey.external_provider == external_provider)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[SurveyResponse.model_validate(s) for s in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=(total + page_size - 1) // page_size,
    )


@router.post("/", response_model=SurveyResponse, status_code=201)
async def create_survey(
    data: SurveyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Crear nueva encuesta."""
    # Verificar que el lead existe
    lead_result = await db.execute(select(Lead).where(Lead.id == data.lead_id))
    if not lead_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    survey = Survey(**data.model_dump())
    survey.response_token = _generate_token()
    survey.org_id = org_id
        db.add(survey)
    await db.commit()
    await db.refresh(survey)
    return SurveyResponse.model_validate(survey)


@router.get("/stats")
async def survey_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estadísticas agregadas de encuestas."""
    result = await db.execute(select(Survey))
    surveys = result.scalars().all()

    total = len(surveys)
    completed = [s for s in surveys if s.status.value == 'completed']
    nps_surveys = [s for s in completed if s.survey_type == 'nps' and s.nps_score is not None]
    csat_surveys = [s for s in completed if s.survey_type == 'csat' and s.overall_score is not None]

    # NPS calculation
    promoters = len([s for s in nps_surveys if s.nps_score >= 9])
    passives = len([s for s in nps_surveys if 7 <= s.nps_score < 9])
    detractors = len([s for s in nps_surveys if s.nps_score < 7])
    nps_score = round(((promoters - detractors) / len(nps_surveys)) * 100) if nps_surveys else 0

    # CSAT average
    csat_avg = round(sum(s.overall_score for s in csat_surveys) / len(csat_surveys), 1) if csat_surveys else 0

    return {
        "total": total,
        "completed": len(completed),
        "pending": len([s for s in surveys if s.status.value in ('draft', 'sent')]),
        "expired": len([s for s in surveys if s.status.value == 'expired']),
        "response_rate": round((len(completed) / total) * 100, 1) if total else 0,
        "nps_score": nps_score,
        "nps_promoters": promoters,
        "nps_passives": passives,
        "nps_detractors": detractors,
        "csat_average": csat_avg,
    }


# ─── Analytics ──────────────────────────────────────────────────────

@router.get("/analytics")
async def survey_analytics(
    months: int = 6,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Tendencias NPS/CSAT por mes y distribución de respuestas."""
    result = await db.execute(
        select(Survey).where(Survey.status == 'COMPLETED').order_by(Survey.completed_at.asc())
    )
    surveys = result.scalars().all()

    # Monthly NPS/CSAT trends
    monthly_data = {}
    for s in surveys:
        if not s.completed_at:
            continue
        month_key = s.completed_at.strftime('%Y-%m')
        if month_key not in monthly_data:
            monthly_data[month_key] = {'nps_scores': [], 'csat_scores': [], 'total': 0}
        monthly_data[month_key]['total'] += 1
        if s.survey_type == 'nps' and s.nps_score is not None:
            monthly_data[month_key]['nps_scores'].append(s.nps_score)
        if s.survey_type == 'csat' and s.overall_score is not None:
            monthly_data[month_key]['csat_scores'].append(s.overall_score)

    trends = []
    for month, data in sorted(monthly_data.items())[-months:]:
        nps_scores = data['nps_scores']
        promoters = len([s for s in nps_scores if s >= 9])
        detractors = len([s for s in nps_scores if s < 7])
        nps = round(((promoters - detractors) / len(nps_scores)) * 100) if nps_scores else None
        csat = round(sum(data['csat_scores']) / len(data['csat_scores']), 1) if data['csat_scores'] else None
        trends.append({
            'month': month,
            'nps': nps,
            'csat': csat,
            'responses': data['total'],
        })

    # NPS distribution (all time)
    nps_all = [s for s in surveys if s.survey_type == 'nps' and s.nps_score is not None]
    nps_distribution = {
        'promoters': len([s for s in nps_all if s.nps_score >= 9]),
        'passives': len([s for s in nps_all if 7 <= s.nps_score < 9]),
        'detractors': len([s for s in nps_all if s.nps_score < 7]),
    }

    # CSAT distribution (1-5)
    csat_all = [s for s in surveys if s.survey_type == 'csat' and s.overall_score is not None]
    csat_distribution = {str(i): 0 for i in range(1, 6)}
    for s in csat_all:
        bucket = str(min(5, max(1, round(s.overall_score))))
        csat_distribution[bucket] += 1

    # Recent feedback
    recent_feedback = []
    for s in reversed(surveys[-10:]):
        if s.notes or (s.improvements_suggested and len(s.improvements_suggested) > 0):
            lead_result = await db.execute(select(Lead.company_name).where(Lead.id == s.lead_id))
            lead_name = lead_result.scalar() or 'Unknown'
            recent_feedback.append({
                'survey_id': str(s.id),
                'lead': lead_name,
                'type': s.survey_type,
                'score': s.nps_score if s.survey_type == 'nps' else s.overall_score,
                'notes': s.notes,
                'improvements': s.improvements_suggested,
                'date': s.completed_at.isoformat() if s.completed_at else None,
            })

    return {
        'trends': trends,
        'nps_distribution': nps_distribution,
        'csat_distribution': csat_distribution,
        'recent_feedback': recent_feedback[:5],
        'total_completed': len(surveys),
    }


@router.get("/{survey_id}", response_model=SurveyResponse)
async def get_survey(
    survey_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtener detalle de una encuesta."""
    result = await db.execute(select(Survey).where(Survey.id == survey_id))
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    return SurveyResponse.model_validate(survey)


@router.put("/{survey_id}", response_model=SurveyResponse)
async def update_survey(
    survey_id: UUID,
    data: SurveyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Actualizar encuesta."""
    result = await db.execute(select(Survey).where(Survey.id == survey_id))
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(survey, key, value)

    # Auto-calculate scores if responses are provided
    if data.responses is not None:
        _calculate_scores(survey, data.responses)

    await db.commit()
    await db.refresh(survey)
    return SurveyResponse.model_validate(survey)


@router.delete("/{survey_id}", status_code=204)
async def delete_survey(
    survey_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Eliminar encuesta."""
    result = await db.execute(select(Survey).where(Survey.id == survey_id))
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    await db.delete(survey)
    await db.commit()


@router.post("/{survey_id}/send", response_model=SurveyResponse)
async def send_survey(
    survey_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Enviar encuesta por email al contacto del lead."""
    result = await db.execute(
        select(Survey).where(Survey.id == survey_id)
    )
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")

    if survey.status.value == 'completed':
        raise HTTPException(status_code=400, detail="La encuesta ya fue completada")

    # Get lead info for email
    lead_result = await db.execute(select(Lead).where(Lead.id == survey.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    to_email = data.get('to_email') or lead.email
    if not to_email:
        raise HTTPException(status_code=400, detail="No hay email de destino")

    # Generate token if missing
    if not survey.response_token:
        survey.response_token = _generate_token()

    # Build survey URL: prefer external, then public internal link
    if survey.external_survey_url:
        survey_url = survey.external_survey_url
    else:
        base_url = data.get('base_url', 'https://app.st4rtup.app')
        survey_url = f"{base_url}/survey/{survey.response_token}"

    # Send via email service
    from app.services.email_service import email_service

    type_label = {'nps': 'NPS', 'csat': 'Satisfacción', 'onboarding': 'Onboarding', 'quarterly': 'Seguimiento'}.get(survey.survey_type, 'Satisfacción')

    send_result = await email_service.send_email(
        to=to_email,
        subject=f"Encuesta de {type_label}: {survey.title}",
        html_body=f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #111827; color: #f3f4f6; padding: 32px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #06b6d4; font-size: 24px; margin: 0;">St4rtup</h1>
                <p style="color: #9ca3af; font-size: 14px; margin-top: 4px;">Encuesta de {type_label}</p>
            </div>
            <h2 style="color: #f3f4f6; font-size: 20px; margin-bottom: 16px;">{survey.title}</h2>
            <p style="color: #d1d5db; font-size: 15px; line-height: 1.6;">
                Hola,<br><br>
                Tu opinión es muy importante para nosotros. Nos gustaría que dedicaras unos minutos a completar esta breve encuesta.
                {'Solo necesitas seleccionar un número del 0 al 10.' if survey.survey_type == 'nps' else ''}
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{survey_url}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Completar Encuesta
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #374151; margin: 24px 0;">
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
                Enviado por St4rtup CRM · <a href="https://app.st4rtup.app" style="color: #06b6d4;">app.st4rtup.app</a>
            </p>
        </div>
        """,
        text_body=f"Encuesta: {survey.title}. Accede aquí: {survey_url}",
    )

    if not send_result.get('success'):
        raise HTTPException(status_code=500, detail=f"Error enviando email: {send_result.get('error')}")

    survey.status = 'SENT'
    survey.sent_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(survey)
    return SurveyResponse.model_validate(survey)


@router.post("/{survey_id}/respond", response_model=SurveyResponse)
async def submit_response(
    survey_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Registrar respuesta manual a una encuesta."""
    result = await db.execute(select(Survey).where(Survey.id == survey_id))
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")

    responses = data.get('responses', [])
    survey.responses = responses
    survey.status = 'COMPLETED'
    survey.completed_at = datetime.now(timezone.utc)

    if 'nps_score' in data:
        survey.nps_score = data['nps_score']
    if 'overall_score' in data:
        survey.overall_score = data['overall_score']
    if 'improvements_suggested' in data:
        survey.improvements_suggested = data['improvements_suggested']

    # Auto-calculate if not explicitly provided
    _calculate_scores(survey, responses)

    await db.commit()
    await db.refresh(survey)
    return SurveyResponse.model_validate(survey)


# ─── Public endpoints (sin auth) ───────────────────────────────────

@router.get("/public/{token}")
async def get_public_survey(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Obtener encuesta pública por token (sin autenticación)."""
    result = await db.execute(
        select(Survey).where(Survey.response_token == token)
    )
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")

    if survey.status.value == 'completed':
        return {'status': 'already_completed', 'title': survey.title, 'survey_type': survey.survey_type}

    if survey.status.value == 'expired' or (survey.expires_at and survey.expires_at < datetime.now(timezone.utc)):
        return {'status': 'expired', 'title': survey.title}

    # Get lead name
    lead_result = await db.execute(select(Lead.company_name).where(Lead.id == survey.lead_id))
    lead_name = lead_result.scalar() or ''

    return {
        'status': 'active',
        'id': str(survey.id),
        'title': survey.title,
        'survey_type': survey.survey_type,
        'lead_name': lead_name,
    }


@router.post("/public/{token}/respond")
@limiter.limit(RATE_WEBHOOK)
async def submit_public_response(
    request: Request,
    token: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Registrar respuesta pública (sin autenticación)."""
    result = await db.execute(
        select(Survey).where(Survey.response_token == token)
    )
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")

    if survey.status.value == 'completed':
        raise HTTPException(status_code=400, detail="Esta encuesta ya fue completada")

    if survey.expires_at and survey.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Esta encuesta ha expirado")

    responses = data.get('responses', [])
    survey.responses = responses
    survey.status = 'COMPLETED'
    survey.completed_at = datetime.now(timezone.utc)

    if 'nps_score' in data:
        survey.nps_score = data['nps_score']
    if 'overall_score' in data:
        survey.overall_score = data['overall_score']
    if 'improvements_suggested' in data:
        survey.improvements_suggested = data['improvements_suggested']
    if 'notes' in data:
        survey.notes = data['notes']

    _calculate_scores(survey, responses)

    await db.commit()
    return {'status': 'ok', 'message': 'Gracias por tu respuesta'}


# ─── Webhook para proveedores externos ──────────────────────────────

@router.post("/webhook/{provider}")
@limiter.limit(RATE_WEBHOOK)
async def survey_webhook(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook para recibir respuestas de proveedores externos (Typeform, Google Forms, etc.)."""
    # Verify webhook signature before processing
    raw_body = await verify_webhook_signature(request, provider)
    body = json.loads(raw_body)

    handler = WEBHOOK_HANDLERS.get(provider)
    if not handler:
        raise HTTPException(status_code=400, detail=f"Proveedor no soportado: {provider}")

    survey_data = handler(body)
    if not survey_data:
        return {"status": "ignored", "message": "Evento no procesable"}

    external_id = survey_data.get('external_survey_id')
    if not external_id:
        return {"status": "error", "message": "No se pudo extraer el ID de la encuesta"}

    # Find matching survey by external_survey_id
    result = await db.execute(
        select(Survey).where(
            Survey.external_provider == provider,
            Survey.external_survey_id == external_id,
        )
    )
    survey = result.scalar_one_or_none()

    if not survey:
        return {"status": "not_found", "message": f"No hay encuesta vinculada con {provider} ID: {external_id}"}

    # Update survey with response data
    survey.status = 'COMPLETED'
    survey.completed_at = datetime.now(timezone.utc)
    survey.external_response_data = body
    if survey_data.get('responses'):
        survey.responses = survey_data['responses']
    if survey_data.get('nps_score') is not None:
        survey.nps_score = survey_data['nps_score']
    if survey_data.get('overall_score') is not None:
        survey.overall_score = survey_data['overall_score']

    _calculate_scores(survey, survey.responses or [])

    await db.commit()
    return {"status": "ok", "survey_id": str(survey.id)}


# ─── Helpers ────────────────────────────────────────────────────────

def _calculate_scores(survey: Survey, responses: list) -> None:
    """Calcular NPS/CSAT scores automáticamente desde las respuestas."""
    if not responses:
        return

    scores = [r.get('score') for r in responses if r.get('score') is not None]
    if not scores:
        return

    if survey.survey_type == 'nps':
        # NPS: use the main score (typically 0-10)
        if survey.nps_score is None and len(scores) == 1:
            survey.nps_score = scores[0]
    elif survey.survey_type == 'csat':
        # CSAT: average of all scores
        if survey.overall_score is None:
            survey.overall_score = round(sum(scores) / len(scores), 2)
    else:
        # Generic: just average
        if survey.overall_score is None:
            survey.overall_score = round(sum(scores) / len(scores), 2)


# ─── Webhook Parsers por proveedor ──────────────────────────────────

def _parse_typeform(body: dict) -> Optional[dict]:
    """Parser de webhook de Typeform."""
    event_type = body.get('event_type')
    if event_type != 'form_response':
        return None

    form_response = body.get('form_response', {})
    form_id = form_response.get('form_id', '')
    answers = form_response.get('answers', [])

    responses = []
    nps_score = None
    scores = []
    for answer in answers:
        field = answer.get('field', {})
        q_type = answer.get('type', '')
        value = None
        score = None

        if q_type == 'number':
            value = answer.get('number')
            score = value
        elif q_type == 'choice':
            value = answer.get('choice', {}).get('label', '')
        elif q_type == 'text':
            value = answer.get('text', '')
        elif q_type == 'opinion_scale':
            value = answer.get('number')
            score = value
        elif q_type == 'rating':
            value = answer.get('number')
            score = value
        elif q_type == 'nps':
            value = answer.get('number')
            score = value
            nps_score = value
        else:
            value = str(answer.get(q_type, ''))

        responses.append({
            'question': field.get('ref', field.get('id', '')),
            'question_title': field.get('title', ''),
            'answer': value,
            'score': score,
        })
        if score is not None:
            scores.append(score)

    return {
        'external_survey_id': form_id,
        'responses': responses,
        'nps_score': nps_score,
        'overall_score': round(sum(scores) / len(scores), 2) if scores else None,
    }


def _parse_google_forms(body: dict) -> Optional[dict]:
    """Parser de webhook de Google Forms (via Apps Script)."""
    form_id = body.get('form_id', '')
    responses_data = body.get('responses', body.get('answers', []))

    if isinstance(responses_data, dict):
        responses = [{'question': k, 'answer': v, 'score': _try_int(v)} for k, v in responses_data.items()]
    elif isinstance(responses_data, list):
        responses = responses_data
    else:
        return None

    scores = [r['score'] for r in responses if r.get('score') is not None]
    return {
        'external_survey_id': form_id,
        'responses': responses,
        'nps_score': scores[0] if len(scores) == 1 else None,
        'overall_score': round(sum(scores) / len(scores), 2) if scores else None,
    }


def _parse_surveymonkey(body: dict) -> Optional[dict]:
    """Parser de webhook de SurveyMonkey."""
    event_type = body.get('event_type', '')
    if 'response' not in event_type:
        return None

    resources = body.get('resources', {})
    survey_id = resources.get('survey_id', body.get('filter_id', ''))
    # SurveyMonkey sends minimal data in webhook; full response via API
    return {
        'external_survey_id': survey_id,
        'responses': [{'raw_event': event_type, 'respondent_id': resources.get('respondent_id', '')}],
    }


def _parse_tally(body: dict) -> Optional[dict]:
    """Parser de webhook de Tally."""
    event_type = body.get('eventType', '')
    if event_type != 'FORM_RESPONSE':
        return None

    data = body.get('data', {})
    form_id = data.get('formId', '')
    fields = data.get('fields', [])

    responses = []
    scores = []
    for field in fields:
        value = field.get('value', '')
        score = _try_int(value) if field.get('type') in ('INPUT_NUMBER', 'RATING', 'LINEAR_SCALE') else None
        responses.append({
            'question': field.get('key', ''),
            'question_title': field.get('label', ''),
            'answer': value,
            'score': score,
        })
        if score is not None:
            scores.append(score)

    return {
        'external_survey_id': form_id,
        'responses': responses,
        'overall_score': round(sum(scores) / len(scores), 2) if scores else None,
    }


def _parse_jotform(body: dict) -> Optional[dict]:
    """Parser de webhook de JotForm."""
    form_id = body.get('formID', body.get('form_id', ''))
    if not form_id:
        return None

    # JotForm sends form fields as flat key-value pairs
    responses = []
    scores = []
    for key, value in body.items():
        if key.startswith('q') and '_' in key:
            score = _try_int(value)
            responses.append({
                'question': key,
                'answer': value,
                'score': score,
            })
            if score is not None:
                scores.append(score)

    return {
        'external_survey_id': str(form_id),
        'responses': responses,
        'overall_score': round(sum(scores) / len(scores), 2) if scores else None,
    }


def _parse_survicate(body: dict) -> Optional[dict]:
    """Parser de webhook de Survicate."""
    survey_id = body.get('survey_id', '')
    if not survey_id:
        return None

    answers = body.get('answers', [])
    responses = []
    scores = []
    nps_score = None
    for ans in answers:
        score = ans.get('value') if isinstance(ans.get('value'), (int, float)) else None
        responses.append({
            'question': ans.get('question_id', ''),
            'question_title': ans.get('question', ''),
            'answer': ans.get('value', ''),
            'score': score,
        })
        if score is not None:
            scores.append(score)
        if ans.get('type') == 'nps' and score is not None:
            nps_score = score

    return {
        'external_survey_id': str(survey_id),
        'responses': responses,
        'nps_score': nps_score,
        'overall_score': round(sum(scores) / len(scores), 2) if scores else None,
    }


def _parse_hotjar(body: dict) -> Optional[dict]:
    """Parser de webhook de Hotjar Surveys."""
    survey_id = body.get('survey_id', body.get('id', ''))
    if not survey_id:
        return None

    answers = body.get('responses', body.get('answers', []))
    responses = []
    scores = []
    for ans in answers if isinstance(answers, list) else []:
        score = _try_int(ans.get('value')) if ans.get('value') is not None else None
        responses.append({
            'question': ans.get('question_id', ''),
            'question_title': ans.get('question', ''),
            'answer': ans.get('value', ''),
            'score': score,
        })
        if score is not None:
            scores.append(score)

    return {
        'external_survey_id': str(survey_id),
        'responses': responses,
        'overall_score': round(sum(scores) / len(scores), 2) if scores else None,
    }


def _try_int(value) -> Optional[int]:
    """Intentar convertir un valor a int."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


WEBHOOK_HANDLERS = {
    'typeform': _parse_typeform,
    'google_forms': _parse_google_forms,
    'surveymonkey': _parse_surveymonkey,
    'tally': _parse_tally,
    'jotform': _parse_jotform,
    'survicate': _parse_survicate,
    'hotjar': _parse_hotjar,
}
