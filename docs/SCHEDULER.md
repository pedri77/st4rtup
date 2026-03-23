# Automation Scheduler - Riskitera Sales

## 📋 Overview

El sistema utiliza **APScheduler** para ejecutar automatizaciones de forma programada (cron jobs). El scheduler se inicializa automáticamente al arrancar el backend y corre en segundo plano.

## 🚀 Jobs Configurados

### AC-01: Daily Actions Summary
- **Schedule:** Diario a las 08:30 AM (Europe/Madrid)
- **Function:** `run_ac01_daily_summary()`
- **Descripción:** Envía email con resumen de acciones pendientes (vencidas, hoy, próximos 3 días)
- **Archivo:** `app/core/scheduler.py`

## 🔧 Arquitectura

```
app/
├── main.py                    # Inicializa scheduler en startup
├── core/
│   └── scheduler.py           # Configuración de jobs
└── api/v1/endpoints/
    └── automation_tasks.py    # Lógica de automatizaciones
```

### Flujo de Inicialización

1. **FastAPI startup** (`main.py` lifespan)
   - Llama a `init_scheduler()`
   - Llama a `start_scheduler()`

2. **Scheduler** (`scheduler.py`)
   - Crea instancia de `AsyncIOScheduler`
   - Registra jobs con triggers cron
   - Inicia ejecución en background

3. **Jobs**
   - Se ejecutan según schedule
   - Logs automáticos de éxito/error
   - Manejo de errores con logging

## 📝 Agregar Nuevo Job

### Paso 1: Crear la función async

En `app/core/scheduler.py`:

```python
async def run_my_automation():
    """
    Descripción de la automatización
    """
    from app.core.database import AsyncSessionLocal
    import logging

    logger = logging.getLogger(__name__)
    logger.info("🤖 Starting MY-01: My Automation")

    try:
        async with AsyncSessionLocal() as db:
            # Tu lógica aquí
            pass

        logger.info("✅ MY-01: Completed successfully")

    except Exception as e:
        logger.error(f"❌ MY-01: Error: {str(e)}", exc_info=True)
```

### Paso 2: Registrar el job

En `init_scheduler()`:

```python
# ─── MY-01: My Automation ────────────────────────────────────
# Runs every Monday at 09:00 AM
scheduler.add_job(
    run_my_automation,
    trigger=CronTrigger(
        day_of_week='mon',  # 0=Monday, 6=Sunday
        hour=9,
        minute=0,
        timezone='Europe/Madrid'
    ),
    id='my01_automation',
    name='MY-01: My Automation',
    replace_existing=True,
    misfire_grace_time=1800,  # 30 min grace period
)
logger.info("  ✓ MY-01: My Automation (09:00 AM every Monday)")
```

### Paso 3: Implementar lógica

Si es complejo, crea la lógica en `automation_tasks.py`:

```python
@router.post("/MY-01/execute")
async def execute_my_automation(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Tu lógica de negocio
    return {"success": True}
```

Y llámala desde el scheduler:

```python
async def run_my_automation():
    from app.api.v1.endpoints.automation_tasks import execute_my_automation_logic
    result = await execute_my_automation_logic()
```

## 🕐 Ejemplos de Triggers Cron

```python
from apscheduler.triggers.cron import CronTrigger

# Diario a las 08:30
CronTrigger(hour=8, minute=30)

# Lunes a Viernes a las 09:00
CronTrigger(day_of_week='mon-fri', hour=9, minute=0)

# Primer día de cada mes a las 10:00
CronTrigger(day=1, hour=10, minute=0)

# Cada hora
CronTrigger(minute=0)

# Cada 15 minutos
CronTrigger(minute='*/15')

# Viernes a las 17:00
CronTrigger(day_of_week='fri', hour=17, minute=0)

# Trimestral (enero, abril, julio, octubre) día 1 a las 08:00
CronTrigger(month='1,4,7,10', day=1, hour=8, minute=0)
```

## 📊 Monitoreo

### Ver estado del scheduler

**Endpoint:**
```
GET /api/v1/automation-tasks/scheduler/status
```

**Response:**
```json
{
  "status": "running",
  "running": true,
  "timezone": "Europe/Madrid",
  "jobs": [
    {
      "id": "ac01_daily_summary",
      "name": "AC-01: Daily Actions Summary",
      "next_run_time": "2026-02-27T08:30:00+01:00",
      "trigger": "cron[hour='8', minute='30']"
    }
  ],
  "total_jobs": 1
}
```

### Ver logs

Los logs del scheduler se muestran en la consola del backend:

```bash
# Ver logs en tiempo real (desarrollo)
uvicorn app.main:app --reload

# Ver logs en producción (Fly.io)
fly logs
```

### Logs típicos

```
✅ Scheduler configured with active jobs:
   • AC-01: Daily Actions Summary (ID: ac01_daily_summary)
     Next run: 2026-02-27 08:30:00+01:00

🤖 Starting AC-01: Daily Actions Summary
✅ AC-01: Email sent successfully to sales@riskitera.com
   Summary: 5 total (2 overdue, 1 today, 2 upcoming)
   Provider: zoho, Message ID: xyz123
✅ Job ac01_daily_summary executed successfully
```

## 🐛 Troubleshooting

### El scheduler no se inicia

**Síntoma:** No ves logs de "Scheduler configured" al arrancar

**Solución:**
1. Verifica que APScheduler esté instalado: `pip install apscheduler==3.10.4`
2. Revisa logs de errores en startup
3. Asegúrate de que el lifespan esté configurado en `main.py`

### Job no se ejecuta

**Síntoma:** El job aparece en status pero no se ejecuta

**Solución:**
1. Verifica el timezone: debe coincidir con tu servidor
2. Revisa `next_run_time` en el endpoint `/scheduler/status`
3. Chequea logs de errores en la función del job
4. Aumenta `misfire_grace_time` si el servidor está bajo carga

### Job falla silenciosamente

**Síntoma:** No hay logs de error pero no funciona

**Solución:**
1. Asegúrate de que la función sea `async`
2. Usa `try/except` con logging
3. Verifica que imports estén dentro de la función (evitar circular imports)
4. Revisa que la DB session se cierre correctamente

### Múltiples instancias ejecutan el job

**Síntoma:** El job se ejecuta múltiples veces (por ejemplo, en múltiples pods)

**Solución:**
1. Usa un lock distribuido (Redis)
2. O configura el scheduler solo en un worker designado
3. O usa un servicio externo de cron (cron-job.org)

## 🔒 Seguridad

### Jobs internos

Los jobs del scheduler NO requieren autenticación porque corren internamente en el servidor.

### Jobs externos (webhooks)

Si expones endpoints para triggers externos:

```python
@router.post("/MY-01/webhook")
async def my_automation_webhook(
    token: str = Header(..., alias="X-Webhook-Token")
):
    # Validar token
    if token != settings.WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Ejecutar
    await run_my_automation()
    return {"success": True}
```

## 🚀 Despliegue

### Fly.io

El scheduler funciona automáticamente en Fly.io porque se inicia con la app.

**Consideraciones:**
- Fly.io usa UTC por defecto, pero APScheduler usa timezone configurado
- Si la máquina se detiene (`auto_stop_machines`), el scheduler también se detiene
- Para jobs críticos, mantén `min_machines_running = 1`

### Docker

El scheduler funciona en Docker sin configuración adicional.

### Múltiples workers

Si tienes múltiples workers de uvicorn:

```bash
# MALO: Cada worker tendrá su propio scheduler
uvicorn app.main:app --workers 4

# BUENO: Un worker principal ejecuta scheduler, otros solo API
# Worker 1: con scheduler (main process)
# Workers 2-4: solo API (sin scheduler)
```

Solución: Usa variable de entorno para controlar:

```python
import os

def init_scheduler():
    # Solo el worker principal ejecuta scheduler
    if os.getenv("WORKER_ID") != "main":
        logger.info("⏭️  Skipping scheduler (not main worker)")
        return None

    # ... resto del código
```

## 📚 Referencias

- [APScheduler Documentation](https://apscheduler.readthedocs.io/)
- [Cron Expression Generator](https://crontab.guru/)
- [Python Logging](https://docs.python.org/3/library/logging.html)
