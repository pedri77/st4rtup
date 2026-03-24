"""
Email drip sequences for St4rtup SaaS.
Triggered by scheduler daily at 09:00.
"""
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User

logger = logging.getLogger(__name__)

APP_URL = "https://app.st4rtup.com"

DRIP_SEQUENCES = {
    "welcome": {
        "day": 0,
        "subject": "¡Bienvenido a St4rtup! Tu CRM está listo",
        "body": "Hola {name},\n\n¡Bienvenido a St4rtup! Tu CRM está listo para usar.\n\n3 cosas que puedes hacer ahora:\n\n1. Crea tu primer lead → {app_url}/app/leads\n2. Configura tu pipeline → {app_url}/app/pipeline\n3. Conecta tu email → {app_url}/app/settings\n\n¿Necesitas ayuda? Responde a este email.\n\n— El equipo de St4rtup"
    },
    "day_1_import": {
        "day": 1,
        "subject": "Importa tus leads en 30 segundos",
        "body": "Hola {name},\n\n¿Sabías que puedes importar todos tus leads desde un CSV?\n\nSolo ve a Leads → Importar CSV y arrastra tu archivo.\nSoportamos formato HubSpot, Salesforce y genérico.\n\n{app_url}/app/leads\n\n— El equipo de St4rtup"
    },
    "day_3_pipeline": {
        "day": 3,
        "subject": "Tu pipeline visual te espera",
        "body": "Hola {name},\n\nEl pipeline Kanban es donde la magia ocurre.\n\nArrastra tus oportunidades entre etapas, ve el forecast de revenue y detecta cuellos de botella al instante.\n\nPruébalo → {app_url}/app/pipeline\n\n— El equipo de St4rtup"
    },
    "day_7_ai": {
        "day": 7,
        "subject": "¿Has probado la IA? 4 agentes trabajan para ti",
        "body": "Hola {name},\n\nSt4rtup tiene 4 agentes IA integrados:\n\n1. Scoring automático de leads (ICP)\n2. Cualificación BANT de llamadas\n3. Generación de propuestas\n4. Contenido SEO con 4 agentes encadenados\n\nTodo incluido en tu plan.\n\nAgentes IA: {app_url}/app/agents\nSEO Center: {app_url}/app/marketing/seo-center\n\n— El equipo de St4rtup"
    },
    "day_14_trial_end": {
        "day": 14,
        "subject": "Tu prueba de Growth termina hoy",
        "body": "Hola {name},\n\nTu prueba gratuita de 14 días del plan Growth termina hoy.\n\nPara mantener acceso a Marketing Hub, IA, SEO y automatizaciones, elige un plan:\n\n{app_url}/pricing\n\nSi necesitas más tiempo, responde a este email.\n\n— El equipo de St4rtup"
    },
    "day_30_nps": {
        "day": 30,
        "subject": "¿Qué tal tu experiencia con St4rtup? (1 minuto)",
        "body": "Hola {name},

Llevas 30 días usando St4rtup. En una escala del 0 al 10, ¿recomendarías St4rtup a otro founder?

Responde directamente a este email.

— El equipo de St4rtup"
    },
    "day_90_nps": {
        "day": 90,
        "subject": "3 meses con St4rtup — ¿cómo lo estamos haciendo?",
        "body": "Hola {name},

¡3 meses juntos! ¿Recomendarías St4rtup a un amigo? (0-10)
¿Qué mejorarías?

Responde a este email — leemos todo.

— El equipo de St4rtup"
    },
    "day_30_reactivation": {
        "day": 30,
        "subject": "Te echamos de menos en St4rtup",
        "body": "Hola {name},\n\nHace un tiempo que no entras en St4rtup.\n\nNovedades recientes:\n- Llamadas IA con scoring automático\n- WhatsApp Business integrado\n- 14 gráficos en el dashboard\n- Sala de negociación con firma digital\n\nVuelve → {app_url}\n\n— El equipo de St4rtup"
    },
}


async def send_drip_email(user_email, user_name, sequence_key):
    seq = DRIP_SEQUENCES.get(sequence_key)
    if not seq:
        return
    subject = seq["subject"]
    body = seq["body"].format(name=user_name or "there", app_url=APP_URL)
    try:
        from app.services.email_service import send_email
        await send_email(to=user_email, subject=subject, body=body)
        logger.info("Drip '%s' sent to %s", sequence_key, user_email)
    except Exception as e:
        logger.error("Drip failed for %s: %s", user_email, e)


async def run_drip_check():
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        users = await db.execute(select(User))
        for user in users.scalars().all():
            if not user.email:
                continue
            days = (now - user.created_at).days if user.created_at else 999
            for key, seq in DRIP_SEQUENCES.items():
                if days == seq["day"]:
                    drips_sent = (user.preferences or {}).get("drips_sent", [])
                    if key not in drips_sent:
                        await send_drip_email(user.email, user.full_name, key)
                        if not user.preferences:
                            user.preferences = {}
                        user.preferences.setdefault("drips_sent", []).append(key)
                        await db.commit()


async def send_weekly_digest():
    """Send weekly KPI digest to all active users. Called by scheduler Mondays 9:15."""
    async with AsyncSessionLocal() as db:
        users = await db.execute(select(User))
        for user in users.scalars().all():
            if not user.email:
                continue
            subject = "Tu resumen semanal — St4rtup"
            body = f"Hola {user.full_name or 'there'},\n\nAquí va tu resumen de la semana:\n\nDashboard: {APP_URL}/app/dashboard\nPipeline: {APP_URL}/app/pipeline\nEmails: {APP_URL}/app/emails\n\nEntra para ver tus KPIs en tiempo real.\n\n— El equipo de St4rtup"
            try:
                from app.services.email_service import send_email
                await send_email(to=user.email, subject=subject, body=body)
            except Exception as e:
                logger.error("Weekly digest failed for %s: %s", user.email, e)
