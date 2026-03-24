"""Public form submission endpoints — secured with tokens + honeypot.
External users fill these forms via /form/:formId?token=xxx URLs."""
import logging
import secrets
from datetime import date, datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel as PydanticModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.rate_limit import limiter
from app.models.form_token import FormToken, FormSubmission as FormSubmissionModel

logger = logging.getLogger(__name__)
router = APIRouter()

RATE_FORM = "30/minute"


class FormSubmission(PydanticModel):
    form_id: str
    data: dict
    token: Optional[str] = None
    lead_id: Optional[str] = None
    submitted_by: Optional[str] = None
    _hp_field: Optional[str] = None  # Honeypot — must be empty


class TokenCreate(PydanticModel):
    form_id: str
    recipient_email: str
    recipient_name: str = ""
    lead_id: Optional[str] = None
    expires_days: int = 7
    max_uses: int = 1
    send_email: bool = True


@router.get("/config/{form_id}")
async def get_form_config(
    form_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Returns form field configuration — validates token if provided."""
    config = FORM_CONFIGS.get(form_id)
    if not config:
        raise HTTPException(status_code=404, detail=f"Form '{form_id}' not found")

    # Validate token
    if token:
        result = await db.execute(
            select(FormToken).where(FormToken.token == token, FormToken.form_id == form_id)
        )
        ft = result.scalar_one_or_none()
        if not ft:
            raise HTTPException(status_code=403, detail="Token invalido")
        if not ft.is_active:
            raise HTTPException(status_code=403, detail="Token revocado")
        if ft.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=403, detail="Token expirado")
        if ft.max_uses and ft.uses >= ft.max_uses:
            raise HTTPException(status_code=403, detail="Token ya utilizado")
        # Return config with lead_id pre-filled
        return {**config, "token_valid": True, "lead_id": str(ft.lead_id) if ft.lead_id else None,
                "recipient_name": ft.recipient_name, "recipient_email": ft.recipient_email}

    return {**config, "token_valid": False}


# ═══════════════════════════════════════════════════════════════
# Token Management (PROTECTED — requires auth)
# ═══════════════════════════════════════════════════════════════


@router.get("/tokens")
async def list_tokens(
    form_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista tokens generados con paginacion."""
    from sqlalchemy import func

    base_q = select(FormToken)
    if form_id:
        base_q = base_q.where(FormToken.form_id == form_id)

    total = await db.scalar(select(func.count()).select_from(base_q.subquery())) or 0
    q = base_q.order_by(FormToken.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)

    items = [{
        "id": str(t.id), "token": t.token, "form_id": t.form_id,
        "recipient_email": t.recipient_email, "recipient_name": t.recipient_name,
        "lead_id": str(t.lead_id) if t.lead_id else None,
        "expires_at": t.expires_at.isoformat() if t.expires_at else None,
        "max_uses": t.max_uses, "uses": t.uses, "is_active": t.is_active,
        "sent_at": t.sent_at.isoformat() if t.sent_at else None,
        "submitted_at": t.submitted_at.isoformat() if t.submitted_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "email_error": (t.metadata_ or {}).get("error") if t.metadata_ and t.metadata_.get("email_status") != "sent" else None,
    } for t in result.scalars().all()]

    return {
        "items": items, "total": total, "page": page, "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.post("/tokens")
async def create_token(
    data: TokenCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Crea token y opcionalmente envia email con link."""
    token_str = secrets.token_urlsafe(32)
    ft = FormToken(
        token=token_str, form_id=data.form_id,
        lead_id=data.lead_id, recipient_email=data.recipient_email,
        recipient_name=data.recipient_name,
        expires_at=datetime.now(timezone.utc) + timedelta(days=data.expires_days),
        max_uses=data.max_uses, created_by=current_user.get("email", ""),
    )
    db.add(ft)
    await db.commit()

    form_url = f"https://app.st4rtup.app/form/{data.form_id}?token={token_str}"

    # Send email with form link
    if data.send_email:
        try:
            from app.services.email_service import email_service
            form_title = FORM_CONFIGS.get(data.form_id, {}).get("title", data.form_id)
            html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0e1a; padding: 20px; border-radius: 8px 8px 0 0;">
                    <span style="color: #0cd5e8; font-weight: bold; font-size: 18px;">ST4RTUP</span>
                </div>
                <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #1e293b; margin-top: 0;">Formulario: {form_title}</h2>
                    <p style="color: #64748b;">Hola {data.recipient_name or ''},</p>
                    <p style="color: #64748b;">Se te ha enviado un formulario para completar. Haz click en el boton para acceder:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{form_url}" style="background: linear-gradient(135deg, #7c3aed, #0cd5e8); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                            Completar formulario
                        </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px;">Este enlace expira en {data.expires_days} dias. Si tienes problemas, copia esta URL: {form_url}</p>
                    <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin: 20px 0;">
                        <p style="color: #92400e; font-size: 12px; margin: 0; font-weight: 600;">Por favor, no respondas a este email.</p>
                        <p style="color: #92400e; font-size: 11px; margin: 4px 0 0 0;">Las respuestas por email no se registran. Utiliza el boton de arriba para completar el formulario. Si necesitas contactar con nosotros, escribe a <a href="mailto:hello@st4rtup.app" style="color: #0891b2;">hello@st4rtup.app</a></p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="color: #94a3b8; font-size: 11px;">
                        St4rtup | Plataforma growth de Ciberseguridad<br>
                        <a href="https://st4rtup.app" style="color: #0891b2; text-decoration: none;">st4rtup.app</a>
                    </p>
                </div>
            </div>
            """
            result = await email_service.send_email(
                to=data.recipient_email,
                subject=f"St4rtup — Formulario: {form_title}",
                html_body=html,
            )
            if result.get("success"):
                ft.sent_at = datetime.now(timezone.utc)
                ft.metadata_ = {"email_status": "sent", "provider": result.get("provider", "")}
                await db.commit()
                email_error = None
            else:
                email_error = result.get("error", "Unknown error")
                ft.metadata_ = {"email_status": "failed", "error": email_error}
                await db.commit()
                logger.warning("Form email failed: %s", email_error)
        except Exception as e:
            email_error = str(e)
            ft.metadata_ = {"email_status": "error", "error": email_error}
            await db.commit()
            logger.warning("Failed to send form email: %s", e)

    return {"id": str(ft.id), "token": token_str, "form_url": form_url,
            "sent": ft.sent_at is not None,
            "email_error": ft.metadata_.get("error") if ft.metadata_ and ft.metadata_.get("email_status") != "sent" else None,
            "expires_at": ft.expires_at.isoformat()}


@router.delete("/tokens/{token_id}")
async def revoke_token(
    token_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Revoca un token."""
    result = await db.execute(select(FormToken).where(FormToken.id == token_id))
    ft = result.scalar_one_or_none()
    if not ft:
        raise HTTPException(status_code=404, detail="Token not found")
    ft.is_active = False
    await db.commit()
    return {"revoked": True}


@router.get("/forms-list")
async def list_available_forms(current_user: dict = Depends(get_current_user)):
    """Lista todos los formularios disponibles con sus URLs."""
    return [{
        "id": fid, "title": cfg.get("title", fid), "subtitle": cfg.get("subtitle", ""),
        "url": f"https://app.st4rtup.app/form/{fid}",
        "requires_lead": cfg.get("requires_lead", False),
    } for fid, cfg in FORM_CONFIGS.items()]


@router.get("/stats")
async def form_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """KPIs de formularios: enviados, completados, tasa respuesta."""
    from sqlalchemy import func

    total_tokens = await db.scalar(select(func.count(FormToken.id))) or 0
    tokens_sent = await db.scalar(select(func.count(FormToken.id)).where(FormToken.sent_at.isnot(None))) or 0
    tokens_completed = await db.scalar(select(func.count(FormToken.id)).where(FormToken.submitted_at.isnot(None))) or 0
    tokens_expired = await db.scalar(select(func.count(FormToken.id)).where(
        FormToken.expires_at < datetime.now(timezone.utc), FormToken.submitted_at.is_(None)
    )) or 0
    tokens_pending = await db.scalar(select(func.count(FormToken.id)).where(
        FormToken.is_active.is_(True), FormToken.submitted_at.is_(None),
        FormToken.expires_at >= datetime.now(timezone.utc)
    )) or 0
    total_submissions = await db.scalar(select(func.count(FormSubmissionModel.id))) or 0

    # By form
    by_form_q = await db.execute(
        select(FormSubmissionModel.form_id, func.count(FormSubmissionModel.id))
        .group_by(FormSubmissionModel.form_id)
    )
    by_form = {r[0]: r[1] for r in by_form_q.all()}

    return {
        "total_tokens": total_tokens,
        "tokens_sent": tokens_sent,
        "tokens_completed": tokens_completed,
        "tokens_expired": tokens_expired,
        "tokens_pending": tokens_pending,
        "total_submissions": total_submissions,
        "response_rate": round(tokens_completed / max(tokens_sent, 1) * 100, 1),
        "by_form": by_form,
    }


@router.get("/submissions")
async def list_submissions(
    form_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista submissions de formularios con paginacion."""
    from sqlalchemy import desc, func

    base_q = select(FormSubmissionModel)
    if form_id:
        base_q = base_q.where(FormSubmissionModel.form_id == form_id)

    total = await db.scalar(select(func.count()).select_from(base_q.subquery())) or 0
    q = base_q.order_by(desc(FormSubmissionModel.created_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)

    items = [{
        "id": str(s.id), "form_id": s.form_id,
        "submitted_email": s.submitted_email, "submitted_by": s.submitted_by,
        "entity_type": s.entity_type, "entity_id": s.entity_id,
        "data_summary": {k: str(v)[:50] for k, v in (s.data or {}).items() if v and k not in ("_hp_website",)},
        "result": s.result,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    } for s in result.scalars().all()]

    return {
        "items": items, "total": total, "page": page, "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.post("/submit")
@limiter.limit(RATE_FORM)
async def submit_form(
    request: Request,
    submission: FormSubmission,
    db: AsyncSession = Depends(get_db),
):
    """Public form submission — validates token + honeypot, then processes."""
    form_id = submission.form_id
    data = submission.data

    # Honeypot check — bots fill hidden fields
    if submission._hp_field or data.get("_hp_website") or data.get("_hp_company_url"):
        logger.warning("Honeypot triggered on form %s", form_id)
        # Return fake success to not alert the bot
        return {"status": "ok", "form_id": form_id}

    # Token validation
    lead_id = submission.lead_id
    if submission.token:
        result = await db.execute(
            select(FormToken).where(FormToken.token == submission.token, FormToken.form_id == form_id)
        )
        ft = result.scalar_one_or_none()
        if not ft or not ft.is_active:
            raise HTTPException(status_code=403, detail="Token invalido o revocado")
        if ft.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=403, detail="Token expirado")
        if ft.max_uses and ft.uses >= ft.max_uses:
            raise HTTPException(status_code=403, detail="Token ya utilizado")
        # Mark token as used
        ft.uses = (ft.uses or 0) + 1
        ft.submitted_at = datetime.now(timezone.utc)
        if not lead_id and ft.lead_id:
            lead_id = str(ft.lead_id)
        await db.commit()

    handler = FORM_HANDLERS.get(form_id)
    if not handler:
        raise HTTPException(status_code=400, detail=f"Unknown form: {form_id}")

    try:
        result = await handler(db, data, lead_id)

        # Save submission record
        try:
            entity_id = result.get("lead_id") or result.get("bant_id") or result.get("partner_id") or result.get("onboarding_id") or result.get("churn_id") or result.get("roi_id") or result.get("survey_id") or result.get("visit_id")
            entity_type = "lead" if "lead_id" in result else "bant" if "bant_id" in result else "partner" if "partner_id" in result else form_id.split("-")[0]
            sub = FormSubmissionModel(
                form_id=form_id,
                token_id=None,
                lead_id=lead_id,
                submitted_by=submission.submitted_by,
                submitted_email=data.get("contact_email") or data.get("recipient_email") or data.get("email") or "",
                data=data,
                result=result,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id else None,
                ip_address=request.client.host if request.client else None,
            )
            if submission.token:
                tok = await db.execute(select(FormToken).where(FormToken.token == submission.token))
                tok_obj = tok.scalar_one_or_none()
                if tok_obj:
                    sub.token_id = tok_obj.id
            db.add(sub)
            await db.commit()
        except Exception as e:
            logger.warning("Failed to save form submission: %s", e)

        # Dispatch event to workflow engine
        try:
            from app.core.workflow_engine import dispatch_event
            await dispatch_event("form.submitted", {
                "form_id": form_id, "lead_id": submission.lead_id or result.get("lead_id"),
                "title": f"Formulario {form_id}", "message": f"Enviado por {submission.submitted_by or 'anonimo'}",
            }, db)
            # Dispatch specific events based on form type
            if form_id == "lead-001" and result.get("lead_id"):
                await dispatch_event("lead.created", {"lead_id": result["lead_id"]}, db)
        except Exception:
            pass  # Workflow dispatch is best-effort

        return {"status": "ok", "form_id": form_id, **result}
    except Exception as e:
        logger.error("Form submission error (%s): %s", form_id, e)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# Form Handlers
# ═══════════════════════════════════════════════════════════════

async def _handle_lead(db, data, lead_id=None):
    from app.models.lead import Lead
    from app.models.enums import LeadStatus, LeadSource
    lead = Lead(
        company_name=data.get("company_name", ""),
        company_cif=data.get("company_cif"),
        company_website=data.get("company_website"),
        company_sector=data.get("company_sector"),
        company_size=data.get("company_size"),
        company_revenue=data.get("company_revenue"),
        company_country=data.get("company_country", "España"),
        company_city=data.get("company_city"),
        company_address=data.get("company_address"),
        company_postal_code=data.get("company_postal_code"),
        contact_name=data.get("contact_name"),
        contact_lastname=data.get("contact_lastname"),
        contact_title=data.get("contact_title"),
        contact_email=data.get("contact_email"),
        contact_phone=data.get("contact_phone"),
        contact_linkedin=data.get("contact_linkedin"),
        contact_language=data.get("contact_language", "es"),
        decision_role=data.get("decision_role"),
        campaign_origin=data.get("campaign_origin"),
        priority=data.get("priority"),
        ens_level=data.get("ens_level"),
        current_grc_tool=data.get("current_grc_tool"),
        regulatory_frameworks=data.get("regulatory_frameworks"),
        is_critical_infrastructure=data.get("is_critical_infrastructure") == "Si",
        is_public_sector=data.get("is_public_sector") == "Si",
        notes=data.get("notes"),
        status=LeadStatus.NEW,
        source=LeadSource.WEBSITE,
    )
    db.add(lead)
    await db.commit()
    return {"lead_id": str(lead.id), "message": "Lead registrado correctamente"}


async def _handle_bant(db, data, lead_id=None):
    from app.models.forms import LeadBANT
    sb = int(data.get("score_budget", 0))
    sa = int(data.get("score_authority", 0))
    sn = int(data.get("score_need", 0))
    st = int(data.get("score_timeline", 0))
    bant = LeadBANT(
        lead_id=lead_id, score_budget=sb, score_authority=sa, score_need=sn, score_timeline=st,
        score_total=sb + sa + sn + st,
        has_budget=data.get("has_budget"), budget_range=data.get("budget_range"),
        budget_approver=data.get("budget_approver"), budget_notes=data.get("budget_notes"),
        is_contact_decision_maker=data.get("is_contact_decision_maker"),
        decision_maker_name=data.get("decision_maker_name"),
        stakeholder_map=data.get("stakeholder_map"),
        pain_point=data.get("pain_point"), regulatory_urgency=data.get("regulatory_urgency"),
        current_situation=data.get("current_situation"), desired_situation=data.get("desired_situation"),
        competitors_evaluated=data.get("competitors_evaluated"),
        has_implementation_deadline=data.get("has_implementation_deadline"),
        decision_timeframe=data.get("decision_timeframe"), buying_phase=data.get("buying_phase"),
        next_milestone=data.get("next_milestone"),
        recommendation=data.get("recommendation"), notes=data.get("notes"),
    )
    db.add(bant)
    await db.commit()
    return {"bant_id": str(bant.id), "score_total": bant.score_total}


async def _handle_visit(db, data, lead_id=None):
    lid = lead_id or data.get("lead_id")
    if not lid:
        # No lead — store as generic
        return await _handle_generic(db, data, lead_id)
    from app.models.crm import Visit
    from app.models.enums import VisitType, VisitResult
    try:
        vtype = VisitType(data.get("visit_type", "remote"))
    except (ValueError, KeyError):
        vtype = VisitType.REMOTE if hasattr(VisitType, 'REMOTE') else list(VisitType)[0]
    try:
        vresult = VisitResult(data.get("result", "positive"))
    except (ValueError, KeyError):
        vresult = list(VisitResult)[0]
    visit = Visit(
        lead_id=lid,
        visit_date=datetime.fromisoformat(data.get("visit_date", datetime.now(timezone.utc).isoformat())),
        visit_type=vtype,
        duration_minutes=int(data.get("duration_minutes", 60) or 60),
        location=data.get("location"),
        result=vresult,
        summary=data.get("summary"),
        key_findings=data.get("key_findings"),
        pain_points=data.get("pain_points"),
        next_steps=data.get("next_steps"),
        objections=data.get("objections"),
        demo_modules=data.get("demo_modules"),
        demo_type=data.get("demo_type"),
        demo_score=int(data.get("demo_score", 0)) if data.get("demo_score") else None,
        demo_gaps=data.get("demo_gaps"),
        demo_poc_requested=data.get("demo_poc_requested"),
    )
    db.add(visit)
    await db.commit()
    return {"visit_id": str(visit.id)}


async def _handle_partner(db, data, lead_id=None):
    from app.models.forms import Partner
    partner = Partner(
        name=data.get("name", ""), partner_type=data.get("partner_type", "referral"),
        contact_name=data.get("contact_name"), contact_email=data.get("contact_email"),
        contact_phone=data.get("contact_phone"), agreement_type=data.get("agreement_type"),
        commission_pct=float(data.get("commission_pct", 0)), territory=data.get("territory"),
        notes=data.get("notes"),
    )
    db.add(partner)
    await db.commit()
    return {"partner_id": str(partner.id)}


async def _handle_onboarding(db, data, lead_id=None):
    from app.models.forms import OnboardingChecklist
    ob = OnboardingChecklist(
        client_name=data.get("client_name", ""), lead_id=lead_id,
        csm_assigned=data.get("csm_assigned"), notes=data.get("notes"),
        checklist_items=data.get("checklist_items", []),
    )
    db.add(ob)
    await db.commit()
    return {"onboarding_id": str(ob.id)}


async def _handle_churn(db, data, lead_id=None):
    from app.models.forms import ChurnRecord
    churn = ChurnRecord(
        client_name=data.get("client_name", ""), lead_id=lead_id,
        churn_reason=data.get("churn_reason", "other"),
        churn_category=data.get("churn_category"),
        previous_arr=float(data.get("previous_arr", 0)),
        last_nps=int(data.get("last_nps", 0)) if data.get("last_nps") else None,
        warning_signals=data.get("warning_signals"),
        retention_attempts=data.get("retention_attempts"),
        competitor_switched_to=data.get("competitor_switched_to"),
        win_back_possible=data.get("win_back_possible"),
        lessons_learned=data.get("lessons_learned"), notes=data.get("notes"),
    )
    db.add(churn)
    await db.commit()
    return {"churn_id": str(churn.id)}


async def _handle_roi(db, data, lead_id=None):
    from app.models.forms import ROICalculation
    tc = sum(float(data.get(k, 0)) for k in ["current_fte_cost", "current_tools_cost", "current_audit_cost", "current_incident_cost", "current_penalty_risk"])
    tr = sum(float(data.get(k, 0)) for k in ["riskitera_license_cost", "riskitera_implementation_cost", "riskitera_training_cost"])
    savings = tc - tr
    roi_pct = round((savings / max(tr, 1)) * 100, 1)
    roi = ROICalculation(
        client_name=data.get("client_name", ""), lead_id=lead_id,
        current_fte_cost=float(data.get("current_fte_cost", 0)),
        current_tools_cost=float(data.get("current_tools_cost", 0)),
        current_audit_cost=float(data.get("current_audit_cost", 0)),
        current_incident_cost=float(data.get("current_incident_cost", 0)),
        current_penalty_risk=float(data.get("current_penalty_risk", 0)),
        total_current_cost=tc,
        riskitera_license_cost=float(data.get("riskitera_license_cost", 0)),
        riskitera_implementation_cost=float(data.get("riskitera_implementation_cost", 0)),
        riskitera_training_cost=float(data.get("riskitera_training_cost", 0)),
        total_riskitera_cost=tr, total_savings=savings, roi_pct=roi_pct,
        payback_months=round(tr / max(savings / 12, 1)) if savings > 0 else 0,
        three_year_value=savings * 3 - tr, notes=data.get("notes"),
    )
    db.add(roi)
    await db.commit()
    return {"roi_id": str(roi.id), "roi_pct": roi_pct, "total_savings": savings}


async def _handle_nps(db, data, lead_id=None):
    if not lead_id:
        return await _handle_generic(db, {**data, "form_type": "nps"}, lead_id)
    from app.models.survey import Survey
    from app.models.enums import SurveyStatus
    survey = Survey(
        lead_id=lead_id, title="Encuesta NPS", survey_type="nps",
        status=SurveyStatus.COMPLETED,
        nps_score=int(data.get("score", 0)),
        responses=data,
    )
    db.add(survey)
    await db.commit()
    return {"survey_id": str(survey.id)}


async def _handle_csat(db, data, lead_id=None):
    if not lead_id:
        return await _handle_generic(db, {**data, "form_type": "csat"}, lead_id)
    from app.models.survey import Survey
    from app.models.enums import SurveyStatus
    survey = Survey(
        lead_id=lead_id, title="Encuesta CSAT", survey_type="csat",
        status=SurveyStatus.COMPLETED,
        overall_score=float(data.get("score", 0)),
        responses=data,
    )
    db.add(survey)
    await db.commit()
    return {"survey_id": str(survey.id)}


async def _handle_generic(db, data, lead_id=None):
    """Generic handler — stores data in workflow_audit_log as form submission record."""
    try:
        from sqlalchemy import text
        import json
        await db.execute(text(
            "INSERT INTO workflow_audit_log (id, workflow_id, module, trigger_type, entity_type, status, payload, created_at) "
            "VALUES (gen_random_uuid(), :wf_id, 'forms', 'form_submit', 'form', 'success', :payload, NOW())"
        ), {"wf_id": f"form-{data.get('form_id', 'unknown')}", "payload": json.dumps(data, default=str)})
        await db.commit()
    except Exception:
        pass
    return {"stored": True, "form_data": list(data.keys())}
    return {"survey_id": str(survey.id)}


FORM_HANDLERS = {
    "lead-001": _handle_lead,
    "bant-002": _handle_bant,
    "visit-001": _handle_visit,
    "demo-002": _handle_visit,
    "partner-001": _handle_partner,
    "onboard-001": _handle_onboarding,
    "churn-001": _handle_churn,
    "roi-001": _handle_roi,
    "nps-001": _handle_nps,
    "csat-001": _handle_csat,
    "demo-request": _handle_lead,
    "deal-001": _handle_generic,
    "deal-002": _handle_generic,
    "account-001": _handle_generic,
    "review-001": _handle_generic,
    "action-001": _handle_generic,
    "email-001": _handle_generic,
    "call-001": _handle_generic,
}


# ═══════════════════════════════════════════════════════════════
# Form Configurations (for frontend renderer)
# ═══════════════════════════════════════════════════════════════

FORM_CONFIGS = {
    "lead-001": {
        "id": "lead-001", "title": "Alta de Lead", "subtitle": "Captura de cliente potencial",
        "sections": [
            {"title": "Datos de Empresa", "fields": [
                {"key": "company_name", "label": "Nombre empresa", "type": "text", "required": True},
                {"key": "company_cif", "label": "CIF/NIF", "type": "text", "required": True},
                {"key": "company_website", "label": "Web corporativa", "type": "text"},
                {"key": "company_sector", "label": "Sector", "type": "select", "options": ["Banca", "Energia", "Telco", "Salud", "AAPP", "Industria", "Seguros", "Retail", "Otro"]},
                {"key": "company_size", "label": "Tamano empresa", "type": "select", "options": ["1-50", "50-200", "200-500", "500-1000", "+1000"]},
                {"key": "company_country", "label": "Pais", "type": "text", "default": "Espana"},
                {"key": "company_city", "label": "Ciudad", "type": "text"},
            ]},
            {"title": "Contacto Principal", "fields": [
                {"key": "contact_name", "label": "Nombre", "type": "text", "required": True},
                {"key": "contact_lastname", "label": "Apellidos", "type": "text"},
                {"key": "contact_title", "label": "Cargo", "type": "text", "placeholder": "CEO, CTO, DPO..."},
                {"key": "contact_email", "label": "Email", "type": "email", "required": True},
                {"key": "contact_phone", "label": "Telefono", "type": "tel"},
                {"key": "contact_linkedin", "label": "LinkedIn URL", "type": "text"},
                {"key": "decision_role", "label": "Tipo decisor", "type": "select", "options": ["Decisor", "Influencer", "Tecnico", "Economico"]},
            ]},
            {"title": "Perfil Regulatorio", "fields": [
                {"key": "regulatory_frameworks", "label": "Frameworks aplicables", "type": "multiselect", "options": ["ENS", "NIS2", "DORA", "SaaS Best Practices", "PCI-DSS", "LOPD-GDD"]},
                {"key": "is_critical_infrastructure", "label": "Infraestructura critica", "type": "select", "options": ["Si", "No", "En evaluacion"]},
                {"key": "ens_level", "label": "Nivel ENS objetivo", "type": "select", "options": ["Basico", "Medio", "Alto"]},
                {"key": "current_grc_tool", "label": "Herramienta growth actual", "type": "text", "placeholder": "Ninguna / Manual / Otra"},
            ]},
            {"title": "Notas", "fields": [
                {"key": "notes", "label": "Notas adicionales", "type": "textarea"},
            ]},
        ],
    },
    "bant-002": {
        "id": "bant-002", "title": "Cualificacion BANT", "subtitle": "Budget - Authority - Need - Timeline", "requires_lead": True,
        "sections": [
            {"title": "Budget (Presupuesto)", "fields": [
                {"key": "has_budget", "label": "Tiene presupuesto asignado?", "type": "select", "options": ["Si", "No", "En proceso"]},
                {"key": "budget_range", "label": "Rango presupuesto anual", "type": "select", "options": ["<5K EUR", "5K-15K", "15K-50K", "50K-150K", "+150K"]},
                {"key": "budget_approver", "label": "Quien aprueba?", "type": "text"},
                {"key": "score_budget", "label": "Score Budget (0-25)", "type": "number", "max": 25},
            ]},
            {"title": "Authority (Decisor)", "fields": [
                {"key": "is_contact_decision_maker", "label": "Contacto es decisor final?", "type": "select", "options": ["Si", "No"]},
                {"key": "decision_maker_name", "label": "Nombre del decisor", "type": "text"},
                {"key": "stakeholder_map", "label": "Mapa de stakeholders", "type": "textarea"},
                {"key": "score_authority", "label": "Score Authority (0-25)", "type": "number", "max": 25},
            ]},
            {"title": "Need (Necesidad)", "fields": [
                {"key": "pain_point", "label": "Pain point principal", "type": "text"},
                {"key": "regulatory_urgency", "label": "Urgencia regulatoria", "type": "select", "options": ["Si (plazo conocido)", "No", "Latente"]},
                {"key": "current_situation", "label": "Situacion actual (AS-IS)", "type": "textarea"},
                {"key": "desired_situation", "label": "Situacion deseada (TO-BE)", "type": "textarea"},
                {"key": "competitors_evaluated", "label": "Competidores evaluados", "type": "text"},
                {"key": "score_need", "label": "Score Need (0-25)", "type": "number", "max": 25},
            ]},
            {"title": "Timeline (Plazo)", "fields": [
                {"key": "has_implementation_deadline", "label": "Fecha limite implementacion?", "type": "text"},
                {"key": "decision_timeframe", "label": "Cuando decide?", "type": "select", "options": ["Inmediato", "<30d", "30-90d", ">90d", "Indefinido"]},
                {"key": "buying_phase", "label": "Fase de compra", "type": "select", "options": ["Awareness", "Evaluacion", "Decision", "Negociacion"]},
                {"key": "next_milestone", "label": "Proximo hito", "type": "text"},
                {"key": "score_timeline", "label": "Score Timeline (0-25)", "type": "number", "max": 25},
            ]},
            {"title": "Resultado", "fields": [
                {"key": "recommendation", "label": "Recomendacion", "type": "select", "options": ["Cualificado", "Descartar", "Nurturing"]},
                {"key": "notes", "label": "Notas", "type": "textarea"},
            ]},
        ],
    },
    "partner-001": {
        "id": "partner-001", "title": "Alta de Partner", "subtitle": "Registro de partner o aliado comercial",
        "sections": [
            {"title": "Datos del Partner", "fields": [
                {"key": "name", "label": "Nombre empresa partner", "type": "text", "required": True},
                {"key": "partner_type", "label": "Tipo", "type": "select", "required": True, "options": ["Referral", "Reseller", "Technology", "Implementation", "Consulting"]},
                {"key": "contact_name", "label": "Contacto principal", "type": "text"},
                {"key": "contact_email", "label": "Email", "type": "email"},
                {"key": "contact_phone", "label": "Telefono", "type": "tel"},
                {"key": "agreement_type", "label": "Tipo acuerdo", "type": "text"},
                {"key": "commission_pct", "label": "Comision %", "type": "number"},
                {"key": "territory", "label": "Territorio", "type": "text"},
                {"key": "notes", "label": "Notas", "type": "textarea"},
            ]},
        ],
    },
    "onboard-001": {
        "id": "onboard-001", "title": "Onboarding Cliente", "subtitle": "Checklist de incorporacion de nuevo cliente",
        "sections": [
            {"title": "Datos del Cliente", "fields": [
                {"key": "client_name", "label": "Empresa cliente", "type": "text", "required": True},
                {"key": "csm_assigned", "label": "CSM / AM asignado", "type": "text"},
                {"key": "notes", "label": "Notas", "type": "textarea"},
            ]},
        ],
    },
    "churn-001": {
        "id": "churn-001", "title": "Analisis de Churn", "subtitle": "Registro de baja o no-renovacion",
        "sections": [
            {"title": "Datos", "fields": [
                {"key": "client_name", "label": "Cliente", "type": "text", "required": True},
                {"key": "churn_reason", "label": "Motivo principal", "type": "select", "required": True, "options": ["Precio", "Funcionalidad", "Servicio", "Competidor", "Budget recortado", "Cambio organizacional", "Otro"]},
                {"key": "churn_category", "label": "Categoria", "type": "select", "options": ["Voluntario", "Involuntario", "Downgrade"]},
                {"key": "previous_arr", "label": "ARR previo (EUR)", "type": "number"},
                {"key": "last_nps", "label": "Ultimo NPS", "type": "number"},
                {"key": "warning_signals", "label": "Senales de alerta previas", "type": "textarea"},
                {"key": "retention_attempts", "label": "Intentos de retencion", "type": "textarea"},
                {"key": "competitor_switched_to", "label": "Competidor al que cambio", "type": "text"},
                {"key": "win_back_possible", "label": "Posibilidad win-back", "type": "select", "options": ["Alta", "Media", "Baja", "Ninguna"]},
                {"key": "lessons_learned", "label": "Lecciones aprendidas", "type": "textarea"},
            ]},
        ],
    },
    "roi-001": {
        "id": "roi-001", "title": "Calculadora ROI", "subtitle": "Calcula el retorno de inversion con St4rtup",
        "sections": [
            {"title": "Costes actuales (sin St4rtup)", "fields": [
                {"key": "client_name", "label": "Empresa", "type": "text", "required": True},
                {"key": "current_fte_cost", "label": "Coste personal growth/compliance (EUR/ano)", "type": "number"},
                {"key": "current_tools_cost", "label": "Coste herramientas actuales (EUR/ano)", "type": "number"},
                {"key": "current_audit_cost", "label": "Coste auditorias (EUR/ano)", "type": "number"},
                {"key": "current_incident_cost", "label": "Coste medio incidentes (EUR/ano)", "type": "number"},
                {"key": "current_penalty_risk", "label": "Riesgo sanciones regulatorias (EUR)", "type": "number"},
            ]},
            {"title": "Inversion St4rtup", "fields": [
                {"key": "riskitera_license_cost", "label": "Licencia anual St4rtup (EUR)", "type": "number", "default": 0},
                {"key": "riskitera_implementation_cost", "label": "Implementacion (EUR)", "type": "number", "default": 0},
                {"key": "riskitera_training_cost", "label": "Formacion (EUR)", "type": "number", "default": 0},
            ]},
            {"title": "Notas", "fields": [
                {"key": "notes", "label": "Notas adicionales", "type": "textarea"},
            ]},
        ],
    },
    "nps-001": {
        "id": "nps-001", "title": "Encuesta NPS", "subtitle": "En una escala del 0 al 10, cuanto recomendarias St4rtup?",
        "sections": [
            {"title": "", "fields": [
                {"key": "score", "label": "Puntuacion (0-10)", "type": "number", "required": True, "min": 0, "max": 10},
                {"key": "feedback", "label": "Comentarios", "type": "textarea", "placeholder": "Que podriamos mejorar?"},
            ]},
        ],
    },
    "csat-001": {
        "id": "csat-001", "title": "Encuesta CSAT", "subtitle": "Como valorarias tu experiencia con St4rtup?",
        "sections": [
            {"title": "", "fields": [
                {"key": "score", "label": "Satisfaccion (1-5)", "type": "number", "required": True, "min": 1, "max": 5},
                {"key": "feedback", "label": "Comentarios", "type": "textarea"},
            ]},
        ],
    },
    "visit-001": {
        "id": "visit-001", "title": "Registro de Visita", "subtitle": "Resultado de visita o reunion comercial", "requires_lead": True,
        "sections": [
            {"title": "Datos de la Visita", "fields": [
                {"key": "visit_date", "label": "Fecha", "type": "date", "required": True},
                {"key": "visit_type", "label": "Tipo", "type": "select", "required": True, "options": ["presential", "remote", "phone"]},
                {"key": "duration_minutes", "label": "Duracion (min)", "type": "number", "default": 60},
                {"key": "location", "label": "Lugar / Plataforma", "type": "text", "placeholder": "Zoom / Teams / Oficina"},
                {"key": "result", "label": "Resultado", "type": "select", "required": True, "options": ["positive", "neutral", "negative", "follow_up", "no_show"]},
            ]},
            {"title": "Resumen", "fields": [
                {"key": "summary", "label": "Resumen ejecutivo", "type": "textarea"},
                {"key": "key_findings", "label": "Hallazgos clave", "type": "textarea"},
                {"key": "pain_points", "label": "Pain points", "type": "textarea"},
                {"key": "next_steps", "label": "Proximos pasos", "type": "textarea"},
                {"key": "objections", "label": "Objeciones y riesgos", "type": "textarea"},
            ]},
        ],
    },
    "demo-002": {
        "id": "demo-002", "title": "Informe de Demo", "subtitle": "Resultado de demo tecnica del producto St4rtup growth", "requires_lead": True,
        "sections": [
            {"title": "Datos de la Demo", "fields": [
                {"key": "visit_date", "label": "Fecha demo", "type": "date", "required": True},
                {"key": "duration_minutes", "label": "Duracion (min)", "type": "number", "default": 60},
                {"key": "demo_type", "label": "Tipo demo", "type": "select", "options": ["Standard", "Personalizada", "PoC", "Live"]},
                {"key": "result", "label": "Resultado", "type": "select", "required": True, "options": ["positive", "neutral", "negative"]},
            ]},
            {"title": "Modulos Evaluados", "fields": [
                {"key": "demo_modules", "label": "Modulos demostrados", "type": "multiselect", "options": ["growth Dashboard", "Gestion Riesgos", "ENS", "NIS2/DORA", "SaaS Best Practices", "SOC Manager", "Detection Engineering", "CTI", "Evidence Vault", "CEO Dashboard", "CFO View", "AI Copilot"]},
            ]},
            {"title": "Feedback", "fields": [
                {"key": "demo_positive_reactions", "label": "Reacciones positivas", "type": "textarea"},
                {"key": "demo_technical_questions", "label": "Preguntas tecnicas", "type": "textarea"},
                {"key": "demo_gaps", "label": "Gaps identificados", "type": "textarea"},
                {"key": "demo_score", "label": "Puntuacion demo (1-10)", "type": "number", "min": 1, "max": 10},
                {"key": "demo_poc_requested", "label": "Solicitan PoC?", "type": "select", "options": ["Si", "No", "Pendiente"]},
            ]},
        ],
    },
    "deal-001": {
        "id": "deal-001", "title": "Alta de Oportunidad", "subtitle": "Registro de oportunidad en el pipeline", "requires_lead": True,
        "sections": [
            {"title": "Datos de la Oportunidad", "fields": [
                {"key": "name", "label": "Nombre oportunidad", "type": "text", "required": True, "placeholder": "St4rtup growth - [Empresa] - 2026"},
                {"key": "value", "label": "Valor anual (EUR)", "type": "number", "default": 0},
                {"key": "stage", "label": "Stage", "type": "select", "required": True, "options": ["discovery", "qualification", "proposal", "negotiation"]},
                {"key": "probability", "label": "Probabilidad cierre %", "type": "number", "default": 25},
                {"key": "expected_close_date", "label": "Fecha cierre estimada", "type": "date"},
            ]},
            {"title": "Detalle", "fields": [
                {"key": "modules_requested", "label": "Modulos", "type": "multiselect", "options": ["growth", "SOC", "CTI", "Full Platform"]},
                {"key": "pricing_model", "label": "Modelo pricing", "type": "select", "options": ["Pilot 19.500 EUR", "Anual", "Modular", "Enterprise Custom"]},
                {"key": "competitors_in_evaluation", "label": "Competidores evaluados", "type": "text"},
                {"key": "notes", "label": "Notas", "type": "textarea"},
            ]},
        ],
    },
    "deal-002": {
        "id": "deal-002", "title": "Propuesta Comercial", "subtitle": "Briefing para elaborar propuesta tecnico-economica", "requires_lead": True,
        "sections": [
            {"title": "Alcance Tecnico", "fields": [
                {"key": "modules_requested", "label": "Modulos solicitados", "type": "multiselect", "required": True, "options": ["growth", "SOC", "CTI", "Full Platform"]},
                {"key": "regulatory_frameworks", "label": "Frameworks regulatorios", "type": "multiselect", "options": ["Enterprise", "NIS2", "DORA", "SaaS Best Practices"]},
                {"key": "num_licenses", "label": "Usuarios / licencias", "type": "number"},
                {"key": "integrations_required", "label": "Integraciones requeridas", "type": "text", "placeholder": "SIEM, EDR, AD, Cloud..."},
                {"key": "deployment_env", "label": "Entorno despliegue", "type": "select", "options": ["Cloud St4rtup", "On-premise", "Hibrido", "VPC dedicada"]},
                {"key": "sla_required", "label": "SLA requerido", "type": "select", "options": ["99.9%", "99.5%", "Best effort", "Personalizado"]},
            ]},
            {"title": "Estructura Economica", "fields": [
                {"key": "pricing_model", "label": "Modelo pricing", "type": "select", "options": ["Pilot 19.500 EUR", "Anual", "Modular", "Enterprise"]},
                {"key": "discount_pct", "label": "Descuento %", "type": "number", "default": 0},
                {"key": "include_poc", "label": "Incluir PoC gratuita", "type": "select", "options": ["Si (90 dias)", "No"]},
                {"key": "payment_terms", "label": "Condiciones pago", "type": "text"},
                {"key": "proposal_deadline", "label": "Fecha limite entrega", "type": "date"},
                {"key": "delivery_format", "label": "Formato", "type": "select", "options": ["PDF", "PowerPoint", "Word", "Demo personalizada"]},
            ]},
        ],
    },
    "account-001": {
        "id": "account-001", "title": "Plan de Cuenta", "subtitle": "Estrategia comercial por cliente", "requires_lead": True,
        "sections": [
            {"title": "Datos del Cliente", "fields": [
                {"key": "account_type", "label": "Tipo cuenta", "type": "select", "options": ["Pilot", "Customer", "Partner", "Strategic"]},
                {"key": "arr", "label": "ARR actual (EUR)", "type": "number"},
                {"key": "renewal_date", "label": "Fecha renovacion", "type": "date"},
                {"key": "nps", "label": "Ultimo NPS", "type": "number", "min": 0, "max": 10},
            ]},
            {"title": "Stakeholders", "fields": [
                {"key": "economic_buyer", "label": "Decisor economico", "type": "text"},
                {"key": "champion", "label": "Champion interno", "type": "text"},
                {"key": "blocker", "label": "Blocker / riesgo", "type": "text"},
            ]},
            {"title": "Expansion", "fields": [
                {"key": "upsell_modules", "label": "Modulos upsell potencial", "type": "text"},
                {"key": "upsell_value", "label": "Valor upsell (EUR)", "type": "number"},
                {"key": "notes", "label": "Notas estrategia", "type": "textarea"},
            ]},
        ],
    },
    "review-001": {
        "id": "review-001", "title": "Seguimiento Mensual", "subtitle": "Review mensual del proyecto con cliente", "requires_lead": True,
        "sections": [
            {"title": "KPIs del Mes", "fields": [
                {"key": "uptime", "label": "Uptime servicio %", "type": "text", "default": "99.9%"},
                {"key": "incidents_open", "label": "Incidencias abiertas", "type": "number", "default": 0},
                {"key": "incidents_closed", "label": "Incidencias cerradas", "type": "number", "default": 0},
                {"key": "nps", "label": "NPS del mes", "type": "number", "min": 0, "max": 10},
            ]},
            {"title": "Estado y Acciones", "fields": [
                {"key": "milestones", "label": "Hitos completados", "type": "textarea"},
                {"key": "issues", "label": "Problemas abiertos", "type": "textarea"},
                {"key": "next_actions", "label": "Acciones proximo mes", "type": "textarea"},
                {"key": "client_feedback", "label": "Feedback del cliente", "type": "textarea"},
                {"key": "satisfaction", "label": "Satisfaccion general", "type": "select", "options": ["Muy satisfecho", "Satisfecho", "Neutro", "Insatisfecho"]},
            ]},
        ],
    },
    "action-001": {
        "id": "action-001", "title": "Alta de Accion", "subtitle": "Registro de tarea comercial", "requires_lead": True,
        "sections": [
            {"title": "Datos de la Accion", "fields": [
                {"key": "title", "label": "Titulo", "type": "text", "required": True},
                {"key": "action_type", "label": "Tipo", "type": "select", "options": ["Llamada", "Email", "Reunion", "Propuesta", "Tarea interna", "Otro"]},
                {"key": "priority", "label": "Prioridad", "type": "select", "required": True, "options": ["Alta", "Media", "Baja", "Urgente"]},
                {"key": "due_date", "label": "Fecha limite", "type": "date", "required": True},
                {"key": "description", "label": "Descripcion", "type": "textarea", "required": True},
            ]},
        ],
    },
    "email-001": {
        "id": "email-001", "title": "Briefing de Email", "subtitle": "Planificacion de email o secuencia",
        "sections": [
            {"title": "Datos Generales", "fields": [
                {"key": "name", "label": "Nombre email / secuencia", "type": "text", "required": True},
                {"key": "email_type", "label": "Tipo", "type": "select", "options": ["Email unico", "Secuencia", "Newsletter", "Transaccional", "Nurturing"]},
                {"key": "objective", "label": "Objetivo", "type": "select", "options": ["Booking demo", "Descarga recurso", "Reactivacion", "NPS", "Renovacion"]},
                {"key": "platform", "label": "Plataforma", "type": "select", "options": ["Resend", "Brevo", "SendGrid", "n8n"]},
            ]},
            {"title": "Audiencia", "fields": [
                {"key": "segment", "label": "Segmento objetivo", "type": "text", "placeholder": "Leads CEO / Clientes activos..."},
                {"key": "persona_icp", "label": "Persona ICP", "type": "select", "options": ["CEO", "DPO", "SOC Manager", "CIO", "CTO"]},
                {"key": "exclusions", "label": "Exclusiones", "type": "text"},
            ]},
            {"title": "Contenido", "fields": [
                {"key": "subject", "label": "Asunto", "type": "text"},
                {"key": "copy_notes", "label": "Notas de copy", "type": "textarea"},
            ]},
        ],
    },
    "call-001": {
        "id": "call-001", "title": "Briefing de Llamada IA", "subtitle": "Configuracion de llamada con Retell AI", "requires_lead": True,
        "sections": [
            {"title": "Configuracion", "fields": [
                {"key": "objective", "label": "Objetivo de la llamada", "type": "select", "required": True, "options": ["Cualificacion", "Demo booking", "Follow-up", "Reactivacion", "NPS"]},
                {"key": "script_notes", "label": "Notas para el script", "type": "textarea"},
                {"key": "contact_name", "label": "Nombre contacto", "type": "text"},
                {"key": "contact_phone", "label": "Telefono", "type": "tel"},
                {"key": "preferred_time", "label": "Hora preferida", "type": "text", "placeholder": "Manana / Tarde / Indiferente"},
            ]},
        ],
    },
    "demo-request": {
        "id": "demo-request", "title": "Solicitar Demo", "subtitle": "Reserva una demo personalizada de la plataforma St4rtup growth",
        "sections": [
            {"title": "Tus datos", "fields": [
                {"key": "contact_name", "label": "Nombre", "type": "text", "required": True},
                {"key": "contact_lastname", "label": "Apellidos", "type": "text", "required": True},
                {"key": "contact_email", "label": "Email corporativo", "type": "email", "required": True},
                {"key": "contact_phone", "label": "Telefono", "type": "tel"},
                {"key": "contact_title", "label": "Cargo", "type": "text", "placeholder": "CEO, CTO, DPO..."},
            ]},
            {"title": "Tu empresa", "fields": [
                {"key": "company_name", "label": "Empresa", "type": "text", "required": True},
                {"key": "company_sector", "label": "Sector", "type": "select", "options": ["Banca y Finanzas", "Energia", "Telecomunicaciones", "Salud", "Administracion Publica", "Industria", "Seguros", "Retail", "Tecnologia", "Otro"]},
                {"key": "company_size", "label": "Empleados", "type": "select", "options": ["1-50", "50-200", "200-500", "500-1000", "+1000"]},
            ]},
            {"title": "Interes", "fields": [
                {"key": "regulatory_frameworks", "label": "Que normativas te interesan?", "type": "multiselect", "options": ["Enterprise", "NIS2", "DORA", "SaaS Best Practices", "PCI-DSS", "LOPD-GDD"]},
                {"key": "current_grc_tool", "label": "Herramienta growth actual", "type": "text", "placeholder": "Ninguna / Manual / Excel / Otra plataforma"},
                {"key": "notes", "label": "Que te gustaria ver en la demo?", "type": "textarea", "placeholder": "Cuentanos tus necesidades o preguntas..."},
                {"key": "preferred_time", "label": "Horario preferido", "type": "select", "options": ["Manana (9-12h)", "Mediodia (12-14h)", "Tarde (15-18h)", "Indiferente"]},
            ]},
        ],
    },
}
