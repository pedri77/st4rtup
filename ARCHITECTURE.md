# Architecture — Riskitera Sales CRM

## 1. System Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Cloudflare      │     │  Fly.io (CDG)         │     │  Fly.io Postgres │
│  Pages           │────▶│  FastAPI Backend      │────▶│  PostgreSQL 15   │
│                  │     │  Python 3.11 (async)  │     │  (asyncpg)       │
│  React 18        │     │  20 API routers       │     │  38 tables       │
│  Vite + Tailwind │     │  7 services           │     │  15+ enums       │
└─────────────────┘     └──────┬───────┬────────┘     └─────────────────┘
                               │       │
                    ┌──────────┘       └──────────┐
                    ▼                              ▼
          ┌─────────────────┐            ┌─────────────────┐
          │  Supabase Auth   │            │  External APIs   │
          │  JWT (HS256)     │            │  - Email (7)     │
          │  User management │            │  - Telegram      │
          └─────────────────┘            │  - DocuSign      │
                                         │  - n8n           │
                                         └─────────────────┘
```

## 2. Backend Architecture

### Layer Pattern
```
Endpoints (app/api/v1/endpoints/)  →  Request handling, validation, auth
    ↓
Services (app/services/)           →  Business logic, external integrations
    ↓
Models (app/models/)               →  SQLAlchemy ORM, database schema
    ↓
Database (app/core/database.py)    →  AsyncSession, connection pooling
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| App entry | `main.py` | FastAPI app, CORS, router registration, lifespan |
| Config | `core/config.py` | Pydantic Settings, env vars (200+ config keys) |
| Auth | `core/security.py` | Supabase JWT validation, admin role check |
| Database | `core/database.py` | AsyncSession factory via asyncpg |
| Scheduler | `core/scheduler.py` | APScheduler for automation cron jobs |

### API Routers (20)

| Router | Prefix | Auth |
|--------|--------|------|
| dashboard | `/dashboard` | user |
| leads | `/leads` | user |
| visits | `/visits` | user |
| emails | `/emails` | user |
| actions | `/actions` | user |
| opportunities | `/opportunities` | user |
| account_plans | `/account-plans` | user |
| monthly_reviews | `/monthly-reviews` | user |
| surveys | `/surveys` | user (+ public endpoints) |
| offers | `/offers` | user (+ unauthenticated webhooks) |
| users | `/users` | user/admin |
| settings | `/settings` | admin |
| automations | `/automations` | user |
| automation_tasks | `/automation-tasks` | user |
| chat | `/chat` | user |
| contacts | `/contacts` | user |
| reports | `/reports` | user |
| notifications | `/notifications` | user |

### Services (7)

| Service | Size | Responsibility |
|---------|------|---------------|
| `email_service.py` | 28KB | Multi-provider email dispatch (Resend, Zoho, Brevo, SES, Mailgun, SMTP, Gmail OAuth) |
| `integration_service.py` | 32KB | Apollo.io, Zoho CRM, webhook management |
| `ai_chat_service.py` | 17KB | AI assistant with 7 provider backends |
| `invoice_service.py` | 17KB | Holded, Stripe, Facturama invoice generation |
| `signature_service.py` | 15KB | DocuSign + YouSign e-signature integration |
| `notification_service.py` | 13KB | In-app + Telegram notifications |
| `telegram_service.py` | 8KB | Telegram Bot API messaging |

### Async Patterns
- All DB operations via `AsyncSession` (asyncpg driver)
- `SQLAlchemy 2.0` style: `select()`, `result.scalars().all()`
- `APScheduler` for background cron jobs (EM-01, AC-01)
- `httpx.AsyncClient` for external API calls
- **Known issue:** `smtplib.SMTP` blocks event loop (should use `asyncio.to_thread`)

## 3. Frontend Architecture

### Stack
- **React 18** with functional components and hooks
- **Vite 6** with code splitting (21 lazy-loaded pages)
- **TailwindCSS 3.4** for styling
- **Axios** for API calls with JWT interceptor

### State Management
- **AuthContext** — Supabase auth state, user session
- **Zustand stores** (3) — UI preferences, filters, user state
- **React Query** — Server state (not fully adopted across all pages)

### Component Hierarchy
```
App.jsx
├── AuthContext (session management)
├── Layout (sidebar + header)
│   ├── 21 lazy-loaded pages
│   └── Common components (modals, tables, forms)
└── SurveyPublicPage (unauthenticated route)
```

### Key Frontend Patterns
- `@/` import alias (configured in vite.config.js)
- `react-hot-toast` for user feedback
- `jsPDF` + `jspdf-autotable` for PDF generation
- `PapaParse` + `xlsx` for CSV/Excel import/export
- `Lucide React` for icons
- `recharts` for dashboard charts

## 4. Database Design

### Core Patterns
- **UUID primary keys** with `gen_random_uuid()` server default
- **TimestampMixin**: `created_at`, `updated_at` on all tables
- **PostgreSQL native enums** (15+ types) for status fields
- **JSON/JSONB columns** for semi-structured data (tags, config, attendees, items)
- **Foreign keys** with `ON DELETE CASCADE`
- **Indexes** on frequently filtered columns (status, lead_id, dates)

### Entity Relationships
```
Lead (central hub)
├── Visits (1:N)
├── Emails (1:N)
├── Actions (1:N)
├── Contacts (1:N)
├── Opportunities (1:N)
│   └── Offers (1:N)
├── AccountPlans (1:N)
├── MonthlyReviews (1:N)
└── Surveys (1:N)

User
├── Notifications (1:N)
└── ChatConversations (1:N)
    └── ChatMessages (1:N)

Automation
└── AutomationExecutions (1:N)

SystemSettings (singleton)
```

### Migration Strategy
- **Current:** `SQLAlchemy create_all()` at startup
- **Alembic** directory exists but no versioned migrations
- **Recommended:** Formalize with `alembic revision --autogenerate`

## 5. API Design

### Conventions
- **Prefix:** `/api/v1`
- **Auth:** Bearer JWT in `Authorization` header
- **Pagination:** `?page=1&page_size=20` → `PaginatedResponse{items, total, page, page_size, pages}`
- **Filtering:** Query params per endpoint (status, lead_id, search, date ranges)
- **Sorting:** `?sort_by=field&sort_order=desc` (with allowlist validation)
- **Errors:** `HTTPException` with standard status codes
- **Docs:** `/docs` (Swagger) and `/redoc`

### Response Patterns
```python
# List with pagination
PaginatedResponse(items=[...], total=N, page=1, page_size=20, pages=M)

# Single item
ModelResponse(id=UUID, ...fields..., created_at, updated_at)

# Action result
{"success": True, "message": "...", ...details...}
```

## 6. Integration Points

| Integration | Protocol | Auth Method |
|-------------|----------|-------------|
| Supabase Auth | REST | API Key (anon/service role) |
| Email (7 providers) | REST/SMTP | API Keys |
| Telegram | REST | Bot Token |
| n8n | REST/Webhooks | API Key |
| DocuSign | REST | Integration Key |
| YouSign | REST | API Key |
| Apollo.io | REST | API Key |
| Stripe | REST + Webhooks | Secret Key + Webhook Secret |
| Holded | REST | API Key |
| AI (7 providers) | REST | API Keys |

## 7. Deployment Architecture

### Production
| Component | Platform | Region | Config |
|-----------|----------|--------|--------|
| Backend | Fly.io | CDG (Paris) | 512MB, 1 CPU, rolling deploy |
| Frontend | Cloudflare Pages | Global CDN | Auto-build on push to main |
| Database | Fly.io Postgres | CDG | PostgreSQL 15, single node |
| Auth | Supabase | Cloud | JWT HS256 |

### CI/CD Pipeline (GitHub Actions)
```
Push to main/develop → Backend lint (ruff) + test (pytest)
                     → Frontend lint (ESLint) + build (Vite)
                     → Deploy to Fly.io (main only, needs FLY_API_TOKEN)
                     → Cloudflare Pages auto-deploys frontend
```

## 8. Gaps and Improvements (Prioritized)

### P0 — Security (Fix Immediately)
- ~~Hardcoded SECRET_KEY default~~ **FIXED**
- ~~Debug print() statements in security.py~~ **FIXED**
- ~~Unsafe sort_by getattr~~ **FIXED**
- ~~DEBUG=True by default~~ **FIXED**
- Webhook endpoints need signature verification
- No row-level access control (all users see all data)

### P1 — Performance & Reliability
- N+1 queries in automations list and offers list (use JOINs/eager loading)
- Synchronous SMTP blocks async event loop (use `asyncio.to_thread`)
- Lead creation uses multiple commits instead of atomic transaction
- No rate limiting on API endpoints

### P2 — Architecture
- Monolithic `models.py` and `schemas.py` (~1500+ lines each) — split by domain
- Opportunities endpoint lacks pagination
- Formalize Alembic versioned migrations
- Add role-based authorization (viewer should be read-only)
- React Query not fully adopted on all pages

### P3 — Quality
- Frontend tests not implemented (Vitest setup exists)
- Mock data imported in production builds
- Inconsistent URL paths (`""` vs `"/"`)
- ADR-001 references Railway (now uses Fly.io) — needs update
