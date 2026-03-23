"""Endpoints para el sistema de agentes LLM."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access

router = APIRouter()


# ─── Registry ────────────────────────────────────────────────────

@router.get("/")
async def list_agents(
    _current_user: dict = Depends(get_current_user),
):
    """Lista todos los agentes registrados."""
    # Ensure all agents are imported and registered
    import app.agents.lead_intelligence  # noqa: F401
    import app.agents.bant_qualifier  # noqa: F401
    import app.agents.proposal_generator  # noqa: F401
    import app.agents.customer_success  # noqa: F401
    from app.agents.registry import agent_registry
    return {"agents": agent_registry.list_agents()}


# ─── AGENT-LEAD-001: Lead Intelligence ───────────────────────────

@router.post("/lead-intelligence/{lead_id}")
async def score_lead_icp(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Ejecuta AGENT-LEAD-001 sobre un lead — scoring ICP con LLM."""
    from app.agents.lead_intelligence import score_lead
    user_id = UUID(current_user["sub"]) if current_user.get("sub") else None
    return await score_lead(db, lead_id, user_id)


class BulkScoreRequest(BaseModel):
    lead_ids: list[UUID]


@router.post("/lead-intelligence/bulk")
async def bulk_score_leads(
    request: BulkScoreRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Scoring ICP en batch sobre múltiples leads."""
    if len(request.lead_ids) > 50:
        raise HTTPException(status_code=400, detail="Máximo 50 leads por batch")
    from app.agents.lead_intelligence import bulk_score_leads
    user_id = UUID(current_user["sub"]) if current_user.get("sub") else None
    return await bulk_score_leads(db, request.lead_ids, user_id)


# ─── AGENT-QUALIFY-001: BANT Qualifier ────────────────────────────

class QualifyCallRequest(BaseModel):
    transcript: str
    call_id: Optional[UUID] = None
    lead_id: Optional[UUID] = None


@router.post("/bant-qualifier")
async def qualify_call_bant(
    request: QualifyCallRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Ejecuta AGENT-QUALIFY-001 — análisis BANT de transcripción de llamada."""
    from app.agents.bant_qualifier import qualify_call
    user_id = UUID(current_user["sub"]) if current_user.get("sub") else None
    return await qualify_call(
        db, request.call_id, request.transcript, request.lead_id, user_id
    )


# ─── AGENT-PROPOSAL-001: Proposal Generator ──────────────────────

class GenerateProposalRequest(BaseModel):
    opportunity_id: Optional[UUID] = None
    lead_id: Optional[UUID] = None
    notes: str = ""


@router.post("/proposal-generator")
async def generate_proposal(
    request: GenerateProposalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Ejecuta AGENT-PROPOSAL-001 — genera propuesta comercial personalizada en Markdown."""
    if not request.opportunity_id and not request.lead_id:
        raise HTTPException(status_code=400, detail="Provide opportunity_id or lead_id")
    from app.agents.proposal_generator import generate_proposal
    user_id = UUID(current_user["sub"]) if current_user.get("sub") else None
    return await generate_proposal(
        db, request.opportunity_id, request.lead_id, request.notes, user_id
    )


# ─── AGENT-CS-001: Customer Success ───────────────────────────────

class AnalyzeCustomerRequest(BaseModel):
    lead_id: UUID
    nps_score: Optional[int] = None
    nps_comment: str = ""


@router.post("/customer-success")
async def analyze_customer(
    request: AnalyzeCustomerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Ejecuta AGENT-CS-001 — análisis de customer success (NPS, churn, upsell)."""
    from app.agents.customer_success import analyze_customer
    user_id = UUID(current_user["sub"]) if current_user.get("sub") else None
    return await analyze_customer(
        db, request.lead_id, request.nps_score, request.nps_comment, user_id=user_id
    )


# ─── PDF Export ───────────────────────────────────────────────────

class ExportPDFRequest(BaseModel):
    markdown: str
    title: str = "Propuesta Comercial"
    filename: str = "propuesta_st4rtup.pdf"
    client_name: str = ""
    client_company: str = ""


@router.post("/export-pdf")
async def export_proposal_pdf(
    request: ExportPDFRequest,
    _current_user: dict = Depends(get_current_user),
):
    """Convierte Markdown de propuesta a PDF corporativo descargable."""
    from app.services.pdf_service import markdown_to_pdf
    pdf_bytes = markdown_to_pdf(
        request.markdown, request.title,
        client_name=request.client_name,
        client_company=request.client_company,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{request.filename}"'},
    )


# ─── RAG Context ──────────────────────────────────────────────────

class IndexDocumentRequest(BaseModel):
    doc_id: str
    text: str
    doc_type: str = "note"
    lead_id: Optional[str] = None
    metadata: Optional[dict] = None


@router.post("/rag/index")
async def rag_index_document(
    request: IndexDocumentRequest,
    _current_user: dict = Depends(require_write_access),
):
    """Indexa un documento en Qdrant para RAG."""
    from app.services.rag_service import index_document
    ok = await index_document(request.doc_id, request.text, request.metadata, request.doc_type, request.lead_id)
    return {"indexed": ok}


@router.get("/rag/search")
async def rag_search(
    query: str = Query(...),
    lead_id: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    limit: int = Query(5, ge=1, le=20),
    _current_user: dict = Depends(get_current_user),
):
    """Busca contexto relevante en Qdrant."""
    from app.services.rag_service import search_context
    results = await search_context(query, lead_id, doc_type, limit)
    return {"results": results, "count": len(results)}


# ─── Audit ────────────────────────────────────────────────────────

@router.get("/audit")
async def get_agent_audit(
    agent_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Obtiene el audit trail de ejecuciones de agentes."""
    from app.agents.audit import audit_trail
    entries = await audit_trail.get_recent(db, agent_id, limit)
    return {"entries": entries, "total": len(entries)}


# ─── Prompts ──────────────────────────────────────────────────────

@router.get("/prompts/{agent_id}")
async def get_agent_prompts(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Obtiene los prompts actuales de un agente (DB + defaults)."""
    from app.agents.prompts import prompt_registry, DEFAULTS
    system = await prompt_registry.get_prompt(agent_id, "system", db)
    user_tpl = await prompt_registry.get_prompt(agent_id, "user_template", db)
    defaults = DEFAULTS.get(agent_id, {})
    return {
        "agent_id": agent_id,
        "system": system,
        "user_template": user_tpl,
        "version": defaults.get("version", "unknown"),
        "is_customized": system != defaults.get("system", ""),
    }


class UpdatePromptRequest(BaseModel):
    prompt_type: str  # "system" or "user_template"
    content: str


@router.put("/prompts/{agent_id}")
async def update_agent_prompt(
    agent_id: str,
    request: UpdatePromptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza un prompt de agente (persiste en DB)."""
    from app.agents.prompts import prompt_registry
    if request.prompt_type not in ("system", "user_template"):
        raise HTTPException(status_code=400, detail="prompt_type debe ser 'system' o 'user_template'")
    success = await prompt_registry.update_prompt(agent_id, request.prompt_type, request.content, db)
    if not success:
        raise HTTPException(status_code=500, detail="Error actualizando prompt")
    return {"updated": True, "agent_id": agent_id, "prompt_type": request.prompt_type}
