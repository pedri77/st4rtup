"""Schemas del gestor documental de marketing."""
from typing import Optional, List
from uuid import UUID
from pydantic import Field

from app.models.enums import DocumentFolder, DocumentStatus, AssetLanguage
from app.schemas.base import BaseSchema, TimestampSchema


# ─── Document Schemas ─────────────────────────────────────────

class MarketingDocumentCreate(BaseSchema):
    name: str = Field(..., max_length=255)
    folder: DocumentFolder
    file_type: str = Field(..., max_length=50)
    drive_file_id: Optional[str] = None
    drive_url: Optional[str] = None
    preview_url: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    status: DocumentStatus = DocumentStatus.DRAFT
    language: AssetLanguage = AssetLanguage.ES
    description: Optional[str] = None
    regulatory_focus: Optional[str] = None
    persona_target: Optional[str] = None
    tags: Optional[List[str]] = None
    campaign_id: Optional[UUID] = None


class MarketingDocumentUpdate(BaseSchema):
    name: Optional[str] = Field(None, max_length=255)
    folder: Optional[DocumentFolder] = None
    status: Optional[DocumentStatus] = None
    language: Optional[AssetLanguage] = None
    description: Optional[str] = None
    regulatory_focus: Optional[str] = None
    persona_target: Optional[str] = None
    tags: Optional[List[str]] = None
    campaign_id: Optional[UUID] = None
    drive_file_id: Optional[str] = None
    drive_url: Optional[str] = None
    preview_url: Optional[str] = None
    file_url: Optional[str] = None


class MarketingDocumentVersionResponse(TimestampSchema):
    id: UUID
    document_id: UUID
    version: int
    drive_file_id: Optional[str] = None
    drive_url: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    notes: Optional[str] = None
    uploaded_by: Optional[UUID] = None


class MarketingDocumentLinkResponse(TimestampSchema):
    id: UUID
    document_id: UUID
    entity_type: str
    entity_id: UUID
    linked_by: Optional[UUID] = None


class MarketingDocumentResponse(TimestampSchema):
    id: UUID
    name: str
    folder: DocumentFolder
    file_type: str
    drive_file_id: Optional[str] = None
    drive_url: Optional[str] = None
    preview_url: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    version: int
    status: DocumentStatus
    language: AssetLanguage
    description: Optional[str] = None
    regulatory_focus: Optional[str] = None
    persona_target: Optional[str] = None
    tags: Optional[List[str]] = None
    campaign_id: Optional[UUID] = None
    uploaded_by: Optional[UUID] = None
    versions: Optional[List[MarketingDocumentVersionResponse]] = None
    links: Optional[List[MarketingDocumentLinkResponse]] = None


# ─── Version Schemas ──────────────────────────────────────────

class DocumentVersionCreate(BaseSchema):
    drive_file_id: Optional[str] = None
    drive_url: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    notes: Optional[str] = None


# ─── Link Schemas ─────────────────────────────────────────────

class DocumentLinkCreate(BaseSchema):
    entity_type: str = Field(..., max_length=50)
    entity_id: UUID
