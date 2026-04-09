<div align="center">

<img src="docs/assets/banner.svg" alt="st4rtup — Founder Productivity Suite: internal CRM + 22 n8n workflows for selling GRC at Riskitera" width="100%" />

<br/>

<a href="#"><img src="https://img.shields.io/badge/status-production-success?style=for-the-badge&labelColor=0d1117" /></a>
<a href="#"><img src="https://img.shields.io/badge/version-1.2.0-blue?style=for-the-badge&labelColor=0d1117" /></a>
<a href="#"><img src="https://img.shields.io/badge/license-proprietary-red?style=for-the-badge&labelColor=0d1117" /></a>
<a href="#"><img src="https://img.shields.io/badge/region-EU%20%F0%9F%87%AA%F0%9F%87%BA-blueviolet?style=for-the-badge&labelColor=0d1117" /></a>
<a href="#"><img src="https://img.shields.io/badge/RGPD-compliant-success?style=for-the-badge&labelColor=0d1117" /></a>
<a href="#"><img src="https://img.shields.io/badge/automations-22%20n8n-F59E0B?style=for-the-badge&labelColor=0d1117" /></a>

<br/>

**Internal Sales CRM · 22 n8n Automations · 7 AI providers · 🇪🇺 EU-hosted**
_Riskitera's commercial cockpit for selling GRC into ENS / NIS2 / DORA / ISO 27001 / EU AI Act accounts_

<br/>

[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLAlchemy 2](https://img.shields.io/badge/SQLAlchemy-2%20async-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![Pydantic v2](https://img.shields.io/badge/Pydantic-v2-E92063?style=flat-square&logo=pydantic&logoColor=white)](https://docs.pydantic.dev/)
[![PostgreSQL 15](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase Auth](https://img.shields.io/badge/Supabase-Auth-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![n8n](https://img.shields.io/badge/n8n-22%20workflows-EA4B71?style=flat-square&logo=n8n&logoColor=white)](https://n8n.io/)
[![Fly.io](https://img.shields.io/badge/Fly.io-CDG-8B5CF6?style=flat-square&logo=flydotio&logoColor=white)](https://fly.io/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflarepages&logoColor=white)](https://pages.cloudflare.com/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-CI%2FCD-2088FF?style=flat-square&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://core.telegram.org/bots)

</div>

<br/>

<div align="center">

### 🚀 The cockpit a solo founder needs to <ins>run a full B2B GRC sales cycle without a sales team</ins>

</div>

<br/>

```diff
+ 📋 Full sales cycle: leads · visits · pipeline · opportunities · offers · monthly reviews · NPS/CSAT
+ 🔁 22 n8n automations baked in: welcome sequences, daily summaries, escalations, pipeline alerts
+ 📨 6 email providers (Resend · Zoho · Brevo · SES · Mailgun · SMTP) with open/click tracking
+ 🤖 7 AI providers behind a unified chat assistant (incl. self-hosted vLLM for sensitive data)
+ 🔔 Real-time alerts via Telegram, Slack/Teams webhooks and outbound HMAC-signed webhooks
+ 🇪🇺 100% EU-hosted (Fly.io CDG + Cloudflare Pages + Supabase EU)
- ❌ No vendor lock-in to a single email provider
- ❌ No US-only data residency
- ❌ No SaaS-CRM seat tax — you own the stack
```

<br/>

---

## 📖 Tabla de contenidos

<table>
<tr>
<td>

- [🎯 ¿Qué es st4rtup?](#-qué-es-st4rtup)
- [✨ Características](#-características)
- [🏗️ Arquitectura](#️-arquitectura)
- [🔄 Flujo de un lead](#-flujo-de-un-lead)
- [🧱 Stack tecnológico](#-stack-tecnológico)

</td>
<td>

- [📦 Estructura del proyecto](#-estructura-del-proyecto)
- [🔁 22 automatizaciones n8n](#-22-automatizaciones-n8n)
- [🧩 Módulos del CRM](#-módulos-del-crm)
- [🚀 Quick start](#-quick-start)
- [🗺️ Roadmap](#️-roadmap)

</td>
<td>

- [📚 Documentación](#-documentación)
- [🛡️ Seguridad y soberanía](#️-seguridad-y-soberanía)
- [⚖️ Comparativa](#️-comparativa-vs-competencia)
- [🤝 Contribuir](#-contribuir)
- [📬 Contacto](#-contacto)

</td>
</tr>
</table>

---

## 🎯 ¿Qué es st4rtup?

**st4rtup** (a.k.a. *Riskitera Sales*) es el CRM comercial interno construido por Riskitera S.L.U. para vender su plataforma GRC a empresas españolas y europeas sujetas a regulaciones de ciberseguridad (**ENS Alto · NIS2 · DORA · ISO 27001 · EU AI Act**).

A diferencia de los CRMs SaaS clásicos (HubSpot, Pipedrive, Salesforce), que cobran por seat, fuerzan workflows pre-cocinados y dependen de servidores en US, **st4rtup está diseñado como cockpit de founder**:

<table>
<tr>
<td width="50%" valign="top">

### 🚫 Modelo SaaS-CRM tradicional
- Pricing por seat — caro para founders con solo 1-3 comerciales
- Workflows rígidos: si no encajas, se rompen
- Datos en US (HubSpot, Salesforce, Pipedrive)
- Automatizaciones limitadas o de pago extra
- Vendor lock-in a un solo email provider
- Asistente IA opaco, sin opción self-hosted

</td>
<td width="50%" valign="top">

### ✅ Modelo st4rtup
- **Founder-first**: stack propio, cero seat tax
- **22 automations** incluidas, código abierto en n8n
- **EU-hosted**: Fly.io CDG + Cloudflare + Supabase EU
- **6 email providers** intercambiables (failover real)
- **7 AI providers** con vLLM self-hosted como opción soberana
- **Telegram + Slack + Teams + webhooks HMAC** out-of-the-box

</td>
</tr>
</table>

---

## ✨ Características

<div align="center">

| 📋 Sales Ops | 🔁 Automatización | 🤖 IA & Comms | 🛡️ Operaciones |
|:---:|:---:|:---:|:---:|
| Lead capture + scoring | 22 workflows n8n seed | 7 AI providers | RBAC: admin · comercial · viewer |
| Visitas + auto-follow-ups | APScheduler interno | Self-hosted vLLM option | Audit log inmutable |
| Pipeline drag-and-drop | Daily summaries | Content pipeline 4-agent | Cost control + guardrails |
| Ofertas + e-signature | Escalado de acciones | Social listening | Feature flags GrowthBook |
| NPS/CSAT públicos | Pipeline stage triggers | Hunter.io enrichment | Webhook HMAC dispatcher |
| Account plans + monthly reviews | Escheduler stale-deal | Waalaxy LinkedIn outreach | Telegram + Slack + Teams |

</div>

<br/>

<details>
<summary>📋 <b>Ver módulos de negocio cubiertos</b></summary>

<br/>

| # | Módulo | Casos de uso |
|---|---|---|
| 1 | **Leads** | Captura desde web/Apollo/CSV, scoring, enriquecimiento Hunter.io, dedup |
| 2 | **Visitas comerciales** | Calendario, resultado, auto-creación de acciones de follow-up |
| 3 | **Pipeline** | Etapas drag-and-drop, alertas de deal estancado, weekly report |
| 4 | **Oportunidades** | Forecasting, probabilidad, weighted ARR |
| 5 | **Ofertas** | PDF white-label, e-signature DocuSign/YouSign, invoicing |
| 6 | **Account plans** | Planificación estratégica por cliente clave |
| 7 | **Monthly reviews** | Status de proyecto + reporting consolidado |
| 8 | **Encuestas** | NPS post-cierre + CSAT trimestral con links públicos |
| 9 | **Email campaigns** | Multi-provider, open/click tracking, follow-ups secuenciados |
| 10 | **Notificaciones** | DB + Telegram + Slack + Teams + webhooks salientes HMAC |
| 11 | **Chat assistant** | Conversaciones context-aware con 7 AI backends |
| 12 | **Reports** | Pipeline health, actividad, rendimiento por comercial |
| 13 | **Content pipeline** | 4 AI agents: keyword → draft → SEO → meta tags |
| 14 | **Social listening** | Brand + competitor monitoring |
| 15 | **Cost control** | Budget caps + cost events + guardrail engine para llamadas LLM |

</details>

---

## 🏗️ Arquitectura

```mermaid
flowchart TB
    subgraph EDGE["🌐 Edge"]
        CFP[☁️ Cloudflare Pages<br/>frontend SPA]
        SUP[🟢 Supabase Auth<br/>JWT HS256]
    end

    subgraph FLY["🇫🇷 Fly.io · Région CDG"]
        subgraph WEB["Web tier"]
            FAST[🐍 FastAPI async<br/>Python 3.11]
        end

        subgraph SVC["Services tier"]
            EMAIL[📨 Email service<br/>6 providers]
            NOTIF[🔔 Notification service]
            CHAT[🤖 AI chat service<br/>7 providers]
            HUNT[🔎 Hunter.io enrichment]
            CP[✍️ Content pipeline<br/>4 AI agents]
            COST[💰 Guardrail engine<br/>budget caps]
        end

        subgraph SCHED["Schedulers"]
            APS[⏰ APScheduler<br/>internal cron]
        end

        subgraph DATA["Data tier"]
            PG[(🐘 PostgreSQL 15<br/>50+ tables · asyncpg)]
        end
    end

    subgraph EXT["🔌 External"]
        N8N[🟠 n8n<br/>22 workflows]
        TG[📨 Telegram Bot]
        SLACK[💬 Slack / Teams]
        WAA[💼 Waalaxy LinkedIn]
        VLLM[🚀 vLLM self-hosted<br/>sovereign option]
        APOLLO[🟣 Apollo.io]
        GCAL[📅 Google Calendar]
        STRIPE[💳 Stripe-ready]
    end

    CFP --> FAST
    CFP --> SUP
    SUP -.JWT.-> FAST
    FAST --> PG
    FAST --> EMAIL
    FAST --> NOTIF
    FAST --> CHAT
    FAST --> HUNT
    FAST --> CP
    FAST --> COST
    APS --> FAST
    NOTIF --> TG
    NOTIF --> SLACK
    EMAIL -.providers.-> FAST
    CHAT --> VLLM
    CP --> VLLM
    N8N -.webhooks.-> FAST
    FAST -.HMAC dispatch.-> N8N
    HUNT -.API.-> FAST
    APOLLO -.sync.-> FAST
    GCAL -.bidirectional.-> FAST
    WAA -.outreach.-> FAST

    style CFP fill:#F38020,stroke:#fff,color:#fff
    style SUP fill:#3FCF8E,stroke:#fff,color:#fff
    style FAST fill:#009688,stroke:#fff,color:#fff
    style PG fill:#4169E1,stroke:#fff,color:#fff
    style N8N fill:#EA4B71,stroke:#fff,color:#fff
    style TG fill:#26A5E4,stroke:#fff,color:#fff
    style VLLM fill:#FF6F00,stroke:#fff,color:#fff
```

<br/>

## 🔄 Flujo de un lead

```mermaid
sequenceDiagram
    autonumber
    participant W as 🌐 Web form
    participant N as 🟠 n8n LD-01
    participant API as 🐍 FastAPI
    participant DB as 🐘 Postgres
    participant H as 🔎 Hunter.io
    participant TG as 📨 Telegram
    participant U as 🙋 Comercial
    participant V as 🚀 vLLM

    W->>N: webhook submit
    N->>API: POST /leads (HMAC verified)
    API->>DB: INSERT lead (status=new)
    API->>H: enqueue enrichment (LD-03)
    H-->>API: company data + email validity
    API->>DB: UPDATE lead (enriched)
    API->>API: lead scoring (LD-04)
    API->>DB: UPDATE lead.score
    API->>TG: notify "🔥 nuevo lead score=85"
    TG-->>U: push notification
    U->>API: GET /leads/{id}
    U->>API: POST /visits (schedule)
    Note over API,DB: VI-01 auto-creates follow-up actions
    U->>API: POST /chat (ask AI assistant)
    API->>V: invoke vLLM (sensitive data)
    V-->>API: contextual answer
    API-->>U: answer + sources
    Note over API,DB: AC-01 next morning sends daily summary
```

---

## 🧱 Stack tecnológico

<div align="center">

### 🐍 Backend
![Python 3.11](https://img.shields.io/badge/Python%203.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI%20async-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLAlchemy 2](https://img.shields.io/badge/SQLAlchemy%202%20async-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![Pydantic v2](https://img.shields.io/badge/Pydantic%20v2-E92063?style=for-the-badge&logo=pydantic&logoColor=white)
![Alembic](https://img.shields.io/badge/Alembic-6BA539?style=for-the-badge)
![APScheduler](https://img.shields.io/badge/APScheduler-FF6F00?style=for-the-badge)

### 🎨 Frontend
![React 18](https://img.shields.io/badge/React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![React Query](https://img.shields.io/badge/React%20Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-000000?style=for-the-badge)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

### 🗄️ Datos
![PostgreSQL 15](https://img.shields.io/badge/PostgreSQL%2015-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![asyncpg](https://img.shields.io/badge/asyncpg-336791?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase%20Auth-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)

### 📨 Email & Notif
![Resend](https://img.shields.io/badge/Resend-000000?style=for-the-badge&logo=resend&logoColor=white)
![Zoho](https://img.shields.io/badge/Zoho%20Mail-C8202F?style=for-the-badge&logo=zoho&logoColor=white)
![Brevo](https://img.shields.io/badge/Brevo-0B996E?style=for-the-badge)
![AWS SES](https://img.shields.io/badge/AWS%20SES-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)
![Mailgun](https://img.shields.io/badge/Mailgun-F0664D?style=for-the-badge&logo=mailgun&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram%20Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)
![Slack](https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white)
![Teams](https://img.shields.io/badge/MS%20Teams-6264A7?style=for-the-badge&logo=microsoftteams&logoColor=white)

### 🤖 AI & Automation
![n8n](https://img.shields.io/badge/n8n%2022%20workflows-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)
![vLLM](https://img.shields.io/badge/vLLM%20self--hosted-FF6F00?style=for-the-badge&logo=nvidia&logoColor=white)
![GrowthBook](https://img.shields.io/badge/GrowthBook%20flags-1C7DFF?style=for-the-badge)
![Hunter.io](https://img.shields.io/badge/Hunter.io-FF7A59?style=for-the-badge)

### ☁️ Infra & CI/CD
![Fly.io](https://img.shields.io/badge/Fly.io%20CDG-8B5CF6?style=for-the-badge&logo=flydotio&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflarepages&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

</div>

---

## 📦 Estructura del proyecto

```
st4rtup/
├── 📄 CLAUDE.md                       # Reglas de desarrollo + contexto
├── 📄 ARCHITECTURE.md                 # Patrones del sistema y gaps
├── 📄 SECURITY_REVIEW.md              # OWASP Top 10 audit
├── 📄 CODE_REVIEW.md                  # Revisión de calidad
├── 📄 QA_PLAN.md                      # Estrategia de testing
├── 📄 README.md                       # ← estás aquí
│
├── 📁 backend/                        # FastAPI async
│   ├── 📁 app/
│   │   ├── 🌐 api/v1/endpoints/       # 19 routers (leads, visits, emails, ...)
│   │   ├── 🛠️ core/                   # config · database · security
│   │   ├── 🗂️ models/                 # SQLAlchemy 2 (por dominio)
│   │   ├── 📋 schemas/                # Pydantic v2 (por dominio)
│   │   ├── 🔧 services/               # Email · notif · AI · content · cost · vLLM
│   │   ├── 🤖 agents/                 # Agent definitions
│   │   ├── 📨 email_templates/        # Plantillas Jinja
│   │   ├── ⏰ tasks.py                # APScheduler jobs
│   │   └── 🛠️ utils/
│   ├── 📁 alembic/                    # Migraciones async
│   ├── 📁 tests/                      # 33 test files (pytest-asyncio)
│   ├── 🐳 Dockerfile
│   └── requirements.txt
│
├── 📁 frontend/                       # React 18 + Vite SPA
│   └── 📁 src/
│       ├── 📁 pages/                  # 48+ pages: Dashboard · Leads · Pipeline ·
│       │                              # Actions · GTM · Marketing · ContentPipeline ·
│       │                              # ReportBuilder · Webhooks · CostControl · ...
│       ├── 📁 components/             # Layout · widgets · common reusable
│       ├── 📁 services/               # Axios api client
│       ├── 📁 hooks/                  # useUserRole · usePersistedFilters · ...
│       ├── 📁 store/                  # Zustand: UI · userPrefs · auth
│       ├── 📁 contexts/               # AuthContext (Supabase)
│       ├── 📁 i18n/                   # ES + EN
│       ├── 📁 mocks/
│       └── 📁 test/                   # Vitest setup
│
├── 📁 docs/
│   ├── 📁 adr/                        # ADR-001-architecture
│   ├── 📁 skills/                     # Claude Code skill files
│   ├── 📁 templates/
│   ├── 📁 manuales/
│   ├── 📁 operations/
│   ├── 📁 admin-dashboard/
│   ├── 📄 PRD-riskitera-sales.md
│   ├── 📄 ROADMAP.md
│   ├── 📄 SCHEDULER.md
│   ├── 📄 N8N_VS_INTERNAL.md
│   ├── 📄 HETZNER_SECURITY_PLAN.md
│   └── 📄 USER_MANAGEMENT_GUIDE.md
│
├── 📁 zoho-extension/                 # Zoho Mail extension companion
├── 📁 ops/                            # Ops scripts
├── 📁 scripts/                        # SQL helpers
├── 📁 sql/
├── 📁 migrations/
├── 📁 content/
└── 📄 fly.toml / railway.toml         # Deploy configs
```

---

## 🔁 22 automatizaciones n8n

<div align="center">

| ID | Categoría | Nombre | Prioridad |
|:---:|---|---|:---:|
| **EM-01** | 📨 Email Automation | Secuencia Welcome | 🔴 Crítica |
| **EM-02** | 📨 Email Automation | Tracking de Email | 🔴 Crítica |
| **EM-03** | 📨 Email Automation | Re-engagement | 🟠 Alta |
| **EM-04** | 📨 Email Automation | Follow-up Post-Visita | 🟠 Alta |
| **LD-01** | 🎯 Leads & Captación | Webhook Formulario Web | 🔴 Crítica |
| **LD-02** | 🎯 Leads & Captación | Sincronización Apollo.io | 🟠 Alta |
| **LD-03** | 🎯 Leads & Captación | Enriquecimiento Automático | 🟡 Media |
| **LD-04** | 🎯 Leads & Captación | Lead Scoring Automático | 🟠 Alta |
| **VI-01** | 📅 Visitas | Auto-crear Acciones Post-Visita | 🟠 Alta |
| **VI-02** | 📅 Visitas | Recordatorio Pre-Visita | 🟡 Media |
| **VI-03** | 📅 Visitas | Sync Google Calendar | 🟡 Media |
| **AC-01** | ⚡ Acciones & Alertas | Resumen Diario de Acciones | 🔴 Crítica |
| **AC-02** | ⚡ Acciones & Alertas | Escalado Automático | 🟠 Alta |
| **AC-03** | ⚡ Acciones & Alertas | Auto-cierre Acciones | 🟡 Media |
| **PI-01** | 📊 Pipeline | Triggers por Cambio de Etapa | 🟠 Alta |
| **PI-02** | 📊 Pipeline | Report Semanal Pipeline | 🟠 Alta |
| **PI-03** | 📊 Pipeline | Alerta Deal Estancado | 🟠 Alta |
| **MR-01** | 📅 Seguimiento Mensual | Auto-generación Monthly Review | 🔴 Crítica |
| **MR-02** | 📅 Seguimiento Mensual | Informe Mensual Consolidado | 🟠 Alta |
| **SV-01** | 📝 Encuestas | Encuesta Post-Cierre (NPS) | 🟠 Alta |
| **SV-02** | 📝 Encuestas | Encuesta Trimestral CSAT | 🟡 Media |
| **IN-01** | 🔌 Integraciones | Importar Leads Scraping | 🟠 Alta |
| **IN-02** | 🔌 Integraciones | Notificaciones Telegram Hub | 🟠 Alta |

</div>

> Las 22 automatizaciones se inicializan desde `/api/v1/automations/seed` y se gestionan vía dashboard. Definidas en `backend/app/services/` + workflows JSON en n8n.

---

## 🧩 Módulos del CRM

<div align="center">

| Módulo | Endpoint | Estado |
|---|---|:---:|
| Dashboard | `/dashboard/stats` | ✅ |
| Leads | `/leads` | ✅ CRUD + import + scoring |
| Visitas | `/visits` | ✅ CRUD + auto-actions |
| Emails | `/emails` + `/emails/{id}/send` | ✅ Multi-provider |
| Acciones | `/actions` | ✅ CRUD + escalado |
| Oportunidades | `/opportunities` | ✅ CRUD |
| Ofertas | `/offers` | ✅ PDF + e-sign |
| Account Plans | `/account-plans` | ✅ CRUD |
| Monthly Reviews | `/monthly-reviews` | ✅ CRUD + auto-gen |
| Encuestas | `/surveys` | ✅ NPS + CSAT públicos |
| Contactos | `/contacts` | ✅ CRUD |
| Automatizaciones | `/automations` + `/seed` | ✅ Toggle + executions |
| Tareas Auto | `/automation-tasks` | ✅ |
| Notificaciones | `/notifications` | ✅ DB + push |
| Chat | `/chat` | ✅ 7 AI providers |
| Reports | `/reports` | ✅ Pipeline · actividad · rendimiento |
| Usuarios | `/users` + `/me/profile` | ✅ RBAC 3 roles |
| Configuración | `/settings` | ✅ Admin only |

</div>

---

## 🚀 Quick start

### 📋 Requisitos

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)
![Node](https://img.shields.io/badge/Node-20+-339933?style=flat&logo=node.js&logoColor=white)
![Postgres](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql&logoColor=white)

### 🐍 Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # Configurar SUPABASE_*, DATABASE_URL, providers
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

### ⚛️ Frontend

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_URL, VITE_SUPABASE_*
npm run dev
```

### 🌐 URLs

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8001 |
| Swagger | http://localhost:8001/docs |
| ReDoc | http://localhost:8001/redoc |
| **Producción** | **https://sales.riskitera.com** |

### 🧪 Tests

```bash
# Backend
cd backend && pytest tests/ -v --asyncio-mode=auto
cd backend && ruff check app/

# Frontend
cd frontend && npm run lint && npm run build
cd frontend && npm test            # watch
cd frontend && npm run test:run    # CI
```

### 🚢 Deploy

| Componente | Plataforma | Método |
|---|---|---|
| Backend | Fly.io `riskitera-sales-backend` (CDG) | `fly deploy` (auto en push a `main`) |
| Frontend | Cloudflare Pages | Auto-build en push a `main` |
| DB | Fly.io Postgres `riskitera-postgres` (CDG) | Managed |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml` |

---

## 🗺️ Roadmap

```mermaid
gantt
    title st4rtup Roadmap 2026
    dateFormat YYYY-MM-DD
    axisFormat %b
    section 🧱 Foundation
    Stack base + auth      :done, f1, 2026-01-08, 14d
    19 routers + 50 tablas :done, f2, after f1, 21d
    33 test files          :done, f3, after f2, 7d
    section 🔁 Automations
    22 n8n workflows       :done, a1, 2026-02-15, 21d
    APScheduler internal   :done, a2, after a1, 7d
    Webhook HMAC dispatch  :done, a3, after a2, 7d
    section 🚀 Production
    CI/CD GitHub Actions   :done, p1, 2026-03-01, 5d
    Fly.io deploy          :done, p2, after p1, 3d
    Cloudflare frontend    :done, p3, after p2, 3d
    Sentry hardening       :active, p4, 2026-04-08, 10d
    section ✨ Mejoras
    MOD-LINKEDIN-001       :         m1, after p4, 30d
    Offers e-sign full     :         m2, after m1, 14d
    Content pipeline GA    :         m3, after m2, 14d
    Cost control v2        :         m4, after m3, 10d
    section 🎯 v2.0
    Multi-tenant SaaS      :         v1, after m4, 60d
    Public launch          :crit,    pl, after v1, 1d
```

<br/>

### ✅ Hitos clave

- [x] **Sprint 1** · FastAPI async + Postgres + Supabase Auth
- [x] **Sprint 2** · 19 routers + 50 tablas + 33 test files
- [x] **Sprint 3** · 22 workflows n8n seed + APScheduler interno
- [x] **Sprint 4** · 6 email providers + Telegram + Slack/Teams + webhooks HMAC
- [x] **Sprint 5** · 7 AI providers + content pipeline 4-agent + vLLM self-hosted
- [x] **Sprint 6** · CI/CD GitHub Actions → Fly.io + Cloudflare auto-deploy
- [x] **Sprint 7** · Cost control + guardrails + GrowthBook feature flags
- [ ] **Hardening 9.5** · Sentry findings (2026-04-08): 7 bugs reales en prod
- [ ] **MOD-LINKEDIN-001** · Taplio-killer para founders (Waalaxy + content pipeline)
- [ ] **v1.3** · Offers e-signature production-ready
- [ ] **v2.0** · Multi-tenant SaaS evolution

> **Estado actual**: PRODUCCIÓN en `sales.riskitera.com` · 19 routers · 50+ tablas · 33 test files backend · Auto-deploy Fly.io + Cloudflare · 22 automations live

---

## 📚 Documentación

<table>
<tr>
<td width="50%" valign="top">

### 📐 Arquitectura y reglas
- [CLAUDE.md](CLAUDE.md) — Reglas de desarrollo + convenciones
- [ARCHITECTURE.md](ARCHITECTURE.md) — Patrones del sistema y gaps
- [SECURITY_REVIEW.md](SECURITY_REVIEW.md) — OWASP Top 10 audit
- [CODE_REVIEW.md](CODE_REVIEW.md) — Revisión de calidad
- [QA_PLAN.md](QA_PLAN.md) — Estrategia de testing
- [docs/adr/ADR-001-architecture.md](docs/adr/ADR-001-architecture.md)

</td>
<td width="50%" valign="top">

### 🔌 Operaciones e integración
- [docs/PRD-riskitera-sales.md](docs/PRD-riskitera-sales.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/SCHEDULER.md](docs/SCHEDULER.md)
- [docs/N8N_VS_INTERNAL.md](docs/N8N_VS_INTERNAL.md)
- [docs/HETZNER_SECURITY_PLAN.md](docs/HETZNER_SECURITY_PLAN.md)
- [docs/USER_MANAGEMENT_GUIDE.md](docs/USER_MANAGEMENT_GUIDE.md)
- [SETUP_LOCAL.md](SETUP_LOCAL.md) · [DEPLOY_FLYIO.md](DEPLOY_FLYIO.md)

</td>
</tr>
</table>

---

## 🛡️ Seguridad y soberanía

<div align="center">

| 🇪🇺 EU-hosted | 🔐 Cifrado | 📜 Compliance | 🔍 Auditoría |
|:---:|:---:|:---:|:---:|
| Fly.io CDG (Francia) | TLS 1.3 in-transit | RGPD-friendly | Workflow audit log |
| Cloudflare Pages | JWT HS256 (Supabase) | ENS Alto-aligned | Cost events log |
| Supabase EU | Webhook HMAC dispatch | Sin transferencias US | 33 test files (pytest) |
| Postgres CDG | API keys env vars | Right to erasure | Sentry observability |

</div>

<br/>

### 🚨 Security & audit status

<div align="center">

> ⚠️ **Sentry monitoreado — sprint 9.5 hardening en curso (2026-04-08).**
>
> Auditoría interna sobre Sentry production logs detectó **7 bugs reales en producción** que bloquean el siguiente release. Trackeados en `project_st4rtup_sentry_errors_20260408`:

| ID | Severidad | Componente | Categoría |
|---|---|---|---|
| **PYTHON-FASTAPI-6** | 🟠 Alta | PendingRollbackError en sesión async | Database |
| **DRIP-EMAILS** | 🟠 Alta | Syntax error en `drip_emails` task | Scheduler |
| **SCHEDULER-IMP-1..3** | 🟠 Alta | 3 imports rotos en scheduler | Scheduler |
| **JSON-LIKE** | 🟡 Media | Query JSON LIKE mal formada | API |
| **USER-NDF** | 🟡 Media | `User not defined` en endpoint | API |

Plan de remediación detallado en el memo interno.
**Empezar el siguiente sprint por PYTHON-FASTAPI-6.**

</div>

<br/>

> 🔒 **Política de credenciales**
> Todas las API keys (email providers, AI providers, Apollo, Hunter, Telegram, Slack) viven en variables de entorno y secrets de Fly.io. Nunca hardcoded ni en `.env` commiteado.

> 🛡️ **Política de webhooks**
> Todos los webhooks salientes se firman con HMAC. Los entrantes desde n8n se verifican contra `X-Webhook-Signature` antes de ejecutar cualquier acción de negocio.

---

## ⚖️ Comparativa vs competencia

<div align="center">

| Aspecto | 🚀 **st4rtup** | HubSpot | Pipedrive | Salesforce | Close.io |
|---|:---:|:---:|:---:|:---:|:---:|
| **Modelo de pricing** | 🟢 Stack propio (cero seat tax) | 🔴 Por seat | 🔴 Por seat | 🔴 Por seat | 🔴 Por seat |
| **Hosting** | 🟢 EU (Fly CDG + CF) | 🔴 US | 🟡 EU + US | 🔴 US | 🔴 US |
| **Email providers** | 🟢 6 intercambiables | 🟡 Propietario | 🟡 Propietario | 🟡 Propietario | 🟡 Propietario |
| **Automations** | 🟢 22 n8n + APScheduler | 🟡 De pago | 🟡 De pago | 🟡 De pago | 🟡 Limitadas |
| **Self-hosted LLM** | 🟢 vLLM nativo | 🔴 No | 🔴 No | 🔴 No | 🔴 No |
| **Webhook HMAC** | 🟢 Out-of-the-box | 🟡 Add-on | 🟡 Add-on | 🟢 Sí | 🟡 Add-on |
| **Telegram alerts** | 🟢 Nativo | 🔴 No | 🔴 No | 🔴 No | 🔴 No |
| **GRC vertical** | 🟢 First-class | 🔴 Genérico | 🔴 Genérico | 🟡 AppExchange | 🔴 Genérico |
| **Idioma español** | 🟢 First-class | 🟡 Parcial | 🟡 Parcial | 🟡 Parcial | 🔴 EN only |
| **Vendor lock-in** | 🟢 Cero (open-source stack) | 🔴 Total | 🔴 Total | 🔴 Total | 🔴 Total |

</div>

---

## 🤝 Contribuir

> Este es un proyecto **propietario** de Riskitera S.L.U. en producción interna. No aceptamos contribuciones externas todavía.
>
> Si quieres seguir el desarrollo, dale ⭐ al repo. Si te interesa el producto como early adopter de la versión multi-tenant SaaS (v2.0), contacta abajo.

<details>
<summary>👨‍💻 <b>Para colaboradores internos</b></summary>

<br/>

1. Lee `CLAUDE.md` antes de cualquier PR — convenciones backend/frontend
2. Branch strategy: `main` (producción) · `develop` (staging) · `feature/*`
3. Commits en inglés conventional (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
4. **Backend**: async/await siempre · SQLAlchemy 2.0 (`select()`, no `query()`) · Pydantic v2 (`model_validate`, `model_dump`) · type hints obligatorios
5. **Frontend**: componentes funcionales · React Query keys descriptivos · Zustand para state global · Tailwind utilities · alias `@/`
6. Tests obligatorios para: nuevos endpoints, services, hooks, store mutations
7. Nunca commitear `.env`, credenciales, dumps de Postgres ni JWT secrets
8. PR requiere: descripción + checklist + screenshots si toca UI

</details>

---

## 📬 Contacto

<div align="center">

**David Moya García** · Founder & CTO · Riskitera S.L.U.

[![Email](https://img.shields.io/badge/Email-david@riskitera.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:david@riskitera.com)
[![Producción](https://img.shields.io/badge/Producción-sales.riskitera.com-F59E0B?style=for-the-badge&logo=safari&logoColor=white)](https://sales.riskitera.com)
[![Riskitera](https://img.shields.io/badge/Parent-riskitera.com-000000?style=for-the-badge&logo=safari&logoColor=white)](https://riskitera.com)
[![GitHub](https://img.shields.io/badge/GitHub-pedri77-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/pedri77)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-David%20Moya-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/davidmoyagarcia)

</div>

---

## 📄 Licencia

```
Copyright © 2026 Riskitera S.L.U. — Todos los derechos reservados.

Este software es propiedad exclusiva de Riskitera S.L.U.
Su uso, copia, modificación o distribución sin autorización
expresa por escrito está estrictamente prohibido.

Para licenciar st4rtup / Riskitera Sales para uso comercial, contacta:
david@riskitera.com
```

---

<div align="center">

<sub>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</sub>

<br/>

### Built with 🧡 in 🇪🇸 by [Riskitera S.L.U.](https://riskitera.com)

<br/>

![Last commit](https://img.shields.io/badge/last%20commit-2026--04--09-blue?style=flat-square)
![Made with](https://img.shields.io/badge/Made%20with-Claude%20Code-D97757?style=flat-square&logo=anthropic&logoColor=white)
![Founder Stack](https://img.shields.io/badge/Founder-stack-F59E0B?style=flat-square)

<sub>🚀 Selling GRC, one automated workflow at a time.</sub>

</div>
