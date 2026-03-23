# MOD-COST-001 — Fase 0: Cost Control con Google Sheet + n8n

## Descripción
Control de costes básico sin código adicional en el backend. Google Sheet como fuente de verdad + n8n workflow que evalúa guardrails diariamente.

## Google Sheet: Estructura

Crear una hoja llamada **"Costes"** con las siguientes columnas:

| Columna | Tipo | Ejemplo |
|---------|------|---------|
| A: Fecha | Date | 2026-03-01 |
| B: Herramienta | String | retell_ai |
| C: Concepto | String | Llamadas outbound marzo |
| D: Importe | Number | 12.50 |
| E: Moneda | String | EUR |
| F: Categoría | String | llamadas / infra / saas / marketing |
| G: Notas | String | 250 minutos @ €0.05/min |

### Herramientas válidas (columna B)
- `retell_ai` — Llamadas outbound (€0.05/min)
- `hetzner_gpu` — vLLM infra (€98/mes fijo)
- `n8n_cloud` — Workflows (€20/mes)
- `microsoft_graph` — SharePoint/OneDrive (€12/mes)
- `cal_com` — Agenda (€12/mes)
- `supabase` — Auth + DB (€25/mes)
- `otros` — Catch-all

## Topes Mensuales (Budget Caps)

| Herramienta | Cap (€/mes) | Aviso (%) | Corte (%) |
|-------------|-------------|-----------|-----------|
| Retell AI | 50 | 70% (€35) | 90% (€45) |
| Hetzner GPU | 98 | 80% (€78) | 95% (€93) |
| n8n Cloud | 20 | 75% (€15) | 90% (€18) |
| Microsoft Graph | 12 | 70% (€8.40) | 90% (€10.80) |
| Cal.com | 12 | 70% (€8.40) | 90% (€10.80) |
| Supabase | 25 | 70% (€17.50) | 90% (€22.50) |
| Otros | 50 | 80% (€40) | 95% (€47.50) |
| **TOTAL** | **267** | | |

## n8n Workflow

Archivo: `n8n-flujos/RS-076b_cost_tracking.json`

### Flujo
1. **Cron diario 8:00** (Europe/Madrid)
2. **GET Google Sheet** — lee todas las filas de costes
3. **Evaluar Guardrails** — acumula por herramienta en el mes actual, compara con caps
4. **Si hay alertas** → Telegram + registra en CRM (`/marketing/webhooks/external-alert`)
5. **Siempre** → sync métricas diarias al CRM (`/marketing/webhooks/metrics-sync`)

### Variables de entorno necesarias en n8n
- `COST_SHEET_ID` — ID del Google Sheet
- `GOOGLE_SHEETS_TOKEN` — Token de acceso (OAuth o Service Account)
- `TELEGRAM_BOT_TOKEN` — Bot de alertas
- `TELEGRAM_CHAT_ID` — Chat del founder

## Setup rápido

1. Crear Google Sheet con la estructura de arriba
2. Copiar el Sheet ID de la URL
3. Configurar en n8n: `COST_SHEET_ID`, credenciales Google Sheets
4. Importar `RS-076b_cost_tracking.json` en n8n
5. Activar el workflow

## Evolución a Fase 1 (Sprint 9+)

Cuando el volumen lo justifique, migrar a:
- Tabla `rs_cost_events` en Supabase/Fly.io Postgres
- `GuardrailEvaluator` como nodo LangGraph
- UI en `/settings/costs` con edición de topes en real-time
- Gráficos de proyección y ROI
