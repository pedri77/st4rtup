# Contributing to st4rtup

Thanks for wanting to contribute. This guide covers the basics. For deeper context see `CLAUDE.md` (project conventions) and `SECURITY.md` (disclosure policy).

## Quick setup

### Backend (FastAPI)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in the <CHANGE_ME:...> placeholders
uvicorn app.main:app --reload --port 8001
```

Minimum env vars for local dev:
- `DATABASE_URL` — a Postgres instance (SQLite is only used in tests)
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` (use a dev project, never prod)
- `SECRET_KEY` — any string ≥32 chars
- `CREDENTIAL_ENCRYPTION_KEY` — `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`

### Frontend (React + Vite)

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.example .env
npm run dev
```

### Database migrations

```bash
cd backend
alembic upgrade head              # apply pending
alembic revision -m "description" # create new
alembic downgrade -1              # rollback last
```

## Running tests

Backend:
```bash
cd backend
pytest tests/ -q                                # full suite (~35s)
pytest tests/test_leads.py -v                   # single file
pytest tests/ -k "test_create_lead" -v          # single test by name
```

Frontend:
```bash
cd frontend
npm run test:run                                # CI mode (single run)
npm test                                        # watch mode
npx vitest run src/components/PrivateRoute.test.jsx
```

Target: **both suites must pass** before opening a PR. CI enforces this.

## Branch + commit conventions

- `main` is production. CI auto-deploys on push.
- Feature branches: `feature/short-description`
- Fix branches: `fix/short-description`
- Commits in English, conventional format:
  - `feat:` new feature
  - `fix:` bug fix
  - `security:` security hardening
  - `docs:` documentation only
  - `refactor:` code cleanup, no behaviour change
  - `test:` tests only
  - `chore:` tooling, deps, config

## Code style

### Python
- Type hints on function signatures
- Async everywhere (`async def`, `await`) — never mix sync DB calls
- SQLAlchemy 2.0 style (`select()`, not legacy `query()`)
- Pydantic v2 (`.model_dump()`, `.model_validate()`)
- Endpoints get their own file per resource in `app/api/v1/endpoints/`
- Business logic in `app/services/`, not endpoints
- Docstrings in Spanish for user-facing endpoints

### React
- Functional components with hooks only
- React Query for server state (`useQuery` + `queryKey`)
- Zustand for global client state (with `persist` middleware)
- Tailwind utility classes — avoid custom CSS
- `@/` import alias for `src/`
- `components/common/` for reusable primitives

## Multi-tenant rules (critical)

Every data endpoint **must** scope queries by `org_id`:

```python
from app.core.tenant import get_org_id

@router.get("/my-resource")
async def list_items(
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_org_id),
):
    q = select(MyModel).where(MyModel.org_id == org_id)
    # ...
```

Tests for multi-tenant endpoints must verify that a user from org A cannot see rows from org B.

## Security rules

- **Never** commit secrets. Use `.env` locally and GitHub Actions secrets in CI.
- **Never** log PII. Redact emails, phones, IPs in any `logger.info/error` calls.
- **Never** log raw tokens. Use the first 8 chars + `...` if identifying a token is essential.
- OAuth tokens and API keys in DB **must** be stored via `credential_store.encrypt()`.
- New public endpoints **must** have a slowapi rate limit.
- Validate all user input via Pydantic schemas — never pass raw dicts to DB writes.
- Sanitize HTML output via DOMPurify before rendering in the browser.

## Opening a Pull Request

1. Create a feature branch
2. Make your changes + add tests
3. Run both test suites locally
4. Push and open a PR against `main`
5. Fill out the PR template (auto-loaded)
6. CI runs tests + linting
7. Request review once CI is green

## Reporting a vulnerability

**Do not** open a public issue. See `SECURITY.md` for the disclosure process.

## Questions?

Ping David on Telegram or open a GitHub Discussion.
