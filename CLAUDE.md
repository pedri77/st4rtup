# CLAUDE.md — Riskitera Sales

## Proyecto

Riskitera Sales es el CRM comercial interno de **Riskitera**, una plataforma SaaS de ciberseguridad GRC. Este sistema gestiona el ciclo completo de ventas: captación de leads, seguimiento comercial, pipeline de oportunidades, planes de cuenta, encuestas de satisfacción, y 22 automatizaciones n8n.

**URL producción:** https://sales.riskitera.com
**Repositorio:** https://github.com/pedri77/riskitera-sales

## Stack Tecnológico

| Capa | Tecnología | Hosting |
|------|-----------|---------|
| Frontend | React 18 + Vite + TailwindCSS | Cloudflare Pages |
| Backend | FastAPI + Python 3.11 (async) | Fly.io (región CDG) |
| Base de datos | PostgreSQL 15 | Fly.io Postgres (región CDG) |
| Auth | Supabase Auth + JWT (HS256) | Supabase |
| Email transaccional | Multi-proveedor (Resend, Zoho, Brevo, SES, Mailgun, SMTP) | — |
| Automatizaciones | n8n (self-hosted o cloud) | — |
| Notificaciones | Telegram Bot API | — |

## Estructura del Proyecto

```
riskitera-sales/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # 19 routers: leads, visits, emails, actions,
│   │   │                       # opportunities, offers, accounts, reviews, surveys,
│   │   │                       # dashboard, automations, automation_tasks, settings,
│   │   │                       # contacts, notifications, reports, chat, users, debug
│   │   ├── core/               # config.py, database.py, security.py
│   │   ├── models/             # SQLAlchemy models — archivos por dominio:
│   │   │   ├── enums.py        #   Enums PostgreSQL (status, category, etc.)
│   │   │   ├── base.py         #   Base declarativa
│   │   │   ├── user.py         #   User
│   │   │   ├── lead.py         #   Lead
│   │   │   ├── crm.py          #   Visit, Email, AccountPlan, Action, MonthlyReview
│   │   │   ├── pipeline.py     #   Opportunity, Offer
│   │   │   ├── survey.py       #   Survey, EmailTemplate
│   │   │   ├── contact.py      #   Contact
│   │   │   ├── automation.py   #   Automation, AutomationExecution
│   │   │   ├── notification.py #   Notification
│   │   │   ├── system.py       #   SystemSettings, ChatConversation, ChatMessage
│   │   │   └── models.py       #   Re-export shim (backward compat)
│   │   ├── schemas/            # Pydantic v2 schemas — archivos por dominio:
│   │   │   ├── base.py         #   BaseSchema, TimestampSchema, PaginatedResponse
│   │   │   ├── user.py         #   User CRUD schemas
│   │   │   ├── lead.py         #   Lead CRUD schemas
│   │   │   ├── crm.py          #   Visit, Email, Action, AccountPlan, MonthlyReview
│   │   │   ├── pipeline.py     #   Opportunity, Offer schemas
│   │   │   ├── survey.py       #   Survey schemas
│   │   │   ├── contact.py      #   Contact schemas
│   │   │   ├── automation.py   #   Automation + Execution schemas
│   │   │   ├── dashboard.py    #   DashboardStats
│   │   │   ├── notification.py #   Notification schemas
│   │   │   ├── chat.py         #   Chat schemas
│   │   │   └── schemas.py      #   Re-export shim (backward compat)
│   │   ├── services/           # Business logic:
│   │   │   ├── email_service.py          # Multi-provider email sending
│   │   │   ├── notification_service.py   # DB + Telegram + Slack/Teams dispatch
│   │   │   ├── slack_teams_service.py    # Slack webhook/Bot + Teams webhook
│   │   │   ├── telegram_service.py       # Telegram Bot API
│   │   │   ├── hunter_service.py         # Hunter.io email verification
│   │   │   ├── whatsapp_service.py       # WhatsApp Business Cloud API
│   │   │   ├── webhook_dispatcher.py     # Outgoing webhook HMAC dispatch
│   │   │   ├── content_pipeline.py       # 4 AI agents: keyword→draft→SEO→meta
│   │   │   ├── social_listening.py       # Brand/competitor monitoring
│   │   │   ├── feature_flags.py          # GrowthBook + local flags
│   │   │   ├── gcalendar_service.py      # Google Calendar bidirectional sync
│   │   │   ├── waalaxy_service.py        # Waalaxy LinkedIn outreach
│   │   │   ├── vllm_service.py           # Self-hosted vLLM inference
│   │   │   └── guardrail_engine.py       # Cost control guardrails
│   │   └── utils/              # Helpers
│   ├── alembic/                # Migraciones DB (async)
│   ├── tests/                  # Pytest + pytest-asyncio (33 test files)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # Layout, dashboard widgets, common components
│   │   │   ├── common/         #   EmptyState, InlineEdit (reusable)
│   │   │   ├── ActivityHeatmap.jsx  # GitHub-style heatmap
│   │   │   └── ThemeToggle.jsx      # Dark/light mode switch
│   │   ├── pages/              # 48+ pages: Dashboard, Leads, Pipeline,
│   │   │                       # Actions, GTM, Agents, Marketing, Calls,
│   │   │                       # ContentPipeline, ReportBuilder, Webhooks,
│   │   │                       # AlertChannels, CostControl, Social, etc.
│   │   ├── services/api.js     # Axios client con interceptors
│   │   ├── hooks/              # useUserRole, usePersistedFilters, useLeadsSelect, etc.
│   │   ├── store/              # Zustand stores (useUIStore, useUserPreferencesStore, useAuthStore)
│   │   ├── contexts/           # AuthContext (Supabase auth)
│   │   └── test/               # Vitest setup (setup.js)
│   ├── package.json
│   └── vite.config.js
├── scripts/                    # SQL migrations
├── docs/                       # ADR, PRD, skills
└── CLAUDE.md                   # ← Este archivo
```

## Comandos Esenciales

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev

# Tests backend
cd backend && pytest tests/ -v --asyncio-mode=auto

# Tests frontend
cd frontend && npm test          # watch mode
cd frontend && npm run test:run  # CI mode

# Migraciones
cd backend && alembic upgrade head
alembic revision --autogenerate -m "description"

# Lint
cd frontend && npm run lint
cd backend && ruff check app/
```

## Base de Datos

- **PostgreSQL 15** en Fly.io Postgres (async via asyncpg)
- **50+ tablas:** leads, visits, emails, account_plans, actions, opportunities, offers, monthly_reviews, surveys, email_templates, contacts, notifications, automations, automation_executions, system_settings, chat_conversations, chat_messages, webhook_logs, webhook_subscriptions, social_posts, social_recurrences, landing_pages, workflow_audit_log, budget_caps, cost_events, guardrail_log, kpi_history, seo_keywords, seo_rankings, etc.
- **Convenciones:**
  - UUID como PK (gen_random_uuid())
  - Timestamps: created_at, updated_at con trigger automático
  - Enums PostgreSQL nativos para estados
  - JSON/JSONB para datos flexibles (tags, config, attendees)
  - Foreign keys con ON DELETE CASCADE
  - Índices en columnas de filtro frecuente (status, lead_id, dates)

## API

- **Prefijo:** `/api/v1`
- **Auth:** Bearer JWT en header Authorization
- **Paginación:** `?page=1&page_size=20` → `PaginatedResponse`
- **Filtros:** query params específicos por endpoint
- **Errores:** HTTPException con status codes estándar
- **Docs:** `/docs` (Swagger) y `/redoc`

## Módulos del CRM

| Módulo | Endpoint | Estado |
|--------|----------|--------|
| Dashboard | /dashboard/stats | ✅ Implementado |
| Leads | /leads | ✅ CRUD completo |
| Visitas | /visits | ✅ CRUD completo |
| Emails | /emails + /emails/{id}/send | ✅ CRUD + envío |
| Acciones | /actions | ✅ CRUD completo |
| Oportunidades | /opportunities | ✅ CRUD completo |
| Ofertas | /offers | ✅ CRUD completo |
| Planes de Cuenta | /account-plans | ✅ CRUD completo |
| Seguimiento Mensual | /monthly-reviews | ✅ CRUD completo |
| Encuestas | /surveys | ✅ CRUD completo |
| Contactos | /contacts | ✅ CRUD completo |
| Automatizaciones | /automations + /seed | ✅ CRUD + toggle + executions + seed |
| Tareas Automáticas | /automation-tasks | ✅ Gestión de tareas |
| Notificaciones | /notifications | ✅ CRUD + marcar leídas |
| Chat | /chat | ✅ Conversaciones + mensajes |
| Reportes | /reports | ✅ Pipeline, actividad, rendimiento |
| Usuarios | /users + /me/profile | ✅ CRUD + roles (admin/comercial/viewer) |
| Configuración | /settings | ✅ CRUD + test email (admin only) |
| Integraciones | Frontend /integrations | ✅ Email, Telegram, n8n, Apollo, Webhooks |

## Automatizaciones n8n (22 workflows)

Las 22 automatizaciones están definidas en `/api/v1/automations/seed`:

| ID | Nombre | Categoría | Prioridad |
|----|--------|-----------|-----------|
| EM-01 | Secuencia Welcome | Email Automation | Crítica |
| EM-02 | Tracking de Email | Email Automation | Crítica |
| EM-03 | Re-engagement | Email Automation | Alta |
| EM-04 | Follow-up Post-Visita | Email Automation | Alta |
| LD-01 | Webhook Formulario Web | Leads & Captación | Crítica |
| LD-02 | Sincronización Apollo.io | Leads & Captación | Alta |
| LD-03 | Enriquecimiento Automático | Leads & Captación | Media |
| LD-04 | Lead Scoring Automático | Leads & Captación | Alta |
| VI-01 | Auto-crear Acciones Post-Visita | Visitas | Alta |
| VI-02 | Recordatorio Pre-Visita | Visitas | Media |
| VI-03 | Sync Google Calendar | Visitas | Media |
| AC-01 | Resumen Diario de Acciones | Acciones & Alertas | Crítica |
| AC-02 | Escalado Automático | Acciones & Alertas | Alta |
| AC-03 | Auto-cierre Acciones | Acciones & Alertas | Media |
| PI-01 | Triggers por Cambio de Etapa | Pipeline | Alta |
| PI-02 | Report Semanal Pipeline | Pipeline | Alta |
| PI-03 | Alerta Deal Estancado | Pipeline | Alta |
| MR-01 | Auto-generación Monthly Review | Seguimiento Mensual | Crítica |
| MR-02 | Informe Mensual Consolidado | Seguimiento Mensual | Alta |
| SV-01 | Encuesta Post-Cierre (NPS) | Encuestas | Alta |
| SV-02 | Encuesta Trimestral CSAT | Encuestas | Media |
| IN-01 | Importar Leads Scraping | Integraciones | Alta |
| IN-02 | Notificaciones Telegram Hub | Integraciones | Alta |

## Reglas de Desarrollo

### Backend (Python/FastAPI)
- Siempre usar async/await (asyncpg, no psycopg2)
- SQLAlchemy 2.0 style (select(), no legacy query())
- Pydantic v2 con model_validate() y model_dump()
- Todo endpoint protegido con Depends(get_current_user)
- Separar lógica de negocio en services/, no en endpoints
- Type hints en todas las funciones
- Docstrings en español para endpoints

### Frontend (React)
- Componentes funcionales con hooks
- React Query para estado del servidor (queryKey descriptivos)
- Zustand para estado global (useUIStore, useUserPreferencesStore con persist, useAuthStore)
- TailwindCSS utilities, no CSS custom
- Alias @/ para imports (configurado en vite)
- Componentes reutilizables en components/common/
- Toast (react-hot-toast) para feedback usuario

### Testing
- Backend: pytest + pytest-asyncio + httpx.AsyncClient
- Fixtures compartidas en conftest.py (db_engine, db_session, client, factories)
- Mock de base de datos con SQLite async in-memory
- 33 test files cubriendo: leads, visits, emails, actions, contacts, offers, opportunities, surveys, users, dashboard, automations, automation_tasks, accounts, reviews, settings, reports, notifications, chat, agents, ai_chat_service, cost_control, external_analytics, gtm, integration_service, marketing, marketing_webhooks, public_api, webhooks_subscriptions, email_tracking, report_builder, social_recurrences, email_service
- Test user (admin) pre-seeded in conftest.py client fixture for FK constraints
- Frontend: Vitest + React Testing Library + jsdom (configurado)
- Setup en frontend/src/test/setup.js (localStorage mock, URL mock)
- 7 test files: useLeadsSelect, usePersistedFilters, useUIStore, useUserPreferencesStore, useAuthStore, api service, KpiCard

### Git
- Commits en inglés, convencional: feat:, fix:, docs:, refactor:
- Branch strategy: main (producción), develop (staging), feature/*
- PR con descripción del cambio

## Contexto de Negocio

Riskitera Sales es la herramienta comercial interna para vender la plataforma GRC Riskitera a empresas españolas y europeas sujetas a regulaciones de ciberseguridad (ENS, NIS2, DORA, ISO 27001, EU AI Act). Los leads son empresas que necesitan cumplimiento normativo y el CRM rastrea todo el ciclo desde captación hasta cierre y post-venta.

## Despliegue

- **Backend (Fly.io):** Push a main → `fly deploy` (app: `riskitera-sales-backend`, región CDG)
- **Frontend (Cloudflare Pages):** Push a main → auto-build `npm run build` → dist/
- **Database (Fly.io Postgres):** App `riskitera-postgres`, región CDG. Migraciones via alembic o SQL directo
- **Auth (Supabase):** Solo Supabase Auth para JWT. Datos de usuario en Fly.io Postgres
- **Variables de entorno:** Ver `.env.example` en cada directorio
