# MOD-AICALLS-001: Módulo de Llamadas con IA para riskitera-sales

> **Clasificación:** Uso interno · Riskitera S.L.U. · Confidencial
> **Versión:** 1.0 adaptada · Marzo 2026
> **Stack:** FastAPI + Fly.io Postgres + React JS + TailwindCSS + Supabase Auth

---

## CONTEXTO

Módulo integrado en `riskitera-sales` que permite realizar llamadas outbound con IA (Retell AI) desde la consola del CRM, con registro automático, análisis post-llamada y seguimiento integrado en pipeline.

### Módulos existentes que interactúan
- **Leads** — tabla `leads` con `score`, `status`, `source`, `regulatory_frameworks`, `enrichment_data`
- **Pipeline** — `opportunities` con stages
- **Actions** — tareas de seguimiento
- **Calendario** — eventos
- **Dashboard** — KPIs existentes
- **Marketing Hub** (MOD-MKT-001) — 21/23 steps completados
- **Chat IA** — `ai_chat_service.py` multi-proveedor (OpenAI, Anthropic, Google, Mistral, Groq, DeepSeek)

### Integraciones existentes relevantes
- Apollo.io (enrichment de leads)
- Telegram (notificaciones)
- Email multi-proveedor (Resend, Zoho, Brevo, SES, Mailgun, SMTP)

---

## ESPECIFICACIÓN FUNCIONAL

### RF-001 — Consola de Llamadas

```
Ruta: /calls
Componente: frontend/src/pages/calls/CallsConsolePage.jsx
```

- **Header**: indicador conexión Retell, llamadas del día, minutos consumidos mes, coste (€)
- **Panel de selección de lead**: búsqueda con filtros por `regulatory_frameworks`, `status`, `score`, `company_sector`
- **Tarjeta de contexto del lead**: snapshot con empresa, contacto, score, regulatory_frameworks, historial de interacciones (emails, visitas, llamadas anteriores)
- **Selector de prompt/guión**: dropdown con el prompt activo según objetivo
- **Preview del prompt**: panel expandible con variables interpoladas con datos del lead
- **Botón de inicio de llamada**: estados loading/activo/en-llamada/finalizada
- **Panel de llamada activa** (visible durante la llamada):
  - Temporizador en tiempo real
  - Estado: conectando/hablando/en-espera/finalizada
  - Botón finalización manual
  - Indicador turno de habla (IA/humano)
  - Transcripción en tiempo real (streaming desde Retell webhook)

---

### RF-002 — Gestor de Prompts y Guiones

```
Ruta: /calls/prompts
Componente: frontend/src/pages/calls/CallPromptsPage.jsx
```

**Estructura de un prompt de llamada (modelo `CallPrompt`):**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| nombre | String(255) | "Prospección Inicial CISO ENS" |
| objetivo | String(50) | prospecting / followup_demo / closing / reactivation / qualification |
| persona_target | ARRAY(String) | CISO, DPO, CTO, MSSP |
| regulatory_focus | ARRAY(String) | ENS, NIS2, DORA, ISO27001, any |
| idioma | String(5) | es / en |
| voz_id | String(100) | ID de voz en Retell AI |
| system_prompt | Text | Prompt de sistema para el LLM |
| primer_mensaje | Text | Primer mensaje del agente al conectar |
| variables_dinamicas | ARRAY(String) | {{lead_nombre}}, {{empresa}}, etc. |
| fallback_responses | JSON | Respuestas ante objeciones comunes |
| objetivo_llamada | Text | Qué debe conseguir el agente |
| duracion_objetivo_min | Integer | Duración objetivo en minutos |
| max_duracion_min | Integer | Máxima duración permitida |
| activo | Boolean | true |
| version | Integer | Auto-incremento por edición |

**Funcionalidades:**
- Listado con filtros por objetivo/persona/regulatory_focus/activo
- Editor de prompts con textarea para `system_prompt` con soporte a variables `{{variable}}`
- Editor de `primer_mensaje` con preview de variables interpoladas
- Selector múltiple de `persona_target` y `regulatory_focus`
- Selector de voz Retell (fetch desde API Retell /voices)
- Gestión de `fallback_responses`: tabla editable (objeción → respuesta)
- Duplicar prompt para crear variantes
- Versionado: cada save crea snapshot en `call_prompt_versions`
- Test de prompt: llamada de prueba a número de test
- Métricas por prompt: tasa de éxito, duración media, conversión

**Variables dinámicas disponibles:**
```
{{lead_nombre}}         → contact_name
{{lead_empresa}}        → company_name
{{lead_cargo}}          → contact_title
{{regulatory_focus}}    → regulatory_frameworks (join)
{{last_interaction}}    → Última interacción registrada
{{demo_fecha}}          → Fecha de demo si existe
{{score}}               → Score actual
{{stage}}               → Status del lead
{{agente_nombre}}       → Nombre del usuario que lanza la llamada
{{company_sector}}      → company_sector
{{company_size}}        → company_size
```

---

### RF-003 — Registro Automático de Llamadas

**Modelo `CallRecord`** (SQLAlchemy, extiende BaseModel):

```python
class CallRecord(BaseModel):
    """Registro de llamada con IA."""
    __tablename__ = "call_records"

    # Relaciones
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt_id = Column(UUID(as_uuid=True), ForeignKey("call_prompts.id", ondelete="SET NULL"))
    prompt_version = Column(Integer)
    initiated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))

    # Datos Retell
    retell_call_id = Column(String(255), unique=True)
    retell_agent_id = Column(String(255))

    # Metadatos
    fecha_inicio = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    fecha_fin = Column(DateTime(timezone=True))
    duracion_segundos = Column(Integer)

    # Estado y resultado
    estado = Column(String(30), nullable=False, default="iniciando", index=True)
    # iniciando | conectando | activa | finalizada | fallida | no_contesta | buzon
    resultado = Column(String(30), index=True)
    # interesado | no_interesado | callback | demo_agendada | propuesta_solicitada | sin_respuesta

    # Contenido
    transcripcion = Column(Text)
    resumen_ia = Column(Text)
    sentiment = Column(String(20))  # positivo | neutral | negativo
    sentiment_score = Column(Float)  # -1.0 a 1.0

    # Acciones derivadas
    siguiente_accion = Column(Text)
    fecha_siguiente = Column(DateTime(timezone=True))
    notas_agente = Column(Text)

    # Métricas IA
    interrupciones = Column(Integer, default=0)
    turnos_conversacion = Column(Integer, default=0)
    latencia_media_ms = Column(Integer)

    # Coste
    minutos_facturados = Column(Float)
    coste_eur = Column(Float)

    # Scoring impact
    score_antes = Column(Integer)
    score_despues = Column(Integer)

    # RGPD
    consentimiento_grabacion = Column(Boolean, default=False)

    # Relationships
    lead = relationship("Lead", backref="call_records")
    prompt = relationship("CallPrompt")
    user = relationship("User")
```

**Modelo `CallPrompt`:**

```python
class CallPrompt(BaseModel):
    __tablename__ = "call_prompts"

    nombre = Column(String(255), nullable=False)
    objetivo = Column(String(50), nullable=False, index=True)
    persona_target = Column(ARRAY(String))
    regulatory_focus = Column(ARRAY(String))
    idioma = Column(String(5), default="es")
    voz_id = Column(String(100))
    system_prompt = Column(Text, nullable=False)
    primer_mensaje = Column(Text, nullable=False)
    variables_dinamicas = Column(ARRAY(String))
    fallback_responses = Column(JSON, default=[])
    objetivo_llamada = Column(Text)
    duracion_objetivo_min = Column(Integer, default=5)
    max_duracion_min = Column(Integer, default=15)
    activo = Column(Boolean, default=True, index=True)
    version = Column(Integer, default=1)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))

    versions = relationship("CallPromptVersion", back_populates="prompt", cascade="all, delete-orphan")
```

**Modelo `CallPromptVersion`:**

```python
class CallPromptVersion(BaseModel):
    __tablename__ = "call_prompt_versions"

    prompt_id = Column(UUID(as_uuid=True), ForeignKey("call_prompts.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    snapshot = Column(JSON, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))

    prompt = relationship("CallPrompt", back_populates="versions")
```

---

### RF-004 — Flujo Post-llamada

**Al finalizar cada llamada:**

1. **Procesar transcripción** recibida de Retell via webhook:
   - Guardar transcripción en `call_records.transcripcion`
   - Enviar a `ai_chat_service` (proveedor configurado en `AI_DEFAULT_PROVIDER`) para:
     - Resumen en 3-5 líneas
     - Clasificación de sentiment (positivo/neutral/negativo + score -1 a 1)
     - Extracción de `siguiente_accion` sugerida
     - Detección de resultado (interesado/no_interesado/callback/etc.)

2. **Modal post-llamada** (aparece automáticamente al colgar):
   ```
   ┌─────────────────────────────────────────┐
   │  Llamada finalizada — [Nombre Lead]      │
   │  Duración: 4m 32s · Coste: €0.29        │
   ├─────────────────────────────────────────┤
   │  Resumen IA:                            │
   │  [resumen generado automáticamente]     │
   ├─────────────────────────────────────────┤
   │  Resultado de la llamada:               │
   │  ○ Interesado    ○ No interesado        │
   │  ○ Callback      ● Demo agendada        │
   │  ○ Propuesta     ○ Sin respuesta        │
   ├─────────────────────────────────────────┤
   │  Siguiente acción:                      │
   │  [sugerencia IA: "Enviar propuesta..."] │
   │  Fecha: [datepicker]                    │
   ├─────────────────────────────────────────┤
   │  Notas adicionales:                     │
   │  [textarea]                             │
   ├─────────────────────────────────────────┤
   │  [Guardar y actualizar pipeline]        │
   └─────────────────────────────────────────┘
   ```

3. **Actualizar automáticamente en el CRM:**
   - Score del lead según resultado y sentiment
   - Status del lead si procede (demo_agendada → `qualified`)
   - Registrar interacción en el historial del lead
   - Crear `Action` con siguiente_accion y fecha
   - Si `demo_agendada` → crear evento en calendario

---

### RF-005 — Historial de Llamadas por Lead

**En LeadDetailPage.jsx, añadir sección "Llamadas":**

- Timeline cronológico de todas las llamadas al lead
- Cada llamada: fecha, duración, prompt usado, resultado, sentiment, coste, resumen IA
- Botón para ver transcripción completa (expandible)
- Score antes/después de cada llamada
- Botón "Llamar de nuevo" que redirige a la consola con el lead preseleccionado

---

### RF-006 — Dashboard de Llamadas

```
Ruta: /calls/dashboard
Componente: frontend/src/pages/calls/CallsDashboardPage.jsx
```

**KPIs (tarjetas superiores):**
- Llamadas hoy / semana / mes
- Tasa de contacto (contestadas / intentadas)
- Tasa de conversión (resultado positivo / total)
- Minutos consumidos y coste mes actual
- Score delta promedio

**Gráficos (Recharts v2.15.0 — ya instalado):**
- Llamadas por día (últimos 30 días) — BarChart
- Distribución de resultados — PieChart
- Sentiment medio por semana — LineChart
- Rendimiento por prompt — tabla
- Coste acumulado del mes — AreaChart
- Llamadas por hora del día — BarChart horizontal

**Filtros globales:**
- Rango de fechas
- Agente (initiated_by)
- Prompt
- Resultado
- Regulatory focus del lead

---

### RF-007 — Integración con Pipeline y Scoring

**Scoring rules post-llamada:**
```python
CALL_SCORE_RULES = {
    "demo_agendada":        +25,
    "interesado":           +15,
    "propuesta_solicitada": +20,
    "callback":             +5,
    "sin_respuesta":         0,
    "buzon":                -2,
    "no_interesado":       -15,
}

SENTIMENT_MODIFIER = {
    "positivo":  +5,
    "neutral":    0,
    "negativo":  -5,
}
```

**Movimiento automático de status:**
```python
STATUS_TRIGGERS = {
    "demo_agendada":        LeadStatus.QUALIFIED,
    "propuesta_solicitada": LeadStatus.PROPOSAL,
    "interesado":           None,  # no mover, solo marcar
}
```

---

## INTEGRACIÓN RETELL AI

### Iniciar llamada outbound

```python
# Backend: POST /calls/initiate
# Llama a Retell API: POST https://api.retellai.com/v2/create-phone-call

async def initiate_call(lead_id, prompt_id, user_id):
    payload = {
        "from_number": settings.RETELL_FROM_NUMBER,
        "to_number": lead.contact_phone,
        "agent_id": settings.RETELL_AGENT_ID_DEFAULT,
        "retell_llm_dynamic_variables": {
            "lead_nombre": lead.contact_name,
            "lead_empresa": lead.company_name,
            "lead_cargo": lead.contact_title,
            "regulatory_focus": ", ".join(lead.regulatory_frameworks or []),
            # ...más variables interpoladas
        },
        "metadata": {
            "lead_id": str(lead_id),
            "prompt_id": str(prompt_id),
            "initiated_by": str(user_id),
        }
    }
```

### Webhook de eventos Retell

```
Endpoint: POST /api/v1/calls/retell-webhook (PÚBLICO — sin auth)
Verificación: HMAC con RETELL_WEBHOOK_SECRET (usar webhook_verify.py existente)
```

Eventos a manejar:
- `call_started` → Actualizar estado a "activa"
- `call_ended` → Calcular duración, iniciar procesamiento post-llamada
- `call_analyzed` → Recibir transcript y análisis
- `transcript_updated` → Streaming de transcripción en tiempo real

---

## ESTRUCTURA DE ARCHIVOS

### Backend (FastAPI)

```
backend/app/
├── api/v1/endpoints/
│   └── calls.py                    # Todos los endpoints del módulo
├── models/
│   └── call.py                     # CallRecord, CallPrompt, CallPromptVersion
├── schemas/
│   └── call.py                     # Pydantic schemas Create/Update/Response
└── services/
    └── retell_service.py           # Wrapper API Retell + webhook handler + análisis post-llamada
```

### Frontend (React JS)

```
frontend/src/
├── pages/
│   └── calls/
│       ├── CallsConsolePage.jsx     # Vista principal lanzamiento
│       ├── CallsDashboardPage.jsx   # Dashboard métricas
│       ├── CallHistoryPage.jsx      # Historial global
│       └── CallPromptsPage.jsx      # CRUD prompts
└── services/
    └── api.js                       # Añadir callsApi y callPromptsApi
```

### Registro (archivos existentes a modificar)

- `backend/app/models/__init__.py` — Registrar CallRecord, CallPrompt, CallPromptVersion
- `backend/app/api/v1/router.py` — Registrar calls router
- `frontend/src/App.jsx` — Lazy import + rutas /calls/*
- `frontend/src/components/layout/Layout.jsx` — Añadir nav item "Llamadas IA" con icono `Phone`
- `frontend/src/pages/LeadDetailPage.jsx` — Añadir sección historial de llamadas
- `frontend/src/services/api.js` — Añadir callsApi, callPromptsApi
- `backend/app/core/config.py` — Añadir variables RETELL_*

---

## NAVEGACIÓN

**Añadir al sidebar de Layout.jsx (después de "Chat IA"):**
```javascript
{ name: 'Llamadas IA', href: '/calls', icon: Phone },
```

**Rutas en App.jsx:**
```
/calls                → CallsConsolePage
/calls/dashboard      → CallsDashboardPage
/calls/history        → CallHistoryPage
/calls/prompts        → CallPromptsPage
```

---

## VARIABLES DE ENTORNO

Añadir a `backend/app/core/config.py`:

```python
# Retell AI
RETELL_API_KEY: str = ""
RETELL_AGENT_ID_DEFAULT: str = ""
RETELL_FROM_NUMBER: str = ""           # Formato E.164: +34XXXXXXXXX
RETELL_WEBHOOK_SECRET: str = ""
RETELL_COST_PER_MINUTE: float = 0.07  # €/minuto para cálculo de coste
```

---

## ENDPOINTS BACKEND

### Calls

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | /calls | Listar llamadas (paginado, filtros) | JWT |
| GET | /calls/{id} | Detalle llamada con transcripción | JWT |
| POST | /calls/initiate | Iniciar llamada (crea CallRecord + llama Retell) | JWT |
| POST | /calls/{id}/complete | Completar post-llamada (resultado, notas, scoring) | JWT |
| GET | /calls/lead/{lead_id} | Llamadas de un lead | JWT |
| GET | /calls/stats | Estadísticas del dashboard | JWT |
| GET | /calls/stats/by-prompt | Rendimiento por prompt | JWT |
| POST | /calls/retell-webhook | Webhook Retell (PÚBLICO) | HMAC |

### Prompts

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | /calls/prompts | Listar prompts | JWT |
| GET | /calls/prompts/{id} | Detalle prompt | JWT |
| POST | /calls/prompts | Crear prompt | JWT |
| PUT | /calls/prompts/{id} | Actualizar (crea versión) | JWT |
| DELETE | /calls/prompts/{id} | Eliminar prompt | JWT |
| POST | /calls/prompts/{id}/duplicate | Duplicar prompt | JWT |
| GET | /calls/prompts/{id}/versions | Historial de versiones | JWT |
| POST | /calls/prompts/seed | Cargar 5 prompts iniciales | JWT |
| POST | /calls/prompts/{id}/test | Llamada de prueba | JWT |

---

## PROMPTS SEED (5 predefinidos)

### PROMPT-001: Prospección Inicial CISO (ENS/NIS2)

```
Objetivo: prospecting
Persona: CISO
Regulatory: ENS, NIS2
Idioma: es

System prompt:
Eres un consultor senior de ciberseguridad de Riskitera, especializado en
cumplimiento normativo para empresas españolas reguladas bajo ENS y NIS2.
Tu nombre es {{agente_nombre}}.

Tu objetivo en esta llamada es:
1. Presentarte brevemente (máx 30 segundos)
2. Validar que hablas con la persona correcta
3. Identificar el principal dolor regulatorio de {{lead_empresa}} respecto a {{regulatory_focus}}
4. Generar suficiente interés para agendar una demo de 30 minutos

Tono: profesional, directo, sin tecnicismos innecesarios. No leas un script, conversa.
No insistas más de 2 veces si hay resistencia. Si no es buen momento, pide cuándo llamar.

Datos del contacto:
- Nombre: {{lead_nombre}}
- Empresa: {{lead_empresa}}
- Cargo: {{lead_cargo}}
- Marco regulatorio: {{regulatory_focus}}
- Última interacción: {{last_interaction}}

Primer mensaje:
"Buenos días, ¿hablo con {{lead_nombre}}? Soy {{agente_nombre}} de Riskitera..."
```

### PROMPT-002: Follow-up Post-Demo
```
Objetivo: followup_demo
Persona: CISO, DPO, CTO
Regulatory: any
Idioma: es

System prompt:
Eres un consultor de Riskitera. Ya hicisteis una demo con {{lead_empresa}} el {{demo_fecha}}.
Tu objetivo es:
1. Recoger feedback de la demo
2. Resolver dudas pendientes
3. Avanzar hacia la propuesta formal

Si el interlocutor tiene dudas técnicas sobre integración, ofrece una sesión técnica adicional.
Si está listo, ofrece enviar propuesta personalizada esta semana.

Primer mensaje:
"Hola {{lead_nombre}}, soy {{agente_nombre}} de Riskitera. Le llamo para hacer seguimiento
de la demo que realizamos el {{demo_fecha}}. ¿Ha tenido oportunidad de comentarlo internamente?"
```

### PROMPT-003: Reactivación Lead Frío
```
Objetivo: reactivation
Persona: CISO, DPO, CTO
Regulatory: any
Idioma: es

System prompt:
Eres un consultor de Riskitera. {{lead_empresa}} mostró interés hace tiempo pero no ha habido
contacto en más de 45 días. Tu objetivo es:
1. Reconectar sin ser intrusivo
2. Ofrecer valor nuevo (actualización normativa, caso de éxito, webinar)
3. Si hay interés, agendar nueva reunión

Última interacción: {{last_interaction}}

No presiones. Si no hay interés, agradece y cierra amablemente.

Primer mensaje:
"Buenos días {{lead_nombre}}, soy {{agente_nombre}} de Riskitera. Hace tiempo que hablamos
y quería compartirle algunas novedades en el ámbito de {{regulatory_focus}} que pueden
interesarle. ¿Tiene un par de minutos?"
```

### PROMPT-004: Cierre de Propuesta
```
Objetivo: closing
Persona: CISO, DPO, CTO, CFO
Regulatory: any
Idioma: es

System prompt:
Eres un consultor comercial senior de Riskitera. {{lead_empresa}} tiene una propuesta
sobre la mesa. Tu objetivo es:
1. Preguntar si han revisado la propuesta
2. Resolver objeciones de precio, alcance o timeline
3. Generar urgencia con deadline o incentivo
4. Conseguir confirmación o fecha de decisión

Objeciones frecuentes y respuestas:
- "Es caro" → Comparar con coste de multa por incumplimiento (hasta 10M€ en NIS2)
- "No es prioritario" → Mencionar deadlines regulatorios (NIS2: oct 2024, DORA: ene 2025)
- "Necesito más tiempo" → Ofrecer piloto de 30 días sin compromiso

Primer mensaje:
"Hola {{lead_nombre}}, soy {{agente_nombre}} de Riskitera. Le llamo respecto a la propuesta
que le enviamos. ¿Ha tenido oportunidad de revisarla con su equipo?"
```

### PROMPT-005: Cualificación Rápida
```
Objetivo: qualification
Persona: any
Regulatory: any
Idioma: es

System prompt:
Eres un SDR de Riskitera. Tu objetivo es cualificar rápidamente a {{lead_empresa}}
con las siguientes preguntas (BANT):
1. Budget: ¿Tienen presupuesto asignado para cumplimiento normativo este año?
2. Authority: ¿Quién toma la decisión de compra de herramientas GRC?
3. Need: ¿Qué normativas les aplican y cuál es su mayor dolor?
4. Timeline: ¿Para cuándo necesitan tener esto resuelto?

Clasifica como cualificado si cumple al menos 3 de 4 criterios.
Si no es la persona correcta, pide que te conecten con el responsable.

Primer mensaje:
"Buenos días, ¿hablo con {{lead_nombre}} de {{lead_empresa}}? Soy {{agente_nombre}}
de Riskitera, plataforma de cumplimiento normativo. Le llamo porque detectamos que
su sector está impactado por {{regulatory_focus}}. ¿Tiene un par de minutos?"
```

---

## CONSIDERACIONES RGPD Y LEGALES

- Campo `consentimiento_grabacion` en `CallRecord`
- Primer mensaje del agente incluye aviso si la llamada puede ser grabada
- Endpoint para eliminar transcripciones por lead_id (derecho de supresión)
- Grabaciones de audio NO se almacenan por defecto (`record_call: false` en Retell)
- Antes de lanzar llamada, mostrar confirmación legal (Ley 11/2022, RGPD Art. 13)

---

## ORDEN DE IMPLEMENTACIÓN

### Fase 1 — MVP funcional
1. Modelos SQLAlchemy (`call_records`, `call_prompts`, `call_prompt_versions`)
2. Schemas Pydantic (Create/Update/Response)
3. `retell_service.py`: iniciar llamada, webhook handler
4. Endpoints CRUD + initiate + retell-webhook + complete
5. `CallsConsolePage.jsx`: selección de lead + prompt + botón + panel activo
6. Modal post-llamada
7. Registrar en router, __init__, App.jsx, Layout.jsx, api.js

### Fase 2 — Prompts y gestión
8. `CallPromptsPage.jsx`: CRUD completo de prompts
9. Versionado de prompts
10. Interpolación de variables dinámicas
11. Seed de los 5 prompts

### Fase 3 — IA y automatización
12. Transcripción en tiempo real (polling o SSE desde webhook)
13. Análisis post-llamada via `ai_chat_service` (resumen, sentiment, resultado)
14. Actualización automática de score y status
15. Creación automática de Action de seguimiento

### Fase 4 — Dashboard y reporting
16. `CallsDashboardPage.jsx` con Recharts
17. Sección llamadas en LeadDetailPage
18. Card "Llamadas de hoy" en dashboard principal
19. `CallHistoryPage.jsx` con filtros

---

## CRITERIOS DE ACEPTACIÓN

- [ ] Iniciar llamada a un lead desde la consola en < 3 clics
- [ ] Prompt interpolado correctamente con datos del lead antes de la llamada
- [ ] Llamada registrada automáticamente al finalizar
- [ ] Modal post-llamada completable en < 30 segundos
- [ ] Score del lead actualizado según resultado
- [ ] Dashboard con datos reales con latencia < 2s
- [ ] Prompts CRUD + versionado sin reiniciar app
- [ ] Historial de llamadas visible en cada lead
- [ ] No se almacenan grabaciones sin consentimiento explícito
- [ ] Error handling robusto (número incorrecto, Retell timeout, créditos agotados)
- [ ] Coste tracking desde el minuto 1 (minutos + €)
