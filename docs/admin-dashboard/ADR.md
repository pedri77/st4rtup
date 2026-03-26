# ADR — Admin Dashboard Architecture

**ADR-001:** Arquitectura del Admin Dashboard
**Fecha:** Marzo 2026
**Estado:** Aceptado

---

## Contexto

St4rtup necesita un panel de administración para operar como SaaS. El dashboard actual de usuario no sirve para gestionar la plataforma — muestra datos de una organización, no datos globales.

## Decisión

### Arquitectura

```
/app/admin (frontend)
  └── AdminLayout (sidebar propio, diferente del CRM)
        ├── AdminDashboard (KPIs)
        ├── AdminUsers (tabla orgs + users)
        ├── AdminBilling (revenue, pagos)
        ├── AdminHealth (infra, errores)
        ├── AdminEmails (envíos, métricas)
        └── AdminEngagement (uso features)

/api/v1/admin/* (backend)
  └── Endpoints protegidos con role=admin
        ├── GET /admin/kpis
        ├── GET /admin/users
        ├── GET /admin/billing
        ├── GET /admin/health
        ├── GET /admin/emails
        ├── GET /admin/engagement
        └── GET /admin/errors
```

### Stack técnico

| Componente | Tecnología | Justificación |
|-----------|------------|---------------|
| **Frontend** | React + mismo design system | Reutilizar componentes |
| **Gráficas** | Recharts (ya instalado) | Consistencia |
| **Auth** | RoleGuard admin | Ya existe |
| **Backend** | FastAPI endpoints /admin/* | Queries sin org_id filter (globales) |
| **Infra metrics** | SSH + parsing (o Prometheus futuro) | Simplicidad |
| **Email metrics** | Resend API /emails endpoint | Directo |
| **Billing** | Stripe API /charges + /subscriptions | Datos reales |

### Alternativas consideradas

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| **Panel custom** (elegida) | Control total, misma codebase | Más trabajo | ✅ |
| **Retool/AdminJS** | Rápido de montar | Dependencia externa, coste | ❌ |
| **Grafana** | Muy potente para métricas | Complejo, otro servicio | ❌ Futuro |
| **Metabase** | SQL queries visuales | Otro servicio, setup | ❌ |

### Seguridad

- Todos los endpoints `/admin/*` requieren JWT con `role=admin`
- Los queries NO filtran por org_id (ven datos globales)
- Logs de acceso al admin dashboard
- Rate limiting más estricto (10 req/s)

### Datos sensibles

- Emails de usuarios: visible solo en admin
- Revenue: visible solo en admin
- Passwords: NUNCA visibles
- API keys de terceros: NUNCA visibles (mostrar "****" + últimos 4 chars)

## Consecuencias

- **Positivo:** Visibilidad total del negocio desde un solo lugar
- **Positivo:** Detección temprana de problemas (churn, errores, infra)
- **Riesgo:** Si el admin se compromete, accede a todos los datos
- **Mitigación:** 2FA obligatorio para admin (futuro)

## Plan de datos

### Datos que ya tenemos (listos para mostrar)
- users, organizations, org_members → Supabase
- payments → tabla local
- usage_events → tabla local
- notifications → tabla local

### Datos que necesitamos recopilar
- Visitas landing → Plausible Analytics (futuro)
- Errores backend → journalctl parsing
- Infra metrics → SSH commands (free, df, uptime)
- Email metrics → Resend API
- Stripe metrics → Stripe API

### Datos que necesitamos crear
- `admin_audit_log` — quién accedió al admin y qué hizo
- `platform_metrics` — snapshot diario de KPIs para histórico
