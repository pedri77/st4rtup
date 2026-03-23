# 🔄 Guía de Persistencia con localStorage

## ✅ Páginas con Persistencia Activa

Las siguientes páginas ahora **guardan automáticamente** filtros y búsquedas en localStorage:

| Página | Key Storage | Filtros Persistidos |
|--------|-------------|---------------------|
| **VisitsPage** | `filters_visits`, `search_visits` | Tipo de Visita, Resultado, Periodo, Rango de Fechas, Búsqueda |
| **EmailsPage** | `filters_emails`, `search_emails` | Estado, Tipo, Fecha de Envío, Búsqueda |
| **ReviewsPage** | `filters_reviews`, `search_reviews` | Estado de Salud, Issues, Período, Búsqueda |
| **SurveysPage** | `filters_surveys`, `search_surveys` | Tipo de Encuesta, Estado, Fecha de Respuesta, Búsqueda |

---

## 🎯 ¿Cómo Funciona?

### 1. Aplicación Automática
Cuando el usuario aplica filtros o busca:
```javascript
// Usuario selecciona filtros en la UI
setFilters({ status: { ...status, value: ['completed'] } })

// ✅ Se guarda AUTOMÁTICAMENTE en localStorage
localStorage.setItem('filters_surveys', JSON.stringify(filters))
```

### 2. Restauración al Cargar
Al recargar la página:
```javascript
// Hook lee de localStorage
const stored = localStorage.getItem('filters_surveys')
if (stored) {
  const parsed = JSON.parse(stored)
  // Merge con estructura inicial para mantener integridad
  return mergedFilters
}
```

### 3. Persistencia Inteligente
- **Merge automático:** Los filtros nuevos se integran con los guardados
- **Estructura garantizada:** Siempre mantiene la estructura completa de filtros
- **Error handling:** Si hay error de JSON, vuelve a filtros iniciales

---

## 🧪 Cómo Probar

### Prueba 1: Filtros Persisten
1. Navega a `/visits`
2. Aplica filtros:
   - Tipo: Presencial, Online
   - Resultado: Positiva
3. **Recarga la página** (F5 o Ctrl+R)
4. ✅ Los filtros deberían seguir aplicados

### Prueba 2: Búsqueda Persiste
1. En `/emails` busca "TechCorp"
2. **Recarga la página**
3. ✅ "TechCorp" debería seguir en el campo de búsqueda

### Prueba 3: Navegación Entre Páginas
1. En `/reviews` aplica filtros
2. Navega a `/surveys`
3. Vuelve a `/reviews`
4. ✅ Los filtros de reviews se mantienen (cada página tiene su propio storage)

### Prueba 4: Limpiar Filtros
1. Aplica múltiples filtros
2. Click en "Limpiar todo" en FilterSummary
3. ✅ Se eliminan de localStorage también
4. Recarga: filtros vacíos

---

## 🔍 Inspección en DevTools

### Ver Storage Actual
```javascript
// Abrir DevTools > Console
// Ver filtros guardados
console.log(localStorage.getItem('filters_visits'))
console.log(localStorage.getItem('search_visits'))

// Ver todos los filtros guardados
Object.keys(localStorage)
  .filter(k => k.startsWith('filters_') || k.startsWith('search_'))
  .forEach(k => console.log(k, localStorage.getItem(k)))
```

### Limpiar Todo el Storage
```javascript
// Limpiar solo filtros/búsquedas
Object.keys(localStorage)
  .filter(k => k.startsWith('filters_') || k.startsWith('search_'))
  .forEach(k => localStorage.removeItem(k))

// O limpiar TODO
localStorage.clear()
```

---

## 📋 Estructura de Datos Guardados

### Ejemplo: filters_visits
```json
{
  "visit_type": {
    "type": "multiselect",
    "label": "Tipo de Visita",
    "options": [...],
    "value": ["presencial", "virtual"]
  },
  "result": {
    "type": "multiselect",
    "label": "Resultado",
    "options": [...],
    "value": ["positive"]
  },
  "time_range": {
    "type": "multiselect",
    "label": "Periodo",
    "options": [...],
    "value": []
  },
  "date_range": {
    "type": "daterange",
    "label": "Rango de Fechas",
    "value": { "from": "2024-01-01", "to": "2024-12-31" }
  }
}
```

### Ejemplo: search_visits
```json
"TechCorp"
```

---

## 🛠️ API del Hook

### usePersistedFilterSearch

```javascript
import { usePersistedFilterSearch } from '@/hooks/usePersistedFilters'

const {
  filters,           // Estado de filtros (con valores persistidos)
  setFilters,        // Setter de filtros (persiste automáticamente)
  resetFilters,      // Resetea a valores iniciales y limpia localStorage
  searchQuery,       // Query de búsqueda (persistido)
  setSearchQuery,    // Setter de búsqueda (persiste automáticamente)
  clearSearch,       // Limpia búsqueda y localStorage
  clearAll,          // Limpia filtros + búsqueda de golpe
} = usePersistedFilterSearch('page-key', initialFilters)
```

### Hooks Individuales

Si solo necesitas una cosa:

```javascript
// Solo filtros
import { usePersistedFilters } from '@/hooks/usePersistedFilters'
const [filters, setFilters, resetFilters] = usePersistedFilters('key', initial)

// Solo búsqueda
import { usePersistedSearch } from '@/hooks/usePersistedFilters'
const [searchQuery, setSearchQuery, clearSearch] = usePersistedSearch('key')
```

---

## 🚀 Aplicar a Nuevas Páginas

### Paso 1: Importar el Hook
```javascript
import { usePersistedFilterSearch } from '@/hooks/usePersistedFilters'
```

### Paso 2: Reemplazar useState
```diff
- const [searchQuery, setSearchQuery] = useState('')
- const [filters, setFilters] = useState(initialFilters)

+ const {
+   filters,
+   setFilters,
+   searchQuery,
+   setSearchQuery,
+ } = usePersistedFilterSearch('my-page', initialFilters)
```

### Paso 3: Mantener handleFiltersChange (si existe)
```javascript
// Este código NO necesita cambios
const handleFiltersChange = (key, value) => {
  setFilters({
    ...filters,
    [key]: { ...filters[key], value },
  })
}
```

### Paso 4: ¡Listo!
Los filtros y búsqueda ahora persisten automáticamente.

---

## 💡 Beneficios

### Para el Usuario
- ✅ No pierde sus filtros al recargar
- ✅ Vuelve exactamente donde lo dejó
- ✅ Mejor experiencia al navegar entre páginas
- ✅ Ahorro de tiempo (no re-aplicar filtros)

### Para el Desarrollador
- ✅ Zero configuration
- ✅ API simple y consistente
- ✅ Error handling automático
- ✅ TypeScript friendly
- ✅ Merge inteligente de estructura

---

## 🔧 Troubleshooting

### Problema: Filtros no persisten
**Solución:** Verifica que la key sea única para cada página
```javascript
// ❌ MAL - misma key para 2 páginas
usePersistedFilterSearch('filters', ...)

// ✅ BIEN - keys únicas
usePersistedFilterSearch('visits', ...)
usePersistedFilterSearch('emails', ...)
```

### Problema: Error al parsear JSON
**Solución:** El hook ya maneja este caso, vuelve a filtros iniciales
```javascript
try {
  const parsed = JSON.parse(stored)
} catch (error) {
  console.warn('Error parsing, using initial')
  return initialFilters
}
```

### Problema: Filtros "antiguos" no compatibles
**Solución:** Cambiar la key o versionar
```javascript
// Opción 1: Nueva key
usePersistedFilterSearch('visits-v2', ...)

// Opción 2: Limpiar manualmente
localStorage.removeItem('filters_visits')
```

---

## 📊 Métricas de Storage

### Tamaño Aproximado por Página
- Filtros: ~500 bytes
- Búsqueda: ~50 bytes
- **Total por página: ~550 bytes**

### Límite de localStorage
- Navegadores modernos: **5-10 MB**
- Con 4 páginas: **~2.2 KB** (0.02% del límite)
- ✅ Muy por debajo del límite

---

## 🎯 Próximos Pasos

### Páginas Pendientes de Persistencia
- [ ] LeadsPage
- [ ] PipelinePage
- [ ] ActionsPage
- [ ] DashboardPage (filtros de fecha)

### Mejoras Futuras
- [ ] Sync cross-tab (BroadcastChannel API)
- [ ] Compresión de datos (LZString)
- [ ] Versionado de estructura
- [ ] Export/Import de filtros
- [ ] Filtros favoritos/presets

---

**✅ Persistencia implementada en 4 páginas y lista para expandir a toda la app!**
