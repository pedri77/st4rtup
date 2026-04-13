import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, Phone, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { callsApi } from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  outline: 'none',
}
const optionStyle = { backgroundColor: T.muted, color: T.fg }

const ESTADO_COLORS = {
  iniciando: T.warning,
  conectando: 'hsl(210,70%,55%)',
  activa: T.success,
  finalizada: T.fgMuted,
  fallida: T.destructive,
  no_contesta: 'hsl(25,90%,50%)',
  buzon: T.purple,
}

const RESULTADO_COLORS = {
  demo_agendada: T.success,
  interesado: T.cyan,
  propuesta_solicitada: 'hsl(210,70%,55%)',
  callback: T.warning,
  sin_respuesta: T.fgMuted,
  no_interesado: T.destructive,
  buzon: T.purple,
}

const RESULTADO_LABELS = {
  demo_agendada: 'Demo agendada',
  interesado: 'Interesado',
  propuesta_solicitada: 'Propuesta',
  callback: 'Callback',
  sin_respuesta: 'Sin respuesta',
  no_interesado: 'No interesado',
  buzon: 'Buzon',
}

const SENTIMENT_COLORS = {
  positivo: T.success,
  neutral: T.fgMuted,
  negativo: T.destructive,
}

function EstadoBadge({ estado }) {
  const color = ESTADO_COLORS[estado] || T.fgMuted
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color, backgroundColor: `${color}15` }}>
      {estado}
    </span>
  )
}

function ResultadoBadge({ resultado }) {
  if (!resultado) return <span className="text-xs" style={{ color: T.fgMuted }}>—</span>
  const color = RESULTADO_COLORS[resultado] || T.fgMuted
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color, backgroundColor: `${color}15` }}>
      {RESULTADO_LABELS[resultado] || resultado}
    </span>
  )
}

function SentimentBadge({ sentiment, score }) {
  if (!sentiment) return null
  const color = SENTIMENT_COLORS[sentiment] || T.fgMuted
  return (
    <span className="text-xs font-medium" style={{ color }}>
      {sentiment} {score != null && `(${score.toFixed(1)})`}
    </span>
  )
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CallHistoryPage() {
  const T = useThemeColors()
  const [page, setPage] = useState(1)
  const [filterEstado, setFilterEstado] = useState('')
  const [filterResultado, setFilterResultado] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['calls', 'history', page, filterEstado, filterResultado],
    queryFn: () => callsApi.list({
      page,
      page_size: 20,
      estado: filterEstado || undefined,
      resultado: filterResultado || undefined,
    }).then(r => r.data),
  })

  const calls = data?.items || []
  const totalPages = data?.pages || 0

  const linkStyle = {
    backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted,
    borderRadius: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500,
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 space-y-6" style={{ backgroundColor: T.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"
            style={{ fontFamily: fontDisplay, color: T.fg }}>
            <History className="w-7 h-7" style={{ color: T.cyan }} />
            Historial de Llamadas
          </h1>
          <p className="mt-1 text-sm" style={{ color: T.fgMuted }}>
            {data?.total || 0} llamadas registradas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app/calls" style={linkStyle}>Consola</Link>
          <Link to="/app/calls/dashboard" style={linkStyle}>Dashboard</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select name="filterEstado" aria-label="Filtrar por estado"
          value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1) }}
          style={inputStyle}>
          <option value="" style={optionStyle}>Todos los estados</option>
          <option value="finalizada" style={optionStyle}>Finalizada</option>
          <option value="activa" style={optionStyle}>Activa</option>
          <option value="fallida" style={optionStyle}>Fallida</option>
          <option value="no_contesta" style={optionStyle}>No contesta</option>
          <option value="buzon" style={optionStyle}>Buzon</option>
        </select>
        <select name="filterResultado" aria-label="Filtrar por resultado"
          value={filterResultado} onChange={e => { setFilterResultado(e.target.value); setPage(1) }}
          style={inputStyle}>
          <option value="" style={optionStyle}>Todos los resultados</option>
          <option value="demo_agendada" style={optionStyle}>Demo agendada</option>
          <option value="interesado" style={optionStyle}>Interesado</option>
          <option value="propuesta_solicitada" style={optionStyle}>Propuesta</option>
          <option value="callback" style={optionStyle}>Callback</option>
          <option value="sin_respuesta" style={optionStyle}>Sin respuesta</option>
          <option value="no_interesado" style={optionStyle}>No interesado</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : calls.length === 0 ? (
        <div className="text-center py-12" style={{ color: T.fgMuted }}>
          <Phone className="w-12 h-12 mx-auto mb-3" />
          <p>No hay llamadas registradas</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <table className="w-full">
            <thead style={{ backgroundColor: T.muted, borderBottom: `1px solid ${T.border}` }}>
              <tr>
                {['Fecha', 'Lead', 'Estado', 'Resultado', 'Duracion', 'Score', 'Coste', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: T.fgMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <>
                  <tr key={call.id} className="cursor-pointer transition-colors"
                    style={{ borderBottom: `1px solid ${T.border}` }}
                    onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = `${T.muted}80`}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td className="px-4 py-3 text-sm" style={{ color: T.fg }}>{formatDate(call.fecha_inicio)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/app/leads/${call.lead_id}`} className="text-sm" style={{ color: T.cyan }}
                        onClick={e => e.stopPropagation()}>
                        {call.lead_id?.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3"><EstadoBadge estado={call.estado} /></td>
                    <td className="px-4 py-3"><ResultadoBadge resultado={call.resultado} /></td>
                    <td className="px-4 py-3 text-sm" style={{ color: T.fgMuted }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(call.duracion_segundos)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {call.score_antes != null && call.score_despues != null ? (
                        <span style={{ color: call.score_despues > call.score_antes ? T.success : call.score_despues < call.score_antes ? T.destructive : T.fgMuted }}>
                          {call.score_antes} → {call.score_despues}
                        </span>
                      ) : <span style={{ color: T.fgMuted }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: T.fgMuted }}>
                      {call.coste_eur ? `${call.coste_eur.toFixed(3)}€` : '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: T.fgMuted }}>
                      {expandedId === call.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </td>
                  </tr>
                  {expandedId === call.id && (
                    <tr key={`${call.id}-detail`}>
                      <td colSpan={8} className="px-4 py-4" style={{ backgroundColor: T.muted }}>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            {call.resumen_ia && (
                              <div>
                                <p className="font-medium mb-1" style={{ color: T.fg }}>Resumen IA</p>
                                <p className="rounded-lg p-3" style={{ color: T.fgMuted, backgroundColor: T.bg, border: `1px solid ${T.border}` }}>{call.resumen_ia}</p>
                              </div>
                            )}
                            {call.notas_agente && (
                              <div>
                                <p className="font-medium mb-1" style={{ color: T.fg }}>Notas del agente</p>
                                <p className="rounded-lg p-3" style={{ color: T.fgMuted, backgroundColor: T.bg, border: `1px solid ${T.border}` }}>{call.notas_agente}</p>
                              </div>
                            )}
                            {call.siguiente_accion && (
                              <div>
                                <p className="font-medium mb-1" style={{ color: T.fg }}>Siguiente accion</p>
                                <p style={{ color: T.fgMuted }}>{call.siguiente_accion}</p>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs" style={{ color: T.fgMuted }}>Sentiment</p>
                                <SentimentBadge sentiment={call.sentiment} score={call.sentiment_score} />
                              </div>
                              <div>
                                <p className="text-xs" style={{ color: T.fgMuted }}>Turnos</p>
                                <p style={{ color: T.fg }}>{call.turnos_conversacion || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs" style={{ color: T.fgMuted }}>Latencia media</p>
                                <p style={{ color: T.fg }}>{call.latencia_media_ms ? `${call.latencia_media_ms}ms` : '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs" style={{ color: T.fgMuted }}>Minutos facturados</p>
                                <p style={{ color: T.fg }}>{call.minutos_facturados ? `${call.minutos_facturados.toFixed(2)}` : '—'}</p>
                              </div>
                            </div>
                            {call.transcripcion && (
                              <div>
                                <p className="font-medium mb-1" style={{ color: T.fg }}>Transcripcion</p>
                                <div className="text-xs rounded-lg p-3 max-h-40 overflow-y-auto whitespace-pre-wrap"
                                  style={{ color: T.fgMuted, backgroundColor: T.bg, border: `1px solid ${T.border}`, fontFamily: "'IBM Plex Mono', monospace" }}>
                                  {call.transcripcion}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${T.border}` }}>
              <p className="text-sm" style={{ color: T.fgMuted }}>
                Pagina {page} de {totalPages} ({data?.total} total)
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
                  style={{ border: `1px solid ${T.border}`, color: T.fgMuted }}>
                  Anterior
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
                  style={{ border: `1px solid ${T.border}`, color: T.fgMuted }}>
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
