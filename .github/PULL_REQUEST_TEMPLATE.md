<!--
Thanks for the PR. Fill out the sections below before requesting review.
Keep it short — lean PRs merge faster.
-->

## Summary

<!-- 1-3 bullets describing WHAT this PR does and WHY. -->
-
-

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Refactor / cleanup
- [ ] Breaking change (API contract, DB schema, env vars)
- [ ] Docs only

## Test plan

<!-- How did you verify this works? Paste commands/output when relevant. -->
- [ ] `pytest tests/ -q` (backend suite green)
- [ ] `npm run test:run` (frontend suite green)
- [ ] Manual smoke test on the affected flow
- [ ] Tested on production-like data (org_id scoping verified for multi-tenant changes)

## Security checklist

- [ ] No hardcoded secrets or API keys committed
- [ ] Authentication required on new endpoints (`Depends(get_current_user)`)
- [ ] Multi-tenant filter applied (`.where(X.org_id == org_id)`)
- [ ] User input validated via Pydantic / sanitized via DOMPurify
- [ ] No PII added to logs or audit trail
- [ ] OAuth tokens / API keys stored via `credential_store` (not plaintext)
- [ ] Rate limit considered for new public endpoints
- [ ] CORS origins unchanged OR reviewed

## Database migrations

- [ ] No schema change, OR
- [ ] Alembic migration added under `backend/alembic/versions/`
- [ ] Migration is **idempotent** (safe to re-run)
- [ ] Downgrade path tested

## Deployment notes

<!-- Anything ops should know: new env var, one-off script, feature flag, etc. -->
- New env var: <!-- e.g. SENTRY_DSN -->
- One-off task after deploy: <!-- e.g. run POST /api/v1/settings/encrypt-credentials -->

## Screenshots / recordings (UI changes only)

<!-- Before/after if the change is visual. -->

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
