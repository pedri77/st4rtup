/**
 * PDF Export utility for St4rtup CRM
 * Generates styled HTML reports and opens them in a new window with print dialog.
 */

const BRAND_COLOR = '#0891b2'
const BRAND_DARK = '#155e75'

/**
 * Convert an array of objects into an HTML table string.
 * Automatically adds badge styling for common status values.
 * @param {Array} data - Array of objects
 * @param {Array} headers - Array of { key, label } objects
 * @returns {string} HTML table markup
 */
export function toHtmlTable(data, headers) {
  if (!data || data.length === 0) {
    return '<p style="color:#6B7280;text-align:center;padding:24px 0;">Sin datos disponibles</p>'
  }

  const cols = headers || Object.keys(data[0]).map(k => ({ key: k, label: k }))

  const statusBadge = (value) => {
    const v = String(value).toLowerCase().replace(/[_ ]/g, '')
    const badges = {
      won: { bg: '#D1FAE5', color: '#065F46', label: value },
      ganado: { bg: '#D1FAE5', color: '#065F46', label: value },
      cerrado: { bg: '#D1FAE5', color: '#065F46', label: value },
      lost: { bg: '#FEE2E2', color: '#991B1B', label: value },
      perdido: { bg: '#FEE2E2', color: '#991B1B', label: value },
      active: { bg: '#DBEAFE', color: '#1E40AF', label: value },
      activo: { bg: '#DBEAFE', color: '#1E40AF', label: value },
      new: { bg: '#E0E7FF', color: '#3730A3', label: value },
      nuevo: { bg: '#E0E7FF', color: '#3730A3', label: value },
      contacted: { bg: '#FEF3C7', color: '#92400E', label: value },
      contactado: { bg: '#FEF3C7', color: '#92400E', label: value },
      qualified: { bg: '#CFFAFE', color: '#155E75', label: value },
      cualificado: { bg: '#CFFAFE', color: '#155E75', label: value },
      proposal: { bg: '#F3E8FF', color: '#6B21A8', label: value },
      propuesta: { bg: '#F3E8FF', color: '#6B21A8', label: value },
      negotiation: { bg: '#FFEDD5', color: '#9A3412', label: value },
      negociacion: { bg: '#FFEDD5', color: '#9A3412', label: value },
    }
    const badge = badges[v]
    if (badge) {
      return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${badge.bg};color:${badge.color}">${badge.label}</span>`
    }
    return escapeHtml(String(value ?? ''))
  }

  // Detect if a value looks like a status
  const isStatusLike = (key) => {
    const k = key.toLowerCase()
    return ['status', 'estado', 'stage', 'etapa', 'fase'].some(s => k.includes(s))
  }

  const headerRow = cols.map(c => `<th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#374151;background:#F3F4F6;border-bottom:2px solid #E5E7EB;white-space:nowrap">${escapeHtml(c.label)}</th>`).join('')

  const bodyRows = data.map((row, i) => {
    const bg = i % 2 === 0 ? '#FFFFFF' : '#F9FAFB'
    const cells = cols.map(c => {
      const val = row[c.key]
      const rendered = isStatusLike(c.key) ? statusBadge(val) : escapeHtml(String(val ?? ''))
      return `<td style="padding:9px 14px;font-size:13px;color:#374151;border-bottom:1px solid #E5E7EB">${rendered}</td>`
    }).join('')
    return `<tr style="background:${bg}">${cells}</tr>`
  }).join('')

  return `<table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>`
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Generate a styled HTML report and open it in a new window with print dialog.
 *
 * @param {string} title - Report title
 * @param {Array} sections - Array of section objects:
 *   { heading: string, type: 'metrics'|'table'|'html', data: ... }
 *
 *   type 'metrics': data = [{ label, value, color? }]
 *   type 'table':   data = { rows: [], headers: [{ key, label }] }
 *   type 'html':    data = raw HTML string
 */
export function exportToPDF(title, sections) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const sectionHtml = sections.map(section => {
    let content = ''

    if (section.type === 'metrics' && Array.isArray(section.data)) {
      const cards = section.data.map(m => {
        const accentColor = m.color || BRAND_COLOR
        return `<div style="flex:1;min-width:140px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:10px;padding:16px 20px;text-align:center;border-top:3px solid ${accentColor}">
          <div style="font-size:12px;color:#6B7280;margin-bottom:4px;font-weight:500">${escapeHtml(m.label)}</div>
          <div style="font-size:24px;font-weight:700;color:#111827">${escapeHtml(String(m.value))}</div>
        </div>`
      }).join('')
      content = `<div style="display:flex;gap:12px;flex-wrap:wrap">${cards}</div>`
    } else if (section.type === 'table' && section.data) {
      content = toHtmlTable(section.data.rows, section.data.headers)
    } else if (section.type === 'html') {
      content = section.data || ''
    }

    return `<div style="margin-bottom:28px">
      ${section.heading ? `<h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 12px 0;padding-bottom:6px;border-bottom:2px solid ${BRAND_COLOR}">${escapeHtml(section.heading)}</h2>` : ''}
      ${content}
    </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} - St4rtup CRM</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      @page { margin: 15mm 12mm; size: A4; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; background: #fff; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="background:linear-gradient(135deg,${BRAND_DARK},${BRAND_COLOR});padding:28px 32px;color:#fff;border-radius:0 0 12px 12px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">RISKITERA SALES</div>
        <div style="font-size:12px;opacity:0.85;margin-top:2px">Plataforma Comercial GRC</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;opacity:0.75">Generado el</div>
        <div style="font-size:13px;font-weight:600">${dateStr}</div>
      </div>
    </div>
    <div style="margin-top:16px;font-size:20px;font-weight:700">${escapeHtml(title)}</div>
  </div>

  <!-- Content -->
  <div style="padding:28px 32px">
    ${sectionHtml}
  </div>

  <!-- Footer -->
  <div style="padding:16px 32px;border-top:2px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center;margin-top:16px">
    <div style="font-size:11px;color:#9CA3AF">CONFIDENCIAL - St4rtup CRM &copy; ${now.getFullYear()}</div>
    <div style="font-size:11px;color:#9CA3AF">${dateStr}</div>
  </div>

  <script>
    window.onload = function() { setTimeout(function(){ window.print(); }, 400); };
  </script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  } else {
    alert('No se pudo abrir la ventana de impresión. Verifica que no esté bloqueado por el navegador.')
  }
}
