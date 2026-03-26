"""MOD-DEALROOM-001 — Deal Room endpoints."""
import hashlib
import time
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import require_write_access
from app.models.pipeline import Opportunity
from app.services import dealroom_service

router = APIRouter()


@router.post("/{opportunity_id}/create")
async def create_deal_room(
    opportunity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea un Deal Room en SharePoint para una oportunidad."""
    result = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")

    return await dealroom_service.create_deal_room(
        db, opportunity_id, opp.name, opp.company_name or "Unknown"
    )


@router.get("/{opportunity_id}/files")
async def list_deal_room_files(
    opportunity_id: UUID,
    subfolder: Optional[str] = Query(None, description="Propuestas, Contratos, Presentaciones, Documentación"),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Lista archivos del Deal Room de una oportunidad."""
    result = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")

    # Read dealroom_folder from opportunity metadata
    meta = opp.metadata_ or {} if hasattr(opp, 'metadata_') else {}
    folder_path = meta.get("dealroom_folder", f"Deal Rooms/{opp.company_name or 'Unknown'} - {opp.name}")
    if subfolder:
        folder_path = f"{folder_path}/{subfolder}"

    return await dealroom_service.list_deal_room_files(db, folder_path)


@router.post("/{opportunity_id}/upload")
async def upload_to_deal_room(
    opportunity_id: UUID,
    file: UploadFile = File(...),
    subfolder: str = Query("Propuestas"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Sube un archivo al Deal Room de una oportunidad."""
    result = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Oportunidad no encontrada")

    meta = opp.metadata_ or {} if hasattr(opp, 'metadata_') else {}
    folder_path = meta.get("dealroom_folder", f"Deal Rooms/{opp.company_name or 'Unknown'} - {opp.name}")
    folder_path = f"{folder_path}/{subfolder}"

    content = await file.read()
    return await dealroom_service.upload_to_deal_room(db, folder_path, file.filename, content)


class ShareLinkRequest(BaseModel):
    item_id: str
    link_type: str = "view"
    password: Optional[str] = None
    expiration: Optional[str] = None


@router.post("/share")
async def create_share_link(
    request: ShareLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea un enlace compartido para un archivo del Deal Room."""
    return await dealroom_service.create_sharing_link(
        db, request.item_id, request.link_type, request.password, request.expiration
    )


# ─── Deal Room Documents (RS-DR-002 + RS-DR-001) ────────────

from app.models.deal_room_doc import DealRoomDocument, DealRoomPageEvent

# Rate limiter (in-memory, simple)
_page_event_limiter: dict = {}  # session_id -> (count, last_reset_time)


@router.post("/{room_id}/documents/upload")
async def upload_document(
    room_id: UUID,
    recipient_email: str = Query(""),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Sube un PDF con watermarking automatico al Deal Room."""
    if not file.filename or not file.filename.endswith('.pdf'):
        raise HTTPException(400, "Solo se permiten archivos PDF")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(400, "Archivo demasiado grande (max 50MB)")

    # Get room info for watermark
    company_name = "Cliente"

    # Apply watermark
    from app.services.pdf_watermark import apply_watermark
    watermarked_bytes = await apply_watermark(content, company_name, recipient_email)

    # Count pages
    page_count = 0
    try:
        import fitz
        doc = fitz.open(stream=watermarked_bytes, filetype="pdf")
        page_count = len(doc)
        doc.close()
    except Exception:
        pass

    # Save to filesystem (or could use Google Drive)
    import os
    storage_dir = "/tmp/deal_room_docs"
    os.makedirs(storage_dir, exist_ok=True)
    storage_path = f"{storage_dir}/{room_id}_{file.filename}"
    with open(storage_path, "wb") as f:
        f.write(watermarked_bytes)

    # Save metadata
    doc_record = DealRoomDocument(
        room_id=room_id,
        original_name=file.filename,
        storage_path=storage_path,
        watermarked=True,
        recipient_email=recipient_email,
        file_size_bytes=len(watermarked_bytes),
        page_count=page_count,
        uploaded_by=current_user.get("email", ""),
    )
    db.add(doc_record)
    await db.commit()
    await db.refresh(doc_record)

    return {
        "id": str(doc_record.id),
        "name": file.filename,
        "watermarked": True,
        "page_count": page_count,
        "size_bytes": len(watermarked_bytes),
    }


@router.get("/{room_id}/documents")
async def list_documents(
    room_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista documentos de un Deal Room."""
    result = await db.execute(
        select(DealRoomDocument).where(
            DealRoomDocument.room_id == room_id,
            DealRoomDocument.is_active == True,
        ).order_by(desc(DealRoomDocument.created_at))
    )
    docs = result.scalars().all()
    return {
        "items": [{
            "id": str(d.id), "name": d.original_name, "watermarked": d.watermarked,
            "recipient_email": d.recipient_email, "page_count": d.page_count,
            "size_bytes": d.file_size_bytes, "uploaded_by": d.uploaded_by,
            "created_at": d.created_at.isoformat(),
        } for d in docs],
        "total": len(docs),
    }


@router.post("/{room_id}/documents/{doc_id}/page-event")
async def record_page_event(
    room_id: UUID,
    doc_id: UUID,
    page_number: int = Query(..., ge=1),
    entered_at: str = Query(...),
    exited_at: str = Query(None),
    session_id: str = Query(...),
    visitor_token: str = Query(...),
    visitor_email: str = Query(None),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Registra evento de visualizacion de pagina (publico, sin auth). Rate limited."""
    now = time.time()

    # Simple rate limiting: 60 events per minute per session
    if session_id in _page_event_limiter:
        count, reset_time = _page_event_limiter[session_id]
        if now - reset_time > 60:
            _page_event_limiter[session_id] = (1, now)
        elif count >= 60:
            raise HTTPException(429, "Rate limit exceeded")
        else:
            _page_event_limiter[session_id] = (count + 1, reset_time)
    else:
        _page_event_limiter[session_id] = (1, now)

    # Hash IP for GDPR
    ip_hash = None
    ua_hash = None
    if request:
        client_ip = request.client.host if request.client else ""
        ip_hash = hashlib.sha256(f"{client_ip}:st4rtup_salt".encode()).hexdigest()[:64]
        ua = request.headers.get("user-agent", "")
        ua_hash = hashlib.sha256(ua.encode()).hexdigest()[:64]

    # Parse dates
    from dateutil.parser import parse as parse_dt
    entered = parse_dt(entered_at)
    exited = parse_dt(exited_at) if exited_at else None
    duration = int((exited - entered).total_seconds()) if exited and entered else None

    event = DealRoomPageEvent(
        document_id=doc_id, room_id=room_id,
        visitor_email=visitor_email, visitor_token=visitor_token,
        page_number=page_number, entered_at=entered, exited_at=exited,
        duration_seconds=duration, session_id=session_id,
        ip_hash=ip_hash, user_agent_hash=ua_hash,
    )
    db.add(event)
    await db.commit()
    return {"status": "ok"}


@router.get("/{room_id}/documents/{doc_id}/analytics")
async def document_analytics(
    room_id: UUID, doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Analytics de un documento (solo vendedor)."""
    events = await db.execute(
        select(DealRoomPageEvent).where(DealRoomPageEvent.document_id == doc_id)
    )
    all_events = events.scalars().all()

    if not all_events:
        return {"total_sessions": 0, "total_events": 0, "pages": [], "visitors": []}

    sessions = set(e.session_id for e in all_events)
    visitors = set(e.visitor_email for e in all_events if e.visitor_email)
    total_time = sum(e.duration_seconds or 0 for e in all_events)

    # Per-page stats
    page_stats: dict = {}
    for e in all_events:
        p = e.page_number
        if p not in page_stats:
            page_stats[p] = {"page": p, "views": 0, "total_seconds": 0}
        page_stats[p]["views"] += 1
        page_stats[p]["total_seconds"] += e.duration_seconds or 0

    pages = sorted(page_stats.values(), key=lambda x: x["page"])
    max_time = max((p["total_seconds"] for p in pages), default=1) or 1
    for p in pages:
        p["intensity"] = round(p["total_seconds"] / max_time, 2)  # 0-1 for heatmap

    # Per-visitor stats
    visitor_stats: dict = {}
    for e in all_events:
        v = e.visitor_email or "Anonimo"
        if v not in visitor_stats:
            visitor_stats[v] = {
                "email": v, "sessions": set(), "total_seconds": 0,
                "pages_viewed": set(), "last_visit": None,
            }
        visitor_stats[v]["sessions"].add(e.session_id)
        visitor_stats[v]["total_seconds"] += e.duration_seconds or 0
        visitor_stats[v]["pages_viewed"].add(e.page_number)
        if not visitor_stats[v]["last_visit"] or (
            e.entered_at and e.entered_at > visitor_stats[v]["last_visit"]
        ):
            visitor_stats[v]["last_visit"] = e.entered_at

    visitor_list = [{
        "email": v["email"],
        "sessions": len(v["sessions"]),
        "total_seconds": v["total_seconds"],
        "pages_viewed": len(v["pages_viewed"]),
        "last_visit": v["last_visit"].isoformat() if v["last_visit"] else None,
    } for v in visitor_stats.values()]

    return {
        "total_sessions": len(sessions),
        "unique_visitors": len(visitors),
        "total_time_seconds": total_time,
        "total_events": len(all_events),
        "pages": pages,
        "visitors": visitor_list,
    }


# ─── NDA Gate (RS-DR-003) ────────────────────────────────────

@router.post("/{room_id}/nda/request")
async def request_nda(
    room_id: UUID,
    member_email: str = Query(...),
    member_name: str = Query(...),
    company_name: str = Query(""),
    db: AsyncSession = Depends(get_db),
):
    """Request NDA signature (public, no auth)."""
    from app.services.nda_service import send_nda
    result = await send_nda(member_email, member_name, company_name)
    return result


@router.get("/{room_id}/nda/status")
async def nda_status(
    room_id: UUID,
    member_email: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Check NDA status for a member (public, no auth)."""
    # For now return a simple check - in production would query deal_room_members
    return {"signed": False, "provider": "checkbox", "message": "NDA pendiente de firma"}


@router.post("/{room_id}/nda/confirm-checkbox")
async def confirm_nda_checkbox(
    room_id: UUID,
    member_email: str = Query(...),
    member_name: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Confirm NDA via checkbox (when no signature provider is configured)."""
    # In production, update deal_room_members with nda_signed=True
    return {"signed": True, "provider": "checkbox", "signed_at": datetime.now(timezone.utc).isoformat()}
