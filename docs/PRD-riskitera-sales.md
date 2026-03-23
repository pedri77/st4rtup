# PRD — Riskitera Sales CRM

**Versión:** 1.0
**Fecha:** 2026-02-25
**Autor:** David (Founder & CTO, Riskitera)
**Estado:** En desarrollo

---

## 1. Visión

Construir un CRM comercial interno que gestione el ciclo de ventas completo de Riskitera: desde la captación de leads hasta el seguimiento post-venta, con 22 automatizaciones n8n que eliminan tareas manuales repetitivas y maximizan la conversión.

## 2. Problema

Como fundador técnico en solitario vendiendo una plataforma GRC enterprise:
- No hay tiempo para gestión comercial manual (follow-ups, reportes, tracking)
- Los leads se pierden por falta de seguimiento sistemático
- No hay visibilidad del pipeline ni métricas de conversión
- Las acciones post-visita se olvidan sin sistema de alertas
- No hay feedback loop con encuestas de satisfacción

## 3. Solución

Un CRM web en sales.riskitera.com con:
- Gestión completa de leads con scoring automático por perfil regulatorio
- Registro de visitas con generación automática de next-steps
- Envío y tracking de emails con secuencias automatizadas
- Pipeline de oportunidades con alertas de deals estancados
- Planes de cuenta estratégicos por cliente
- Seguimiento mensual auto-generado
- Encuestas NPS y CSAT automatizadas
- Dashboard con KPIs en tiempo real
- Panel de 22 automatizaciones con gestión completa

## 4. Usuarios

| Persona | Uso |
|---------|-----|
| David (CTO/Ventas) | Usuario principal, gestión comercial diaria |
| Futuro equipo comercial | Gestión de leads asignados |
| Futuro CSM | Post-venta, encuestas, reviews mensuales |

## 5. Módulos Funcionales

### 5.1 Dashboard (MVP ✅)
- KPIs: total leads, pipeline value, weighted pipeline, acciones overdue, emails/visitas mes
- Leads por estado (chart)
- Widget resumen de automatizaciones con progreso de implementación

### 5.2 Leads (MVP ✅)
- CRUD completo con paginación y búsqueda
- Campos empresa: nombre, CIF, web, sector, tamaño, revenue, dirección, ciudad, provincia, país
- Campos contacto: nombre, cargo, email, teléfono, LinkedIn
- Campos ventas: status (8 estados), source (8 orígenes), score (0-100), assigned_to
- Campos regulatorios: frameworks aplicables (JSON), infraestructura crítica, sector público
- Tags y notas libres
- Vista detalle con historial de visitas, emails, acciones

### 5.3 Visitas (MVP ✅)
- Registro de visita: fecha, tipo (presencial/virtual/telefónica), duración, ubicación
- Asistentes internos y externos (JSON)
- Resultado: positive/neutral/negative/follow_up/no_show
- Summary, key_findings, pain_points, next_steps (todo JSON)
- Follow-up date y notas

### 5.4 Emails (MVP ✅)
- Crear, enviar y rastrear emails
- Integración Resend API para envío real
- Status tracking: draft → sent → delivered → opened → clicked → replied
- Secuencias de follow-up (parent_email_id, follow_up_sequence)
- Programación (scheduled_at)
- Templates reutilizables por categoría

### 5.5 Acciones (MVP ✅)
- CRUD con filtros por lead, status
- Tipos: call, email, meeting, demo, proposal, follow_up
- Status: pending, in_progress, completed, cancelled, overdue
- Prioridad: low, medium, high, critical
- Due date + completed date
- Asignación

### 5.6 Pipeline / Oportunidades (MVP ✅)
- Stages: discovery → qualification → proposal → negotiation → closed_won/closed_lost
- Probability (0-100%)
- Value + recurring_revenue (ARR)
- Products (JSON: módulos Riskitera)
- Win/loss reason + competitor
- Expected/actual close date

### 5.7 Planes de Cuenta (MVP ✅)
- 1:1 con lead (unique constraint)
- Objetivo, propuesta de valor, productos target
- Stakeholders: decision_makers, champions, blockers (JSON con name/role/influence)
- SWOT: strengths, weaknesses, opportunities, threats
- Milestones con status y fechas
- Competitive landscape
- Deal value estimado y close date

### 5.8 Seguimiento Mensual (MVP ✅)
- Review por lead por mes/año
- Project status: on_track, at_risk, delayed, completed
- Health score (1-10)
- Métricas: emails sent/received, meetings, conversations
- Actions: completed, pending, planned
- Improvements identified + client feedback

### 5.9 Encuestas (MVP ✅)
- Tipos: nps, csat, onboarding, quarterly
- Status lifecycle: draft → sent → completed → expired
- Responses (JSON array con question/answer/score)
- NPS score (-100 a 100) + overall score
- Improvements suggested + follow-up actions

### 5.10 Automatizaciones (MVP ✅)
- Gestión completa de 22 workflows n8n
- CRUD + toggle activar/pausar
- Stats por categoría, prioridad, fase, implementación
- Historial de ejecuciones por automatización
- Seed endpoint para cargar plan maestro
- Vista: KPIs + barras progreso + cards colapsables por categoría + modal detalle

## 6. Requisitos No Funcionales

| Requisito | Target |
|-----------|--------|
| Latencia API | < 200ms p95 |
| Disponibilidad | 99.5% (Railway SLA) |
| Seguridad | JWT auth, CORS restringido, input validation Pydantic |
| Escalabilidad | Hasta 10k leads, 100k executions |
| Responsive | Mobile-first TailwindCSS |
| Accesibilidad | WCAG 2.1 AA mínimo |
| SEO | N/A (app interna) |

## 7. Roadmap de Implementación

### Fase 1 — Fundamentos (Semanas 1-4) ← ACTUAL
- [x] Estructura proyecto completa (backend + frontend)
- [x] Modelos de datos (11 tablas + enums)
- [x] API endpoints CRUD (10 routers)
- [x] Frontend: Layout, Dashboard, Leads, Automations
- [ ] Deploy Railway (backend)
- [ ] Deploy Cloudflare Pages (frontend)
- [ ] Ejecutar SQL migrations en Supabase
- [ ] Auth real con Supabase Auth

### Fase 2 — Frontend completo (Semanas 5-8)
- [ ] Formularios crear/editar para todos los módulos
- [ ] Lead detail page con tabs (visitas, emails, acciones, plan de cuenta)
- [ ] Pipeline board (Kanban drag-and-drop)
- [ ] Calendário de visitas
- [ ] Email composer con templates
- [ ] Charts en dashboard (Recharts)

### Fase 3 — Automatizaciones n8n (Semanas 9-16)
- [ ] Sprint 1: LD-01, AC-01, IN-02 (fundamentos)
- [ ] Sprint 2: EM-01, EM-02, LD-04 (email core)
- [ ] Sprint 3: VI-01, EM-04, AC-02 (post-visita)
- [ ] Sprint 4: PI-01, PI-02, PI-03 (pipeline)
- [ ] Sprint 5: MR-01, MR-02 (seguimiento mensual)
- [ ] Sprint 6: LD-02, LD-03, IN-01 (enriquecimiento)
- [ ] Sprint 7: SV-01, SV-02, EM-03 (encuestas)
- [ ] Sprint 8: VI-02, VI-03, AC-03 (optimización)

### Fase 4 — Polish y Avanzado (Semanas 17-20)
- [ ] Import/export CSV de leads
- [ ] Bulk actions (cambiar status, asignar, etiquetar)
- [ ] Reporting avanzado (comparativas mensuales, forecast)
- [ ] Integración bidireccional Google Calendar
- [ ] Mobile responsive optimization
- [ ] Dark mode

## 8. Métricas de Éxito

| Métrica | Target 6 meses |
|---------|----------------|
| Leads en sistema | > 500 |
| Tasa conversión lead → qualified | > 25% |
| Tasa conversión qualified → won | > 15% |
| Tiempo medio respuesta a lead | < 24h |
| Acciones overdue | < 5% |
| NPS clientes | > 40 |
| Automatizaciones activas | 22/22 |
| Ejecuciones n8n exitosas | > 95% |

## 9. Dependencias

| Servicio | Propósito | Coste |
|----------|-----------|-------|
| Railway | Backend hosting | ~$5/mes (Hobby) |
| Cloudflare Pages | Frontend hosting | Gratis |
| Supabase | PostgreSQL + Auth | Free tier → Pro |
| Resend | Email transaccional | Free (3k/mes) |
| Apollo.io | Enriquecimiento B2B | Basic ($49/mes) |
| n8n | Automatizaciones | Self-hosted o Cloud |
| Telegram | Notificaciones | Gratis |

## 10. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Solo founder, sin equipo ventas | Automatizar máximo con n8n |
| Free tier limits Supabase | Monitorizar, upgrade a Pro cuando necesario |
| Rate limits Apollo.io | Batch processing, cache en DB |
| n8n downtime | Reintentos automáticos, alertas Telegram |
| Data loss | Backups diarios Supabase, git para código |
