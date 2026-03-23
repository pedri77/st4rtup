"""
Celery + Redis task queue configuration.
Trigger: >50 leads/day or heavy background processing needs.

Para activar:
1. pip install celery[redis]
2. Configurar REDIS_URL en Fly.io secrets
3. Ejecutar: celery -A app.core.celery_app worker --loglevel=info
4. (Opcional) Beat: celery -A app.core.celery_app beat --loglevel=info
"""
import os

# Only initialize if Redis is configured
REDIS_URL = os.getenv("REDIS_URL", "")

if REDIS_URL:
    try:
        from celery import Celery

        celery_app = Celery(
            "st4rtup_crm",
            broker=REDIS_URL,
            backend=REDIS_URL,
        )

        celery_app.conf.update(
            task_serializer="json",
            accept_content=["json"],
            result_serializer="json",
            timezone="Europe/Madrid",
            enable_utc=True,
            task_track_started=True,
            task_time_limit=300,  # 5 min max per task
            task_soft_time_limit=240,
            worker_prefetch_multiplier=1,
            worker_max_tasks_per_child=100,
        )

        # Scheduled tasks (Celery Beat)
        celery_app.conf.beat_schedule = {
            "daily-summary": {
                "task": "app.tasks.send_daily_summary",
                "schedule": 86400.0,  # 24h
            },
            "check-overdue-actions": {
                "task": "app.tasks.check_overdue_actions",
                "schedule": 3600.0,  # 1h
            },
            "social-recurrence-generator": {
                "task": "app.tasks.generate_recurring_posts",
                "schedule": 3600.0,  # 1h
            },
        }

    except ImportError:
        celery_app = None
else:
    celery_app = None
