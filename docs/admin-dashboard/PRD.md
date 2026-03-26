# PRD — Admin Dashboard St4rtup

**Versión:** v1.0
**Fecha:** Marzo 2026
**Autor:** David Moya
**Estado:** En diseño

---

## 1. Visión

Un dashboard de administración completo para operar St4rtup como plataforma SaaS. Diferente del dashboard de usuario — este es para el operador de la plataforma y muestra métricas de negocio, salud técnica, facturación y comportamiento de usuarios.

## 2. Usuarios objetivo

| Rol | Acceso | Necesidades |
|-----|--------|-------------|
| **Founder/CEO** | Total | MRR, churn, signups, revenue, proyecciones |
| **CTO** | Total | Errores, rendimiento, infraestructura, deploys |
| **Growth** | Parcial | Conversión, funnel registro, engagement, marketplace |

## 3. Módulos del Admin Dashboard

### 3.1 KPIs de negocio (vista principal)
- **MRR** (Monthly Recurring Revenue) — suma de suscripciones activas
- **ARR** (Annual Recurring Revenue) — MRR × 12
- **Churn rate** — % de cancelaciones/mes
- **LTV** (Lifetime Value) — revenue medio por cliente
- **CAC** (Customer Acquisition Cost) — coste de adquisición
- **Signups/día** — nuevos registros
- **Conversión trial→paid** — % que pasa de trial a pago
- **Revenue neto/mes** — ingresos - costes infra

### 3.2 Usuarios y organizaciones
- **Total usuarios registrados** + gráfica de crecimiento
- **Usuarios activos** (last 7 days / 30 days)
- **Usuarios conectados ahora** (sessions activas)
- **Organizaciones por plan** — Starter / Growth / Scale (donut)
- **Top organizaciones por actividad** — ranking
- **Usuarios en trial** — cuántos, cuándo expiran
- **Tabla completa de orgs** — nombre, plan, leads, users, last active, revenue

### 3.3 Facturación
- **Revenue Stripe** — pagos completados, fallidos, pendientes
- **Revenue PayPal** — ídem
- **Facturas emitidas/pagadas/vencidas**
- **Add-ons vendidos** — cuáles, cuántos, revenue
- **Proyección de revenue** — basada en trials activos × conversión histórica
- **Gráfica MRR evolución** — últimos 12 meses

### 3.4 Salud técnica
- **Uptime** — % disponibilidad API
- **Tiempo de respuesta medio** — latencia endpoints
- **Errores 500/día** — gráfica
- **CPU / RAM / Disco** del VPS Hetzner
- **Estado servicios** — Backend, Nginx, Supabase Auth, DB
- **Últimos deploys** — fecha, commit, resultado
- **Certificados SSL** — expiración

### 3.5 Emails
- **Emails enviados/día** — drip, transaccionales, notificaciones
- **Tasa de apertura** (si tracking activo)
- **Tasa de clics**
- **Emails fallidos** — bounces, errores Resend
- **Balance Resend** — emails restantes del plan

### 3.6 Engagement y producto
- **Páginas más visitadas** (dentro del CRM)
- **Features más usadas** — de usage_events
- **Features menos usadas** — detectar las que nadie usa
- **Tiempo medio de sesión**
- **Leads creados/día** (global, todas las orgs)
- **Oportunidades creadas/día**
- **Artículos SEO generados**
- **Llamadas IA realizadas**

### 3.7 Landing y marketing
- **Visitas a la landing** (si Google Analytics/Plausible)
- **Conversión landing→registro**
- **Páginas más visitadas** (pricing, blog, vs/, demo)
- **Click en botones de pago** (Stripe/PayPal)
- **Chatbot interacciones** — preguntas frecuentes

### 3.8 Marketplace
- **Add-ons más solicitados** (clics en "Comprar")
- **Add-ons vendidos** — revenue por add-on
- **Features bloqueadas más vistas** — qué quieren los usuarios

### 3.9 Errores y logs
- **Últimos errores 500** — endpoint, timestamp, stack trace
- **Errores de auth** — login fallidos, tokens expirados
- **Webhooks fallidos** — dead letter queue
- **Rate limiting** — IPs/users bloqueados

### 3.10 Alertas automáticas
- **Trial expira en 24h** — lista de usuarios
- **Pago fallido** — lista + acción (reintentar/contactar)
- **Organización inactiva 7+ días**
- **Disco > 80%**
- **Errores 500 > 10/hora**
- **Churn spike** — más de 2 cancelaciones/día

## 4. Acceso

- **URL:** `/app/admin` (solo users con role=admin)
- **Subrutas:**
  - `/app/admin` — Dashboard KPIs
  - `/app/admin/users` — Gestión usuarios/orgs
  - `/app/admin/billing` — Facturación detallada
  - `/app/admin/health` — Salud técnica
  - `/app/admin/emails` — Emails y comunicaciones
  - `/app/admin/engagement` — Uso del producto
  - `/app/admin/errors` — Logs de errores
  - `/app/admin/alerts` — Alertas configurables

## 5. Fuentes de datos

| Dato | Fuente |
|------|--------|
| Usuarios/Orgs | Supabase `organizations` + `org_members` + `users` |
| Facturación | Stripe API + tabla `payments` |
| Uso features | Tabla `usage_events` |
| Emails | Resend API + tabla local |
| Errores | Logs del servidor (journalctl) |
| Infra | SSH al VPS (CPU, RAM, disk) |
| Landing visits | Google Analytics / Plausible (futuro) |
| Marketplace | Tabla `usage_events` (feature=marketplace_click) |

## 6. Prioridad de implementación

| Fase | Módulos | Esfuerzo |
|------|---------|----------|
| **MVP** | KPIs negocio + Usuarios/Orgs + Facturación | 4h |
| **V1** | Salud técnica + Emails + Engagement | 4h |
| **V2** | Marketplace analytics + Errores + Alertas | 4h |
| **V3** | Landing analytics (requiere Plausible) | 2h |

## 7. Métricas de éxito

- El admin puede ver el estado del negocio en <10 segundos
- Las alertas detectan problemas antes que los usuarios
- La conversión trial→paid mejora gracias a visibilidad
