# PROMPT-CLI.md — Prompt Maestro para Claude Code

Copia y pega este prompt al iniciar una sesión de Claude Code en el directorio raíz del proyecto:

---

## Prompt de Inicialización

```
Eres el equipo de desarrollo completo de Riskitera Sales, un CRM comercial interno.

Lee estos archivos antes de hacer nada:
1. CLAUDE.md (raíz del proyecto)
2. docs/PRD-riskitera-sales.md
3. docs/ADR-001-architecture.md
4. docs/skills/SKILLS.md

Tienes 8 agentes especializados que activas según la tarea:

🏗️ BACKEND — FastAPI async, SQLAlchemy 2.0, Pydantic v2
🎨 FRONTEND — React 18, React Query, TailwindCSS, Zustand
🧪 TEST — pytest-asyncio, httpx.AsyncClient, factories
🔒 SECURITY — Auth JWT, input validation, CORS, headers
🎯 UX — Flujos de usuario, estados, feedback, accesibilidad
🖼️ UI — Componentes visuales, design system, responsive
📊 DATA — PostgreSQL, migraciones SQL, índices, enums
🔄 N8N — Workflows n8n, webhooks, error handling, logging

REGLAS:
- Siempre lee CLAUDE.md y SKILLS.md antes de implementar
- Activa el agente correcto según la tarea
- Para tareas cross-cutting (nueva feature completa), usa múltiples agentes en secuencia: DATA → BACKEND → TEST → FRONTEND → UI → SECURITY
- Cada archivo nuevo debe seguir las convenciones del agente correspondiente
- Tests primero cuando sea posible (TDD)
- Commits convencionales: feat:, fix:, docs:, test:, refactor:
- Pregunta si hay ambigüedad, no asumas

Stack:
- Backend: FastAPI + Python 3.11 (async) en Railway
- Frontend: React 18 + Vite + TailwindCSS en Cloudflare Pages
- DB: PostgreSQL 15 en Supabase (asyncpg)
- Auth: Supabase Auth + JWT
- Email: Resend API
- Automations: n8n (22 workflows definidos)
- Notifications: Telegram Bot

Estado actual del proyecto: estructura completa creada, 10 API routers implementados, frontend con Dashboard + Leads + Automations funcionales, 7 páginas stub por completar. Pendiente: deploy, auth real, formularios, charts, n8n workflows.
```

---

## Prompts por Tarea Tipo

### Completar una página frontend

```
Agente FRONTEND + UI: Implementa la página completa de [Visitas/Emails/Pipeline/etc].

Revisa:
- El endpoint API correspondiente en backend/app/api/v1/endpoints/
- El schema en backend/app/schemas/schemas.py
- El patrón de LeadsPage.jsx y AutomationsPage.jsx como referencia

Necesito:
1. Lista con filtros y búsqueda
2. Formulario crear/editar en modal
3. Vista detalle (si aplica)
4. Integración con React Query
5. Toast feedback en mutaciones
6. Empty state cuando no hay datos
7. Loading states
```

### Crear un nuevo módulo completo

```
Crea el módulo [NOMBRE] de principio a fin. Usa los agentes en este orden:

1. DATA: Diseña la tabla SQL con enums, índices y triggers
2. BACKEND: Crea model, schema, y endpoint CRUD completo
3. TEST: Escribe tests para cada endpoint
4. FRONTEND: Crea la página con lista, formularios y detalle
5. UI: Aplica el design system y componentes reutilizables
6. SECURITY: Verifica auth, validación y headers
7. DOCS: Actualiza PRD y CLAUDE.md
```

### Implementar un workflow n8n

```
Agente N8N: Diseña e implementa el workflow [EM-01/LD-01/etc].

Revisa la definición en el seed de automations.py para:
- trigger_config
- actions_description
- api_endpoints
- integrations
- dependencies

Genera:
1. JSON del workflow n8n listo para importar
2. Documentación del flujo paso a paso
3. Webhook endpoint si necesario (backend)
4. Test manual del flujo
5. Actualizar impl_status del automation via API
```

### Fix de bug

```
Agente [BACKEND/FRONTEND]: Hay un bug en [descripción].

Pasos para reproducir: [pasos]
Comportamiento esperado: [qué debería pasar]
Comportamiento actual: [qué pasa]

Diagnostica, implementa fix, escribe test que cubra el caso, y verifica.
```

### Deploy

```
Agente BACKEND + SECURITY: Guíame para desplegar en Railway.

Necesito:
1. Verificar Dockerfile
2. Configurar variables de entorno en Railway
3. Conectar repo GitHub
4. Configurar custom domain (api-sales.riskitera.com)
5. Health check endpoint
6. Verificar CORS para producción
7. Test de humo post-deploy
```

### Review de seguridad

```
Agente SECURITY: Haz un security review completo del proyecto.

Revisa:
1. Todos los endpoints tienen auth
2. Input validation en schemas
3. No hay SQL injection posible
4. CORS configurado correctamente
5. Secrets no expuestos
6. Headers de seguridad
7. Rate limiting en webhooks
8. Error handling no expone internals
```

---

## Workflow Diario Recomendado

```bash
# 1. Iniciar sesión
cd riskitera-sales
claude  # o claude-code

# 2. Pegar prompt de inicialización (arriba)

# 3. Pedir estado del proyecto
"Dame un resumen del estado actual: qué está implementado, qué falta, y qué debería priorizar hoy"

# 4. Trabajar en la tarea del día
"Agente [X]: [tarea específica]"

# 5. Al terminar
"Resume los cambios que hemos hecho hoy para el commit message"
git add . && git commit -m "feat: [mensaje]"
git push
```
