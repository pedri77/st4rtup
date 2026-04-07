# Changelog

All notable changes to this project are documented in this file.
Format loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — 2026-04-07

### Security
- **Encryption at-rest for OAuth tokens**: Gmail / GSC / LinkedIn / YouTube / DocuSign / YouSign credentials now encrypted via the existing `credential_store` (Fernet). Backwards-compatible with legacy plaintext via `enc:` prefix.
- **Form tokens hardened**: `secrets.token_urlsafe(64)`, 30-day TTL cap, IP + User-Agent audit log on use.
- **ALLOWED_INTEGRATIONS whitelist** enforced in `test_integration` endpoint (28 providers).
- **PII minimisation**: audit trail no longer logs `company_name` on lead scoring; external LLM calls anonymise contact name/email when an external provider is configured.
- **`/verify-impersonate` endpoint**: single-use JWT exchange with audit log, replacing URL-token impersonation.
- **SECRET_KEY production validation**: app refuses to boot if weak/placeholder key or localhost in CORS while `APP_ENV=production`.
- **N8N service token**: constant-time HMAC comparison, role downgraded from `admin` to `service`.
- **RGPD**: IPs truncated to `/24` (IPv4) and `/48` (IPv6) in uvicorn access logs.
- **SECURITY.md** added with disclosure policy and hardening summary.

### Added
- `GET/POST /api/v1/users/me/onboarding` endpoints persist wizard state per-org.
- `organizations.onboarding_completed` + `onboarding_data` columns (migration `005_onboarding`).
- Frontend: `PrivateRoute` auto-redirects new users to `/app/onboarding` until wizard is completed; `OnboardingPage.finish()` now persists to backend so state syncs cross-device.
- CI/CD: GitHub Actions deploy backend to Hetzner via SSH rsync + retry-based health check (replaces Fly.io deploy).
- `AutomationPhase.PHASE_5` enum value (unblocks auto-seed of sprint-5 automations).

### Changed
- Backend tests suite: **375/375 green** (was 360/375). Root causes fixed:
  - `conftest.py` now clears `workflow_engine._event_handlers` per-test to isolate side effects (welcome email trigger).
  - `conftest.py` walks `app/models/` and imports every submodule so `Base.metadata.create_all` covers all tables.
  - `test_public_api.py` uses the new `org_uuid:key` format and `TEST_ORG_ID`.
  - `test_email_tracking.py` and `test_report_builder.py` use trailing slash on `/leads/` to avoid 307 redirects.
- Frontend `api.js`: list endpoints (`/leads/`, `/visits/`, `/emails/`, `/actions/`, `/contacts/`, `/opportunities/`, `/offers/`, `/account-plans/`, `/monthly-reviews/`, `/surveys/`, `/automations/`, `/users/`) now always use trailing slash to avoid browser stripping `Authorization` on cross-origin 307 redirects.
- `.env.example` placeholders replaced with explicit `<CHANGE_ME:...>` markers.

### Fixed
- **Hotfix production** `contacts.py:list_contacts`: NameError `name 'org_id' is not defined` — the production copy had the filter but lacked the `Depends(get_org_id)` parameter. Full `rsync` of `backend/app/` fixed the stale-deploy drift.
- **Hotfix production** `automations.code` unique constraint: migration `003_automation_code_per_org` was never applied on Hetzner. Applied manually: `DROP INDEX ix_automations_code; ADD CONSTRAINT uq_automation_org_code UNIQUE (org_id, code)`. Auto-seed now idempotent across orgs.
- **Hotfix production** `visits.gcal_event_id` column missing: migration `002_gcal_sync` was never applied on Hetzner. `ALTER TABLE visits ADD COLUMN gcal_event_id VARCHAR(255)`.
- CI backend-test step no longer has `continue-on-error: true` — the suite is green.

### Removed
- `backend/app/core/encryption.py` (redundant — `credential_store` already provides the same Fernet-based API).
- Legacy Fly.io deploy step from CI workflow.
