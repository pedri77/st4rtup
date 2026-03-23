# Testing Automations Dashboard - Checklist

## ✅ Pre-requisitos
- [ ] Backend corriendo en `http://localhost:8001`
- [ ] Frontend corriendo en `http://localhost:5173`
- [ ] Archivo `.env.local` creado con `VITE_API_URL=http://localhost:8001/api/v1`
- [ ] Usuario autenticado en Supabase

## 🧪 Tests Funcionales

### 1. Cargar datos (Seed)
- [ ] Ir a /automations
- [ ] Clic en "Seed 22 Automations"
- [ ] Ver toast de éxito: "Seeded 22 automations successfully"
- [ ] Ver las 8 categorías expandidas con las automatizaciones

### 2. KPIs Dashboard
Verificar que se muestran correctamente:
- [ ] Total: 22
- [ ] Activas: 0 (inicialmente todas en draft)
- [ ] Errores: 0
- [ ] Ejecuciones 24h: 0
- [ ] Tasa Éxito: 0%
- [ ] Progreso Impl.: calculado según estimated_hours

### 3. Filtros
- [ ] Buscar "Email" → debe mostrar solo Email Automation (4 items)
- [ ] Filtro Prioridad "Crítica" → 5 automatizaciones (EM-01, EM-02, LD-01, AC-01, MR-01)
- [ ] Filtro Implementación "Pending" → todas (22)
- [ ] Filtro Fase "Fase 1" → 4 automatizaciones
- [ ] Botón "Limpiar filtros" → vuelve a mostrar todas

### 4. Toggle Activation
- [ ] Clic en toggle de EM-01 (Secuencia Welcome)
- [ ] Status cambia de "Borrador" a "Activo"
- [ ] El punto verde se anima (pulse)
- [ ] KPI "Activas" incrementa a 1
- [ ] Volver a hacer clic → vuelve a "Pausado"

### 5. Detalle Modal
- [ ] Clic en cualquier automatización
- [ ] Se abre modal con toda la info:
  - [ ] Código, nombre, descripción
  - [ ] Categoría, prioridad, implementación, fase/sprint
  - [ ] Configuración trigger (JSON)
  - [ ] Flujo de acciones
  - [ ] API Endpoints usados
  - [ ] Integraciones
  - [ ] Dependencias
  - [ ] Tabla de ejecuciones (vacía inicialmente)
- [ ] Botón "Activar/Pausar" funciona
- [ ] Cerrar modal (X o clic fuera)

### 6. Categorías Colapsables
- [ ] Cada categoría tiene un header con color distintivo
- [ ] Clic en header colapsa/expande la categoría
- [ ] Cuenta de automatizaciones por categoría correcta
- [ ] Si hay activas, muestra "X activas" en verde
- [ ] Si hay errores, muestra "X error" en rojo

### 7. Orden y Presentación
- [ ] Automatizaciones ordenadas por código (EM-01, EM-02, ..., IN-02)
- [ ] Headers de columnas claros: ID, Automatización, Trigger, Prioridad, etc.
- [ ] Hover sobre fila resalta en gris claro
- [ ] Todo responsive y sin scrolls horizontales

## 🐛 Problemas Comunes

### Error: "Could not fetch"
→ Backend no está corriendo o VITE_API_URL incorrecto
→ Verificar consola: `🔧 API Configuration`

### Seed retorna "Already exists"
→ Ya hay automatizaciones en BD
→ Borrarlas desde Supabase SQL Editor: `DELETE FROM automations;`

### Toggle no funciona
→ Error de autenticación
→ Verificar token JWT en Network tab

### Modal no cierra
→ Bug en onClick → reportar

## 📊 Estado Esperado Después del Seed

```json
{
  "total": 22,
  "by_category": {
    "email_automation": 4,
    "leads_captacion": 4,
    "visitas": 3,
    "acciones_alertas": 3,
    "pipeline": 3,
    "seguimiento_mensual": 2,
    "encuestas": 2,
    "integraciones": 2
  },
  "by_priority": {
    "critical": 5,
    "high": 11,
    "medium": 6
  },
  "by_impl_status": {
    "pending": 22
  },
  "by_phase": {
    "phase_1": 4,
    "phase_2": 6,
    "phase_3": 5,
    "phase_4": 7
  }
}
```

## 🎯 Siguientes Pasos

Después de verificar que todo funciona:
1. Configurar Zoho API Key en `.env` y Fly.io secrets
2. Probar envío de emails reales con EM-01
3. Crear ejecuciones de prueba para testear métricas
4. Configurar webhooks de Resend para EM-02
5. Implementar n8n workflows reales
