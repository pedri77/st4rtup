#!/usr/bin/env python3
"""
Seed script for Riskitera Sales CRM
Populates database with:
- 22 automations
- Sample leads
- Sample visits, emails, actions

Usage:
    python scripts/seed_data.py --env production
    python scripts/seed_data.py --env local
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.core.config import settings
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import Lead, Visit, Email, Action, Automation
from datetime import datetime, timedelta, timezone
import random


async def seed_automations(db: AsyncSession) -> int:
    """Seed the 22 automations via the database directly."""
    # Check if already seeded
    existing = (await db.execute(select(func.count(Automation.id)))).scalar()
    if existing > 0:
        print(f"⚠️  Already {existing} automations exist. Skipping...")
        return 0

    seed_data = [
        {"code": "EM-01", "name": "Secuencia Welcome", "description": "Cuando se crea un lead nuevo, dispara secuencia de 3 emails automáticos: Día 0 (intro), Día 3 (propuesta valor), Día 7 (follow-up).", "category": "email_automation", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/lead-created", "event": "lead.created"}, "actions_description": "1. Recibir webhook nuevo lead\n2. Wait 0/3/7 días\n3. GET template por categoría\n4. Personalizar con datos lead\n5. POST /emails (crear)\n6. POST /emails/{id}/send\n7. PUT /leads/{id} (status→contacted)", "api_endpoints": ["POST /api/v1/emails", "POST /api/v1/emails/{id}/send", "PUT /api/v1/leads/{id}"], "integrations": ["Resend API"], "priority": "critical", "complexity": "medium", "impact": "Alto - Primer contacto automático", "phase": "phase_1", "sprint": "Sprint 2", "estimated_hours": 8, "dependencies": []},
        {"code": "EM-02", "name": "Tracking de Email", "description": "Webhook de Resend notifica cuando un email es abierto, clickeado o respondido. Actualiza status y ajusta score del lead (+5 open, +10 click, +20 reply).", "category": "email_automation", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/resend-events", "events": ["email.opened", "email.clicked", "email.replied"]}, "actions_description": "1. Recibir webhook Resend\n2. Buscar email por resend_id\n3. PUT /emails/{id}\n4. GET lead asociado\n5. PUT /leads/{id} (score)\n6. Si reply → crear Action follow-up", "api_endpoints": ["PUT /api/v1/emails/{id}", "PUT /api/v1/leads/{id}", "POST /api/v1/actions"], "integrations": ["Resend Webhooks"], "priority": "critical", "complexity": "low", "impact": "Alto - Scoring automático", "phase": "phase_1", "sprint": "Sprint 2", "estimated_hours": 4, "dependencies": ["EM-01"]},
        {"code": "EM-03", "name": "Re-engagement Automático", "description": "Cron semanal busca leads dormant con último contacto > 30 días. Envía email de reactivación personalizado según sector y frameworks.", "category": "email_automation", "trigger_type": "cron", "trigger_config": {"cron": "0 9 * * 1", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /leads?status=dormant\n2. Filtrar último contacto > 30d\n3. Seleccionar template por sector\n4. POST /emails + send\n5. PUT /leads/{id} (status→contacted)", "api_endpoints": ["GET /api/v1/leads", "POST /api/v1/emails", "PUT /api/v1/leads/{id}"], "integrations": ["Resend API"], "priority": "high", "complexity": "medium", "impact": "Alto - Recuperar oportunidades", "phase": "phase_4", "sprint": "Sprint 7", "estimated_hours": 4, "dependencies": ["EM-01"]},
        {"code": "EM-04", "name": "Follow-up Post-Visita", "description": "Tras visita positiva o follow_up, envía email de agradecimiento y resumen 24h después con los next_steps acordados.", "category": "email_automation", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/visit-created", "filter": "result in [positive, follow_up]"}, "actions_description": "1. Recibir webhook nueva visita\n2. Filtrar result\n3. Wait 24h\n4. GET /leads/{id}\n5. Componer email con summary + next_steps\n6. POST /emails + send", "api_endpoints": ["GET /api/v1/leads/{id}", "POST /api/v1/emails", "POST /api/v1/emails/{id}/send"], "integrations": ["Resend API"], "priority": "high", "complexity": "low", "impact": "Alto - Profesionalizar seguimiento", "phase": "phase_2", "sprint": "Sprint 3", "estimated_hours": 3, "dependencies": []},
        {"code": "LD-01", "name": "Webhook Formulario Web", "description": "Recibe datos de formulario riskitera.com, crea lead con source=website, asigna score inicial y notifica por Telegram.", "category": "leads_captacion", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/website-form"}, "actions_description": "1. Recibir datos formulario\n2. Mapear campos a schema Lead\n3. POST /leads\n4. Calcular score inicial\n5. PUT /leads/{id}\n6. Notificar Telegram", "api_endpoints": ["POST /api/v1/leads", "PUT /api/v1/leads/{id}"], "integrations": ["Telegram Bot API"], "priority": "critical", "complexity": "low", "impact": "Crítico - No perder ningún lead", "phase": "phase_1", "sprint": "Sprint 1", "estimated_hours": 4, "dependencies": []},
        {"code": "LD-02", "name": "Sincronización Apollo.io", "description": "Cron diario sincroniza prospectos desde Apollo.io filtrados por sector, país España y tamaño > 50 empleados.", "category": "leads_captacion", "trigger_type": "cron", "trigger_config": {"cron": "0 8 * * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET Apollo.io API\n2. Filtrar criterios\n3. Verificar duplicados (CIF)\n4. POST /leads enriquecidos\n5. Resumen diario email", "api_endpoints": ["POST /api/v1/leads", "GET /api/v1/leads"], "integrations": ["Apollo.io API"], "priority": "high", "complexity": "high", "impact": "Alto - Alimentar pipeline", "phase": "phase_3", "sprint": "Sprint 6", "estimated_hours": 8, "dependencies": []},
        {"code": "LD-03", "name": "Enriquecimiento Automático", "description": "Lead con datos mínimos → busca CIF, sector CNAE, tamaño, contactos. Infiere frameworks regulatorios aplicables.", "category": "leads_captacion", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/lead-created", "filter": "minimal_data"}, "actions_description": "1. Detectar lead incompleto\n2. Buscar API CNAE\n3. Apollo.io enrichment\n4. Inferir frameworks\n5. PUT /leads/{id}", "api_endpoints": ["PUT /api/v1/leads/{id}"], "integrations": ["Apollo.io API", "APIs CNAE"], "priority": "medium", "complexity": "high", "impact": "Medio - Mejor cualificación", "phase": "phase_3", "sprint": "Sprint 6", "estimated_hours": 6, "dependencies": ["LD-02"]},
        {"code": "LD-04", "name": "Lead Scoring Automático", "description": "Recalcula score basado en reglas: sector crítico +20, público +15, >200 empleados +10, NIS2 +25, interacción email +5/+10/+20.", "category": "leads_captacion", "trigger_type": "event", "trigger_config": {"events": ["lead.updated", "email.opened", "visit.created"]}, "actions_description": "1. Recibir evento\n2. GET /leads/{id}\n3. Aplicar reglas scoring\n4. PUT /leads/{id}\n5. Si score > 70 → qualified\n6. Notificar", "api_endpoints": ["GET /api/v1/leads/{id}", "PUT /api/v1/leads/{id}"], "integrations": ["Telegram Bot API"], "priority": "high", "complexity": "medium", "impact": "Alto - Priorizar esfuerzo", "phase": "phase_1", "sprint": "Sprint 2", "estimated_hours": 4, "dependencies": ["EM-02"]},
        {"code": "VI-01", "name": "Auto-crear Acciones Post-Visita", "description": "Al registrar visita, crea acciones automáticas según resultado: positive → propuesta (3d), follow_up → reunión (5d).", "category": "visitas", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/visit-created"}, "actions_description": "1. Recibir visita\n2. Switch por result\n3. POST /actions\n4. PUT /leads/{id}", "api_endpoints": ["POST /api/v1/actions", "PUT /api/v1/leads/{id}"], "integrations": [], "priority": "high", "complexity": "low", "impact": "Alto - No olvidar next steps", "phase": "phase_2", "sprint": "Sprint 3", "estimated_hours": 3, "dependencies": []},
        {"code": "VI-02", "name": "Recordatorio Pre-Visita", "description": "24h antes de visita programada, envía briefing con datos del lead, historial y puntos clave.", "category": "visitas", "trigger_type": "cron", "trigger_config": {"cron": "0 * * * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /visits próximas 24h\n2. GET /leads/{id}\n3. GET historial\n4. Componer briefing\n5. Enviar Telegram + Email", "api_endpoints": ["GET /api/v1/visits", "GET /api/v1/leads/{id}", "GET /api/v1/emails"], "integrations": ["Telegram Bot API", "Google Calendar"], "priority": "medium", "complexity": "medium", "impact": "Medio - Mejor preparación", "phase": "phase_4", "sprint": "Sprint 8", "estimated_hours": 4, "dependencies": []},
        {"code": "VI-03", "name": "Sync Google Calendar", "description": "Sincronización bidireccional con Google Calendar para visitas comerciales.", "category": "visitas", "trigger_type": "webhook", "trigger_config": {"bidirectional": True}, "actions_description": "1A. Nueva visita → evento GCal\n1B. Evento GCal → POST /visits\n2. Actualizar ambos\n3. Link a lead en descripción", "api_endpoints": ["POST /api/v1/visits", "GET /api/v1/leads/{id}"], "integrations": ["Google Calendar API"], "priority": "medium", "complexity": "high", "impact": "Medio - Centralizar agenda", "phase": "phase_4", "sprint": "Sprint 8", "estimated_hours": 6, "dependencies": []},
        {"code": "AC-01", "name": "Resumen Diario de Acciones", "description": "Cada día 08:30 envía resumen Telegram + email: acciones vencidas, hoy, próximos 3 días, priorizado por urgencia.", "category": "acciones_alertas", "trigger_type": "cron", "trigger_config": {"cron": "30 8 * * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /actions pending + in_progress\n2. Clasificar: overdue/hoy/3d\n3. GET /leads para nombres\n4. Componer mensaje\n5. Enviar Telegram + Email", "api_endpoints": ["GET /api/v1/actions", "GET /api/v1/leads/{id}"], "integrations": ["Telegram Bot API", "Resend API"], "priority": "critical", "complexity": "low", "impact": "Crítico - No perder oportunidades", "phase": "phase_1", "sprint": "Sprint 1", "estimated_hours": 4, "dependencies": []},
        {"code": "AC-02", "name": "Escalado Automático", "description": "Acciones overdue > 3d → alerta Telegram. Overdue > 7d → prioridad critical + email escalado.", "category": "acciones_alertas", "trigger_type": "cron", "trigger_config": {"cron": "0 9 * * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /actions overdue\n2. Calcular días retraso\n3. Si > 3d → Telegram\n4. Si > 7d → PUT priority critical + email", "api_endpoints": ["GET /api/v1/actions", "PUT /api/v1/actions/{id}", "GET /api/v1/leads/{id}"], "integrations": ["Telegram Bot API", "Resend API"], "priority": "high", "complexity": "low", "impact": "Alto - Evitar caída de deals", "phase": "phase_2", "sprint": "Sprint 3", "estimated_hours": 3, "dependencies": ["AC-01"]},
        {"code": "AC-03", "name": "Auto-cierre Acciones", "description": "Al enviar email o registrar visita, marca acciones pendientes relacionadas como completadas automáticamente.", "category": "acciones_alertas", "trigger_type": "event", "trigger_config": {"events": ["email.sent", "visit.created"]}, "actions_description": "1. Recibir evento\n2. GET /actions?lead_id&pending\n3. Match por type\n4. PUT /actions completed", "api_endpoints": ["GET /api/v1/actions", "PUT /api/v1/actions/{id}"], "integrations": [], "priority": "medium", "complexity": "medium", "impact": "Medio - Reducir gestión manual", "phase": "phase_4", "sprint": "Sprint 8", "estimated_hours": 4, "dependencies": []},
        {"code": "PI-01", "name": "Triggers por Cambio de Etapa", "description": "Cambio de stage en oportunidad dispara acciones: qualification→checklist, proposal→email, negotiation→alerta, closed_won→encuesta.", "category": "pipeline", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/opportunity-stage-change"}, "actions_description": "1. Detectar cambio stage\n2. Switch por etapa\n3. Crear acciones/emails/surveys\n4. Actualizar lead status", "api_endpoints": ["PUT /api/v1/leads/{id}", "POST /api/v1/actions", "POST /api/v1/emails", "POST /api/v1/surveys"], "integrations": ["Telegram Bot API", "Resend API"], "priority": "high", "complexity": "high", "impact": "Crítico - Automatizar proceso", "phase": "phase_2", "sprint": "Sprint 4", "estimated_hours": 8, "dependencies": ["EM-01", "AC-01"]},
        {"code": "PI-02", "name": "Report Semanal Pipeline", "description": "Viernes 17:00: informe con valor pipeline, ponderado, oportunidades por etapa, deals en riesgo, forecast.", "category": "pipeline", "trigger_type": "cron", "trigger_config": {"cron": "0 17 * * 5", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /dashboard/stats\n2. GET /opportunities\n3. Calcular deals sin actividad\n4. Generar informe HTML\n5. Enviar email + Telegram", "api_endpoints": ["GET /api/v1/dashboard/stats", "GET /api/v1/opportunities", "GET /api/v1/actions"], "integrations": ["Telegram Bot API", "Resend API"], "priority": "high", "complexity": "medium", "impact": "Alto - Visibilidad del negocio", "phase": "phase_2", "sprint": "Sprint 4", "estimated_hours": 4, "dependencies": []},
        {"code": "PI-03", "name": "Alerta Deal Estancado", "description": "Detecta oportunidades sin actividad en 14 días. Crea acción follow-up y alerta Telegram.", "category": "pipeline", "trigger_type": "cron", "trigger_config": {"cron": "0 10 * * 3", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /opportunities abiertas\n2. Verificar última actividad\n3. Si > 14d → POST /actions + alerta", "api_endpoints": ["GET /api/v1/opportunities", "GET /api/v1/actions", "POST /api/v1/actions"], "integrations": ["Telegram Bot API"], "priority": "high", "complexity": "medium", "impact": "Alto - Reactivar deals", "phase": "phase_2", "sprint": "Sprint 4", "estimated_hours": 4, "dependencies": []},
        {"code": "MR-01", "name": "Auto-generación Monthly Review", "description": "Día 1 cada mes: genera Monthly Review por lead activo con emails, visitas, acciones pre-rellenados.", "category": "seguimiento_mensual", "trigger_type": "cron", "trigger_config": {"cron": "0 8 1 * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /leads activos\n2. Contar métricas mes anterior\n3. POST /monthly-reviews\n4. Enviar resumen consolidado", "api_endpoints": ["GET /api/v1/leads", "GET /api/v1/emails", "GET /api/v1/visits", "GET /api/v1/actions", "POST /api/v1/monthly-reviews"], "integrations": ["Resend API"], "priority": "critical", "complexity": "high", "impact": "Crítico - Ahorro tiempo", "phase": "phase_3", "sprint": "Sprint 5", "estimated_hours": 8, "dependencies": []},
        {"code": "MR-02", "name": "Informe Mensual Consolidado", "description": "Día 2 cada mes: informe HTML con KPIs, leads nuevos, oportunidades, NPS, comparativa mes anterior.", "category": "seguimiento_mensual", "trigger_type": "cron", "trigger_config": {"cron": "0 10 2 * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /dashboard/stats\n2. GET /monthly-reviews\n3. Calcular KPIs\n4. Generar HTML\n5. Enviar email", "api_endpoints": ["GET /api/v1/dashboard/stats", "GET /api/v1/monthly-reviews", "GET /api/v1/opportunities"], "integrations": ["Resend API"], "priority": "high", "complexity": "high", "impact": "Alto - Visión ejecutiva", "phase": "phase_3", "sprint": "Sprint 5", "estimated_hours": 6, "dependencies": ["MR-01"]},
        {"code": "SV-01", "name": "Encuesta Post-Cierre (NPS)", "description": "30 días después de closed_won, envía encuesta NPS. Si NPS < 7 → acción urgente. Si NPS >= 9 → pedir referencia.", "category": "encuestas", "trigger_type": "cron", "trigger_config": {"cron": "0 10 * * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /opportunities closed_won hace 30d\n2. POST /surveys NPS\n3. POST /emails encuesta\n4. Webhook respuesta\n5. Lógica NPS", "api_endpoints": ["POST /api/v1/surveys", "POST /api/v1/emails", "PUT /api/v1/surveys/{id}", "POST /api/v1/actions"], "integrations": ["Resend API", "Typeform"], "priority": "high", "complexity": "high", "impact": "Alto - Retención y referencias", "phase": "phase_4", "sprint": "Sprint 7", "estimated_hours": 6, "dependencies": []},
        {"code": "SV-02", "name": "Encuesta Trimestral CSAT", "description": "Cada trimestre envía encuesta de satisfacción a clientes activos. Recopila feedback e identifica mejoras.", "category": "encuestas", "trigger_type": "cron", "trigger_config": {"cron": "0 10 1 1,4,7,10 *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /leads?status=won\n2. POST /surveys CSAT\n3. POST /emails\n4. Webhook respuestas\n5. Informe trimestral", "api_endpoints": ["GET /api/v1/leads", "POST /api/v1/surveys", "POST /api/v1/emails"], "integrations": ["Resend API", "Typeform"], "priority": "medium", "complexity": "medium", "impact": "Medio - Mejora continua", "phase": "phase_4", "sprint": "Sprint 7", "estimated_hours": 4, "dependencies": ["SV-01"]},
        {"code": "IN-01", "name": "Importar Leads desde Scraping", "description": "Conecta con sistema de scraping de directorios españoles. Importa, deduplica por CIF, asigna source=scraping.", "category": "integraciones", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/scraping-batch"}, "actions_description": "1. Recibir datos scraping\n2. Verificar duplicados\n3. POST /leads\n4. Asignar frameworks\n5. Resumen Telegram", "api_endpoints": ["POST /api/v1/leads", "GET /api/v1/leads"], "integrations": ["Sistema scraping", "Telegram"], "priority": "high", "complexity": "medium", "impact": "Alto - Alimentar pipeline", "phase": "phase_3", "sprint": "Sprint 6", "estimated_hours": 4, "dependencies": []},
        {"code": "IN-02", "name": "Notificaciones Telegram Hub", "description": "Bot Telegram centralizado para todas las notificaciones: leads, emails, acciones, deals. Comandos rápidos.", "category": "integraciones", "trigger_type": "event", "trigger_config": {"channels": ["leads", "actions", "pipeline", "daily"]}, "actions_description": "1. Configurar Bot\n2. Crear canales\n3. Centralizar alertas\n4. Comandos: /lead, /actions today", "api_endpoints": ["GET (todos los endpoints)"], "integrations": ["Telegram Bot API"], "priority": "high", "complexity": "medium", "impact": "Alto - Centro notificaciones", "phase": "phase_1", "sprint": "Sprint 1", "estimated_hours": 4, "dependencies": []},
    ]

    count = 0
    for item in seed_data:
        auto = Automation(**item)
        db.add(auto)
        count += 1

    await db.commit()
    print(f"✅ Seeded {count} automations successfully")
    return count


async def seed_sample_leads(db: AsyncSession) -> int:
    """Seed sample leads for testing."""
    # Check if already seeded
    existing = (await db.execute(select(func.count(Lead.id)))).scalar()
    if existing > 0:
        print(f"⚠️  Already {existing} leads exist. Skipping...")
        return 0

    sample_leads = [
        {
            "company_name": "Banco Santander",
            "company_cif": "A39000013",
            "contact_name": "Juan García López",
            "contact_email": "juan.garcia@gruposantander.com",
            "contact_phone": "+34 912 345 678",
            "company_sector": "Financiero",
            "company_size": "5000+",
            "is_public_sector": True,
            "regulatory_frameworks": ["DORA", "NIS2", "ISO27001", "ENS"],
            "status": "qualified",
            "score": 95,
            "source": "linkedin",
            "notes": "Cliente potencial muy interesado en cumplimiento DORA. Reunión agendada para demo.",
            "tags": ["high_priority", "finance", "dora"]
        },
        {
            "company_name": "Telefónica España",
            "company_cif": "A82018474",
            "contact_name": "María Rodríguez",
            "contact_email": "maria.rodriguez@telefonica.com",
            "contact_phone": "+34 913 123 456",
            "company_sector": "Telecomunicaciones",
            "company_size": "5000+",
            "is_public_sector": True,
            "regulatory_frameworks": ["NIS2", "ISO27001", "ENS"],
            "status": "contacted",
            "score": 85,
            "source": "website",
            "notes": "Operador crítico NIS2. Interés en automatización de cumplimiento normativo.",
            "tags": ["nis2", "telecom", "operator_critical"]
        },
        {
            "company_name": "Ayuntamiento de Madrid",
            "company_cif": "P2807900B",
            "contact_name": "Carlos Fernández",
            "contact_email": "carlos.fernandez@madrid.es",
            "contact_phone": "+34 915 881 000",
            "company_sector": "Administración Pública",
            "company_size": "1000-5000",
            "is_public_sector": True,
            "regulatory_frameworks": ["ENS", "ISO27001"],
            "status": "new",
            "score": 75,
            "source": "linkedin",
            "notes": "Administración pública. Obligación ENS Alto. Presupuesto anual para ciberseguridad.",
            "tags": ["ens_alto", "public_sector"]
        },
        {
            "company_name": "Repsol",
            "company_cif": "A78398389",
            "contact_name": "Ana Martínez",
            "contact_email": "ana.martinez@repsol.com",
            "contact_phone": "+34 917 538 100",
            "company_sector": "Energía",
            "company_size": "5000+",
            "is_public_sector": False,
            "regulatory_frameworks": ["NIS2", "ISO27001"],
            "status": "qualified",
            "score": 90,
            "source": "referral",
            "notes": "Infraestructura crítica energética. Necesitan cumplimiento NIS2 urgente.",
            "tags": ["nis2", "energy", "critical_infrastructure"]
        },
        {
            "company_name": "BBVA",
            "company_cif": "A48265169",
            "contact_name": "Pedro Sánchez",
            "contact_email": "pedro.sanchez@bbva.com",
            "contact_phone": "+34 944 876 220",
            "company_sector": "Financiero",
            "company_size": "5000+",
            "is_public_sector": True,
            "regulatory_frameworks": ["DORA", "ISO27001", "PCI-DSS"],
            "status": "contacted",
            "score": 92,
            "source": "apollo",
            "notes": "Entidad financiera. DORA compliance deadline Q2 2025.",
            "tags": ["dora", "finance", "urgent"]
        },
        {
            "company_name": "Iberdrola",
            "company_cif": "A95758389",
            "contact_name": "Laura González",
            "contact_email": "laura.gonzalez@iberdrola.com",
            "contact_phone": "+34 944 151 411",
            "company_sector": "Energía",
            "company_size": "5000+",
            "is_public_sector": False,
            "regulatory_frameworks": ["NIS2", "ISO27001", "ENS"],
            "status": "new",
            "score": 70,
            "source": "website",
            "notes": "Operador de servicios esenciales. Contacto inicial por formulario web.",
            "tags": ["nis2", "energy"]
        },
        {
            "company_name": "Endesa",
            "company_cif": "A81948077",
            "contact_name": "Javier López",
            "contact_email": "javier.lopez@endesa.es",
            "contact_phone": "+34 912 131 314",
            "company_sector": "Energía",
            "company_size": "5000+",
            "is_public_sector": False,
            "regulatory_frameworks": ["NIS2", "ISO27001"],
            "status": "dormant",
            "score": 60,
            "source": "linkedin",
            "notes": "Contacto hace 2 meses. Sin respuesta. Reactivar campaña.",
            "tags": ["reengage", "energy"]
        },
        {
            "company_name": "Renfe",
            "company_cif": "Q2870002H",
            "contact_name": "Carmen Ruiz",
            "contact_email": "carmen.ruiz@renfe.com",
            "contact_phone": "+34 912 320 320",
            "company_sector": "Transporte",
            "company_size": "5000+",
            "is_public_sector": True,
            "regulatory_frameworks": ["NIS2", "ENS", "ISO27001"],
            "status": "contacted",
            "score": 80,
            "source": "website",
            "notes": "Infraestructura crítica transporte. Interés en solución integral.",
            "tags": ["nis2", "transport", "critical"]
        },
    ]

    count = 0
    for item in sample_leads:
        lead = Lead(**item)
        db.add(lead)
        count += 1

    await db.commit()
    print(f"✅ Seeded {count} sample leads successfully")
    return count


async def main():
    parser = argparse.ArgumentParser(description="Seed Riskitera Sales database")
    parser.add_argument(
        "--env",
        choices=["local", "production"],
        default="local",
        help="Environment to seed (local or production)",
    )
    parser.add_argument(
        "--automations-only",
        action="store_true",
        help="Seed only automations",
    )
    parser.add_argument(
        "--leads-only",
        action="store_true",
        help="Seed only sample leads",
    )
    args = parser.parse_args()

    print(f"🌱 Seeding {args.env} database...")
    print(f"📍 Database URL: {settings.DATABASE_URL[:30]}...")

    # Get database session
    async for db in get_db():
        try:
            total = 0

            # Seed automations
            if not args.leads_only:
                print("\n📋 Seeding automations...")
                automations_count = await seed_automations(db)
                total += automations_count

            # Seed sample leads
            if not args.automations_only:
                print("\n👥 Seeding sample leads...")
                leads_count = await seed_sample_leads(db)
                total += leads_count

            print(f"\n✨ Seeding complete! Total records created: {total}")

        except Exception as e:
            print(f"❌ Error seeding database: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

        break  # Only need one iteration


if __name__ == "__main__":
    asyncio.run(main())
