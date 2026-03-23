import * as XLSX from 'xlsx'

/**
 * Exporta datos a Excel (.xlsx)
 * @param {Array} data - Array de objetos con los datos
 * @param {String} filename - Nombre del archivo (sin extensión)
 * @param {Object} options - Opciones de exportación
 * @param {Array} options.columns - Columnas a exportar {key, label}
 * @param {Function} options.transform - Función para transformar cada fila
 */
export function exportToExcel(data, filename, options = {}) {
  const { columns, transform } = options

  // Si no hay datos, no exportar
  if (!data || data.length === 0) {
    alert('No hay datos para exportar')
    return
  }

  // Preparar datos
  let exportData = data

  // Aplicar transformación si existe
  if (transform && typeof transform === 'function') {
    exportData = data.map(transform)
  }

  // Si hay columnas específicas, filtrar
  if (columns && Array.isArray(columns)) {
    exportData = exportData.map(row => {
      const filteredRow = {}
      columns.forEach(col => {
        filteredRow[col.label || col.key] = row[col.key]
      })
      return filteredRow
    })
  }

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(exportData)

  // Auto-width de columnas
  const columnWidths = []
  Object.keys(exportData[0] || {}).forEach((key, i) => {
    const maxLength = Math.max(
      key.length,
      ...exportData.map(row => String(row[key] || '').length)
    )
    columnWidths.push({ wch: Math.min(maxLength + 2, 50) })
  })
  ws['!cols'] = columnWidths

  // Crear workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')

  // Generar archivo
  const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

/**
 * Exporta datos a CSV
 * @param {Array} data - Array de objetos con los datos
 * @param {String} filename - Nombre del archivo (sin extensión)
 * @param {Object} options - Opciones de exportación
 */
export function exportToCSV(data, filename, options = {}) {
  const { columns, transform } = options

  if (!data || data.length === 0) {
    alert('No hay datos para exportar')
    return
  }

  let exportData = data

  if (transform && typeof transform === 'function') {
    exportData = data.map(transform)
  }

  if (columns && Array.isArray(columns)) {
    exportData = exportData.map(row => {
      const filteredRow = {}
      columns.forEach(col => {
        filteredRow[col.label || col.key] = row[col.key]
      })
      return filteredRow
    })
  }

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(exportData)

  // Convertir a CSV
  const csv = XLSX.utils.sheet_to_csv(ws)

  // Crear blob y descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Formatea una fecha para exportación
 */
export function formatDateForExport(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Limpia texto para exportación (remueve HTML, saltos de línea excesivos)
 */
export function cleanTextForExport(text) {
  if (!text) return ''
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\n{2,}/g, '\n') // Replace multiple newlines with single
    .replace(/\s+/g, ' ') // Replace multiple spaces with single
    .trim()
}
