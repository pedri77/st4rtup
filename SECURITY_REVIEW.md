# Security Review — Riskitera Sales

## Date: 2026-03-14
## Reviewer: Security Agent (AppSec)

---

### Critical Findings (3)

#### CRIT-01: Hardcoded default SECRET_KEY
- **File:** `backend/app/core/config.py:75`
- **Risk:** If `SECRET_KEY` env var is not set, the app uses a publicly known default, allowing JWT token forgery
- **Remediation:** Remove default value; fail startup if not set. **STATUS: FIXED** — now raises ValueError on startup

#### CRIT-02: Google OAuth callback lacks CSRF state validation
- **File:** `backend/app/api/v1/endpoints/settings.py:328`
- **Risk:** OAuth callback endpoint has no authentication and no CSRF `state` parameter — allows token injection
- **Remediation:** Add `state` parameter with HMAC validation; require authenticated session

#### CRIT-03: Survey/Signature webhook endpoints lack signature verification
- **File:** `backend/app/api/v1/endpoints/surveys.py:431`, `offers.py:215-231`
- **Risk:** Webhook endpoints accept unauthenticated POST requests without HMAC/signature verification — allows data manipulation
- **Remediation:** Implement webhook signature verification (HMAC-SHA256) per provider documentation

---

### High Findings (6)

#### HIGH-01: Unsafe `getattr()` for sort column
- **File:** `backend/app/api/v1/endpoints/leads.py:85`
- **Risk:** User-supplied `sort_by` passed to `getattr(Lead, sort_by)` — potential attribute access abuse
- **Remediation:** Allowlist of valid sort columns. **STATUS: FIXED** — allowlist implemented

#### HIGH-02: No row-level access control on lead CRUD
- **File:** `backend/app/api/v1/endpoints/leads.py` (all methods)
- **Risk:** Any authenticated user can read/modify/delete any lead regardless of ownership
- **Remediation:** Add `assigned_to` or `created_by` filter for non-admin users

#### HIGH-03: DEBUG=True by default
- **File:** `backend/app/core/config.py`
- **Risk:** SQL query logging and detailed errors exposed in production
- **Remediation:** Set `DEBUG=False` by default; only enable via env var

#### HIGH-04: Sensitive data logged via print() in security.py
- **File:** `backend/app/core/security.py` (multiple lines)
- **Risk:** User emails, roles, and admin email lists written to stdout in production
- **Remediation:** Replace `print()` with `logger.debug()`, redact PII. **STATUS: FIXED**

#### HIGH-05: SSL disabled on database connection
- **File:** `backend/app/core/database.py:14`
- **Risk:** Database traffic potentially unencrypted if not using internal networking
- **Remediation:** Enable SSL in production via `connect_args={"ssl": "require"}`

#### HIGH-06: Settings endpoint accepts unvalidated dict
- **File:** `backend/app/api/v1/endpoints/settings.py`
- **Risk:** Arbitrary JSON can be stored as system configuration
- **Remediation:** Define Pydantic schema for settings with field validation

---

### Medium Findings (7)

#### MED-01: No rate limiting on any endpoint
- **Risk:** Brute force, credential stuffing, and API abuse possible
- **Remediation:** Add `slowapi` or similar rate limiting middleware

#### MED-02: SSRF risk in integration test endpoints
- **File:** `backend/app/services/integration_service.py`
- **Risk:** User-controlled URLs passed to `httpx.get()` for webhook testing
- **Remediation:** Validate URLs against allowlist; block internal/private IP ranges

#### MED-03: API docs exposed unconditionally in production
- **File:** `backend/app/main.py`
- **Risk:** `/docs` and `/redoc` accessible without authentication
- **Remediation:** Disable in production or add auth middleware for docs endpoints

#### MED-04: Admin auto-promotion based solely on email
- **File:** `backend/app/core/security.py`
- **Risk:** If attacker registers with an admin email in Supabase, they get auto-promoted
- **Remediation:** Require explicit admin assignment; remove email-based auto-promotion

#### MED-05: Silent user ID re-mapping
- **File:** `backend/app/core/security.py:94-97`, `users.py:36-38`
- **Risk:** If a user's Supabase ID changes, the system silently remaps — could enable privilege escalation
- **Remediation:** Log re-mapping events; require admin approval for ID changes

#### MED-06: Unsanitized HTML in email templates
- **File:** `backend/app/api/v1/endpoints/automation_tasks.py`
- **Risk:** User-supplied lead data (company name, etc.) injected into HTML without escaping
- **Remediation:** Use `html.escape()` on all user-supplied values in templates

#### MED-07: Console logging of API config in production frontend
- **File:** `frontend/src/services/api.js`
- **Risk:** API URLs and configuration visible in browser console
- **Remediation:** Remove `console.log()` calls or gate behind `import.meta.env.DEV`

---

### Low/Informational (7)

| ID | Issue | File |
|----|-------|------|
| LOW-01 | CORS allows wildcard `*` origin | config.py |
| LOW-02 | Error messages leak internal details (table names, constraint names) | Multiple endpoints |
| LOW-03 | JWT stored in localStorage (XSS-accessible) | AuthContext.jsx |
| LOW-04 | Missing security headers (CSP, X-Frame-Options, etc.) | main.py |
| LOW-05 | Webhook secrets not masked in settings API response | settings.py |
| LOW-06 | Public survey endpoint exposes lead IDs | surveys.py |
| LOW-07 | No password complexity requirements for local auth | N/A (Supabase handles) |

---

### Recommendations (Prioritized)

**Immediate (P0):**
1. ~~Remove hardcoded SECRET_KEY default~~ **DONE**
2. Add webhook signature verification (DocuSign, YouSign, Stripe)
3. ~~Replace all `print()` with `logger`~~ **DONE**
4. ~~Add sort_by allowlist~~ **DONE**

**Short-term (P1):**
5. Add rate limiting (`slowapi`)
6. Implement row-level access control
7. Set DEBUG=False by default
8. Enable SSL on database connections
9. Add SSRF protection for webhook URLs

**Medium-term (P2):**
10. Add CSRF state to OAuth callbacks
11. Implement security headers middleware
12. Gate API docs behind auth in production
13. Escape HTML in email templates
14. Review admin auto-promotion logic

**Long-term (P3):**
15. Move JWT from localStorage to httpOnly cookies
16. Add audit logging for admin actions
17. Implement CSP headers
18. Regular dependency vulnerability scanning
