-- Seed 22 Automations for Riskitera Sales
-- Execute in Supabase SQL Editor

-- First, check if there are existing automations
-- If you want to re-seed, run: DELETE FROM automations;

INSERT INTO automations (code, name, description, category, trigger_type, trigger_config, actions_description, api_endpoints, integrations, priority, complexity, impact, phase, sprint, estimated_hours, dependencies)
VALUES
('EM-01', 'Secuencia Welcome', 'Cuando se crea un lead nuevo, dispara secuencia de 3 emails automáticos: Día 0 (intro), Día 3 (propuesta valor), Día 7 (follow-up).', 'email_automation', 'webhook', '{"webhook_path": "/hooks/lead-created", "event": "lead.created"}'::jsonb, '1. Recibir webhook nuevo lead
2. Wait 0/3/7 días
3. GET template por categoría
4. Personalizar con datos lead
5. POST /emails (crear)
6. POST /emails/{id}/send
7. PUT /leads/{id} (status→contacted)', '["POST /api/v1/emails", "POST /api/v1/emails/{id}/send", "PUT /api/v1/leads/{id}"]'::jsonb, '["Resend API"]'::jsonb, 'critical', 'medium', 'Alto - Primer contacto automático', 'phase_1', 'Sprint 2', 8, '[]'::jsonb),

('EM-02', 'Tracking de Email', 'Webhook de Resend notifica cuando un email es abierto, clickeado o respondido. Actualiza status y ajusta score del lead (+5 open, +10 click, +20 reply).', 'email_automation', 'webhook', '{"webhook_path": "/hooks/resend-events", "events": ["email.opened", "email.clicked", "email.replied"]}'::jsonb, '1. Recibir webhook Resend
2. Buscar email por resend_id
3. PUT /emails/{id}
4. GET lead asociado
5. PUT /leads/{id} (score)
6. Si reply → crear Action follow-up', '["PUT /api/v1/emails/{id}", "PUT /api/v1/leads/{id}", "POST /api/v1/actions"]'::jsonb, '["Resend Webhooks"]'::jsonb, 'critical', 'low', 'Alto - Scoring automático', 'phase_1', 'Sprint 2', 4, '["EM-01"]'::jsonb),

('EM-03', 'Re-engagement Automático', 'Cron semanal busca leads dormant con último contacto > 30 días. Envía email de reactivación personalizado según sector y frameworks.', 'email_automation', 'cron', '{"cron": "0 9 * * 1", "timezone": "Europe/Madrid"}'::jsonb, '1. GET /leads?status=dormant
2. Filtrar último contacto > 30d
3. Seleccionar template por sector
4. POST /emails + send
5. PUT /leads/{id} (status→contacted)', '["GET /api/v1/leads", "POST /api/v1/emails", "PUT /api/v1/leads/{id}"]'::jsonb, '["Resend API"]'::jsonb, 'high', 'medium', 'Alto - Recuperar oportunidades', 'phase_4', 'Sprint 7', 4, '["EM-01"]'::jsonb),

('EM-04', 'Follow-up Post-Visita', 'Tras visita positiva o follow_up, envía email de agradecimiento y resumen 24h después con los next_steps acordados.', 'email_automation', 'webhook', '{"webhook_path": "/hooks/visit-created", "filter": "result in [positive, follow_up]"}'::jsonb, '1. Recibir webhook nueva visita
2. Filtrar result
3. Wait 24h
4. GET /leads/{id}
5. Componer email con summary + next_steps
6. POST /emails + send', '["GET /api/v1/leads/{id}", "POST /api/v1/emails", "POST /api/v1/emails/{id}/send"]'::jsonb, '["Resend API"]'::jsonb, 'high', 'low', 'Alto - Profesionalizar seguimiento', 'phase_2', 'Sprint 3', 3, '[]'::jsonb),

('LD-01', 'Webhook Formulario Web', 'Recibe datos de formulario riskitera.com, crea lead con source=website, asigna score inicial y notifica por Telegram.', 'leads_captacion', 'webhook', '{"webhook_path": "/hooks/website-form"}'::jsonb, '1. Recibir datos formulario
2. Mapear campos a schema Lead
3. POST /leads
4. Calcular score inicial
5. PUT /leads/{id}
6. Notificar Telegram', '["POST /api/v1/leads", "PUT /api/v1/leads/{id}"]'::jsonb, '["Telegram Bot API"]'::jsonb, 'critical', 'low', 'Crítico - No perder ningún lead', 'phase_1', 'Sprint 1', 4, '[]'::jsonb),

('LD-02', 'Sincronización Apollo.io', 'Cron diario sincroniza prospectos desde Apollo.io filtrados por sector, país España y tamaño > 50 empleados.', 'leads_captacion', 'cron', '{"cron": "0 8 * * *", "timezone": "Europe/Madrid"}'::jsonb, '1. GET Apollo.io API
2. Filtrar criterios
3. Verificar duplicados (CIF)
4. POST /leads enriquecidos
5. Resumen diario email', '["POST /api/v1/leads", "GET /api/v1/leads"]'::jsonb, '["Apollo.io API"]'::jsonb, 'high', 'high', 'Alto - Alimentar pipeline', 'phase_3', 'Sprint 6', 8, '[]'::jsonb),

('LD-03', 'Enriquecimiento Automático', 'Lead con datos mínimos → busca CIF, sector CNAE, tamaño, contactos. Infiere frameworks regulatorios aplicables.', 'leads_captacion', 'webhook', '{"webhook_path": "/hooks/lead-created", "filter": "minimal_data"}'::jsonb, '1. Detectar lead incompleto
2. Buscar API CNAE
3. Apollo.io enrichment
4. Inferir frameworks
5. PUT /leads/{id}', '["PUT /api/v1/leads/{id}"]'::jsonb, '["Apollo.io API", "APIs CNAE"]'::jsonb, 'medium', 'high', 'Medio - Mejor cualificación', 'phase_3', 'Sprint 6', 6, '["LD-02"]'::jsonb),

('LD-04', 'Lead Scoring Automático', 'Recalcula score basado en reglas: sector crítico +20, público +15, >200 empleados +10, NIS2 +25, interacción email +5/+10/+20.', 'leads_captacion', 'event', '{"events": ["lead.updated", "email.opened", "visit.created"]}'::jsonb, '1. Recibir evento
2. GET /leads/{id}
3. Aplicar reglas scoring
4. PUT /leads/{id}
5. Si score > 70 → qualified
6. Notificar', '["GET /api/v1/leads/{id}", "PUT /api/v1/leads/{id}"]'::jsonb, '["Telegram Bot API"]'::jsonb, 'high', 'medium', 'Alto - Priorizar esfuerzo', 'phase_1', 'Sprint 2', 4, '["EM-02"]'::jsonb),

('VI-01', 'Auto-crear Acciones Post-Visita', 'Al registrar visita, crea acciones automáticas según resultado: positive → propuesta (3d), follow_up → reunión (5d).', 'visitas', 'webhook', '{"webhook_path": "/hooks/visit-created"}'::jsonb, '1. Recibir visita
2. Switch por result
3. POST /actions
4. PUT /leads/{id}', '["POST /api/v1/actions", "PUT /api/v1/leads/{id}"]'::jsonb, '[]'::jsonb, 'high', 'low', 'Alto - No olvidar next steps', 'phase_2', 'Sprint 3', 3, '[]'::jsonb),

('VI-02', 'Recordatorio Pre-Visita', '24h antes de visita programada, envía briefing con datos del lead, historial y puntos clave.', 'visitas', 'cron', '{"cron": "0 * * * *", "timezone": "Europe/Madrid"}'::jsonb, '1. GET /visits próximas 24h
2. GET /leads/{id}
3. GET historial
4. Componer briefing
5. Enviar Telegram + Email', '["GET /api/v1/visits", "GET /api/v1/leads/{id}", "GET /api/v1/emails"]'::jsonb, '["Telegram Bot API", "Google Calendar"]'::jsonb, 'medium', 'medium', 'Medio - Mejor preparación', 'phase_4', 'Sprint 8', 4, '[]'::jsonb),

('VI-03', 'Sync Google Calendar', 'Sincronización bidireccional con Google Calendar para visitas comerciales.', 'visitas', 'webhook', '{"bidirectional": true}'::jsonb, '1A. Nueva visita → evento GCal
1B. Evento GCal → POST /visits
2. Actualizar ambos
3. Link a lead en descripción', '["POST /api/v1/visits", "GET /api/v1/leads/{id}"]'::jsonb, '["Google Calendar API"]'::jsonb, 'medium', 'high', 'Medio - Centralizar agenda', 'phase_4', 'Sprint 8', 6, '[]'::jsonb),

('AC-01', 'Resumen Diario de Acciones', 'Cada día 08:30 envía resumen Telegram + email: acciones vencidas, hoy, próximos 3 días, priorizado por urgencia.', 'acciones_alertas', 'cron', '{"cron": "30 8 * * *", "timezone": "Europe/Madrid"}'::jsonb, '1. GET /actions pending + in_progress
2. Clasificar: overdue/hoy/3d
3. GET /leads para nombres
4. Componer mensaje
5. Enviar Telegram + Email', '["GET /api/v1/actions", "GET /api/v1/leads/{id}"]'::jsonb, '["Telegram Bot API", "Resend API"]'::jsonb, 'critical', 'low', 'Crítico - No perder oportunidades', 'phase_1', 'Sprint 1', 4, '[]'::jsonb),

('AC-02', 'Escalado Automático', 'Acciones overdue > 3d → alerta Telegram. Overdue > 7d → prioridad critical + email escalado.', 'acciones_alertas', 'cron', '{"cron": "0 9 * * *", "timezone": "Europe/Madrid"}'::jsonb, '1. GET /actions overdue
2. Calcular días retraso
3. Si > 3d → Telegram
4. Si > 7d → PUT priority critical + email', '["GET /api/v1/actions", "PUT /api/v1/actions/{id}", "GET /api/v1/leads/{id}"]'::jsonb, '["Telegram Bot API", "Resend API"]'::jsonb, 'high', 'low', 'Alto - Evitar caída de deals', 'phase_2', 'Sprint 3', 3, '["AC-01"]'::jsonb),

('AC-03', 'Auto-cierre Acciones', 'Al enviar email o registrar visita, marca acciones pendientes relacionadas como completadas automáticamente.', 'acciones_alertas', 'event', '{"events": ["email.sent", "visit.created"]}'::jsonb, '1. Recibir evento
2. GET /actions?lead_id&pending
3. Match por type
4. PUT /actions completed', '["GET /api/v1/actions", "PUT /api/v1/actions/{id}"]'::jsonb, '[]'::jsonb, 'medium', 'medium', 'Medio - Reducir gestión manual', 'phase_4', 'Sprint 8', 4, '[]'::jsonb),

('PI-01', 'Triggers por Cambio de Etapa', 'Cambio de stage en oportunidad dispara acciones: qualification→checklist, proposal→email, negotiation→alerta, closed_won→encuesta.', 'pipeline', 'webhook', '{"webhook_path": "/hooks/opportunity-stage-change"}'::jsonb, '1. Detectar cambio stage
2. Switch por etapa
3. Crear acciones/emails/surveys
4. Actualizar lead status', '["PUT /api/v1/leads/{id}", "POST /api/v1/actions", "POST /api/v1/emails", "POST /api/v1/surveys"]'::jsonb, '["Telegram Bot API", "Resend API"]'::jsonb, 'high', 'high', 'Crítico - Automatizar proceso', 'phase_2', 'Sprint 4', 8, '["EM-01", "AC-01"]'::jsonb),

('PI-02', 'Report Semanal Pipeline', 'Viernes 17:00: informe con valor pipeline, ponderado, oportunidades por etapa, deals en riesgo, forecast.', 'pipeline', 'cron', '{"cron": "0 17 * * 5", "timezone": "Europe/Madrid"}'::jsonb, '1. GET /dashboard/stats
2. GET /opportunities
3. Calcular deals sin actividad
4. Generar informe HTML
5. Enviar email + Telegram', '["GET /api/v1/dashboard/stats", "GET /api/v1/opportunities", "GET /api/v1/actions"]'::jsonb, '["Telegram Bot API", "Resend API"]'::jsonb, 'high', 'medium', 'Alto - Visibilidad del negocio', 'phase_2', 'Sprint 4', 4, '[]'::jsonb),

('PI-03', 'Alerta Deal Estancado', 'Detecta oportunidades sin actividad en 14 días. Crea acción follow-up y alerta Telegram.', 'pipeline', 'cron', '{"cron": "0 10 * * 3", "timezone": "Europe/Madrid"}'::jsonb, '1. GET /opportunities abiertas
2. Verificar última actividad
3. Si > 14d → POST /actions + alerta', '["GET /api/v1/opportunities", "GET /api/v1/actions", "POST /api/v1/actions"]'::jsonb, '["Telegram Bot API"]'::jsonb, 'high', 'medium', 'Alto - Reactivar deals', 'phase_2', 'Sprint 4', 4, '[]'::jsonb),

('MR-01', 'Auto-generación Monthly Review', 'Día 1 cada mes: genera Monthly Review por lead activo con emails, visitas, acciones pre-rellenados.', 'seguimiento_mensual', 'cron', '{"cron": "0 8 1 * *", "timezone": "Europe/Madrid"}'::jsonb, '1. GET /leads activos
2. Contar métricas mes anterior
3. POST /monthly-reviews
4. Enviar resumen consolidado', '["GET /api/v1/leads", "GET /api/v1/emails", "GET /api/v1/visits", "GET /api/v1/actions", "POST /api/v1/monthly-reviews"]'::jsonb, '["Resend API"]'::jsonb, 'critical', 'high', 'Crítico - Ahorro tiempo', 'phase_3', 'Sprint 5', 8, '[]'::jsonb),

('MR-02', 'Informe Mensual Consolidado', 'Día 2 cada mes: informe HTML con KPIs, leads nuevos, oportunidades, NPS, comparativa mes anterior.', 'seguimiento_mensual', 'cron', '{"cron": "0 10 2 * *", "timezone": "Europe/Madrid"}'::jsonb, '1. GET /dashboard/stats
2. GET /monthly-reviews
3. Calcular KPIs
4. Generar HTML
5. Enviar email', '["GET /api/v1/dashboard/stats", "GET /api/v1/monthly-reviews", "GET /api/v1/opportunities"]'::jsonb, '["Resend API"]'::jsonb, 'high', 'high', 'Alto - Visión ejecutiva', 'phase_3', 'Sprint 5', 6, '["MR-01"]'::jsonb),

('SV-01', 'Encuesta Post-Cierre (NPS)', '30 días después de closed_won, envía encuesta NPS. Si NPS < 7 → acción urgente. Si NPS >= 9 → pedir referencia.', 'encuestas', 'cron', '{"cron": "0 10 * * *", "timezone": "Europe/Madrid"}'::jsonb, '1. GET /opportunities closed_won hace 30d
2. POST /surveys NPS
3. POST /emails encuesta
4. Webhook respuesta
5. Lógica NPS', '["POST /api/v1/surveys", "POST /api/v1/emails", "PUT /api/v1/surveys/{id}", "POST /api/v1/actions"]'::jsonb, '["Resend API", "Typeform"]'::jsonb, 'high', 'high', 'Alto - Retención y referencias', 'phase_4', 'Sprint 7', 6, '[]'::jsonb),

('SV-02', 'Encuesta Trimestral CSAT', 'Cada trimestre envía encuesta de satisfacción a clientes activos. Recopila feedback e identifica mejoras.', 'encuestas', 'cron', '{"cron": "0 10 1 1,4,7,10 *", "timezone": "Europe/Madrid"}'::jsonb, '1. GET /leads?status=won
2. POST /surveys CSAT
3. POST /emails
4. Webhook respuestas
5. Informe trimestral', '["GET /api/v1/leads", "POST /api/v1/surveys", "POST /api/v1/emails"]'::jsonb, '["Resend API", "Typeform"]'::jsonb, 'medium', 'medium', 'Medio - Mejora continua', 'phase_4', 'Sprint 7', 4, '["SV-01"]'::jsonb),

('IN-01', 'Importar Leads desde Scraping', 'Conecta con sistema de scraping de directorios españoles. Importa, deduplica por CIF, asigna source=scraping.', 'integraciones', 'webhook', '{"webhook_path": "/hooks/scraping-batch"}'::jsonb, '1. Recibir datos scraping
2. Verificar duplicados
3. POST /leads
4. Asignar frameworks
5. Resumen Telegram', '["POST /api/v1/leads", "GET /api/v1/leads"]'::jsonb, '["Sistema scraping", "Telegram"]'::jsonb, 'high', 'medium', 'Alto - Alimentar pipeline', 'phase_3', 'Sprint 6', 4, '[]'::jsonb),

('IN-02', 'Notificaciones Telegram Hub', 'Bot Telegram centralizado para todas las notificaciones: leads, emails, acciones, deals. Comandos rápidos.', 'integraciones', 'event', '{"channels": ["leads", "actions", "pipeline", "daily"]}'::jsonb, '1. Configurar Bot
2. Crear canales
3. Centralizar alertas
4. Comandos: /lead, /actions today', '["GET (todos los endpoints)"]'::jsonb, '["Telegram Bot API"]'::jsonb, 'high', 'medium', 'Alto - Centro notificaciones', 'phase_1', 'Sprint 1', 4, '[]'::jsonb);

-- Mark AC-01 as deployed (already implemented!)
UPDATE automations
SET impl_status = 'deployed', status = 'active', is_enabled = true
WHERE code = 'AC-01';

-- Verify the insert
SELECT COUNT(*) as total_automations FROM automations;
SELECT category, COUNT(*) as count FROM automations GROUP BY category ORDER BY category;
SELECT code, name, impl_status, status FROM automations WHERE code = 'AC-01';
