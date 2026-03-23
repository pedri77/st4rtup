"""Schemas de automatizaciones."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from app.models.enums import (
    AutomationStatus, AutomationCategory, AutomationPriority,
    AutomationComplexity, AutomationTriggerType, AutomationPhase,
    AutomationImplStatus,
)
from app.schemas.base import BaseSchema, TimestampSchema


class AutomationCreate(BaseSchema):
    code: str
    name: str
    description: Optional[str] = None
    category: AutomationCategory
    trigger_type: AutomationTriggerType
    trigger_config: Optional[dict] = None
    actions_description: Optional[str] = None
    actions_config: Optional[dict] = None
    api_endpoints: Optional[List[str]] = None
    integrations: Optional[List[str]] = None
    priority: AutomationPriority = AutomationPriority.MEDIUM
    complexity: AutomationComplexity = AutomationComplexity.MEDIUM
    impact: Optional[str] = None
    phase: Optional[AutomationPhase] = None
    sprint: Optional[str] = None
    estimated_hours: Optional[float] = None
    dependencies: Optional[List[str]] = None
    status: AutomationStatus = AutomationStatus.DRAFT
    impl_status: AutomationImplStatus = AutomationImplStatus.PENDING
    is_enabled: bool = False
    n8n_workflow_id: Optional[str] = None
    n8n_workflow_url: Optional[str] = None
    n8n_webhook_url: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class AutomationUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[AutomationCategory] = None
    trigger_type: Optional[AutomationTriggerType] = None
    trigger_config: Optional[dict] = None
    actions_description: Optional[str] = None
    actions_config: Optional[dict] = None
    api_endpoints: Optional[List[str]] = None
    integrations: Optional[List[str]] = None
    priority: Optional[AutomationPriority] = None
    complexity: Optional[AutomationComplexity] = None
    impact: Optional[str] = None
    phase: Optional[AutomationPhase] = None
    sprint: Optional[str] = None
    estimated_hours: Optional[float] = None
    dependencies: Optional[List[str]] = None
    status: Optional[AutomationStatus] = None
    impl_status: Optional[AutomationImplStatus] = None
    is_enabled: Optional[bool] = None
    n8n_workflow_id: Optional[str] = None
    n8n_workflow_url: Optional[str] = None
    n8n_webhook_url: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class AutomationResponse(TimestampSchema):
    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    category: AutomationCategory
    trigger_type: AutomationTriggerType
    trigger_config: Optional[dict] = None
    actions_description: Optional[str] = None
    api_endpoints: Optional[List[str]] = None
    integrations: Optional[List[str]] = None
    priority: AutomationPriority
    complexity: AutomationComplexity
    impact: Optional[str] = None
    phase: Optional[AutomationPhase] = None
    sprint: Optional[str] = None
    estimated_hours: Optional[float] = None
    dependencies: Optional[List[str]] = None
    status: AutomationStatus
    impl_status: AutomationImplStatus
    is_enabled: bool
    n8n_workflow_id: Optional[str] = None
    n8n_workflow_url: Optional[str] = None
    n8n_webhook_url: Optional[str] = None
    tags: Optional[List[str]] = None
    last_execution: Optional[dict] = None
    executions_24h: Optional[int] = 0
    success_rate: Optional[float] = 0.0


class AutomationDetail(AutomationResponse):
    actions_config: Optional[dict] = None
    notes: Optional[str] = None


class AutomationExecutionCreate(BaseSchema):
    automation_id: UUID
    started_at: datetime
    finished_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    status: str
    trigger_source: Optional[str] = None
    items_processed: int = 0
    items_succeeded: int = 0
    items_failed: int = 0
    error_message: Optional[str] = None
    error_details: Optional[dict] = None
    input_data: Optional[dict] = None
    output_data: Optional[dict] = None
    n8n_execution_id: Optional[str] = None


class AutomationExecutionResponse(TimestampSchema):
    id: UUID
    automation_id: UUID
    started_at: datetime
    finished_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    status: str
    trigger_source: Optional[str] = None
    items_processed: int
    items_succeeded: int
    items_failed: int
    error_message: Optional[str] = None
    n8n_execution_id: Optional[str] = None


class AutomationStats(BaseSchema):
    total: int = 0
    by_status: dict = {}
    by_category: dict = {}
    by_priority: dict = {}
    by_impl_status: dict = {}
    by_phase: dict = {}
    active_count: int = 0
    error_count: int = 0
    total_executions_24h: int = 0
    total_success_24h: int = 0
    total_errors_24h: int = 0
    overall_success_rate: float = 0.0
    estimated_hours_total: float = 0.0
    estimated_hours_completed: float = 0.0
