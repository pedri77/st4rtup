# SEO & Geo-SEO — Cron Workflows para n8n

## Resumen

Este documento describe los workflows de n8n necesarios para automatizar la recolección de datos SEO y Geo-SEO. Los endpoints bulk ya están implementados en el backend y listos para recibir datos.

**Requisitos previos:**
- n8n configurado y accesible
- Al menos una API key de proveedor SEO configurada en Settings:
  - `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` (recomendado)
  - `SEMRUSH_API_KEY`
  - `SERPER_API_KEY` (alternativa ligera)

---

## Workflow 1: SEO Rankings Check (Step 15)

**Frecuencia:** Diaria (03:00 UTC)
**Objetivo:** Consultar posiciones de las keywords activas en Google Search

### Flujo n8n

```
[Cron Trigger 03:00] → [HTTP GET keywords activas] → [Loop por keyword] → [API DataForSEO/Semrush] → [Transformar datos] → [HTTP POST rankings/bulk]
```

### Endpoints utilizados

| Paso | Método | Endpoint | Descripción |
|------|--------|----------|-------------|
| 1 | GET | `/api/v1/marketing/seo/keywords?is_active=true&page_size=200` | Obtener keywords activas |
| 2 | POST | `/api/v1/marketing/seo/rankings/bulk` | Enviar rankings en bulk |

### Payload de rankings/bulk

```json
[
  {
    "keyword_id": "uuid-de-la-keyword",
    "check_date": "2026-03-16",
    "position": 7,
    "url_found": "https://riskitera.com/grc-platform",
    "provider": "dataforseo",
    "country": "ES",
    "device": "desktop",
    "previous_position": 9,
    "serp_features": {
      "featured_snippet": false,
      "people_also_ask": true,
      "local_pack": false
    }
  }
]
```

### Configuración DataForSEO

```
POST https://api.dataforseo.com/v3/serp/google/organic/live
Authorization: Basic base64(login:password)

Body:
{
  "data": [{
    "keyword": "plataforma grc",
    "location_code": 2724,  // Spain
    "language_code": "es",
    "device": "desktop",
    "depth": 100
  }]
}
```

### Configuración Semrush (alternativa)

```
GET https://api.semrush.com/?type=phrase_organic
  &key=SEMRUSH_API_KEY
  &phrase=plataforma+grc
  &database=es
  &display_limit=100
```

### Configuración Serper (alternativa ligera)

```
POST https://google.serper.dev/search
X-API-KEY: SERPER_API_KEY

Body:
{
  "q": "plataforma grc",
  "gl": "es",
  "hl": "es",
  "num": 100
}
```

---

## Workflow 2: Geo Rankings Check (Step 15)

**Frecuencia:** Semanal (lunes 04:00 UTC)
**Objetivo:** Consultar posiciones geo-localizadas por ciudad española

### Flujo n8n

```
[Cron Trigger lunes 04:00] → [HTTP GET keywords activas] → [Loop por keyword × ciudad] → [API con geo-targeting] → [Transformar datos] → [HTTP POST geo/rankings/bulk]
```

### Ciudades objetivo (España)

Madrid, Barcelona, Valencia, Sevilla, Bilbao, Málaga, Zaragoza, Murcia, Palma, Las Palmas

### Endpoints utilizados

| Paso | Método | Endpoint | Descripción |
|------|--------|----------|-------------|
| 1 | GET | `/api/v1/marketing/seo/keywords?is_active=true&page_size=200` | Keywords base |
| 2 | POST | `/api/v1/marketing/seo/geo/rankings/bulk` | Rankings geo en bulk |

### Payload de geo/rankings/bulk

```json
[
  {
    "keyword": "plataforma grc",
    "location": "Madrid",
    "country": "ES",
    "check_date": "2026-03-16",
    "position": 5,
    "url_found": "https://riskitera.com/grc-platform",
    "local_pack_position": 2,
    "provider": "dataforseo",
    "device": "desktop"
  }
]
```

### Configuración DataForSEO con geo-targeting

```json
{
  "data": [{
    "keyword": "plataforma grc madrid",
    "location_name": "Madrid,Community of Madrid,Spain",
    "language_code": "es",
    "device": "desktop",
    "depth": 30
  }]
}
```

---

## Workflow 3: NAP Consistency Audit (Step 16)

**Frecuencia:** Mensual (1er lunes 05:00 UTC)
**Objetivo:** Verificar consistencia NAP en directorios de negocio

### Flujo n8n

```
[Cron 1er lunes] → [Scrape Google Business] → [Scrape Páginas Amarillas] → [Scrape Einforma] → [Comparar vs canonical NAP] → [HTTP POST geo/nap]
```

### Fuentes a verificar

| Fuente | URL | Tipo |
|--------|-----|------|
| Google Business | Google Maps API / scraping | API/scrape |
| Páginas Amarillas | paginasamarillas.es | Scrape |
| Einforma | einforma.com | API |
| Yelp | yelp.es | Scrape |
| LinkedIn | linkedin.com/company | API |

### Endpoint utilizado

```
POST /api/v1/marketing/seo/geo/nap
```

### Payload

```json
{
  "source": "google_business",
  "source_url": "https://maps.google.com/...",
  "business_name": "Riskitera S.L.",
  "address": "Calle Example 123, 28001 Madrid",
  "phone": "+34 91 123 4567",
  "website": "https://riskitera.com",
  "is_consistent": false,
  "inconsistencies": {
    "phone": "missing",
    "address": "different"
  },
  "check_date": "2026-03-16",
  "country": "ES"
}
```

### NAP Canónico (referencia)

Debe configurarse el NAP oficial de Riskitera como referencia para las comparaciones:
- **Name:** Riskitera S.L.
- **Address:** [dirección oficial]
- **Phone:** [teléfono oficial]
- **Website:** https://riskitera.com

---

## Notas de implementación

1. **Autenticación n8n → Backend:** Usar JWT Bearer token. Crear un usuario de servicio con rol `admin` o un endpoint específico con API key.

2. **Rate limits:** DataForSEO permite ~2000 tareas/minuto. Semrush depende del plan. Serper: 2500 queries/mes (plan free).

3. **Costes estimados:**
   - DataForSEO: ~$0.002 por SERP check → 15 keywords × 30 días = ~$0.90/mes
   - Con geo (10 ciudades): 15 × 10 × 4 semanas = ~$1.20/mes
   - Total estimado: ~$2.10/mes

4. **Error handling en n8n:** Configurar nodo "Error Trigger" para enviar notificación Telegram si el workflow falla.

5. **Deduplicación:** Los endpoints bulk no verifican duplicados por fecha — n8n debe evitar ejecutar el mismo día dos veces.
