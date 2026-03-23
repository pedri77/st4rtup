# Roadmap — Riskitera-Sales

## Estado: 23 Marzo 2026

---

### Completado

#### CRM Core
- Leads, Visits, Emails, Actions, Pipeline (tabla + Kanban), Offers, Reviews, Surveys, Contacts
- Dashboard con Activity Heatmap, Revenue Waterfall, Team Activity Radar, Dynamic Favicon
- Mi Dia (resumen personalizado), Quick Actions FAB, Favoritos, Keyboard shortcuts
- Calendar unificado (visitas + acciones + oportunidades + marketing)
- Report Builder (4 tipos + CSV + PDF + Google Sheets export)
- Automations: 22 definidas, 13 deployed, workflow engine interno + n8n opcional
- Users, Roles, Notifications (badge real-time 30s), Chat IA
- Dashboard widgets configurables (persistencia backend, size sm/md/lg)
- Comparativa periodos (semana/mes/trimestre actual vs anterior)
- Widgets embebibles (API key auth para Notion/web)
- Empty states, Inline editing, Print CSS, PWA v2 (offline cache), Dark/light mode

#### Formularios Operativos (19 + Smart Forms)
- 19 formularios publicos con tokens securizados + honeypot
- Panel de gestion con KPIs, tokens, respuestas, paginacion
- Smart Forms: generacion IA de campos personalizados por lead/sector/normativa

#### SEO Command Center (9 tabs)
- Content Hub: CRUD articulos, generar con IA (4 agentes senior), workflow draft>review>published>archived, selector provider IA, export MD/HTML/Drive
- Content Pipeline: 4 agentes individuales o secuenciales (Keywords>Draft>SEO>Meta)
- Keyword Studio: research IA dedicado, guardar en BD, sugerencias, rankings overview con sparklines
- Backlinks: tracker off-site, checker HTTP automatico, 6 KPIs, radial graph
- Dashboard: KPIs unificados, topic network graph, content calendar heatmap
- Repurposer: articulo > LinkedIn, Twitter, email, video script, infografia
- Site Health: auditoria por articulo (meta, headings, keywords, imagenes), score 0-100
- Brand Monitor: keywords de marca, share of voice, competitors bubble chart
- Content Tracker: publicaciones externas (10 plataformas), metricas editables, engagement rate

#### Marketing Hub (15 modulos)
- Campanas multi-canal + Campaign ROI bubble chart
- Funnels visuales (React Flow)
- Assets (auto-sync con articulos SEO)
- Generador UTM, Calendario editorial, Alertas rendimiento
- Documentos con versionado + Google Drive
- Analytics unificado + Channel Attribution treemap
- Tools, Audit Log, LLM Visibility
- Social Media (/marketing/social)
- YouTube dashboard (canal, videos, analytics, search)
- Integraciones marketing

#### AI Calls (4 fases completas)
- Fase 1: 13 endpoints, Retell AI, scoring, webhooks
- Fase 2: Batch queues, scheduling (APScheduler), start/pause/cancel/retry
- Fase 3: Prompt analytics, A/B compare con ganador automatico
- Fase 4: RGPD consent flow, derecho supresion, compliance stats

#### Agentes LLM (4) + Content Pipeline Senior
- AGENT-LEAD-001: ICP scoring con RAG
- AGENT-QUALIFY-001: BANT de transcripciones
- AGENT-PROPOSAL-001: Propuestas Markdown + PDF corporativo
- AGENT-CS-001: Customer Success (NPS, churn, upsell)
- Content Pipeline: 4 agentes con prompts SEO senior-level
- AI Daily Summary: briefing ejecutivo diario generado por IA
- Sugerencias proactivas: leads inactivos, acciones vencidas, deals estancados
- Auto-tagging: IA clasifica leads por sector/normativa

#### Integraciones (25+ servicios)
Google Drive, Google Calendar, Gmail OAuth, YouTube, Notion, HubSpot, Hunter.io, OpenAI, Mistral, DeepSeek, Anthropic, Groq, Resend, n8n, Telegram, Apollo.io, Slack, Teams, WhatsApp, Waalaxy, Lemlist, Calendly, SendGrid, Stripe, Airtable

#### Grafos Visuales (14)
Pipeline Flow, Topic Network, Backlinks Radial, Competitors Bubble, Lead Journey Timeline, Revenue Waterfall, Team Activity Radar, Funnel Conversion, Keyword Rankings Sparklines, Content Calendar Heatmap, Channel Attribution Treemap, Campaign ROI Bubble, Automation Flow, Cost Burn Rate

#### MCP Gateway + Airtable
- 7 tools MCP para agentes IA (KPIs, leads, pipeline, actions, activity)
- Airtable sync bidireccional (3 tablas: Leads, Pipeline, KPIs)
- API publica documentada (GET /public/docs)

#### Seguridad y compliance
- Credential store cifrado (Fernet AES-128-CBC, ENS Alto)
- Form tokens + honeypot anti-bot
- Rate limiting, HMAC webhook signature, timing-safe API keys
- MCP audit trail con PII redaction
- RGPD consent flow + derecho supresion
- Webhook retry (3x exponential backoff + dead letter)

#### Design System (100%)
- 70+ paginas migradas a tokens HSL unificados
- Tipografias: Rajdhani (display) + IBM Plex Mono (datos)
- i18n: ES/EN/PT (navegacion + acciones comunes)
- Editor WYSIWYG Markdown con toolbar + preview

#### CI/CD + Testing
- GitHub Actions: lint + test + build
- Auto-deploy Fly.io + Cloudflare Pages
- 48 test suites, 252 tests
- 53 SQL migrations
- PWA Service Worker v2 (network-first API, cache-first assets)

---

### Pendiente — Requiere infra nueva

| Item | Trigger | Coste |
|------|---------|-------|
| vLLM Hetzner GPU | API cost > 50 EUR/mes | ~80-150 EUR/mes |
| Celery + Redis | >50 leads/dia | ~5-10 EUR/mes |
| Multi-tenancy Keycloak | Primer MSSP | ~10 EUR/mes |
| Verificar dominio Resend | Crear sales@riskitera.com | 0 EUR (DNS) |

---

### Costes de referencia
- Cap mensual herramientas: 267 EUR
- ACV piloto: 19.500 EUR (90 dias PoC)
- Break-even: mes 8-10
- CAC objetivo inbound: < 50 EUR
