import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  FileBarChart, Download, Loader2, Play, Calendar, Filter, FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  outline: 'none',
}

const REPORT_TYPES = [
  { id: 'pipeline', name: 'Pipeline', desc: 'Oportunidades, valores y etapas' },
  { id: 'activity', name: 'Actividad', desc: 'Emails, visitas, acciones por dia' },
  { id: 'leads', name: 'Leads', desc: 'Listado de leads con filtros' },
  { id: 'revenue', name: 'Revenue', desc: 'Ingresos mensuales y deals ganados' },
]

const DATE_RANGES = [
  { id: 'week', name: 'Ultima semana' },
  { id: 'month', name: 'Este mes' },
  { id: 'quarter', name: 'Este trimestre' },
  { id: 'year', name: 'Este ano' },
]

const reportBuilderApi = {
  types: () => api.get('/report-builder/types'),
  generate: (config) => api.post('/report-builder/generate', config),
  exportCsv: (config) => api.post('/report-builder/export-csv', config, { responseType: 'blob' }),
  exportPdf: (config) => api.post('/report-builder/export-pdf', config, { responseType: 'blob' }),
}

export default function ReportBuilderPage() {
  const T = useThemeColors()
  const [reportType, setReportType] = useState('pipeline')
  const [dateRange, setDateRange] = useState('month')
  const [report, setReport] = useState(null)

  const generateMut = useMutation({
    mutationFn: () => reportBuilderApi.generate({ name: 'Custom Report', report_type: reportType, date_range: dateRange }),
    onSuccess: (res) => { setReport(res.data); toast.success('Reporte generado') },
    onError: () => toast.error('Error generando reporte'),
  })

  const exportCsvMut = useMutation({
    mutationFn: () => reportBuilderApi.exportCsv({ name: 'Export', report_type: reportType, date_range: dateRange }),
    onSuccess: (res) => {
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `st4rtup_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV descargado')
    },
  })

  const exportPdfMut = useMutation({
    mutationFn: () => reportBuilderApi.exportPdf({ name: 'Export', report_type: reportType, date_range: dateRange }),
    onSuccess: (res) => {
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `st4rtup_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF descargado')
    },
  })

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <FileBarChart size={24} color={T.cyan} />
        <h1 style={{ fontFamily: fontDisplay, fontSize: '1.75rem', fontWeight: 700, color: T.fg, margin: 0 }}>
          REPORT BUILDER
        </h1>
      </div>

      {/* Config */}
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
          {/* Type selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: T.fgMuted, marginBottom: '0.5rem', fontFamily: fontMono }}>Tipo de reporte</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {REPORT_TYPES.map(rt => (
                <button
                  key={rt.id}
                  onClick={() => setReportType(rt.id)}
                  style={{
                    padding: '0.625rem', borderRadius: '0.5rem', textAlign: 'left', cursor: 'pointer',
                    backgroundColor: reportType === rt.id ? T.cyan + '22' : T.muted,
                    border: `1px solid ${reportType === rt.id ? T.cyan + '66' : T.border}`,
                    color: reportType === rt.id ? T.cyan : T.fg,
                  }}
                >
                  <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: '0.9rem' }}>{rt.name}</div>
                  <div style={{ fontSize: '0.7rem', color: T.fgMuted }}>{rt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: T.fgMuted, marginBottom: '0.5rem', fontFamily: fontMono }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />Periodo
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {DATE_RANGES.map(dr => (
                <button
                  key={dr.id}
                  onClick={() => setDateRange(dr.id)}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', cursor: 'pointer',
                    backgroundColor: dateRange === dr.id ? T.purple + '22' : T.muted,
                    border: `1px solid ${dateRange === dr.id ? T.purple + '66' : T.border}`,
                    color: dateRange === dr.id ? T.purple : T.fgMuted,
                  }}
                >
                  {dr.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => generateMut.mutate()}
            disabled={generateMut.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
              background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`,
              color: T.bg, border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
              fontFamily: fontDisplay, fontWeight: 700, fontSize: '0.9rem',
            }}
          >
            {generateMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Generar reporte
          </button>
          {report && (
            <>
            <button
              onClick={() => exportCsvMut.mutate()}
              disabled={exportCsvMut.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
                backgroundColor: T.success + '22', color: T.success, border: `1px solid ${T.success}44`,
                borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              }}
            >
              <Download size={16} /> CSV
            </button>
            <button
              onClick={() => exportPdfMut.mutate()}
              disabled={exportPdfMut.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
                backgroundColor: T.purple + '22', color: T.purple, border: `1px solid ${T.purple}44`,
                borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              }}
            >
              {exportPdfMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} PDF
            </button>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {report && (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: fontDisplay, fontSize: '1.125rem', fontWeight: 700, color: T.fg, margin: 0 }}>
              {REPORT_TYPES.find(r => r.id === report.report_type)?.name || 'Reporte'}
            </h2>
            <span style={{ fontFamily: fontMono, fontSize: '0.75rem', color: T.fgMuted }}>
              {report.date_range} | {report.rows?.length || 0} filas
            </span>
          </div>

          {/* Summary cards */}
          {report.summary && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {Object.entries(report.summary).filter(([k]) => typeof report.summary[k] !== 'object').map(([key, val]) => (
                <div key={key} style={{ padding: '0.75rem 1rem', backgroundColor: T.muted, borderRadius: '0.5rem', minWidth: 120 }}>
                  <div style={{ fontSize: '0.65rem', color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>{key.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: fontMono, color: T.cyan }}>
                    {typeof val === 'number' ? val.toLocaleString('es-ES') : val}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {report.rows?.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    {Object.keys(report.rows[0]).map(col => (
                      <th key={col} style={{
                        padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: `1px solid ${T.border}`,
                        fontFamily: fontMono, fontSize: '0.7rem', color: T.fgMuted, textTransform: 'uppercase',
                      }}>
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}22` }}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} style={{ padding: '0.5rem 0.75rem', color: T.fg, fontFamily: fontMono }}>
                          {typeof val === 'number' ? val.toLocaleString('es-ES') : val || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
