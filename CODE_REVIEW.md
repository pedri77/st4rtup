# Code Review — Riskitera Sales CRM

**Date:** 2026-03-14 | **Quality Rating: 7/10**

## Strengths

1. **Consistent CRUD patterns** across all endpoints (fetch-validate-mutate-commit)
2. **Proper async usage** with `AsyncSession` throughout
3. **SQLAlchemy 2.0 style** (`select()` consistently, no legacy `query()`)
4. **Auth on all endpoints** via `Depends(get_current_user)`
5. **Good base model design** (UUID PKs, timestamps, server_default)
6. **Proper cascade deletes** on all FK relationships
7. **Email service abstraction** with 7 providers and dispatch pattern
8. **React Query** with optimistic updates (PipelinePage drag-and-drop)
9. **Eager loading** in contacts endpoint (`selectinload`)
10. **Consistent pagination** via `PaginatedResponse`

## Issues Found

### Critical (3)

| ID | Issue | File:Line | Impact |
|----|-------|-----------|--------|
| C1 | `sort_by` parameter not validated — user-supplied string passed to `getattr(Lead, sort_by)`. Needs an allowlist. | leads.py:85 | Potential attribute access abuse |
| C2 | Webhook endpoints lack auth/signature verification — no HMAC or secret validation on incoming webhooks | offers.py:215-231, 271-287 | Unauthenticated data injection |
| C3 | Race condition in `_generate_reference` — concurrent requests can produce duplicate offer references | offers.py:18-26 | Duplicate data |

### Major (6)

| ID | Issue | File | Impact |
|----|-------|------|--------|
| M1 | N+1 queries in automations list — 3 queries per automation (150+ per page of 50) | automations.py:69-107 | Performance |
| M2 | N+1 queries in offers list — separate query per offer for lead name | offers.py:63-68 | Performance |
| M3 | No role-based authorization — `viewer` role can create/update/delete everything. Only settings uses admin check | Multiple endpoints | Security |
| M4 | No tenant/ownership isolation — all users see all data | Multiple endpoints | Security |
| M5 | Multiple commits in `create_lead` — lead, notification, and `_sync_lead_contact` are separate transactions | leads.py | Data integrity |
| M6 | Debug prints in security.py — user emails, roles, admin lists logged to stdout in production | security.py | Info leak |

### Minor (10)

| ID | Issue |
|----|-------|
| m1 | Inconsistent URL paths (`""` vs `"/"`) |
| m2 | Opportunities list lacks pagination |
| m3 | `sign_offer`/`invoice_offer` use `dict` instead of Pydantic schemas |
| m4 | ~300 lines of seed data hardcoded in endpoint |
| m5 | Synchronous `smtplib.SMTP` blocks async event loop (email_service.py) |
| m6 | Frontend silently falls back to mock data on API errors (LeadsPage.jsx) |
| m7 | Mock data imported in production builds |
| m8 | Dashboard PDF export may use stale data |
| m9 | Notification model doesn't extend BaseModel (inconsistent) |
| m10 | `is_primary == True` should be `.is_(True)` for SQLAlchemy |

## Prioritized Recommendations

**P0 (Security — fix immediately):**
- Fix `sort_by` allowlist in leads endpoint
- Add webhook signature verification
- Remove debug `print()` statements in security.py

**P1 (Performance — fix soon):**
- Fix N+1 queries in automations and offers with JOINs or eager loading
- Make lead creation atomic (single commit)
- Run SMTP operations in thread pool (`asyncio.to_thread`)

**P2 (Architecture — plan and schedule):**
- Implement role-based authorization (viewer can't modify data)
- Paginate opportunities endpoint
- Add Pydantic schemas for webhook/signature endpoints

**P3 (Quality — backlog):**
- Remove mock fallbacks in production frontend
- Standardize URL paths
- Fix Notification model consistency
