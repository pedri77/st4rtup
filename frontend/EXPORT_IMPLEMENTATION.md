# 📊 Guía de Implementación de Export

## ✅ Páginas con Export Implementado

- ✅ **LeadsPage** - Export completo con todas las columnas
- ✅ **VisitsPage** - Export con fechas formateadas y arrays convertidos

## 📋 Páginas Pendientes

- ⏳ ActionsPage
- ⏳ EmailsPage
- ⏳ ReviewsPage
- ⏳ SurveysPage
- ⏳ PipelinePage (Opportunities)

---

## 🔧 Cómo Agregar Export a una Página

### Paso 1: Agregar Imports

```javascript
// Al inicio del archivo, después de los otros imports
import ExportButton from '@/components/ExportButton'
import { formatDateForExport } from '@/utils/export'
```

### Paso 2: Agregar Botón en el Header

Encuentra el header de la página (usualmente tiene `className="flex items-center justify-between mb-6"`).

**ANTES:**
```jsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1>Título</h1>
  </div>
  <button onClick={() => setShowCreateModal(true)} className="btn-primary">
    <Plus /> Nuevo
  </button>
</div>
```

**DESPUÉS:**
```jsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1>Título</h1>
  </div>
  <div className="flex gap-3">
    <ExportButton
      data={tuDatosFiltrados}
      filename="nombre-archivo"
      transform={(item) => ({
        'Columna 1': item.field1,
        'Columna 2': item.field2,
        'Fecha': formatDateForExport(item.date),
        // ... más columnas
      })}
    />
    <button onClick={() => setShowCreateModal(true)} className="btn-primary">
      <Plus /> Nuevo
    </button>
  </div>
</div>
```

---

## 📝 Templates por Página

### ActionsPage

```javascript
<ExportButton
  data={sortedActions}
  filename="acciones"
  transform={(action) => ({
    'Título': action.title,
    'Empresa': action.lead_name,
    'Tipo': action.action_type,
    'Estado': action.status,
    'Prioridad': action.priority,
    'Fecha Vencimiento': formatDateForExport(action.due_date),
    'Asignado a': action.assigned_to || '',
    'Descripción': action.description || '',
    'Creado': formatDateForExport(action.created_at),
  })}
/>
```

### EmailsPage

```javascript
<ExportButton
  data={sortedEmails}
  filename="emails"
  transform={(email) => ({
    'Empresa': email.lead_name,
    'Asunto': email.subject,
    'Para': email.to_email,
    'Estado': email.status,
    'Tipo': email.type || '',
    'Enviado': formatDateForExport(email.sent_at),
    'Abierto': formatDateForExport(email.opened_at),
    'Clicked': formatDateForExport(email.clicked_at),
    'Es Seguimiento': email.is_follow_up ? 'Sí' : 'No',
    'Creado': formatDateForExport(email.created_at),
  })}
/>
```

### ReviewsPage

```javascript
<ExportButton
  data={sortedReviews}
  filename="seguimiento-mensual"
  transform={(review) => ({
    'Empresa': review.lead_name,
    'Mes': review.month,
    'Health Score': review.health_score,
    'Estado': review.health_score >= 80 ? 'Excelente' :
              review.health_score >= 60 ? 'Bueno' :
              review.health_score >= 40 ? 'Advertencia' : 'Crítico',
    'Actividades': review.activities_count,
    'Issues': review.issues?.length || 0,
    'Notas': review.notes || '',
    'Próximos Pasos': review.next_steps?.join('; ') || '',
    'Forecast': review.forecast || '',
    'Creado': formatDateForExport(review.created_at),
  })}
/>
```

### SurveysPage

```javascript
<ExportButton
  data={sortedSurveys}
  filename="encuestas"
  transform={(survey) => ({
    'Empresa': survey.lead_name,
    'Tipo': survey.type === 'nps' ? 'NPS' : 'CSAT',
    'Score': survey.score,
    'Categoría': survey.type === 'nps' ?
      (survey.score >= 9 ? 'Promotor' : survey.score >= 7 ? 'Pasivo' : 'Detractor') :
      '',
    'Estado': survey.status,
    'Enviado': formatDateForExport(survey.sent_at),
    'Respondido': formatDateForExport(survey.responded_at),
    'Feedback': survey.feedback || '',
    'Creado': formatDateForExport(survey.created_at),
  })}
/>
```

### PipelinePage (Opportunities)

```javascript
<ExportButton
  data={allOpportunities} // Todas las oportunidades de todas las etapas
  filename="pipeline"
  transform={(opp) => ({
    'Nombre': opp.name,
    'Empresa': opp.lead_name,
    'Etapa': opp.stage,
    'Valor': opp.value || 0,
    'Probabilidad': `${opp.probability}%`,
    'Productos': opp.products?.join(', ') || '',
    'Fecha Cierre Esperada': formatDateForExport(opp.expected_close_date),
    'Notas': opp.notes || '',
    'Creado': formatDateForExport(opp.created_at),
  })}
/>
```

---

## 💡 Tips

### Arrays y Objetos
```javascript
// Arrays - convertir a string separado por comas o punto y coma
'Tags': item.tags?.join(', ') || '',
'Pasos': item.steps?.join('; ') || '',

// Objetos complejos - extraer campos específicos
'Contacto': `${item.contact.name} (${item.contact.email})`,
```

### Fechas
```javascript
// SIEMPRE usar formatDateForExport para fechas
'Fecha': formatDateForExport(item.date),

// Si el campo puede ser null
'Fecha': item.date ? formatDateForExport(item.date) : '',
```

### Booleanos
```javascript
// Convertir a Sí/No en español
'Activo': item.is_active ? 'Sí' : 'No',
'Completado': item.completed ? 'Sí' : 'No',
```

### Enums y Códigos
```javascript
// Traducir códigos a etiquetas legibles
'Estado': statusLabels[item.status] || item.status,
'Tipo': typeIcons[item.type]?.label || item.type,
```

### Números
```javascript
// Números - dejar como están, Excel los formatea bien
'Valor': item.value || 0,
'Score': item.score,

// Porcentajes - agregar símbolo
'Probabilidad': `${item.probability}%`,
```

---

## 🧪 Testing

Después de implementar:

1. **Cargar datos**: Asegúrate de que haya datos en la página
2. **Aplicar filtros**: Prueba que exporte solo los datos filtrados
3. **Click Export**: Abre el menú dropdown
4. **Elegir Excel**: Descarga y abre el archivo .xlsx
5. **Verificar columnas**: Todas las columnas con nombres en español
6. **Verificar fechas**: Fechas formateadas correctamente
7. **Verificar arrays**: Arrays convertidos a texto legible
8. **Elegir CSV**: Descarga y abre en Excel/Google Sheets
9. **Sin datos**: Verificar que el botón está deshabilitado sin datos

---

## 🚀 Script Rápido

Para agregar a múltiples páginas rápidamente:

```bash
# Buscar header section en cada página
grep -n "className=\"flex items-center justify-between mb-6\"" src/pages/*Page.jsx

# Ver el botón actual
grep -A 5 "className=\"btn-primary flex items-center gap-2\"" src/pages/ActionsPage.jsx
```

---

**✅ Una vez implementado en todas las páginas, actualizar la lista al inicio de este documento.**
