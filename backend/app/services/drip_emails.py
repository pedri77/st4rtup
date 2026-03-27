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


# ─── TRANSACTIONAL NOTIFICATIONS ─────────────────────────────

async def send_welcome_email(email: str, name: str):
    """Send immediately after registration."""
    subject = "¡Bienvenido a St4rtup! Tu CRM está listo"
    body = f"""Hola {name or 'there'},

¡Bienvenido a St4rtup! Tu CRM está listo para usar.

Tu prueba gratuita de 7 días del plan Growth ya está activa.

3 cosas que puedes hacer ahora:

1. Completa el onboarding → {APP_URL}/app/onboarding
2. Crea tu primer lead → {APP_URL}/app/leads
3. Explora el dashboard → {APP_URL}/app/dashboard

¿Necesitas ayuda? Responde a este email o usa el chat en la app.

— El equipo de St4rtup
"""
    try:
        from app.services.email_service import send_email
        await send_email(to=email, subject=subject, body=body)
        logger.info("Welcome email sent to %s", email)
    except Exception as e:
        logger.error("Welcome email failed: %s", e)


async def send_trial_expiring_email(email: str, name: str, days_left: int):
    """Send when trial is about to expire."""
    subject = f"Tu prueba de St4rtup termina en {days_left} día{'s' if days_left > 1 else ''}"
    body = f"""Hola {name or 'there'},

Tu prueba gratuita del plan Growth termina en {days_left} día{'s' if days_left > 1 else ''}.

Para mantener acceso a Marketing Hub, IA, SEO y automatizaciones, elige un plan:

{APP_URL}/pricing

Si necesitas más tiempo, responde a este email.

— El equipo de St4rtup
"""
    try:
        from app.services.email_service import send_email
        await send_email(to=email, subject=subject, body=body)
        logger.info("Trial expiring email sent to %s (%d days left)", email, days_left)
    except Exception as e:
        logger.error("Trial expiring email failed: %s", e)


async def send_payment_failed_email(email: str, name: str):
    """Send when a payment fails."""
    subject = "Problema con tu pago — St4rtup"
    body = f"""Hola {name or 'there'},

No hemos podido procesar tu último pago en St4rtup.

Por favor, actualiza tu método de pago para mantener tu suscripción activa:

{APP_URL}/app/billing

Si crees que es un error, responde a este email.

— El equipo de St4rtup
"""
    try:
        from app.services.email_service import send_email
        await send_email(to=email, subject=subject, body=body)
        logger.info("Payment failed email sent to %s", email)
    except Exception as e:
        logger.error("Payment failed email failed: %s", e)


async def send_plan_upgraded_email(email: str, name: str, plan: str):
    """Send when user upgrades plan."""
    subject = f"Plan {plan.title()} activado — St4rtup"
    body = f"""Hola {name or 'there'},

¡Tu plan {plan.title()} ya está activo! 🎉

Ahora tienes acceso a todas las funcionalidades incluidas en tu plan.

Explora lo nuevo → {APP_URL}/app/marketplace

— El equipo de St4rtup
"""
    try:
        from app.services.email_service import send_email
        await send_email(to=email, subject=subject, body=body)
        logger.info("Plan upgraded email sent to %s (%s)", email, plan)
    except Exception as e:
        logger.error("Plan upgraded email failed: %s", e)


async def notify_admin_new_signup(user_email: str, user_name: str):
    """Notify admin when a new user signs up."""
    try:
        from app.core.config import settings
        from app.services.email_service import send_email
        admin_email = (settings.ADMIN_EMAILS or "").split(",")[0].strip()
        if admin_email:
            await send_email(
                to=admin_email,
                subject=f"Nuevo registro en St4rtup: {user_email}",
                body=f"Nuevo usuario registrado:\n\nNombre: {user_name or '(sin nombre)'}\nEmail: {user_email}\n\nVer en admin: {APP_URL}/app/admin?tab=orgs",
            )
    except Exception as e:
        logger.error("Admin notification failed: %s", e)
