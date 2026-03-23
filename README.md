# Riskitera Sales CRM

**Internal Sales Management System for Riskitera**

> Full-cycle CRM for managing leads, commercial visits, sales pipeline, account plans, proposals, NPS/CSAT surveys, and 22 automated workflows — built for selling GRC cybersecurity solutions.

**Production:** [sales.riskitera.com](https://sales.riskitera.com)

## Tech Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | React 18 + Vite + TailwindCSS | Cloudflare Pages |
| Backend | FastAPI + Python 3.11 (async) | Fly.io (CDG region) |
| Database | PostgreSQL 15 (asyncpg) | Fly.io Postgres (CDG) |
| Auth | Supabase Auth + JWT (HS256) | Supabase |
| Email | Multi-provider (Resend, Zoho, Brevo, SES, Mailgun, SMTP) | — |
| Automations | n8n + APScheduler | — |
| Notifications | Telegram Bot API | — |

## Key Features

- **Lead Management** — Capture, qualify, score, import (CSV/Excel), and export leads
- **Commercial Visits** — Schedule, log results, auto-create follow-up actions
- **Sales Pipeline** — Drag-and-drop pipeline with opportunity stages
- **Proposals & Offers** — PDF generation, e-signature (DocuSign/YouSign), invoicing
- **Email Campaigns** — Multi-provider send, open/click tracking, follow-up sequences
- **NPS/CSAT Surveys** — Public survey links with analytics
- **Account Plans** — Strategic planning per client
- **Monthly Reviews** — Project status tracking and reporting
- **22 Automations** — Welcome sequences, daily summaries, escalations, pipeline alerts
- **AI Chat Assistant** — Context-aware assistant with 7 AI provider backends
- **Role-Based Access** — Admin, comercial, and viewer roles
- **Telegram Notifications** — Real-time alerts for actions and events

## Quick Start

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # Configure environment variables
uvicorn app.main:app --reload --port 8001
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env    # Configure VITE_API_URL, VITE_SUPABASE_*
npm run dev
```

### URLs
- Frontend: http://localhost:5173
- Backend: http://localhost:8001
- API Docs: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Tests & Linting

```bash
# Backend tests
cd backend && pytest tests/ -v --asyncio-mode=auto

# Backend lint
cd backend && ruff check app/

# Frontend lint + build
cd frontend && npm run lint && npm run build
```

## API

- **Base path:** `/api/v1`
- **Auth:** Bearer JWT in `Authorization` header
- **Pagination:** `?page=1&page_size=20`
- **Docs:** Swagger UI at `/docs`, ReDoc at `/redoc`

20 API routers covering: dashboard, leads, visits, emails, actions, opportunities, account-plans, monthly-reviews, surveys, offers, users, settings, automations, automation-tasks, chat, contacts, reports, notifications.

## Deployment

| Component | Platform | Deploy Method |
|-----------|----------|---------------|
| Backend | Fly.io (`riskitera-sales-backend`, CDG) | `fly deploy` on push to main |
| Frontend | Cloudflare Pages | Auto-build on push to main |
| Database | Fly.io Postgres (`riskitera-postgres`, CDG) | Managed |

### CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`):
- **Backend:** Python 3.11 → ruff lint → pytest with coverage
- **Frontend:** Node 20 → ESLint → Vite build
- **Deploy:** Fly.io deploy (main branch only, requires `FLY_API_TOKEN` secret)

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Development rules, conventions, and project context |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, patterns, and gaps |
| [SECURITY_REVIEW.md](SECURITY_REVIEW.md) | OWASP Top 10 security audit findings |
| [CODE_REVIEW.md](CODE_REVIEW.md) | Code quality review and recommendations |
| [QA_PLAN.md](QA_PLAN.md) | Test coverage status and testing strategy |
| [SETUP_LOCAL.md](SETUP_LOCAL.md) | Detailed local development setup |
| [DEPLOY_FLYIO.md](DEPLOY_FLYIO.md) | Fly.io deployment guide |
| [docs/](docs/) | ADR, PRD, scheduler docs, user management guide |

## Contributing

- **Branches:** `main` (production), `develop` (staging), `feature/*`
- **Commits:** English, conventional format — `feat:`, `fix:`, `docs:`, `refactor:`
- **Backend:** async/await, SQLAlchemy 2.0, Pydantic v2, type hints
- **Frontend:** Functional components, React Query, TailwindCSS, `@/` imports

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for the full list.

---

*Riskitera Sales is the commercial tool for selling the Riskitera GRC platform to companies subject to cybersecurity regulations (ENS, NIS2, DORA, ISO 27001, EU AI Act).*
