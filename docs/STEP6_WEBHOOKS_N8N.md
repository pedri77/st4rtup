# Step 6: Webhooks n8n — Marketing Hub

> **Estado:** Backend completado — pendiente frontend + tests
> **Dependencias:** n8n configurado y accesible, Steps 1-21 completados
> **Estimación:** ~6 endpoints + tabla `marketing_webhook_log` + UI

---

## Contexto

El módulo Marketing Hub ya tiene:
- **22 automatizaciones CRM** definidas en `/automations/seed` con `trigger_type: webhook` (EM-01, LD-01, VI-01, PI-01, IN-01, etc.) — estas son para el CRM core
- **Webhook receivers** para Typeform/Tally (Step 11) en `/webhooks/typeform` y `/webhooks/tally`
- **Bulk endpoints** para SEO rankings (Step 15-16) en `/marketing/seo/rankings/bulk` y `/marketing/seo/geo/rankings/bulk`
- **Alert engine** (Step 7) con `POST /marketing/alerts/engine/run`
- **LLM Visibility** con `POST /marketing/llm-visibility/run-all`

Step 6 añade **6 webhooks de marketing** específicos para que n8n envíe datos al CRM desde fuentes externas. Cada endpoint tiene idempotencia, logging y validación.

---

## Arquitectura

```
[n8n Workflow] → POST /api/v1/marketing/webhooks/{tipo}
                    ↓
              [Validar payload]
                    ↓
              [Verificar idempotencia (event_id)]
                    ↓
              [Procesar datos → crear/actualizar entidades]
                    ↓
              [Registrar en marketing_webhook_log]
                    ↓
              [Responder {status, processed, entities_affected}]
```

### Autenticación

Los webhooks de n8n usan **Bearer token** (el mismo JWT del sistema) o un **API key** dedicado configurado en n8n. Se recomienda crear un usuario de servicio con rol `admin`:

```
POST /api/v1/marketing/webhooks/campaign-metrics
Authorization: Bearer <jwt-token-usuario-servicio>
```

### Idempotencia

Cada request incluye un `event_id` único (generado por n8n). Si el `event_id` ya existe en `marketing_webhook_log`, el endpoint retorna `{"status": "already_processed"}` sin re-procesar.

---

## Tabla: `marketing_webhook_log`

```python
class MarketingWebhookLog(BaseModel):
    """Log de webhooks de marketing procesados por n8n."""
    __tablename__ = "marketing_webhook_logs"

    event_id = Column(String(255), unique=True, nullable=False, index=True)  # Idempotencia
    webhook_type = Column(String(50), nullable=False, index=True)  # campaign_metrics, social_engagement, etc.
    source = Column(String(100))  # google_ads, linkedin_ads, semrush, etc.
    payload = Column(JSON)  # Raw payload recibido
    result = Column(JSON)  # Resultado del procesamiento
    entities_affected = Column(Integer, default=0)  # Campañas/leads/assets actualizados
    success = Column(Boolean, default=True)
    error = Column(Text)
    processing_ms = Column(Integer)  # Tiempo de procesamiento en ms
    ip_address = Column(String(50))
```

---

## Los 6 Webhooks

### 1. `POST /marketing/webhooks/campaign-metrics`

**Propósito:** n8n sincroniza métricas de Google Ads, LinkedIn Ads, Meta Ads con campañas del CRM.

**Flujo n8n:**
```
[Cron diario 06:00] → [GET Google Ads API] → [GET LinkedIn Ads API] → [Transformar] → [POST campaign-metrics]
```

**Payload:**
```json
{
  "event_id": "camp-metrics-2026-03-16-google",
  "source": "google_ads",
  "date": "2026-03-16",
  "metrics": [
    {
      "campaign_name": "GRC Platform - Search ES",
      "campaign_external_id": "12345678",
      "impressions": 4520,
      "clicks": 187,
      "cost": 234.50,
      "conversions": 12,
      "ctr": 4.14,
      "cpc": 1.25,
      "conversion_rate": 6.42
    }
  ]
}
```

**Lógica:**
1. Buscar campaña por `campaign_name` (fuzzy match) o `external_id` (si se añade campo)
2. Actualizar métricas de la campaña (`actual_budget += cost`, etc.)
3. Si no hay match → log warning, no crear campaña
4. Retornar campañas actualizadas

**Modelo afectado:** `Campaign` — campos `actual_budget`, `metrics` (JSON)

---

### 2. `POST /marketing/webhooks/social-engagement`

**Propósito:** n8n envía datos de engagement de redes sociales (LinkedIn, YouTube, Twitter/X).

**Flujo n8n:**
```
[Cron semanal] → [GET LinkedIn API posts] → [GET YouTube Analytics] → [POST social-engagement]
```

**Payload:**
```json
{
  "event_id": "social-2026-w12-linkedin",
  "source": "linkedin",
  "period": "2026-03-10/2026-03-16",
  "posts": [
    {
      "post_id": "urn:li:share:7123456789",
      "title": "NIS2 compliance guide",
      "impressions": 3400,
      "likes": 89,
      "comments": 12,
      "shares": 23,
      "clicks": 156,
      "engagement_rate": 8.24,
      "url": "https://linkedin.com/posts/..."
    }
  ],
  "summary": {
    "total_impressions": 15200,
    "total_engagement": 456,
    "followers_gained": 34
  }
}
```

**Lógica:**
1. Buscar assets de marketing tipo `social_post` que coincidan con `post_id` o `title`
2. Actualizar métricas del asset (`views`, `clicks`)
3. Crear alerta de marketing si engagement_rate > umbral
4. Almacenar resumen en cache de métricas

**Modelo afectado:** `MarketingAsset` — campos `views`, `clicks`, `conversions`

---

### 3. `POST /marketing/webhooks/content-published`

**Propósito:** n8n notifica cuando se publica contenido nuevo (blog, vídeo, landing page).

**Flujo n8n:**
```
[Webhook WordPress/YouTube] → [Enriquecer datos] → [POST content-published]
```

**Payload:**
```json
{
  "event_id": "content-pub-blog-20260316-001",
  "source": "wordpress",
  "content": {
    "title": "Guía completa NIS2 para empresas españolas",
    "url": "https://riskitera.com/blog/guia-nis2-espana",
    "type": "blog_post",
    "language": "es",
    "category": "nis2",
    "author": "Equipo Riskitera",
    "published_at": "2026-03-16T10:00:00Z",
    "target_keywords": ["nis2 españa", "cumplimiento nis2", "directiva nis2"],
    "meta_title": "Guía NIS2 España 2026 | Riskitera",
    "meta_description": "Todo lo que necesitas saber sobre..."
  }
}
```

**Lógica:**
1. Crear `MarketingAsset` tipo `blog_post` / `video` / `landing_page`
2. Crear `MarketingCalendarEvent` tipo `blog_post` en la fecha de publicación
3. Si tiene `target_keywords` → verificar si existen en `SEOKeyword` → crear si no
4. Crear alerta informativa: "Nuevo contenido publicado: {title}"

**Modelos afectados:** `MarketingAsset`, `MarketingCalendarEvent`, `SEOKeyword`, `MarketingAlert`

---

### 4. `POST /marketing/webhooks/lead-attribution`

**Propósito:** n8n envía datos de atribución de leads (qué campaña/asset/canal generó el lead).

**Flujo n8n:**
```
[Webhook lead-created] → [GET UTM params de la fuente] → [Match campaña] → [POST lead-attribution]
```

**Payload:**
```json
{
  "event_id": "attr-lead-uuid-12345",
  "lead_id": "uuid-del-lead",
  "touchpoints": [
    {
      "channel": "google_ads",
      "campaign_name": "GRC Platform - Search ES",
      "campaign_id": "uuid-de-campana",
      "utm_source": "google",
      "utm_medium": "cpc",
      "utm_campaign": "grc-search-es",
      "landing_page": "https://riskitera.com/grc?utm_source=google",
      "timestamp": "2026-03-14T15:30:00Z",
      "country": "ES",
      "region": "Madrid"
    },
    {
      "channel": "organic",
      "landing_page": "https://riskitera.com/blog/guia-nis2",
      "timestamp": "2026-03-10T09:00:00Z",
      "country": "ES"
    }
  ],
  "attribution_model": "last_touch"
}
```

**Lógica:**
1. Verificar que el `lead_id` existe
2. Almacenar touchpoints en nueva tabla `lead_attribution` o en campo JSON del lead
3. Asignar `source` del lead según el primer/último touchpoint
4. Vincular con campaña si hay `campaign_id`
5. Incrementar contadores de la campaña (leads generados)

**Tabla nueva necesaria:** `lead_attribution`
```python
class LeadAttribution(BaseModel):
    __tablename__ = "lead_attributions"

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(50))  # google_ads, linkedin_ads, organic, referral, email
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"))
    utm_source = Column(String(100))
    utm_medium = Column(String(100))
    utm_campaign = Column(String(255))
    landing_page = Column(String(500))
    country = Column(String(10))
    region = Column(String(100))
    touchpoint_at = Column(DateTime(timezone=True))
    attribution_model = Column(String(30), default="last_touch")  # first_touch, last_touch, linear
    is_converting = Column(Boolean, default=False)  # True for the converting touchpoint
```

---

### 5. `POST /marketing/webhooks/external-alert`

**Propósito:** n8n genera alertas de marketing desde fuentes externas (caída de ranking, pico de gasto ads, competidor detectado).

**Flujo n8n:**
```
[Cron check] → [Verificar condición] → [POST external-alert]
```

**Payload:**
```json
{
  "event_id": "alert-seo-drop-20260316",
  "alert": {
    "type": "seo_drop",
    "severity": "warning",
    "title": "Caída de ranking: 'plataforma grc' de #5 a #15",
    "description": "La keyword 'plataforma grc' ha caído 10 posiciones en los últimos 7 días.",
    "source": "dataforseo",
    "data": {
      "keyword": "plataforma grc",
      "old_position": 5,
      "new_position": 15,
      "change": -10
    },
    "recommended_action": "Revisar contenido de la landing page y backlinks recientes"
  }
}
```

**Lógica:**
1. Crear `MarketingAlert` con los datos proporcionados
2. Mapear `severity` a enum `AlertSeverity` (INFO, WARNING, CRITICAL)
3. Si severity = CRITICAL → enviar notificación Telegram
4. Tipos de alerta soportados:
   - `seo_drop` — caída significativa de ranking
   - `budget_exceeded` — gasto de campaña supera presupuesto
   - `competitor_detected` — competidor mencionado en LLM o nuevo en SERP
   - `nap_inconsistency` — NAP inconsistente detectado en auditoría
   - `form_spike` — aumento inusual de submissions
   - `integration_error` — fallo en integración externa

**Modelo afectado:** `MarketingAlert`

---

### 6. `POST /marketing/webhooks/metrics-sync`

**Propósito:** n8n sincroniza métricas consolidadas de múltiples fuentes para el dashboard de analytics.

**Flujo n8n:**
```
[Cron diario 07:00] → [GET GA4] → [GET Search Console] → [GET CRM stats] → [POST metrics-sync]
```

**Payload:**
```json
{
  "event_id": "metrics-2026-03-16",
  "date": "2026-03-16",
  "source": "consolidated",
  "metrics": {
    "website": {
      "sessions": 1245,
      "users": 890,
      "pageviews": 3456,
      "bounce_rate": 42.3,
      "avg_session_duration": 185,
      "top_pages": [
        {"path": "/grc-platform", "views": 456},
        {"path": "/blog/guia-nis2", "views": 234}
      ],
      "traffic_sources": {
        "organic": 45.2,
        "paid": 23.1,
        "social": 12.4,
        "referral": 8.7,
        "direct": 10.6
      }
    },
    "search_console": {
      "impressions": 12400,
      "clicks": 567,
      "ctr": 4.57,
      "avg_position": 18.3,
      "top_queries": [
        {"query": "plataforma grc", "clicks": 45, "impressions": 890, "position": 7.2},
        {"query": "cumplimiento ens", "clicks": 34, "impressions": 1200, "position": 12.1}
      ]
    },
    "ads": {
      "total_spend": 456.78,
      "total_conversions": 23,
      "cpl": 19.86,
      "roas": 3.4
    }
  }
}
```

**Lógica:**
1. Almacenar en tabla `marketing_metrics_cache` (upsert por fecha + source)
2. Estos datos alimentan el dashboard de Analytics (Step 21)
3. Calcular deltas vs día anterior para detectar anomalías
4. Si hay anomalía → crear alerta automática

**Tabla nueva necesaria:** `marketing_metrics_cache`
```python
class MarketingMetricsCache(BaseModel):
    __tablename__ = "marketing_metrics_cache"

    date = Column(Date, nullable=False, index=True)
    source = Column(String(50), nullable=False)  # ga4, search_console, google_ads, consolidated
    country_code = Column(String(10), default="ES")
    metrics = Column(JSON, nullable=False)  # Full metrics payload

    __table_args__ = (
        UniqueConstraint('date', 'source', 'country_code', name='uq_metrics_cache'),
    )
```

---

## Endpoint de monitorización

### `GET /marketing/webhooks/logs`

Lista webhook logs con filtros (ya existe patrón similar en `/webhooks/logs`):
- `?webhook_type=campaign_metrics`
- `?source=google_ads`
- `?success=false`
- `?date_from=2026-03-01`

### `GET /marketing/webhooks/stats`

Estadísticas: total procesados, errores, por tipo, por fuente, últimas 24h.

### `GET /marketing/webhooks/health`

Health check para n8n: verifica que los endpoints están activos y la DB accesible.

---

## Router y archivos a crear

```
backend/app/
├── api/v1/endpoints/
│   └── marketing_webhooks.py     # 6 webhooks + logs + stats + health
├── models/
│   ├── marketing_webhook_log.py  # MarketingWebhookLog model
│   ├── lead_attribution.py       # LeadAttribution model
│   └── marketing_metrics.py      # MarketingMetricsCache model
└── schemas/
    └── marketing_webhook.py      # Request/Response schemas
```

**Router registration:**
```python
api_router.include_router(
    marketing_webhooks.router,
    prefix="/marketing/webhooks",
    tags=["Marketing - Webhooks n8n"],
)
```

---

## Configuración n8n

### Credenciales necesarias en n8n

| Credencial | Variable en CRM | Uso |
|-----------|-----------------|-----|
| CRM API Token | JWT Bearer | Autenticar webhooks contra el CRM |
| Google Ads | GOOGLE_ADS_* | Campaign metrics |
| LinkedIn Ads | LINKEDIN_ADS_* | Campaign metrics + social |
| GA4 | GA4_* | Website metrics |
| Search Console | GA4_* (same OAuth) | SEO metrics |
| DataForSEO | DATAFORSEO_* | SEO alerts |

### Workflows n8n a crear

| # | Workflow | Trigger | Webhook endpoint | Frecuencia |
|---|---------|---------|-----------------|------------|
| 1 | Campaign Metrics Sync | Cron 06:00 | `/marketing/webhooks/campaign-metrics` | Diario |
| 2 | Social Engagement Sync | Cron lunes 08:00 | `/marketing/webhooks/social-engagement` | Semanal |
| 3 | Content Published | Webhook WordPress/YouTube | `/marketing/webhooks/content-published` | Event-driven |
| 4 | Lead Attribution | Webhook lead.created | `/marketing/webhooks/lead-attribution` | Event-driven |
| 5 | External Alerts | Cron 09:00 | `/marketing/webhooks/external-alert` | Diario |
| 6 | Metrics Dashboard Sync | Cron 07:00 | `/marketing/webhooks/metrics-sync` | Diario |

---

## Checklist de implementación

- [x] Crear modelo `MarketingWebhookLog`
- [x] Crear modelo `LeadAttribution`
- [x] Crear modelo `MarketingMetricsCache`
- [x] Crear schemas para request/response
- [x] Implementar 6 webhook endpoints con idempotencia
- [x] Implementar logs/stats/health endpoints
- [x] Registrar modelos en `__init__.py`
- [x] Registrar router en `router.py`
- [x] Añadir campos faltantes a Campaign, MarketingAsset, MarketingAlert
- [x] Añadir enum values (MarketingAssetType, MarketingAssetStatus, CalendarEventType)
- [x] SQL migración (`scripts/024_marketing_webhooks.sql`)
- [ ] Crear/actualizar frontend (MarketingIntegrationsPage o nuevo WebhooksPage)
- [ ] Tests para cada webhook
- [ ] Documentar configuración n8n

---

## Notas

- **Step 12 (Social connections)** es prerequisito parcial: los webhooks 1, 2 y 6 necesitan que las APIs externas estén conectadas via OAuth. Sin embargo, los endpoints se pueden crear y testear con payloads manuales.
- La tabla `webhook_logs` (Step 11) es para Typeform/Tally. La tabla `marketing_webhook_logs` (Step 6) es específica para n8n y tiene campos adicionales (`event_id`, `webhook_type`, `processing_ms`).
- Los bulk endpoints de SEO (Step 15-16) siguen un patrón similar pero sin idempotencia — se podría unificar en el futuro.
