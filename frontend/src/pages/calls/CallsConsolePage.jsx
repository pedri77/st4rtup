import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Phone, PhoneCall, PhoneOff, Play, CheckCircle2, Loader2, AlertCircle, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { callsApi, callPromptsApi, leadsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}
const optionStyle = { backgroundColor: T.muted, color: T.fg }

const RESULTADOS = [
  { value: 'demo_agendada', label: 'Demo agendada', color: T.success },
  { value: 'interesado', label: 'Interesado', color: T.cyan },
  { value: 'propuesta_solicitada', label: 'Propuesta solicitada', color: 'hsl(210,70%,55%)' },
  { value: 'callback', label: 'Callback', color: T.warning },
  { value: 'sin_respuesta', label: 'Sin respuesta', color: T.fgMuted },
  { value: 'no_interesado', label: 'No interesado', color: T.destructive },
]

const ESTADO_COLORS = {
  iniciando: T.warning,
  conectando: 'hsl(210,70%,55%)',
  activa: T.success,
  finalizada: T.fgMuted,
  fallida: T.destructive,
  no_contesta: 'hsl(25,90%,50%)',
  buzon: T.purple,
}

function EstadoBadge({ estado }) {
  const color = ESTADO_COLORS[estado] || T.fgMuted
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium"
      style={{ color, backgroundColor: `${color}15` }}>
      {estado}
    </span>
  )
}

export default function CallsConsolePage() {
  const queryClient = useQueryClient()
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [selectedPromptId, setSelectedPromptId] = useState('')
  const [toNumber, setToNumber] = useState('')
  const [leadSearch, setLeadSearch] = useState('')
  const [consentRGPD, setConsentRGPD] = useState(false)
  const [activeCall, setActiveCall] = useState(null)
  const [resultado, setResultado] = useState('')
  const [siguienteAccion, setSiguienteAccion] = useState('')
  const [notasAgente, setNotasAgente] = useState('')

  const { data: leadsData } = useQuery({
    queryKey: ['leads', 'calls-select', leadSearch],
    queryFn: () => leadsApi.list({ page_size: 20, search: leadSearch || undefined }).then(r => r.data),
  })

  const { data: promptsData } = useQuery({
    queryKey: ['call-prompts', 'active'],
    queryFn: () => callPromptsApi.list({ activo: true, page_size: 50 }).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['calls', 'stats'],
    queryFn: () => callsApi.stats().then(r => r.data),
  })

  const initiateMutation = useMutation({
    mutationFn: (data) => callsApi.initiate(data).then(r => r.data),
    onSuccess: (data) => {
      setActiveCall(data)
      toast.success(data.simulated ? 'Llamada simulada (Retell no configurado)' : 'Llamada iniciada')
      queryClient.invalidateQueries({ queryKey: ['calls'] })
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error iniciando llamada'),
  })

  const completeMutation = useMutation({
    mutationFn: ({ callId, data }) => callsApi.complete(callId, data).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Llamada completada — Score: ${data.score_antes} → ${data.score_despues}`)
      setActiveCall(null)
      setResultado('')
      setSiguienteAccion('')
      setNotasAgente('')
      queryClient.invalidateQueries({ queryKey: ['calls'] })
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error completando llamada'),
  })

  const handleInitiate = () => {
    if (!selectedLeadId || !selectedPromptId) {
      toast.error('Selecciona un lead y un prompt')
      return
    }
    initiateMutation.mutate({
      lead_id: selectedLeadId,
      prompt_id: selectedPromptId,
      to_number: toNumber || undefined,
      consent: consentRGPD,
    })
  }

  const handleComplete = () => {
    if (!resultado) {
      toast.error('Selecciona un resultado')
      return
    }
    completeMutation.mutate({
      callId: activeCall.call_id,
      data: {
        resultado,
        siguiente_accion: siguienteAccion || undefined,
        notas_agente: notasAgente || undefined,
      },
    })
  }

  const leads = leadsData?.items || []
  const prompts = promptsData?.items || []

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
            <Phone className="w-7 h-7" style={{ color: T.cyan }} />
            Consola de Llamadas IA
          </h1>
          <p className="mt-1 text-sm" style={{ color: T.fgMuted }}>Inicia y gestiona llamadas con Retell AI</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app/calls/prompts" style={linkStyle}>Prompts</Link>
          <Link to="/app/calls/dashboard" style={linkStyle}>Dashboard</Link>
          <Link to="/app/calls/history" style={linkStyle}>Historial</Link>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total llamadas', value: stats.total, color: T.fg },
            { label: 'Finalizadas', value: stats.finalizadas, color: T.success },
            { label: 'Duracion media', value: stats.avg_duration_seconds ? `${Math.round(stats.avg_duration_seconds / 60)}m` : '—', color: T.cyan },
            { label: 'Coste total', value: stats.total_cost_eur ? `${stats.total_cost_eur.toFixed(2)}€` : '0€', color: T.purple },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <p className="text-sm" style={{ color: T.fgMuted }}>{kpi.label}</p>
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Panel izquierdo: Configurar llamada */}
        <div className="rounded-xl p-6 space-y-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: T.fg }}>
            <PhoneCall className="w-5 h-5" style={{ color: T.cyan }} />
            Nueva llamada
          </h2>

          {stats && !stats.retell_configured && (
            <div className="rounded-lg p-3 flex items-start gap-2"
              style={{ backgroundColor: `${T.warning}10`, border: `1px solid ${T.warning}30` }}>
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.warning }} />
              <div className="text-sm" style={{ color: T.warning }}>
                <strong>Retell AI no configurado.</strong> Las llamadas se simularan.
              </div>
            </div>
          )}

          <div>
            <label htmlFor="call-lead-search" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Lead</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: T.fgMuted }} />
              <input id="call-lead-search" name="lead_search" type="text" placeholder="Buscar lead..."
                value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '2.25rem' }} />
            </div>
            <select id="call-lead" name="lead_id" value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              aria-label="Seleccionar lead" style={inputStyle}>
              <option value="" style={optionStyle}>Selecciona un lead...</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id} style={optionStyle}>
                  {lead.company_name} — {lead.contact_name || 'Sin contacto'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="call-prompt" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Prompt / Guion</label>
            <select id="call-prompt" name="prompt_id" value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              aria-label="Seleccionar prompt" style={inputStyle}>
              <option value="" style={optionStyle}>Selecciona un prompt...</option>
              {prompts.map(p => (
                <option key={p.id} value={p.id} style={optionStyle}>
                  {p.nombre} ({p.objetivo}) v{p.version}
                </option>
              ))}
            </select>
            {prompts.length === 0 && (
              <p className="text-xs mt-1" style={{ color: T.fgMuted }}>
                No hay prompts. <Link to="/app/calls/prompts" style={{ color: T.cyan }}>Crea o importa prompts</Link>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="call-number" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Numero (opcional, override)</label>
            <input id="call-number" name="to_number" type="tel" placeholder="+34 612 345 678"
              value={toNumber} onChange={(e) => setToNumber(e.target.value)}
              style={inputStyle} />
          </div>

          {/* RGPD Consent */}
          <div className="rounded-lg p-3 space-y-2"
            style={{ backgroundColor: T.muted, border: `1px solid ${consentRGPD ? T.success + '40' : T.border}` }}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consentRGPD}
                onChange={(e) => setConsentRGPD(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded"
                style={{ accentColor: T.success }} />
              <div>
                <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: T.fg }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: consentRGPD ? T.success : T.fgMuted }} />
                  El interlocutor ha dado consentimiento para grabar esta llamada (RGPD)
                </span>
              </div>
            </label>
            {!consentRGPD && (
              <p className="text-xs flex items-center gap-1.5 ml-7"
                style={{ color: T.warning }}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Sin consentimiento, la llamada no se grabara
              </p>
            )}
          </div>

          <button type="button" onClick={handleInitiate}
            disabled={initiateMutation.isPending || !selectedLeadId || !selectedPromptId}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: T.cyan, color: T.bg }}>
            {initiateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            Iniciar llamada
          </button>
        </div>

        {/* Panel derecho: Llamada activa */}
        <div className="rounded-xl p-6 space-y-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: T.fg }}>
            {activeCall
              ? <PhoneCall className="w-5 h-5 animate-pulse" style={{ color: T.success }} />
              : <PhoneOff className="w-5 h-5" style={{ color: T.fgMuted }} />}
            {activeCall ? 'Llamada en curso' : 'Sin llamada activa'}
          </h2>

          {activeCall ? (
            <>
              <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: T.fgMuted }}>Call ID:</span>
                  <span className="text-xs" style={{ color: T.fg, fontFamily: "'IBM Plex Mono', monospace" }}>{activeCall.call_id?.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: T.fgMuted }}>Retell ID:</span>
                  <span className="text-xs" style={{ color: T.fg, fontFamily: "'IBM Plex Mono', monospace" }}>{activeCall.retell_call_id?.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: T.fgMuted }}>Estado:</span>
                  <EstadoBadge estado={activeCall.estado} />
                </div>
                {activeCall.simulated && (
                  <p className="text-xs rounded p-2 mt-2"
                    style={{ color: T.warning, backgroundColor: `${T.warning}10` }}>
                    Llamada simulada — Retell AI no configurado
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Resultado</label>
                <div className="grid grid-cols-2 gap-2">
                  {RESULTADOS.map(r => (
                    <button type="button" key={r.value} onClick={() => setResultado(r.value)}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        border: `1px solid ${resultado === r.value ? T.cyan : T.border}`,
                        backgroundColor: resultado === r.value ? `${T.cyan}10` : 'transparent',
                        color: resultado === r.value ? T.cyan : T.fgMuted,
                      }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="call-siguiente" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Siguiente accion</label>
                <input id="call-siguiente" name="siguiente_accion" type="text"
                  placeholder="Enviar propuesta, agendar demo..."
                  value={siguienteAccion} onChange={(e) => setSiguienteAccion(e.target.value)}
                  style={inputStyle} />
              </div>

              <div>
                <label htmlFor="call-notas" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Notas del agente</label>
                <textarea id="call-notas" name="notas_agente" rows={3}
                  placeholder="Notas sobre la llamada..."
                  value={notasAgente} onChange={(e) => setNotasAgente(e.target.value)}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>

              <button type="button" onClick={handleComplete}
                disabled={completeMutation.isPending || !resultado}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: T.success, color: T.bg }}>
                {completeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Completar llamada
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: T.fgMuted }}>
              <Phone className="w-12 h-12 mb-3" />
              <p className="text-sm">Selecciona un lead y un prompt para iniciar una llamada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
