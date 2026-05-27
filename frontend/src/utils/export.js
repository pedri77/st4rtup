// Re-export helpers for backward compat (no heavy deps)
export { formatDateForExport, cleanTextForExport } from './exportHelpers'

function prepareData(data, options) {
  const { columns, transform } = options
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
  return exportData
}

/**
 * Exporta datos a Excel (.xlsx)
 */
export async function exportToExcel(data, filename, options = {}) {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar')
    return
  }

  const XLSX = await import('xlsx')
  const exportData = prepareData(data, options)

  const ws = XLSX.utils.json_to_sheet(exportData)

  const columnWidths = []
  Object.keys(exportData[0] || {}).forEach((key) => {
    const maxLength = Math.max(
      key.length,
      ...exportData.map(row => String(row[key] || '').length)
    )
    columnWidths.push({ wch: Math.min(maxLength + 2, 50) })
  })
  ws['!cols'] = columnWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')

  const fileName = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
}

/**
 * Exporta datos a CSV
 */
export async function exportToCSV(data, filename, options = {}) {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar')
    return
  }

  const XLSX = await import('xlsx')
  const exportData = prepareData(data, options)

  const ws = XLSX.utils.json_to_sheet(exportData)
  const csv = XLSX.utils.sheet_to_csv(ws)

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
