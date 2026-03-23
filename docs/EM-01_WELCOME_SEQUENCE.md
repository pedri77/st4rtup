# EM-01: Welcome Sequence - Guía Completa

## 📧 Overview

EM-01 es una secuencia automatizada de 3 emails que se envía a nuevos leads para nutrirlos y guiarlos hacia una conversión. La secuencia está diseñada para educación, value proposition, y call-to-action progresiva.

## 🎯 Secuencia de Emails

### Email Day 0: Welcome & Introduction
- **Timing:** Inmediatamente al crear el lead (o al trigger manual)
- **Objetivo:** Dar la bienvenida y presentar Riskitera
- **Contenido:**
  - Agradecimiento por el interés
  - Presentación de la plataforma GRC
  - Beneficios principales (cumplimiento normativo)
  - CTA: Solicitar Demo
- **Template:** `get_welcome_email_day0()`

### Email Day 3: Value Proposition & Use Cases
- **Timing:** 3 días después del Day 0
- **Objetivo:** Mostrar casos de uso reales y resultados
- **Contenido:**
  - Casos de uso específicos del sector
  - Estadísticas de clientes (70% reducción tiempo)
  - Mapeo a frameworks regulatorios del lead
  - CTA: Agendar Demo
- **Template:** `get_welcome_email_day3()`

### Email Day 7: Follow-up & CTA
- **Timing:** 7 días después del Day 0
- **Objetivo:** Follow-up personalizado y call to action
- **Contenido:**
  - Preguntas discovery (¿qué normativas os afectan?)
  - Propuesta de llamada de 30 minutos
  - Opción de opt-out (sin compromiso)
  - CTA: Agendar Llamada
- **Template:** `get_welcome_email_day7()`

## 🚀 Uso

### Trigger Manual desde API

**Endpoint:**
```
POST /api/v1/automation-tasks/EM-01/trigger/{lead_id}
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "automation": "EM-01",
  "lead_id": "uuid",
  "lead_company": "Example Corp",
  "emails_sent": 1,
  "day0": {
    "success": true,
    "email_id": "uuid",
    "day": 0,
    "provider": "zoho",
    "message_id": "xyz123"
  },
  "message": "Welcome sequence started. Day 0 email sent. Days 3 and 7 will be scheduled."
}
```

### Enviar Email Específico (Testing)

**Endpoint:**
```
POST /api/v1/automation-tasks/EM-01/send-day/{lead_id}/{day}
```

**Parámetros:**
- `lead_id`: UUID del lead
- `day`: 0, 3, o 7

**Ejemplo:**
```bash
curl -X POST "http://localhost:8001/api/v1/automation-tasks/EM-01/send-day/{lead_id}/3" \
  -H "Authorization: Bearer {token}"
```

## 🎨 Templates HTML

Los templates están en `app/email_templates/__init__.py` y son totalmente personalizables:

### Personalización Disponible

Cada template recibe `lead_data` con:
```python
{
  "company": str,           # Nombre de la empresa
  "contact": str,           # Nombre del contacto
  "sector": str,            # Sector de la empresa
  "regulatory_frameworks": list  # Frameworks aplicables
}
```

### Variables Utilizadas

- `{company}` → Nombre de la empresa
- `{contact}` → Nombre del contacto (o "Estimado/a" si no disponible)
- `{sector}` → Sector para personalizar mensaje
- `{frameworks_text}` → String de frameworks (ej: "ENS, NIS2, DORA")

### Modificar Templates

Para personalizar un email, edita la función en `app/email_templates/__init__.py`:

```python
def get_welcome_email_day0(lead_data: Dict[str, Any]) -> Dict[str, str]:
    company = lead_data.get('company', 'su empresa')
    # ... tu código HTML aquí
    return {"subject": subject, "html": html, "text": text}
```

## 📊 Tracking

### Estado de Emails

Cada email enviado se registra en la tabla `emails` con:
- `lead_id`: Asociado al lead
- `status`: draft → sent (o failed)
- `sent_at`: Timestamp de envío
- `resend_id`: Message ID del provider

### Ver Historial de Secuencia

Consulta emails de un lead:
```sql
SELECT subject, status, sent_at
FROM emails
WHERE lead_id = 'uuid'
ORDER BY sent_at DESC;
```

### Detectar Secuencia Activa

```python
# TODO: Implementar verificación de secuencia activa
# Check if lead has emails with status 'sent' in last 7 days
```

## 🔄 Automatización Completa (Futuro)

### Opción A: Scheduler con APScheduler

Agregar job al scheduler que cada día busca leads que necesitan Day 3 o Day 7:

```python
async def send_scheduled_welcome_emails():
    """Check for leads that need Day 3 or Day 7 emails"""
    now = datetime.now(timezone.utc)

    # Find leads created exactly 3 days ago
    three_days_ago = (now - timedelta(days=3)).date()
    leads_day3 = await db.execute(
        select(Lead).where(
            func.date(Lead.created_at) == three_days_ago
        )
    )

    for lead in leads_day3.scalars():
        await send_welcome_sequence_email(db, str(lead.id), day=3)

    # Same for day 7...
```

### Opción B: Background Task Queue (Celery/RQ)

Encolar tareas al crear el lead:

```python
# Al trigger Day 0
send_welcome_day0.delay(lead_id)
send_welcome_day3.apply_async(args=[lead_id], countdown=3*24*60*60)
send_welcome_day7.apply_async(args=[lead_id], countdown=7*24*60*60)
```

### Opción C: Webhook de Lead Created

Configurar webhook que se dispare al crear lead:

```python
@router.post("/webhooks/lead-created")
async def on_lead_created(lead_id: str):
    await trigger_welcome_sequence(lead_id)
```

## 🎯 Integración con Frontend

### Botón en Detalle de Lead

Agregar en `LeadDetailPage.jsx`:

```jsx
import { automationTasksApi } from '@/services/api'

const startWelcomeSequence = useMutation({
  mutationFn: (leadId) => automationTasksApi.triggerEM01(leadId),
  onSuccess: () => {
    toast.success('Welcome sequence iniciada! Email Day 0 enviado.')
  }
})

// En el UI:
<button onClick={() => startWelcomeSequence.mutate(lead.id)}>
  📧 Iniciar Welcome Sequence
</button>
```

### Indicador de Secuencia Activa

Mostrar badge si el lead tiene emails de secuencia:

```jsx
{lead.has_active_sequence && (
  <span className="badge bg-blue-100 text-blue-800">
    📧 Secuencia activa
  </span>
)}
```

## 📈 Métricas y Optimización

### KPIs a Trackear

- **Open Rate por Email:**
  - Day 0: Objetivo >40%
  - Day 3: Objetivo >30%
  - Day 7: Objetivo >25%

- **Click Rate:**
  - CTA Demo: Objetivo >10%

- **Conversión a Demo:**
  - % leads que agendan demo después de secuencia

### A/B Testing

Puedes crear variantes de templates:

```python
def get_welcome_email_day0_variant_b(lead_data):
    # Template alternativo
    pass

# En el código, selecciona aleatoriamente:
variant = random.choice(['a', 'b'])
if variant == 'a':
    template = get_welcome_email_day0(lead_data)
else:
    template = get_welcome_email_day0_variant_b(lead_data)
```

## 🛡️ Best Practices

### 1. Opt-out Automático

Si un lead responde "no interesado" o se da de baja:

```python
# Detener secuencia
lead.email_opt_out = True
await db.commit()
```

### 2. No Duplicar Secuencias

Antes de trigger, verificar:

```python
# Check if already has sequence running
recent_emails = await db.execute(
    select(Email).where(
        and_(
            Email.lead_id == lead_id,
            Email.sent_at >= now - timedelta(days=7)
        )
    )
)

if recent_emails.scalars().first():
    return {"error": "Lead already has active sequence"}
```

### 3. Personalización Avanzada

Agregar más datos del lead para templates:

```python
lead_data = {
    "company": lead.company,
    "contact": lead.contact,
    "sector": lead.company_sector,
    "company_size": lead.company_size,  # ⬅️ Nuevo
    "pain_points": lead.pain_points,     # ⬅️ Nuevo
    "regulatory_frameworks": lead.regulatory_frameworks,
}
```

Y usar en template:

```html
<p>
  Sabemos que empresas de {company_size} empleados en {sector}
  enfrentan desafíos específicos con {pain_points}.
</p>
```

## 🐛 Troubleshooting

### Email no se envía

1. Verificar que el lead tiene email válido
2. Verificar que Zoho/Resend está configurado
3. Revisar logs del backend
4. Verificar status del email en la tabla

### Templates no se personalizan

1. Verificar que el lead tiene los campos requeridos
2. Revisar que `lead_data` se pasa correctamente
3. Usar valores por defecto en templates:
   ```python
   company = lead_data.get('company', 'su empresa')
   ```

### Secuencia se duplica

1. Implementar verificación de secuencia activa
2. Agregar flag `welcome_sequence_sent` al modelo Lead
3. Verificar antes de trigger

## ✅ Checklist de Implementación

- [x] Templates HTML creados (Day 0, 3, 7)
- [x] Endpoint POST /EM-01/trigger/{lead_id}
- [x] Endpoint POST /EM-01/send-day/{lead_id}/{day}
- [x] Integración con email_service (Zoho/Resend)
- [x] Registro de emails en tabla
- [x] Scheduler para Day 3 (09:00) y Day 7 (09:15) via APScheduler
- [x] Verificación de secuencia activa (_check_active_welcome_sequence)
- [x] Verificación de Day 0 enviado antes de Day 3/7
- [x] Skip de leads sin contact_email
- [x] Deduplicación por subject (no reenvía si ya existe)
- [ ] Botón UI en LeadDetailPage
- [ ] Indicador de secuencia activa en UI
- [ ] Opt-out automático
- [ ] Métricas y tracking de conversión

## 📚 Referencias

- Template engine: Jinja2 (para futuro)
- Email best practices: [Mailchimp Guide](https://mailchimp.com/resources/email-marketing-best-practices/)
- GDPR compliance: Siempre incluir opción de unsuscribe
