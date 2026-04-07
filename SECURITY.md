# Security Policy

## Supported Versions

Only the latest release on the `main` branch of `pedri77/st4rtup` receives security updates. There are no long-term support branches at this time.

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public GitHub issue**. Instead:

1. Email the maintainer at `security@riskitera.com` (PGP key on request).
2. Include:
   - A clear description of the issue and affected endpoint/component.
   - Steps to reproduce (a proof-of-concept is ideal).
   - Your assessment of impact.
3. You will receive an acknowledgement within **72 hours** and a remediation plan within **14 days** for confirmed issues.

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). Please give us a reasonable window to patch before publishing details.

## Scope

In scope:
- `backend/` — FastAPI application (api.st4rtup.com)
- `frontend/` — React SPA (app.st4rtup.app / st4rtup.com)
- Authentication, authorization, tenant isolation, credential storage
- OWASP Top 10 and ENS Alto compliance findings

Out of scope:
- Denial-of-service via volumetric attacks
- Findings that require physical access or social engineering
- Self-XSS that requires the attacker to modify their own browser state
- Rate-limiting bypass via IP rotation (we use Cloudflare's protections)
- Issues in third-party dependencies that have no impact on st4rtup

## Rewards

No monetary bounty at this time. Accepted reports are credited in the CHANGELOG and release notes unless the reporter requests anonymity.

## Hardening in Place (high level)

- All secrets stored as systemd/Docker Swarm secrets, never committed.
- OAuth tokens encrypted at rest via Fernet (AES-128-CBC + HMAC-SHA256).
- JWT auth via Supabase, n8n service token checked with constant-time HMAC.
- Multi-tenant row filtering on every data endpoint (`org_id` scoped).
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- Rate limiting on auth and public endpoints via slowapi.
- Input validation via Pydantic v2; output sanitization via DOMPurify.
- Access logs anonymise IPs to /24 (IPv4) / /48 (IPv6) for RGPD compliance.
- Audit trail for admin actions, impersonation, webhook subscriptions.
- Error monitoring via Sentry with PII scrubbing (`before_send` filters headers, cookies, user email and IP).

## Known limitations

- **Cloudflare edge logs** (plan Free) retain visitor IPs in CF's internal infrastructure for ~30 days. CF's "Pseudonymize originating IP" managed transform is only available on Pro+ plans. This is mitigated by our backend-side `/24` anonymisation of access logs and by not storing raw IPs in our DB, but it means a subpoena to Cloudflare could surface recent visitor IPs. Upgrade to CF Pro for full edge-level scrubbing if required.
