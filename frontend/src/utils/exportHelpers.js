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
