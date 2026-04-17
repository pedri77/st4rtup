# Plan: Admin Panel Independiente — admin.st4rtup.com

## Vision

```
admin.st4rtup.com    → Panel super-admin (gestion de todos los tenants)
app.st4rtup.com      → CRM clientes (cada tenant ve solo sus datos)
api.st4rtup.com      → Backend API (compartido, Fly.io)
st4rtup.com          → Landing publica (marketing, pricing, signup)
```

## Arquitectura

```
                    ┌──────────────────────┐
                    │   Cloudflare Pages   │
                    │                      │
        ┌───────────┤  admin.st4rtup.com   │ ← Repo: pedri77/st4rtup-admin
        │           │  (React admin panel) │
        │           └──────────────────────┘
        │
        │           ┌──────────────────────┐
        │           │   Cloudflare Pages   │
        ├───────────┤  app.st4rtup.com     │ ← Repo: pedri77/st4rtup (frontend/)
        │           │  (React CRM client)  │
        │           └──────────────────────┘
        │
        ▼
┌──────────────────────────┐
│     Fly.io (CDG)         │
│  riskitera-sales-backend │ ← Repo: pedri77/st4rtup (backend/)
│  FastAPI + PostgreSQL    │
│                          │
│  Auth: role=admin → full │
│  Auth: role=user  → org  │
└──────────────────────────┘
```

## Que incluye el admin panel

### Paginas del admin

| Pagina | Funcion | Endpoint API |
|--------|---------|-------------|
| Dashboard | Metricas globales: orgs, users, MRR, usage | GET /admin/stats |
| Organizations | CRUD orgs, ver plan, toggle active | GET/POST/PUT /admin/orgs |
| Users | Listar todos los users, impersonate, reset password | GET /admin/users |
| Billing | MRR, facturas, suscripciones por org | GET /admin/billing |
| Automations | Estado global de las 22+ automations por org | GET /admin/automations |
| Agents | Registry de agentes LLM, estado, costes | GET /agents/ |
| Cost Control | Costes por org, por agente, por mes | GET /costs/ |
| Logs | Audit log global, errores, accesos | GET /admin/audit |
| System Settings | Config global (email providers, AI keys, etc.) | GET/PUT /settings/ |
| Health | Estado de DB, LLM, integraciones | GET /health |
| Impersonate | Ver CRM como si fueras un user de una org | POST /admin/impersonate |

### Lo que NO incluye (se queda en app.st4rtup.com)
- Leads, visits, emails, actions, opportunities, offers
- Pipeline, contacts, surveys, account plans
- Marketing hub, GTM, social, content pipeline
- Chat IA, reports, dashboards de usuario

## Stack del admin panel

```
Framework:   React 18 + Vite (igual que el CRM)
Styling:     TailwindCSS 4 + shadcn/ui
Auth:        Supabase JWT (misma instancia, verificar role=admin)
API client:  Axios con interceptor JWT
State:       Zustand (useAdminStore)
Charts:      Recharts (MRR, usage, growth)
Tables:      TanStack Table (orgs, users, logs)
Deploy:      Cloudflare Pages (auto-deploy desde GitHub)
Dominio:     admin.st4rtup.com (CNAME en Cloudflare)
```

## Repo: pedri77/st4rtup-admin

```
st4rtup-admin/
├── src/
│   ├── pages/
│   │   ├── DashboardPage.jsx       # Metricas globales
│   │   ├── OrganizationsPage.jsx   # CRUD orgs
│   │   ├── OrgDetailPage.jsx       # Detalle org + members + usage
│   │   ├── UsersPage.jsx           # Todos los users
│   │   ├── BillingPage.jsx         # MRR, facturas
│   │   ├── AutomationsPage.jsx     # Estado automations por org
│   │   ├── AgentsPage.jsx          # AI agent registry
│   │   ├── CostControlPage.jsx     # Costes por org/agente
│   │   ├── AuditLogPage.jsx        # Logs globales
│   │   ├── SystemSettingsPage.jsx   # Config global
│   │   ├── HealthPage.jsx          # Health check dashboard
│   │   └── LoginPage.jsx           # Login (solo admins)
│   ├── components/
│   │   ├── AdminLayout.jsx         # Sidebar + header
│   │   ├── OrgCard.jsx             # Card de organizacion
│   │   ├── StatsCard.jsx           # Metrica con trend
│   │   ├── MRRChart.jsx            # Grafico MRR
│   │   └── DataTable.jsx           # Tabla generica con sort/filter
│   ├── services/
│   │   └── api.js                  # Axios client → api.st4rtup.com
│   ├── store/
│   │   └── useAdminStore.js        # Zustand
│   ├── contexts/
│   │   └── AuthContext.jsx         # Supabase auth (admin-only)
│   └── App.jsx
├── package.json
├── vite.config.js
├── tailwind.config.js
├── CLAUDE.md
└── README.md
```

## Datos a migrar desde el frontend actual (st4rtup/frontend)

### Paginas que se mueven al admin panel
```
De st4rtup/frontend/src/pages/ → st4rtup-admin/src/pages/

AdminPage.jsx         → DashboardPage.jsx + OrgDetailPage.jsx
SettingsPage.jsx      → SystemSettingsPage.jsx (version admin-only)
AgentsPage.jsx        → AgentsPage.jsx (copy)
CostControlPage.jsx   → CostControlPage.jsx (version cross-org)
```

### Componentes reutilizables (copiar)
```
EmptyState.jsx, InlineEdit.jsx
ThemeToggle.jsx, ActivityHeatmap.jsx
Toast setup, API interceptor base
Auth context (modificar para admin-only check)
```

### Lo que se crea nuevo
```
OrganizationsPage.jsx   — CRUD de orgs (no existe en el CRM actual)
OrgDetailPage.jsx       — Detalle de org: members, usage, plan, billing
BillingPage.jsx         — MRR agregado, facturas cross-org
AuditLogPage.jsx        — Logs globales (no filtrado por org)
HealthPage.jsx          — Visualizacion del /health endpoint
ImpersonateButton.jsx   — "Ver como este usuario" en cada org
```

## Endpoints del backend que ya existen para admin

```
GET  /api/v1/admin/stats              ✅ Ya existe
GET  /api/v1/admin/users              ✅ Ya existe
POST /api/v1/auth/verify-impersonate  ✅ Ya existe
GET  /api/v1/agents/                  ✅ Ya existe
GET  /api/v1/costs/                   ✅ Ya existe
GET  /api/v1/health                   ✅ Ya existe
GET  /api/v1/settings/                ✅ Ya existe
```

### Endpoints a crear en el backend
```
GET  /api/v1/admin/orgs               → Listar todas las orgs con stats
POST /api/v1/admin/orgs               → Crear org manual
PUT  /api/v1/admin/orgs/{id}          → Editar org (plan, limits, active)
GET  /api/v1/admin/orgs/{id}/usage    → Usage stats por org
GET  /api/v1/admin/billing/mrr        → MRR agregado por mes
GET  /api/v1/admin/billing/invoices   → Facturas cross-org
GET  /api/v1/admin/audit              → Audit log global (sin filtro org)
```

## Seguridad

```
Admin panel:
  - Login via Supabase Auth (misma instancia)
  - Verificar role == "admin" en AuthContext
  - Si no es admin → redirect a app.st4rtup.com
  - CORS: solo admin.st4rtup.com
  - Rate limiting: mas permisivo (admin = trusted)

Backend:
  - Endpoints /admin/* requieren role=admin (ya implementado)
  - Impersonation: genera token temporal con scope del user target
  - Audit log: todas las acciones admin se registran
```

## DNS y Cloudflare

```
Registros DNS a crear en Cloudflare:

admin.st4rtup.com  CNAME  st4rtup-admin.pages.dev    (Cloudflare Pages)
app.st4rtup.com    CNAME  st4rtup.pages.dev          (Cloudflare Pages, ya existe?)
api.st4rtup.com    CNAME  riskitera-sales-backend.fly.dev  (Fly.io)
```

## Timeline estimado

| Fase | Dias | Detalle |
|------|------|---------|
| 1. Crear repo + scaffold | 1 | Vite + React + Tailwind + Auth + API client |
| 2. Dashboard + Orgs | 1 | Paginas principales: stats, CRUD orgs |
| 3. Users + Billing + Logs | 1 | Paginas secundarias |
| 4. Backend endpoints | 0.5 | Los 7 endpoints /admin/ nuevos |
| 5. DNS + Cloudflare + deploy | 0.5 | CNAME, Pages project, auto-deploy |
| **Total** | **4 dias** | |

## Proxima sesion: empezar por

1. `gh repo create pedri77/st4rtup-admin --public`
2. Scaffold Vite + React + Tailwind
3. CLAUDE.md del admin panel
4. AuthContext con admin-only check
5. DashboardPage + OrganizationsPage
