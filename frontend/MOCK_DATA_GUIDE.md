# 📊 Guía de Datos Mock - Desarrollo Frontend

## ¿Qué es el Modo Mock?

El modo mock te permite desarrollar y ver la interfaz completa del CRM **sin necesidad de tener el backend conectado**. Todos los datos son simulados pero realistas, permitiéndote ver gráficos, tablas, animaciones y todos los componentes funcionando correctamente.

---

## 🎯 Activar/Desactivar Modo Mock

### Ubicación del Flag

El flag de control está en `/src/mocks/mockData.js`:

```javascript
// Mock mode flag - set to true for development without backend
export const USE_MOCK_DATA = true  // ← Cambiar aquí
```

### Estados:

- **`true`**: Usa datos mock simulados (desarrollo sin backend)
- **`false`**: Intenta conectar con backend real en `http://localhost:8001`

---

## 📦 Componentes con Mock Data

Los siguientes componentes **ya están configurados** para usar mock data automáticamente:

### 1. **Dashboard** (`/pages/DashboardPage.jsx`)

**Datos mock incluidos:**
- ✅ 247 leads totales
- ✅ €1,850,000 en pipeline activo
- ✅ 3 acciones vencidas, 7 para hoy
- ✅ Gráfico de pipeline por etapa (4 etapas)
- ✅ Gráfico de actividad últimos 7 días
- ✅ Embudo de conversión (6 etapas)
- ✅ Top 5 leads por score
- ✅ Distribución por sector (5 sectores)
- ✅ Actividad reciente (5 actividades)
- ✅ Leads por estado (6 estados)
- ✅ Próximas visitas (3 visitas programadas)

**Cómo se ve:**
```
Total Leads: 247 (+12.5%)
Pipeline Activo: €1,850K (+8.3%)
Tasa de Conversión: 18.5% (-2.1%)
```

### 2. **Leads** (`/pages/LeadsPage.jsx`)

**Datos mock incluidos:**
- ✅ 8 leads de ejemplo (empresas españolas)
- ✅ Filtrado funcional por estado, origen y score
- ✅ Búsqueda funcional por empresa, contacto, email
- ✅ Paginación (247 leads total simulados)

**Empresas de ejemplo:**
- TechCorp Solutions (Score: 95, Cualificado)
- Digital Innovations SA (Score: 92, Propuesta)
- CloudBase Systems (Score: 88, Cualificado)
- DataFlow Technologies (Score: 85, Negociación)
- SecureNet España (Score: 82, Cualificado)
- FinTech Iberia (Score: 78, Contactado)
- HealthTech Solutions (Score: 65, Nuevo)
- RetailPro España (Score: 70, Contactado)

### 3. **Notificaciones** (`/components/NotificationsPanel.jsx`)

**Datos mock incluidos:**
- ✅ 5 notificaciones de ejemplo
- ✅ 3 sin leer, 25 total
- ✅ Tipos: lead, action, opportunity, visit, email
- ✅ Prioridades: urgent, high, medium
- ✅ Filtrado funcional por tipo y estado
- ✅ Estadísticas por tipo

**Notificaciones de ejemplo:**
```
🎯 Nuevo lead capturado (hace 1h)
⚠️ Acción vencida (hace 2h)
💰 Oportunidad ganada (hace 5h)
📅 Visita programada (hace 1d)
📧 Email enviado exitosamente (hace 2d)
```

---

## 🔄 Comportamiento del Fallback

Incluso con `USE_MOCK_DATA = false`, si el backend **no está disponible**, el sistema automáticamente hace fallback a mock data:

```javascript
try {
  return await dashboardApi.getStats().then(r => r.data)
} catch (err) {
  console.warn('⚠️ Backend no disponible, usando datos MOCK')
  return mockDashboardStats // ← Fallback automático
}
```

**Ventajas:**
- No necesitas cambiar código para probar con/sin backend
- La app nunca crashea por falta de datos
- Puedes desarrollar frontend aunque el backend tenga problemas

---

## 🎨 Estructura de los Mock Data

### `/src/mocks/mockData.js`

```javascript
export const mockDashboardStats = {
  total_leads: 247,
  pipeline_value: 1850000,
  weighted_pipeline: 925000,
  actions_overdue: 3,
  actions_due_today: 7,
  emails_sent_this_month: 45,
  visits_this_month: 12,
  conversion_rate: 18.5,
  stale_opportunities: 2,

  // Trends
  leads_trend: 12.5,
  pipeline_trend: 8.3,
  conversion_trend: -2.1,

  // Charts data
  leads_by_status: { ... },
  pipeline_by_stage: { ... },
  activity_last_7_days: [...],
  conversion_funnel: [...],
  top_leads_by_score: [...],
  leads_by_sector: { ... },
  recent_activity: [...],
  upcoming_visits: [...]
}

export const mockLeads = {
  items: [...], // 8 leads de ejemplo
  total: 247,
  page: 1,
  page_size: 20,
  pages: 13
}

export const mockNotifications = {
  items: [...], // 5 notificaciones
  total: 25,
  page: 1,
  page_size: 20
}

export const mockNotificationStats = {
  total: 25,
  unread: 3,
  by_type: { ... },
  by_priority: { ... }
}

// Helper para simular latencia
export const mockDelay = (ms = 800) =>
  new Promise(resolve => setTimeout(resolve, ms))
```

---

## 🛠️ Añadir Mock Data a Nuevas Páginas

Si creas una nueva página y quieres añadir mock data:

### 1. Añade los datos mock en `mockData.js`

```javascript
export const mockOpportunities = {
  items: [
    {
      id: '1',
      name: 'Proyecto GRC TechCorp',
      value: 150000,
      stage: 'proposal',
      probability: 60,
      close_date: '2024-06-30',
      lead_id: '1',
      lead_name: 'TechCorp Solutions'
    },
    // ... más datos
  ],
  total: 45,
  page: 1,
  page_size: 20
}
```

### 2. Importa en tu componente

```javascript
import { mockOpportunities, mockDelay, USE_MOCK_DATA } from '@/mocks/mockData'
```

### 3. Usa en tu queryFn

```javascript
const { data, isLoading } = useQuery({
  queryKey: ['opportunities'],
  queryFn: async () => {
    if (USE_MOCK_DATA) {
      console.log('📊 Usando datos MOCK para opportunities')
      await mockDelay(600)
      return mockOpportunities
    }

    try {
      return await opportunitiesApi.list().then(r => r.data)
    } catch (err) {
      console.warn('⚠️ Backend no disponible, usando datos MOCK')
      await mockDelay(400)
      return mockOpportunities
    }
  }
})
```

---

## 🎯 Filtrado en Mock Data

Los filtros **sí funcionan** con mock data. Ejemplo en LeadsPage:

```javascript
// Aplicar filtros básicos a los datos mock
let filteredItems = [...mockLeads.items]

if (search) {
  filteredItems = filteredItems.filter(lead =>
    lead.company_name.toLowerCase().includes(search.toLowerCase()) ||
    lead.contact_name?.toLowerCase().includes(search.toLowerCase())
  )
}

if (filters.status) {
  filteredItems = filteredItems.filter(lead =>
    lead.status === filters.status
  )
}

if (filters.min_score) {
  filteredItems = filteredItems.filter(lead =>
    lead.score >= parseInt(filters.min_score)
  )
}

return {
  items: filteredItems,
  total: filteredItems.length,
  page: page,
  page_size: 20
}
```

---

## 📝 Logs en Consola

Cuando el modo mock está activo, verás logs útiles:

```
📊 Usando datos MOCK para desarrollo
📊 Usando datos MOCK para leads
🔔 Usando datos MOCK para notificaciones
```

Cuando hay fallback por error de backend:

```
⚠️ Backend no disponible, usando datos MOCK: Network Error
```

---

## ✅ Ventajas del Sistema Mock

1. **Desarrollo sin backend**: Puedes trabajar en frontend aunque backend esté caído
2. **Datos realistas**: Empresas españolas, fechas, scores, todo coherente
3. **Filtrado funcional**: Los filtros y búsquedas funcionan con mock data
4. **Sin modificar código**: Toggle simple con un flag
5. **Fallback automático**: Si backend falla, usa mock sin crashear
6. **Performance**: Simula latencia de red realista (600-800ms)
7. **Testing visual**: Ves todos los estados (vacío, error, cargando, datos)

---

## 🚀 Casos de Uso

### Desarrollo Local (sin backend)

```javascript
// mockData.js
export const USE_MOCK_DATA = true
```

```bash
cd frontend
npm run dev
# ✅ Verás dashboard completo con datos
```

### Testing con Backend Real

```javascript
// mockData.js
export const USE_MOCK_DATA = false
```

```bash
# Terminal 1
cd backend && uvicorn app.main:app --reload --port 8001

# Terminal 2
cd frontend && npm run dev
# ✅ Conecta a backend real
```

### Demo o Presentación

```javascript
// mockData.js
export const USE_MOCK_DATA = true
```

- No necesitas base de datos
- No necesitas autenticación
- No necesitas conexión a Supabase
- Todo funciona offline

---

## 🔮 Próximos Pasos

Componentes pendientes de mock data:

- [ ] PipelinePage (oportunidades)
- [ ] ActionsPage (acciones/tareas)
- [ ] VisitsPage (visitas comerciales)
- [ ] EmailsPage (emails enviados)
- [ ] AccountPlansPage (planes de cuenta)
- [ ] MonthlyReviewsPage (seguimiento mensual)
- [ ] SurveysPage (encuestas NPS/CSAT)
- [ ] AutomationsPage (n8n workflows)

---

## 📞 Notas Importantes

- **NO** subas `USE_MOCK_DATA = true` a producción
- Los datos mock **no persisten** (no hay base de datos)
- Las mutaciones (crear/editar/borrar) muestran toast pero no persisten
- Para producción, siempre usar `USE_MOCK_DATA = false`

---

## 🎨 Ejemplo Visual

Con mock data activado, verás:

```
┌─────────────────────────────────────────────┐
│  Dashboard Comercial                        │
│  Visión general del pipeline                │
├─────────────────────────────────────────────┤
│                                             │
│  ⚠️ Acciones Vencidas: 3                   │
│  ⏰ Acciones Hoy: 7                         │
│  📊 Deals Estancados: 2                     │
│                                             │
│  👥 Total Leads: 247 (+12.5%)              │
│  💰 Pipeline: €1,850K (+8.3%)              │
│  📈 Conversión: 18.5% (-2.1%)              │
│                                             │
│  [Gráfico Pipeline por Etapa]              │
│  [Gráfico Actividad 7 días]                │
│  [Embudo de Conversión]                     │
│  [Top 5 Leads]                              │
│                                             │
└─────────────────────────────────────────────┘
```

Todo con datos realistas, animaciones funcionando, y gráficos poblados correctamente.

---

**¡Listo para desarrollar sin límites!** 🚀
