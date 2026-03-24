"""Modelos del gestor documental de marketing."""
from sqlalchemy import (
    Column, String, Text, Integer, JSON, ForeignKey,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.enums import DocumentFolder, DocumentStatus, AssetLanguage


class MarketingDocument(BaseModel):
    """Documento de marketing con versionado y vinculación."""
    __tablename__ = "marketing_documents"

    name = Column(String(255), nullable=False, index=True)
    folder = Column(SAEnum(DocumentFolder), nullable=False, index=True)
    file_type = Column(String(50), nullable=False)  # pdf, docx, pptx, xlsx, png, jpg, etc.
    drive_file_id = Column(String(255))  # Google Drive file ID
    drive_url = Column(String(500))  # Google Drive URL
    preview_url = Column(String(500))  # Thumbnail / preview URL
    file_url = Column(String(500))  # Direct download URL (if not Drive)
    file_size = Column(Integer)  # File size in bytes
    version = Column(Integer, default=1)
    status = Column(
        SAEnum(DocumentStatus),
        default=DocumentStatus.DRAFT,
        nullable=False,
        index=True,
    )
    language = Column(SAEnum(AssetLanguage), default=AssetLanguage.ES)
    description = Column(Text)
    regulatory_focus = Column(String(100))  # ENS / NIS2 / DORA / SaaS Best Practices / Mixto
    persona_target = Column(String(100))  # CEO / DPO / CTO / Compliance Officer
    tags = Column(JSON)  # ["nis2", "españa", "guía"]

    # FK
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    versions = relationship("MarketingDocumentVersion", back_populates="document", cascade="all, delete-orphan")
    links = relationship("MarketingDocumentLink", back_populates="document", cascade="all, delete-orphan")


class MarketingDocumentVersion(BaseModel):
    """Historial de versiones de un documento."""
    __tablename__ = "marketing_document_versions"

    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("marketing_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version = Column(Integer, nullable=False)
    drive_file_id = Column(String(255))
    drive_url = Column(String(500))
    file_url = Column(String(500))
    file_size = Column(Integer)
    notes = Column(Text)
    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    document = relationship("MarketingDocument", back_populates="versions")


class MarketingDocumentLink(BaseModel):
    """Vinculación de documento con entidades (deals, leads, etc.)."""
    __tablename__ = "marketing_document_links"

    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("marketing_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entity_type = Column(String(50), nullable=False)  # lead, opportunity, offer, contact
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    linked_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    document = relationship("MarketingDocument", back_populates="links")
