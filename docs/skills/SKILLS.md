# SKILLS.md — Riskitera Sales Development Skills

## Agentes de Desarrollo

Este proyecto se desarrolla con un sistema de agentes especializados. Cada agente tiene un rol, responsabilidades y convenciones específicas. Al trabajar en una tarea, activa el agente relevante.

---

## 🏗️ Agent: BACKEND

**Rol:** Desarrollo del backend FastAPI

### Convenciones

**Endpoints:**
```python
# Siempre async
@router.get("/", response_model=PaginatedResponse)
async def list_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Docstring en español describiendo la funcionalidad."""
```

**Modelos SQLAlchemy:**
```python
class NewModel(BaseModel):
    __tablename__ = "new_models"
    # UUID PK heredado de BaseModel
    # Timestamps heredados de TimestampMixin
    name = Column(String(255), nullable=False)
    status = Column(SAEnum(NewModelStatus), default=NewModelStatus.DRAFT, index=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"))
    metadata_json = Column(JSON)
    lead = relationship("Lead", back_populates="new_models")
```

**Schemas Pydantic:**
```python
class NewModelCreate(BaseSchema):
    name: str
    status: NewModelStatus = NewModelStatus.DRAFT
    # Optional fields con default None

class NewModelUpdate(BaseSchema):
    # Todos Optional para partial update
    name: Optional[str] = None

class NewModelResponse(TimestampSchema):
    id: UUID
    name: str
    status: NewModelStatus
```

**Reglas:**
- Siempre asyncpg, nunca psycopg2
- SQLAlchemy 2.0 style: select(Model).where(), no Model.query
- model_validate() para serializar, model_dump(exclude_unset=True) para updates
- Business logic en services/, no inline en endpoints
- Toda query con .limit() para prevenir full table scans
- Logs con structlog, no print()
- Nunca exponer stack traces al cliente

---

## 🎨 Agent: FRONTEND

**Rol:** Desarrollo del frontend React

### Convenciones

**Componentes:**
```jsx
// Funcional, con hooks
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { someApi } from '@/services/api'
import toast from 'react-hot-toast'

export default function ComponentName() {
  const queryClient = useQueryClient()
  
  const { data, isLoading } = useQuery({
    queryKey: ['resource-name', { filters }],
    queryFn: () => someApi.list(filters).then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data) => someApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-name'] })
      toast.success('Creado correctamente')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error'),
  })

  if (isLoading) return <LoadingSpinner />
  
  return (/* JSX */)
}
```

**Estilos (TailwindCSS):**
- Usar clases de utilidad, no CSS custom
- clsx() para clases condicionales
- Componentes base en styles/index.css: .btn-primary, .btn-secondary, .card, .input, .badge
- Colores de marca: brand (1e40af), brand-light (3b82f6), brand-dark (1e3a8a)
- Responsive: mobile-first (sm:, md:, lg:)

**Estructura de página:**
```
pages/
  ModulePage.jsx          # Lista con filtros
  ModuleDetailPage.jsx    # Detalle con tabs
components/
  module/
    ModuleForm.jsx        # Formulario crear/editar
    ModuleCard.jsx        # Card individual
    ModuleFilters.jsx     # Barra de filtros
  common/
    LoadingSpinner.jsx
    EmptyState.jsx
    Pagination.jsx
    ConfirmDialog.jsx
```

**Reglas:**
- Nunca class components
- Keys únicas en listas (usar id, nunca index)
- Lazy loading para páginas pesadas
- Error boundaries en pages
- Accesibilidad: aria-labels en iconos, focus management en modales

---

## 🧪 Agent: TEST

**Rol:** Testing y calidad

### Backend Tests

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def auth_headers():
    token = create_test_token(user_id="test-user", email="test@riskitera.com")
    return {"Authorization": f"Bearer {token}"}
```

```python
# tests/test_leads.py
@pytest.mark.asyncio
async def test_create_lead(client, auth_headers):
    response = await client.post("/api/v1/leads", json={
        "company_name": "Test Company",
        "status": "new",
        "source": "website",
    }, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == "Test Company"
    assert data["status"] == "new"
    assert "id" in data
```

**Estructura:**
```
tests/
├── conftest.py           # Fixtures compartidas
├── test_leads.py         # Tests por módulo
├── test_visits.py
├── test_emails.py
├── test_actions.py
├── test_opportunities.py
├── test_automations.py
├── test_dashboard.py
└── test_auth.py
```

**Reglas:**
- Mínimo 1 test por endpoint (happy path)
- Tests de validación (datos incorrectos → 422)
- Tests de auth (sin token → 401)
- Tests de not found (UUID inexistente → 404)
- Factories para crear datos de test (no fixtures hardcodeados)
- No testear implementación, testear comportamiento

---

## 🔒 Agent: SECURITY

**Rol:** Seguridad y hardening

### Checklist por Feature

- [ ] **Auth:** Endpoint protegido con get_current_user
- [ ] **Input validation:** Pydantic schema valida todos los campos
- [ ] **SQL injection:** Usar SQLAlchemy parametrizado, nunca f-strings en queries
- [ ] **CORS:** Solo orígenes permitidos en config
- [ ] **Rate limiting:** Implementar en endpoints públicos (webhooks)
- [ ] **Secrets:** Nunca en código, siempre en .env
- [ ] **Error handling:** No exponer stack traces ni mensajes internos
- [ ] **UUID validation:** FastAPI valida automáticamente con tipo UUID
- [ ] **Pagination limits:** page_size max=100
- [ ] **HTTPS:** Forzado en producción (Railway/Cloudflare)

### Headers de Seguridad (middleware)
```python
# app/core/middleware.py
@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
```

### Webhooks n8n
```python
# Validar secret en webhooks entrantes
WEBHOOK_SECRET = settings.N8N_WEBHOOK_SECRET

async def verify_webhook(request: Request):
    signature = request.headers.get("X-Webhook-Signature")
    if not signature or not hmac.compare_digest(signature, expected):
        raise HTTPException(401, "Invalid webhook signature")
```

---

## 🎯 Agent: UX

**Rol:** Experiencia de usuario y diseño de interacción

### Principios UX

1. **Acción inmediata:** Cada pantalla debe tener una acción primaria clara (CTA)
2. **Feedback instantáneo:** Toast en toda mutación (create/update/delete/toggle)
3. **Zero state:** Cuando no hay datos, mostrar ilustración + acción para crear
4. **Progressive disclosure:** Información básica visible, detalles en modal/expandible
5. **Keyboard first:** Shortcuts para acciones frecuentes (N=nuevo, /=buscar)

### Patterns de UI

**Tablas:**
- Header sticky con sort
- Hover row highlight
- Click row → detail
- Checkbox para bulk actions
- Pagination al fondo

**Formularios:**
- Labels siempre visibles (no solo placeholder)
- Validación inline en blur
- Botón submit deshabilitado hasta form válido
- Loading state en submit
- Toast success/error en resultado

**Modales:**
- Click fuera para cerrar
- Escape para cerrar
- Focus trap dentro del modal
- Max-height con scroll interno
- Overlay con backdrop-blur

**Cards colapsables (Automations pattern):**
- Header con icono, label, count, estado
- Click header → toggle expand
- Contenido: tabla o lista dentro
- Animación suave de expand/collapse

### Colores Semánticos

| Contexto | Color |
|----------|-------|
| Éxito, activo, positivo | green-500/600 |
| Error, crítico, negativo | red-500/600 |
| Warning, pendiente | amber-500/600 |
| Info, en progreso | blue-500/600 |
| Neutro, draft | gray-400/500 |
| Marca Riskitera | brand (#1e40af) |

---

## 🖼️ Agent: UI

**Rol:** Implementación visual y componentes

### Design System

**Typography:**
- Font: system-ui (Tailwind default) — rápido, no necesita cargar fonts
- Headings: text-2xl font-bold text-gray-900
- Body: text-sm text-gray-600
- Labels: text-xs font-medium text-gray-500 uppercase tracking-wide
- Monospace: font-mono (para IDs, código, config)

**Spacing:**
- Page padding: p-8
- Card padding: p-6
- Section gap: mb-6
- Grid gap: gap-4 o gap-6
- Consistent vertical rhythm

**Componentes Reutilizables a crear:**

```
components/common/
├── LoadingSpinner.jsx    # Spinner centered
├── EmptyState.jsx        # Icon + message + CTA
├── Pagination.jsx        # Prev/Next + page numbers
├── StatusBadge.jsx       # Badge coloreado por status
├── PriorityBadge.jsx     # Badge coloreado por prioridad
├── ConfirmDialog.jsx     # Modal de confirmación
├── SearchInput.jsx       # Input con icono lupa
├── FilterSelect.jsx      # Select estilizado
├── StatCard.jsx          # KPI card reutilizable
├── DataTable.jsx         # Tabla con sort, search, pagination
└── Modal.jsx             # Modal base reutilizable
```

---

## 📊 Agent: DATA

**Rol:** Base de datos y migraciones

### Convenciones SQL

```sql
-- Nombres: snake_case, plural para tablas
CREATE TABLE new_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Campos específicos
    name VARCHAR(255) NOT NULL,
    status feature_status DEFAULT 'draft',
    config JSONB,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    -- Timestamps siempre al final
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices en: FKs, status, columnas de filtro/sort frecuente
CREATE INDEX idx_new_features_lead_id ON new_features(lead_id);
CREATE INDEX idx_new_features_status ON new_features(status);

-- Trigger updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON new_features
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Migraciones
- Archivos en `scripts/XXX_description.sql`
- Numeración secuencial: 001, 002, 003...
- Cada migración debe ser idempotente cuando sea posible
- Probar en local antes de ejecutar en Supabase producción
- Backup antes de migraciones destructivas

---

## 🔄 Agent: N8N

**Rol:** Diseño e implementación de automatizaciones n8n

### Convenciones Workflows

**Nomenclatura:**
- Workflow name: `[CODE] - Nombre` (ej: `EM-01 - Secuencia Welcome`)
- Webhook path: `/hooks/{code-lowercase}` (ej: `/hooks/em-01`)
- Notas en cada nodo explicando qué hace

**Estructura tipo:**
```
Trigger → Validate Input → Core Logic → Update API → Notify
  ↓                                         ↓
Error Handler ←─────────────────── Log Execution
```

**HTTP Request a la API:**
```json
{
  "method": "POST",
  "url": "https://api-sales.riskitera.com/api/v1/leads",
  "headers": {
    "Authorization": "Bearer {{ $env.API_TOKEN }}",
    "Content-Type": "application/json"
  },
  "body": "{{ JSON.stringify($json) }}"
}
```

**Error handling:**
- Cada workflow debe tener un nodo Error Trigger
- Error → log execution via API + alerta Telegram
- Reintentos: 3 intentos con backoff exponencial

**Logging de ejecuciones:**
- Al inicio: crear execution (status=running)
- Al final: actualizar execution (status=success/error, duration, items)
```
POST /api/v1/automations/executions
{
  "automation_id": "uuid",
  "started_at": "2026-02-25T10:00:00Z",
  "status": "success",
  "trigger_source": "cron",
  "items_processed": 5,
  "items_succeeded": 4,
  "items_failed": 1,
  "duration_ms": 1234
}
```

---

## 📝 Agent: DOCS

**Rol:** Documentación técnica y de usuario

### Estructura de docs
```
docs/
├── PRD-riskitera-sales.md        # Product Requirements
├── ADR-001-architecture.md        # Architecture Decision Record
├── ADR-002-automations.md         # ADR automatizaciones (futuro)
├── API.md                         # API reference (autogenerado de OpenAPI)
├── DEPLOY.md                      # Guía de deploy
└── skills/                        # Este directorio
    └── (archivos de skills por agente)
```

### Reglas
- ADRs numerados secuencialmente
- PRD actualizado con cada nueva feature
- README.md en raíz siempre actualizado
- Comentarios en código en español
- Docstrings en endpoints
- CHANGELOG.md con cada release
