# 🎨 Frontend Improvements - Riskitera Sales

## ✅ Mejoras Implementadas

### 1. **Loading States & Skeletons** (`src/components/LoadingStates.jsx`)

Componentes elegantes de carga y estados vacíos:

```jsx
import {
  DashboardSkeleton,
  TableSkeleton,
  KpiCardSkeleton,
  ChartSkeleton,
  ListItemSkeleton,
  EmptyState,
  ErrorState,
  LoadingSpinner,
  InlineLoader
} from '@/components/LoadingStates'

// Uso en tu componente
if (isLoading) return <DashboardSkeleton />

if (isError) return (
  <ErrorState
    title="Error al cargar"
    description={error.message}
    onRetry={() => refetch()}
  />
)

if (data.length === 0) return (
  <EmptyState
    icon={Users}
    title="Sin leads"
    description="No hay leads disponibles"
    action={<button className="btn-primary">Crear Lead</button>}
  />
)
```

### 2. **Animaciones CSS** (`src/styles/index.css`)

Animaciones suaves añadidas:

```jsx
// Clases disponibles:
<div className="animate-fade-in">...</div>
<div className="animate-slide-down">...</div>
<div className="animate-slide-up">...</div>
<div className="animate-slide-right">...</div>
<div className="animate-scale-in">...</div>

// Hover effects:
<div className="hover-lift">...</div>

// Focus effects:
<input className="focus-ring" />

// Buttons mejorados:
<button className="btn-primary">...</button>  // Ahora con hover:scale
<button className="btn-secondary">...</button>

// Cards:
<div className="card">...</div>          // Card normal
<div className="card-hover">...</div>    // Card con hover effect
```

### 3. **Dashboard Mejorado** (`src/pages/DashboardPage.jsx`)

**Mejoras añadidas:**
- ✅ Skeleton loading elegante
- ✅ Error handling con retry
- ✅ Animaciones en header y contenido
- ✅ Auto-refetch cada 5 minutos
- ✅ Importación de `clsx` agregada

### 4. **Advanced Filters** (`src/components/AdvancedFilters.jsx`)

Sistema de filtros avanzados reutilizable:

```jsx
import { SearchWithFilters, FilterSummary, MultiSelectDropdown, DateRangePicker } from '@/components/AdvancedFilters'

function MyPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    status: {
      type: 'multiselect',
      label: 'Estado',
      options: [
        { value: 'new', label: 'Nuevo', count: 10 },
        { value: 'contacted', label: 'Contactado', count: 5 }
      ],
      value: []
    },
    createdAt: {
      type: 'daterange',
      label: 'Fecha creación',
      value: { from: '', to: '' }
    }
  })

  return (
    <>
      <SearchWithFilters
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Buscar leads..."
        filters={filters}
        onFiltersChange={(key, value) => {
          setFilters(prev => ({
            ...prev,
            [key]: { ...prev[key], value }
          }))
        }}
      />

      <FilterSummary
        filters={filters}
        resultsCount={data?.length}
        onClear={(key, value) => {
          setFilters(prev => ({
            ...prev,
            [key]: { ...prev[key], value }
          }))
        }}
      />
    </>
  )
}
```

### 5. **Data Table** (`src/components/DataTable.jsx`)

Tabla responsive con sorting y paginación:

```jsx
import DataTable, { ColumnRenderers } from '@/components/DataTable'

const columns = [
  {
    key: 'company_name',
    label: 'Empresa',
    sortable: true,
    width: '30%'
  },
  {
    key: 'status',
    label: 'Estado',
    render: (value) => ColumnRenderers.badge(value, 'info')
  },
  {
    key: 'created_at',
    label: 'Creado',
    render: ColumnRenderers.date
  },
  {
    key: 'amount',
    label: 'Valor',
    render: (value) => ColumnRenderers.currency(value, 'EUR')
  },
  {
    key: 'score',
    label: 'Score',
    render: (value) => ColumnRenderers.percentage(value)
  }
]

<DataTable
  columns={columns}
  data={leads}
  isLoading={isLoading}
  emptyState={
    <EmptyState
      icon={Users}
      title="Sin leads"
      description="No hay leads disponibles"
    />
  }
  onRowClick={(row) => navigate(`/leads/${row.id}`)}
  sortable={true}
  paginated={true}
  pageSize={20}
/>
```

**Column Renderers disponibles:**
- `ColumnRenderers.badge(value, variant)` - Badges con colores
- `ColumnRenderers.date(value)` - Formato de fecha español
- `ColumnRenderers.currency(value, currency)` - Formato moneda
- `ColumnRenderers.percentage(value)` - Formato porcentaje
- `ColumnRenderers.truncate(value, length)` - Truncar texto

---

## 📦 Dependencias a Instalar

Asegúrate de tener instaladas estas dependencias:

```bash
cd frontend
npm install clsx recharts @tanstack/react-query lucide-react date-fns react-hot-toast
```

---

## 🎯 Próximos Pasos Sugeridos

### A. Aplicar DataTable a LeadsPage

```jsx
// En LeadsPage.jsx, reemplaza la tabla actual por:
import DataTable, { ColumnRenderers } from '@/components/DataTable'

const columns = [
  { key: 'company_name', label: 'Empresa', sortable: true },
  { key: 'contact_name', label: 'Contacto' },
  { key: 'status', label: 'Estado', render: (v) => ColumnRenderers.badge(v) },
  { key: 'score', label: 'Score', render: ColumnRenderers.percentage },
  { key: 'created_at', label: 'Creado', render: ColumnRenderers.date },
]

<DataTable
  columns={columns}
  data={leads?.items || []}
  isLoading={isLoading}
  onRowClick={(row) => navigate(`/leads/${row.id}`)}
/>
```

### B. Añadir Filtros Avanzados a LeadsPage

```jsx
import { SearchWithFilters, FilterSummary } from '@/components/AdvancedFilters'

const filters = {
  status: {
    type: 'multiselect',
    label: 'Estado',
    options: [
      { value: 'new', label: 'Nuevo' },
      { value: 'contacted', label: 'Contactado' },
      { value: 'qualified', label: 'Calificado' },
      { value: 'unqualified', label: 'No calificado' }
    ],
    value: []
  },
  source: {
    type: 'multiselect',
    label: 'Fuente',
    options: [
      { value: 'web', label: 'Web' },
      { value: 'referral', label: 'Referido' },
      { value: 'linkedin', label: 'LinkedIn' }
    ],
    value: []
  },
  createdDate: {
    type: 'daterange',
    label: 'Fecha creación',
    value: { from: '', to: '' }
  }
}
```

### C. Mejorar PipelinePage con Drag & Drop

Considera usar `@dnd-kit/core` para drag & drop de oportunidades entre etapas.

### D. Añadir Gráficos en ReportsPage

Usa Recharts como en el Dashboard para crear reportes visuales.

---

## 🎨 Guía de Estilos

### Colores Brand

```css
--brand: #6366F1 (Indigo)
--brand-dark: #4F46E5
--brand-light: #E0E7FF
```

### Espaciado Consistente

```jsx
// Secciones principales
<div className="space-y-6">...</div>

// Cards dentro de grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">...</div>

// Formularios
<div className="space-y-4">...</div>
```

### Tipografía

```jsx
// Títulos de página
<h1 className="text-2xl font-bold text-gray-900">

// Títulos de sección
<h2 className="text-lg font-semibold text-gray-900">

// Subtítulos
<h3 className="text-base font-medium text-gray-700">

// Texto normal
<p className="text-sm text-gray-600">

// Texto secundario
<p className="text-xs text-gray-400">
```

---

## 6. **Mock Data System** (`src/mocks/mockData.js`)

Sistema completo de datos de prueba para desarrollo sin backend:

```javascript
import { mockDashboardStats, mockLeads, mockNotifications, USE_MOCK_DATA } from '@/mocks/mockData'

// Toggle global en mockData.js
export const USE_MOCK_DATA = true // ← Activa/desactiva modo mock

// Uso en componentes (ya integrado en Dashboard, Leads, Notifications)
const { data, isLoading } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: async () => {
    if (USE_MOCK_DATA) {
      console.log('📊 Usando datos MOCK para desarrollo')
      await mockDelay(800) // Simula latencia
      return mockDashboardStats
    }

    try {
      return await dashboardApi.getStats().then(r => r.data)
    } catch (err) {
      console.warn('⚠️ Backend no disponible, usando datos MOCK')
      await mockDelay(500)
      return mockDashboardStats // Fallback automático
    }
  }
})
```

**Datos mock incluidos:**
- `mockDashboardStats`: 247 leads, pipeline €1.85M, gráficos, KPIs, tendencias
- `mockLeads`: 8 empresas españolas con datos completos
- `mockNotifications`: 5 notificaciones (3 sin leer)
- `mockNotificationStats`: Estadísticas de notificaciones

**Características:**
- ✅ Datos realistas en español
- ✅ Filtrado funcional (búsqueda, estado, origen, score)
- ✅ Fallback automático si backend no disponible
- ✅ Simula latencia de red (600-800ms)
- ✅ Toggle simple con un flag
- ✅ No crashea si backend está offline

**Documentación completa:** Ver `MOCK_DATA_GUIDE.md`

---

## 🚀 Checklist de Implementación

- [x] Loading states & skeletons
- [x] Animaciones CSS
- [x] Dashboard mejorado
- [x] Sistema de filtros avanzados
- [x] Data Table responsive
- [x] **Sistema de Mock Data completo**
- [x] **Dashboard con mock data integrado**
- [x] **LeadsPage con mock data integrado**
- [x] **NotificationsPanel con mock data integrado**
- [ ] Aplicar DataTable a LeadsPage
- [ ] Aplicar DataTable a PipelinePage
- [ ] Añadir filtros avanzados a todas las páginas
- [ ] Mejorar mobile responsiveness
- [ ] Añadir modo oscuro (opcional)
- [ ] Implementar drag & drop en Pipeline
- [ ] Añadir más gráficos en Reports

---

## 📝 Notas

- Todos los componentes son **totalmente reutilizables**
- Las animaciones son **sutiles y profesionales**
- El código está **bien documentado**
- Compatible con **TailwindCSS 3.x**
- Optimizado para **rendimiento**
