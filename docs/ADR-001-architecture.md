# ADR-001: Arquitectura Riskitera Sales CRM

**Estado:** Aceptado
**Fecha:** 2026-02-25
**Autor:** David

---

## Contexto

Riskitera necesita un CRM interno para gestionar el ciclo comercial completo. Como founder técnico en solitario, el sistema debe ser:
- Rápido de desarrollar y mantener (mismo stack que Riskitera v4)
- Automatable al máximo (n8n para eliminar tareas manuales)
- Desplegable con coste mínimo (free tiers donde sea posible)
- Extensible para futuro equipo comercial

## Decisión

### 1. Stack: Mismo que Riskitera v4

**Frontend:** React 18 + Vite + TailwindCSS en Cloudflare Pages
**Backend:** FastAPI (Python 3.11, async) en Railway
**Database:** PostgreSQL 15 en Supabase
**Auth:** Supabase Auth + JWT

**Rationale:** Reutilizar expertise existente. No introducir tecnología nueva para un proyecto interno. Deployment pipeline ya conocido.

### 2. Arquitectura: Monolito modular

Backend es un monolito FastAPI con routers modulares, NO microservicios.

```
app/
├── api/v1/endpoints/    # 10 routers independientes
├── core/                # Config, DB, Auth compartidos
├── models/              # SQLAlchemy models
├── schemas/             # Pydantic schemas
└── services/            # Business logic por módulo
```

**Rationale:** Para un CRM interno con 1-3 usuarios, microservicios añade complejidad sin beneficio. El monolito modular permite extraer servicios si escala.

### 3. Base de datos: PostgreSQL con enums nativos

- Enums PostgreSQL para todos los estados (no strings)
- JSON/JSONB para datos semi-estructurados (tags, attendees, config)
- UUID como PK en todas las tablas
- Triggers para updated_at automático
- Sin RLS (aplicación interna, auth a nivel API)

**Rationale:** Enums dan type safety en DB. JSONB evita tablas auxiliares para datos variables. Sin RLS porque no es multi-tenant.

### 4. Automatizaciones: n8n como orquestador externo

n8n se conecta al backend via API REST, NO acceso directo a DB.

```
n8n workflow → HTTP Request → /api/v1/* → Business logic → DB
```

Las automatizaciones se definen y monitorizan desde el propio CRM (tabla automations + automation_executions).

**Rationale:** Separación limpia. n8n no necesita credenciales de DB. Toda la lógica pasa por la API, manteniendo validaciones y audit trail. El panel de automatizaciones en el dashboard da visibilidad sin entrar a n8n.

### 5. Email: Resend API (no SMTP directo)

- Envío via Resend API desde backend
- Webhooks de Resend → n8n → API para tracking (open/click/reply)
- Templates almacenados en DB (email_templates)

**Rationale:** Resend es más fiable que SMTP, tiene buen free tier (3k/mes), webhooks nativos, y API simple. No necesitamos Sendgrid/Mailgun para volúmenes bajos.

### 6. Frontend: React Query + Zustand

- **React Query:** Cache y sincronización con servidor
- **Zustand:** Estado local complejo (formularios multi-step, UI state)
- **NO Redux:** Overengineering para esta escala

**Rationale:** React Query elimina boilerplate de fetch/cache/invalidation. Zustand es mínimo y suficiente para estado que no viene del servidor.

### 7. Deploy: Zero-config approach

- **Railway:** Auto-deploy desde GitHub via Dockerfile
- **Cloudflare Pages:** Auto-build desde GitHub
- **No CI/CD custom:** Los deploy pipelines nativos son suficientes

**Rationale:** Minimizar infraestructura. Railway + Cloudflare tienen deploy automático en push que cubre el 95% de necesidades.

## Alternativas Consideradas

| Decisión | Alternativa | Por qué no |
|----------|-------------|-----------|
| FastAPI | Express/Node | Menos productivo para solo dev, no reutiliza expertise Python |
| Supabase | Neon/PlanetScale | Ya tenemos Supabase en Riskitera v4, evitar fragmentación |
| n8n | Temporal.io/Inngest | Overkill para 22 workflows, n8n es visual y rápido |
| Resend | SendGrid | SendGrid más complejo, Resend API más limpia |
| Monolito | Microservicios | 1-3 usuarios no justifica la complejidad |
| TailwindCSS | Chakra/MUI | Ya dominado en Riskitera v4, más ligero |

## Consecuencias

### Positivas
- Time-to-market muy rápido (mismo stack, patterns conocidos)
- Coste operativo mínimo (~$5-10/mes total)
- 22 automatizaciones gestionables desde un solo dashboard
- Extensible: añadir módulos = nuevo router + model + page

### Riesgos
- Single point of failure en Railway (backend)
- Sin tests E2E automatizados inicialmente
- n8n como dependencia externa para automatizaciones
- Supabase free tier tiene límites (500MB, 2 projects)

### Mitigaciones
- Health checks en Railway con restart automático
- Tests unitarios y de integración desde Fase 2
- Reintentos configurados en n8n + alertas Telegram
- Monitorizar uso Supabase, upgrade cuando >60% capacidad
