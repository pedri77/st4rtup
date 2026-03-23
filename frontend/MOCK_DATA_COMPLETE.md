# ✅ Mock Data - Integración Completa

## 📊 Resumen de lo Implementado

Se ha integrado un sistema completo de **mock data** en el frontend de Riskitera Sales CRM que permite desarrollar y visualizar todas las funcionalidades **sin necesidad de backend**.

---

## 🎯 Módulos con Mock Data

### ✅ Dashboard (`/dashboard`)
**Datos incluidos:**
- 247 leads totales con tendencias
- €1,850K en pipeline activo
- 6 KPIs principales con trends (+12.5%, +8.3%, etc.)
- Gráfico de pipeline por etapa (4 etapas)
- Gráfico de actividad últimos 7 días
- Embudo de conversión (6 etapas)
- Top 5 leads por score (95-82)
- Distribución por sector (5 sectores)
- 5 actividades recientes
- 3 próximas visitas programadas

**Logs:** `📊 Usando datos MOCK para desarrollo`

---

### ✅ Leads (`/leads`)
**Datos incluidos:**
- 8 leads de empresas españolas
- Scores: 65-95
- Estados: nuevo, contactado, cualificado, propuesta, negociación
- Filtrado funcional por estado, origen, score mínimo
- Búsqueda por empresa, contacto, email
- Paginación (247 leads total simulados)

**Empresas de ejemplo:**
- TechCorp Solutions (Score 95, Cualificado)
- Digital Innovations SA (Score 92, Propuesta)
- CloudBase Systems (Score 88, Cualificado)
- DataFlow Technologies (Score 85, Negociación)
- SecureNet España (Score 82, Cualificado)
- FinTech Iberia (Score 78, Contactado)
- HealthTech Solutions (Score 65, Nuevo)
- RetailPro España (Score 70, Contactado)

**Logs:** `📊 Usando datos MOCK para leads`

---

### ✅ Notificaciones (`/notifications` - Panel)
**Datos incluidos:**
- 5 notificaciones de ejemplo
- 3 sin leer, 25 total
- Tipos: lead, action, opportunity, visit, email
- Prioridades: urgent, high, medium
- Filtrado por tipo y estado de lectura
- Estadísticas por tipo en el footer

**Notificaciones:**
- 🎯 Nuevo lead capturado (hace 1h) - Sin leer
- ⚠️ Acción vencida (hace 2h) - Sin leer
- 💰 Oportunidad ganada (hace 5h) - Sin leer
- 📅 Visita programada (hace 1d) - Leída
- 📧 Email enviado exitosamente (hace 2d) - Leída

**Logs:** `🔔 Usando datos MOCK para notificaciones`

---

### ✅ Pipeline / Oportunidades (`/pipeline`)
**Datos incluidos:**
- 6 oportunidades activas
- Etapas: discovery, qualification, proposal, negotiation, closed_won, closed_lost
- Valor total: €557,000
- Probabilidades: 40%-85%
- Fechas de cierre esperadas
- Descripción y próximos pasos

**Oportunidades de ejemplo:**
- Implementación GRC TechCorp (€180K, 75% prob, Proposal)
- Consultoría ISO 27001 Digital Innovations (€85K, 85% prob, Negotiation)
- Licencias CloudBase (€120K, 50% prob, Qualification)
- Auditoría DORA DataFlow (€95K, 70% prob, Proposal)
- Pentesting SecureNet (€45K, 40% prob, Discovery)
- Formación Ciberseguridad FinTech (€32K, 60% prob, Qualification)

**Layout:** Kanban board con columnas por etapa

**Logs:** `💰 Usando datos MOCK para opportunities`

---

### ✅ Acciones / Tareas (`/actions`)
**Datos incluidos:**
- 7 acciones (tareas)
- Estados: pending, in_progress, completed
- Prioridades: low, medium, high, urgent
- 1 acción vencida (ayer)
- 1 acción para hoy
- 5 acciones futuras o en progreso

**Acciones de ejemplo:**
- ⚠️ **Vencida:** Enviar propuesta comercial TechCorp (Alta prioridad)
- ⚡ **Hoy:** Call de seguimiento Digital Innovations (Urgente)
- 🔄 **En progreso:** Preparar demo técnica CloudBase (Alta)
- 📋 **Pendiente:** Enviar documentación DORA a DataFlow (Media)
- 📅 **Pendiente:** Reunión técnica SecureNet (Alta)
- ✅ **Completada:** Negociar términos con FinTech Iberia

**Layout:** Kanban board con columnas: Vencidas, Hoy, Pendientes, En Progreso, Completadas

**Logs:** `📋 Usando datos MOCK para actions`

---

### ✅ Visitas Comerciales (`/visits`)
**Datos incluidos:**
- 6 visitas (presenciales, virtuales, telefónicas)
- Estados: scheduled, completed, cancelled
- Tipos: demo, closing, prospecting, follow_up
- Ubicaciones y asistentes
- Duración y notas

**Visitas de ejemplo:**
- **Programada:** Demo técnica GRC con TechCorp (en 2 días, Madrid)
- **Programada:** Reunión de cierre Digital Innovations (en 5 días, Barcelona)
- **Programada:** Visita de prospección CloudBase (en 10 días, Valencia)
- **Completada:** Follow-up DataFlow (hace 3 días, Online Teams)
- **Completada:** Presentación ejecutiva SecureNet (hace 7 días, Sevilla)
- **Cancelada:** Visita HealthTech (hace 2 días, Málaga)

**Logs:** `📅 Usando datos MOCK para visits`

---

### ✅ Búsqueda Global (`GlobalSearch`)
**Funcionalidad:**
- Búsqueda en todos los módulos desde ⌘K
- Busca en: leads, emails, actions, opportunities, visits
- Filtrado por tipo
- Navegación con teclado (↑↓ Enter Esc)
- En modo mock: solo busca en leads por ahora

**Logs:** `⚠️ Global search backend failed, using mock data`

---

## 🔧 Cómo Funciona

### Toggle Global

En `/frontend/src/mocks/mockData.js`:

```javascript
export const USE_MOCK_DATA = true  // ← true = mock, false = backend real
```

### Comportamiento

1. **Si `USE_MOCK_DATA = true`:**
   - Todos los módulos usan mock data directamente
   - No se intenta conectar al backend
   - Logs en consola: "📊 Usando datos MOCK para..."

2. **Si `USE_MOCK_DATA = false` Y backend falla:**
   - Intenta conectar al backend
   - Si falla, hace fallback automático a mock data
   - Logs en consola: "⚠️ Backend no disponible, usando datos MOCK"

3. **Si `USE_MOCK_DATA = false` Y backend funciona:**
   - Usa datos reales del backend
   - Sin logs de mock

---

## 📁 Estructura de Archivos

```
frontend/src/
├── mocks/
│   └── mockData.js               # ← Mock data central (700+ líneas)
│       ├── mockDashboardStats
│       ├── mockLeads
│       ├── mockNotifications
│       ├── mockNotificationStats
│       ├── mockOpportunities     # ← NUEVO
│       ├── mockActions           # ← NUEVO
│       ├── mockVisits            # ← NUEVO
│       ├── USE_MOCK_DATA flag
│       └── mockDelay() helper
│
├── pages/
│   ├── DashboardPage.jsx         # ✅ Mock integrado
│   ├── LeadsPage.jsx             # ✅ Mock integrado
│   ├── PipelinePage.jsx          # ✅ Mock integrado
│   ├── ActionsPage.jsx           # ✅ Mock integrado
│   └── VisitsPage.jsx            # ✅ Mock integrado
│
└── components/
    ├── NotificationsPanel.jsx    # ✅ Mock integrado
    └── GlobalSearch.jsx          # ✅ Mock integrado
```

---

## 🎨 Características del Mock Data

### Datos Realistas
- Empresas españolas con CIF y datos reales
- Nombres españoles (Juan García, María López, Pedro Martínez)
- Ciudades españolas (Madrid, Barcelona, Valencia, Sevilla, Málaga)
- Emails corporativos (@techcorp.com, @digitalinnovations.es)
- Sectores: Tecnología, Financiero, Salud, Retail, Educación
- Fechas relativas (hoy, ayer, en X días) para mantener relevancia

### Datos Coherentes
- Leads vinculados a oportunidades
- Oportunidades vinculadas a acciones
- Acciones vinculadas a visitas
- Todo con referencias cruzadas (lead_id, lead_name)
- Estados y fechas lógicos

### Simulación de Latencia
```javascript
await mockDelay(600)  // Simula 600ms de latencia de red
```

Esto hace que el loading state sea visible y realista.

---

## 🚀 Próximos Pasos Sugeridos

### A. Páginas Pendientes de Mock Data
- [ ] EmailsPage
- [ ] ReviewsPage (Seguimiento Mensual)
- [ ] SurveysPage (Encuestas NPS/CSAT)
- [ ] AutomationsPage (22 automatizaciones n8n)
- [ ] ReportsPage

### B. Mejorar Mock Data Existente
- [ ] Añadir más variedad de datos (más empresas, más acciones)
- [ ] Mock data para emails enviados
- [ ] Mock data para account plans
- [ ] Mock data para monthly reviews
- [ ] Mock data para surveys

### C. Mejoras de UX
- [ ] Aplicar `DataTable` a LeadsPage
- [ ] Aplicar `AdvancedFilters` a todas las páginas
- [ ] Drag & drop en Pipeline (mover entre etapas)
- [ ] Drag & drop en Actions (mover entre columnas)
- [ ] Calendarios interactivos en Visits
- [ ] Gráficos interactivos en Dashboard

### D. Features Avanzados
- [ ] Modo offline completo (LocalStorage)
- [ ] Persistencia de cambios en modo mock (localStorage)
- [ ] Export a CSV/Excel desde mock data
- [ ] Generador de más mock data aleatorio

---

## ✅ Testing Rápido

### Verificar Dashboard
```
1. Navega a http://localhost:5173/dashboard
2. Deberías ver:
   - 247 leads
   - €1,850K pipeline
   - Gráficos poblados
3. Consola: "📊 Usando datos MOCK para desarrollo"
```

### Verificar Leads
```
1. Navega a /leads
2. Deberías ver 8 empresas
3. Prueba buscar "TechCorp"
4. Prueba filtrar por estado "qualified"
5. Consola: "📊 Usando datos MOCK para leads"
```

### Verificar Pipeline
```
1. Navega a /pipeline
2. Deberías ver 6 oportunidades en columnas
3. Total: €557,000
4. Consola: "💰 Usando datos MOCK para opportunities"
```

### Verificar Actions
```
1. Navega a /actions
2. Deberías ver:
   - 1 acción vencida (roja)
   - 1 acción para hoy (naranja)
   - 5 más en otras columnas
3. Consola: "📋 Usando datos MOCK para actions"
```

### Verificar Visits
```
1. Navega a /visits
2. Deberías ver 6 visitas
3. 3 programadas, 2 completadas, 1 cancelada
4. Consola: "📅 Usando datos MOCK para visits"
```

### Verificar Notificaciones
```
1. Click en el icono de campana (navbar)
2. Deberías ver 5 notificaciones
3. 3 sin leer (fondo azul)
4. Consola: "🔔 Usando datos MOCK para notificaciones"
```

### Verificar Búsqueda Global
```
1. Presiona Ctrl+K o Cmd+K
2. Escribe "TechCorp"
3. Deberías ver resultados de leads
4. Presiona Enter para navegar
```

---

## 🐛 Troubleshooting

### No veo datos mock
✅ **Solución:** Verifica que `USE_MOCK_DATA = true` en `mockData.js`

### Sigo viendo errores de backend
✅ **Solución:** Los errores son esperados. El frontend hace fallback automático. Puedes **detener el backend** si quieres limpiar los logs.

### Los filtros no funcionan
✅ **Solución:** Algunos filtros avanzados funcionan con mock data (Leads, Notifications). Otros pueden requerir más implementación.

### Las mutaciones no persisten
✅ **Esto es esperado:** Los datos mock no se guardan. Cada recarga vuelve al estado inicial. Esto es normal en modo desarrollo.

---

## 💡 Consejos

1. **Desarrollo sin backend:** Deja `USE_MOCK_DATA = true` mientras trabajas en UI
2. **Testing con backend:** Cambia a `false` cuando el backend esté disponible
3. **Demo/Presentación:** Usa mock data para demos sin dependencias externas
4. **Mobile:** Mock data funciona perfecto en móvil (sin restricciones de red)
5. **Offline:** Funciona completamente offline (no requiere internet)

---

## 📊 Estadísticas

- **Archivos con mock integrado:** 7
- **Líneas de mock data:** ~700
- **Datos simulados:**
  - 8 leads
  - 6 oportunidades (€557K total)
  - 7 acciones/tareas
  - 6 visitas comerciales
  - 5 notificaciones
  - 247 leads totales simulados
  - 28 oportunidades totales simuladas
  - 38 acciones totales simuladas
  - 24 visitas totales simuladas

**Total datos visualizables:** ~50 registros con datos completos

---

**¡Mock data 100% funcional! 🎉**

Ahora puedes desarrollar frontend completamente independiente del backend.
