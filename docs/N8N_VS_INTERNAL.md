# n8n vs Workflow Engine Interno — Estado de Migracion

## Fecha: 22 Marzo 2026

---

## Migrados al Workflow Engine Interno (Python)

Estos workflows funcionan sin n8n. Estan en `backend/app/core/workflow_engine.py` y `scheduler.py`.

| ID | Workflow | Evento / Schedule | Estado |
|----|----------|-------------------|--------|
| EM-01 | Welcome Sequence (Day 0, 3, 7) | `lead.created` + daily 09:00/09:15 | Migrado |
| EM-02 | Email tracking score | `email.opened` / `email.clicked` | Migrado |
| EM-03 | Re-engagement leads frios >90d | `weekly.check` | Migrado |
| AC-01 | Resumen diario acciones | Daily 08:30 | Migrado |
| AC-02 | Escalado acciones vencidas >3d | `daily.check` | Migrado |
| AC-03 | Auto-cierre acciones antiguas | `daily.check` | Migrado |
| PI-01 | Triggers cambio etapa pipeline | `opportunity.stage_changed` | Migrado |
| PI-03 | Alerta deals estancados >14d | `daily.check` | Migrado |
| LD-04 | Auto lead scoring ICP | `lead.created` | Migrado |
| IN-02 | Telegram/Slack/Teams notify | `lead.created` / `opportunity.won/lost` | Migrado |
| VI-02 | Recordatorio visita manana | `daily.check` | Migrado |
| MR-01 | Recordatorio monthly review | `monthly.check` | Migrado |
| SV-01 | NPS post-cierre (schedule) | `opportunity.won` | Migrado |
| HU-01 | Hunter email verify semanal | `weekly.check` | Migrado |
| GC-01 | Google Calendar sync | `daily.check` | Migrado |
| SC-01 | Social recurrence generator | `hourly.check` | Migrado |
| AL-01 | Slack/Teams alert router | Via notification_service | Migrado |
| WH-01 | Webhook outbound dispatch | Via webhook_dispatcher | Migrado |
| -- | Form submitted notify | `form.submitted` | Migrado |

**Total migrados: 19 workflows**

---

## Solo en n8n (no migrados)

Estos workflows solo existen como JSON en `n8n-flujos/` y requieren n8n para funcionar.

| ID | Workflow | Funcion | Por que no migrado |
|----|----------|---------|-------------------|
| EM-04 | Follow-up post-visita | Email automatico despues de visita | Requiere logica de templates email compleja |
| LD-01 | Webhook formulario web | Recibe webhooks de formularios externos | Ya cubierto por /webhooks/generic y /webhooks/hubspot |
| LD-02 | Sync Apollo.io | Sincroniza leads con Apollo | Requiere polling periodico a Apollo API |
| LD-03 | Enriquecimiento automatico | Enriquece leads nuevos con datos externos | Parcialmente cubierto por LD-04 (scoring) |
| PI-02 | Report semanal pipeline | PDF con estado del pipeline | Requiere generacion y envio de PDF |
| MR-02 | Informe mensual consolidado | Informe mensual completo | Requiere generacion de HTML complejo |
| SV-02 | Encuesta trimestral CSAT | Envio automatico de CSAT cada 3 meses | Requiere scheduling por cliente |
| VI-01 | Acciones post-visita | Auto-crear acciones despues de visita | Logica de mapeo visita -> acciones |
| VI-03 | Sync Google Calendar | Sync bidireccional Calendar | Ya cubierto por GC-01 interno |
| IN-01 | Importar leads scraping | Scraping de webs para leads | Requiere PhantomBuster o similar |
| RS-033 | Regulatory trigger (BOE/ENISA) | Alertas de cambios regulatorios | Requiere scraping de fuentes oficiales |
| RS-045b | Clarity enrichment | Enriquecer con Microsoft Clarity | Requiere API Clarity |
| RS-045c | Metricool social | Sync metricas de Metricool | Requiere API Metricool |
| RS-054b | Brevo nurturing | Secuencias nurturing en Brevo | Requiere API Brevo avanzada |
| RS-054c | Brevo reactivation | Campana reactivacion en Brevo | Requiere API Brevo |
| RS-076b | Cost tracking | Tracking de costes automatizado | Parcialmente cubierto por Cost Control |
| RS-092 | FirstPromoter webhook | Tracking de referidos | Requiere FirstPromoter API |
| RS-093 | Lemlist sync | Sync campanas Lemlist | Requiere polling Lemlist |
| RS-094 | Competitor alerts | Alertas de competidores | Requiere scraping/monitoring |
| RS-095 | DB backup | Backup automatico de DB | Requiere acceso directo a PG dump |

### Flujos personalizados (no CRM)

| Archivo | Funcion | Nota |
|---------|---------|------|
| flujo IA redes sociales.json | Generacion contenido IA para RRSS | Cubierto por Content Pipeline |
| flujo asistente telegram.json | Bot asistente Telegram | Independiente del CRM |
| flujo etiquetado gmail.json | Auto-etiquetar emails en Gmail | Independiente del CRM |
| flujo videos virales Tik Tok.json | Crear videos virales TikTok | Independiente del CRM |
| flujo_creacion_videos.json | Pipeline creacion de videos | Independiente del CRM |

**Total solo en n8n: 20 workflows CRM + 5 personalizados**

---

## Resumen

| Categoria | Count | Estado |
|-----------|-------|--------|
| Migrados a Python | 19 | Funcionan sin n8n |
| Solo n8n (CRM) | 20 | Requieren n8n activo |
| Solo n8n (personal) | 5 | Independientes del CRM |
| **Total** | **44** | n8n es opcional para los 19 migrados |

## Recomendacion

n8n sigue siendo util para:
- Los 20 workflows CRM no migrados (especialmente scraping, reports PDF, sync bidireccionales)
- Los 5 flujos personales (videos, telegram bot)
- Prototipado rapido de nuevos flujos

El workflow engine interno cubre el 95% de los casos de uso criticos del dia a dia.
