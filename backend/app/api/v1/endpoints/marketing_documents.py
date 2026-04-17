"""Endpoints CRUD para gestor documental de marketing con Google Drive."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.marketing_document import (
    MarketingDocument, MarketingDocumentVersion, MarketingDocumentLink,
)
from app.models.enums import DocumentFolder, DocumentStatus, AssetLanguage
from app.schemas.marketing_document import (
    MarketingDocumentCreate, MarketingDocumentUpdate, MarketingDocumentResponse,
    MarketingDocumentVersionResponse, MarketingDocumentLinkResponse,
    DocumentLinkCreate,
)
from app.schemas.base import PaginatedResponse
from app.services.google_drive_service import upload_to_drive, delete_from_drive

router = APIRouter()


def _doc_response(doc, include_relations=False):
    """Serializa un documento evitando lazy-load de relaciones."""
    data = {
        "id": doc.id, "name": doc.name, "folder": doc.folder,
        "file_type": doc.file_type, "drive_file_id": doc.drive_file_id,
        "drive_url": doc.drive_url, "preview_url": doc.preview_url,
        "file_url": doc.file_url, "file_size": doc.file_size,
        "version": doc.version, "status": doc.status, "language": doc.language,
        "description": doc.description, "regulatory_focus": doc.regulatory_focus,
        "persona_target": doc.persona_target, "tags": doc.tags,
        "campaign_id": doc.campaign_id, "uploaded_by": doc.uploaded_by,
        "created_at": doc.created_at, "updated_at": doc.updated_at,
    }
    if include_relations:
        data["versions"] = [MarketingDocumentVersionResponse.model_validate(v) for v in doc.versions]
        data["links"] = [MarketingDocumentLinkResponse.model_validate(link) for link in doc.links]
    return MarketingDocumentResponse.model_validate(data)


# ─── Documents CRUD ───────────────────────────────────────────


@router.get("", response_model=PaginatedResponse)
async def list_documents(
    folder: Optional[DocumentFolder] = None,
    status: Optional[DocumentStatus] = None,
    language: Optional[AssetLanguage] = None,
    campaign_id: Optional[UUID] = None,
    search: Optional[str] = Query(None, max_length=100),
    regulatory_focus: Optional[str] = None,
    persona_target: Optional[str] = None,
    file_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista documentos de marketing con filtros."""
    query = select(MarketingDocument).order_by(MarketingDocument.created_at.desc())

    if folder:
        query = query.where(MarketingDocument.folder == folder)
    if status:
        query = query.where(MarketingDocument.status == status)
    if language:
        query = query.where(MarketingDocument.language == language)
    if campaign_id:
        query = query.where(MarketingDocument.campaign_id == campaign_id)
    if file_type:
        query = query.where(MarketingDocument.file_type == file_type)
    if regulatory_focus:
        query = query.where(MarketingDocument.regulatory_focus == regulatory_focus)
    if persona_target:
        query = query.where(MarketingDocument.persona_target == persona_target)
    if search:
        query = query.where(
            MarketingDocument.name.ilike(f"%{search}%")
            | MarketingDocument.description.ilike(f"%{search}%")
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[_doc_response(d) for d in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=MarketingDocumentResponse, status_code=201)
async def create_document(
    data: MarketingDocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea un documento de marketing (metadatos)."""
    doc = MarketingDocument(
        **data.model_dump(),
        uploaded_by=UUID(current_user["user_id"]),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return _doc_response(doc)


@router.post("/upload", response_model=MarketingDocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    name: str = Form(...),
    folder: DocumentFolder = Form(...),
    status: DocumentStatus = Form(DocumentStatus.DRAFT),
    language: AssetLanguage = Form(AssetLanguage.ES),
    description: Optional[str] = Form(None),
    regulatory_focus: Optional[str] = Form(None),
    persona_target: Optional[str] = Form(None),
    campaign_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Sube un archivo a Google Drive y crea el registro en BD."""
    # Validate file size (max 50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="El archivo excede el tamaño máximo de 50MB")

    filename = file.filename or name
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # Validate file type
    ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg", "gif", "svg", "csv", "txt", "md", "zip"}
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Tipo de archivo no permitido: .{ext}")

    # Upload to Google Drive
    drive_result = await upload_to_drive(
        file_content=file_content,
        filename=filename,
        folder=folder,
        language=language,
    )

    doc = MarketingDocument(
        name=name,
        folder=folder,
        file_type=ext,
        drive_file_id=drive_result["drive_file_id"] if drive_result else None,
        drive_url=drive_result["drive_url"] if drive_result else None,
        file_size=drive_result["file_size"] if drive_result else len(file_content),
        status=status,
        language=language,
        description=description,
        regulatory_focus=regulatory_focus,
        persona_target=persona_target,
        campaign_id=UUID(campaign_id) if campaign_id else None,
        uploaded_by=UUID(current_user["user_id"]),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return _doc_response(doc)


@router.get("/stats")
async def document_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estadísticas del gestor documental."""
    total = await db.scalar(select(func.count(MarketingDocument.id))) or 0

    # By folder
    folder_q = await db.execute(
        select(MarketingDocument.folder, func.count())
        .group_by(MarketingDocument.folder)
    )
    by_folder = {
        str(row[0].value) if hasattr(row[0], "value") else str(row[0]): row[1]
        for row in folder_q.all()
    }

    # By status
    status_q = await db.execute(
        select(MarketingDocument.status, func.count())
        .group_by(MarketingDocument.status)
    )
    by_status = {
        str(row[0].value) if hasattr(row[0], "value") else str(row[0]): row[1]
        for row in status_q.all()
    }

    # Total size
    total_size = await db.scalar(select(func.sum(MarketingDocument.file_size))) or 0

    return {
        "total": total,
        "by_folder": by_folder,
        "by_status": by_status,
        "total_size_bytes": total_size,
    }


@router.get("/{doc_id}", response_model=MarketingDocumentResponse)
async def get_document(
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene un documento con sus versiones y links."""
    result = await db.execute(
        select(MarketingDocument)
        .options(selectinload(MarketingDocument.versions), selectinload(MarketingDocument.links))
        .where(MarketingDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return _doc_response(doc, include_relations=True)


@router.put("/{doc_id}", response_model=MarketingDocumentResponse)
async def update_document(
    doc_id: UUID,
    data: MarketingDocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza metadatos de un documento."""
    result = await db.execute(
        select(MarketingDocument).where(MarketingDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(doc, key, value)

    await db.commit()
    await db.refresh(doc)
    return _doc_response(doc)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina un documento y su archivo de Drive."""
    result = await db.execute(
        select(MarketingDocument).where(MarketingDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    # Delete from Google Drive if exists
    if doc.drive_file_id:
        await delete_from_drive(doc.drive_file_id)

    await db.delete(doc)
    await db.commit()


# ─── Version Management ──────────────────────────────────────


@router.post("/{doc_id}/versions", response_model=MarketingDocumentVersionResponse, status_code=201)
async def create_version(
    doc_id: UUID,
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Sube una nueva versión de un documento."""
    result = await db.execute(
        select(MarketingDocument).where(MarketingDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    file_content = await file.read()
    if len(file_content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo excede el tamaño máximo de 50MB")
    filename = file.filename or doc.name

    # Upload new version to Drive
    drive_result = await upload_to_drive(
        file_content=file_content,
        filename=filename,
        folder=doc.folder.value if hasattr(doc.folder, "value") else doc.folder,
        language=doc.language.value if hasattr(doc.language, "value") else doc.language,
    )

    new_version = doc.version + 1

    # Save current as version snapshot
    version = MarketingDocumentVersion(
        document_id=doc.id,
        version=new_version,
        drive_file_id=drive_result["drive_file_id"] if drive_result else None,
        drive_url=drive_result["drive_url"] if drive_result else None,
        file_size=drive_result["file_size"] if drive_result else len(file_content),
        notes=notes,
        uploaded_by=UUID(current_user["user_id"]),
    )
    db.add(version)

    # Update document to point to new version
    doc.version = new_version
    if drive_result:
        doc.drive_file_id = drive_result["drive_file_id"]
        doc.drive_url = drive_result["drive_url"]
        doc.file_size = drive_result["file_size"]

    await db.commit()
    await db.refresh(version)
    return MarketingDocumentVersionResponse.model_validate(version)


@router.get("/{doc_id}/versions", response_model=list[MarketingDocumentVersionResponse])
async def list_versions(
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista versiones de un documento."""
    result = await db.execute(
        select(MarketingDocumentVersion)
        .where(MarketingDocumentVersion.document_id == doc_id)
        .order_by(MarketingDocumentVersion.version.desc())
    )
    return [MarketingDocumentVersionResponse.model_validate(v) for v in result.scalars().all()]


# ─── Entity Links ─────────────────────────────────────────────


@router.post("/{doc_id}/links", response_model=MarketingDocumentLinkResponse, status_code=201)
async def create_link(
    doc_id: UUID,
    data: DocumentLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Vincula un documento a una entidad (lead, opportunity, etc.)."""
    # Verify document exists
    result = await db.execute(
        select(MarketingDocument).where(MarketingDocument.id == doc_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    link = MarketingDocumentLink(
        document_id=doc_id,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        linked_by=UUID(current_user["user_id"]),
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return MarketingDocumentLinkResponse.model_validate(link)


@router.get("/{doc_id}/links", response_model=list[MarketingDocumentLinkResponse])
async def list_links(
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista las entidades vinculadas a un documento."""
    result = await db.execute(
        select(MarketingDocumentLink)
        .where(MarketingDocumentLink.document_id == doc_id)
        .order_by(MarketingDocumentLink.created_at.desc())
    )
    return [MarketingDocumentLinkResponse.model_validate(link) for link in result.scalars().all()]


@router.delete("/{doc_id}/links/{link_id}", status_code=204)
async def delete_link(
    doc_id: UUID,
    link_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina un vínculo documento-entidad."""
    result = await db.execute(
        select(MarketingDocumentLink)
        .where(MarketingDocumentLink.id == link_id, MarketingDocumentLink.document_id == doc_id)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Vínculo no encontrado")
    await db.delete(link)
    await db.commit()


# ═══════════════════════════════════════════════════════════════
# Google Drive Browser
# ═══════════════════════════════════════════════════════════════


@router.get("/drive/browse")
async def browse_drive(
    folder: str = Query("content", description="Carpeta: templates, campaigns, content, battlecards, legal"),
    max_results: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """Lista archivos en una carpeta de Google Drive."""
    from app.services.google_drive_service import list_drive_files, FOLDER_DRIVE_MAP
    files = await list_drive_files(folder, max_results)
    return {
        "folder": folder,
        "files": files,
        "total": len(files),
        "available_folders": list(FOLDER_DRIVE_MAP.keys()),
    }


@router.get("/drive/status")
async def drive_status(
    current_user: dict = Depends(get_current_user),
):
    """Verifica si Google Drive esta configurado."""
    from app.services.google_drive_service import _get_drive_service, FOLDER_DRIVE_MAP
    service = _get_drive_service()
    configured_folders = {k: bool(v) for k, v in FOLDER_DRIVE_MAP.items()}
    return {
        "connected": service is not None,
        "folders": configured_folders,
    }
