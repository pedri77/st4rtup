import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Bot, Brain, FileText, Heart, Loader2, Play, Clock, AlertTriangle,
  CheckCircle, XCircle, ChevronDown, ChevronUp, ArrowLeft, Zap, Shield
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { agentsApi, leadsApi } from '@/services/api'
import { useQuery as useReactQuery } from '@tanstack/react-query'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const AGENT_ICONS = {
  'AGENT-LEAD-001': Brain,
  'AGENT-QUALIFY-001': Shield,
  'Agente de propuestas': FileText,
  'AGENT-CS-001': Heart,
}

const AGENT_COLORS = {
  'AGENT-LEAD-001': T.cyan,
  'AGENT-QUALIFY-001': T.warning,
  'Agente de propuestas': T.success,
  'AGENT-CS-001': T.purple,
}

function StatusBadge({ status }) {
  const colors = {
    active: { bg: `${T.success}18`, text: T.success },
    disabled: { bg: `${T.fgMuted}18`, text: T.fgMuted },
    error: { bg: `${T.destructive}18`, text: T.destructive },
    maintenance: { bg: `${T.warning}18`, text: T.warning },
  }
  const c = colors[status] || colors.disabled
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.text }}>
      {status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {status}
    </span>
  )
}

function AgentCard({ agent }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = AGENT_ICONS[agent.id] || Bot
  const color = AGENT_COLORS[agent.id] || T.fgMuted

  return (
    <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>{agent.name}</h3>
            <StatusBadge status={agent.status} />
          </div>
          <p className="text-sm" style={{ color: T.fgMuted }}>{agent.description}</p>
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: T.fgMuted }}>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {agent.model}</span>
            <span style={{ fontFamily: fontMono }}>v{agent.version}</span>
            <span style={{ fontFamily: fontMono }}>~${agent.cost_per_run}/run</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5" style={{ color: T.fgMuted }} /> : <ChevronDown className="w-5 h-5" style={{ color: T.fgMuted }} />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-4 border-t" style={{ borderColor: `${T.border}80` }}>
          <p className="text-xs mb-3" style={{ color: T.fgMuted }}>ID: <code style={{ fontFamily: fontMono, color: T.cyan }}>{agent.id}</code></p>

          {agent.id === 'AGENT-LEAD-001' && <LeadScoringPanel />}
          {agent.id === 'AGENT-QUALIFY-001' && <BANTPanel />}
          {agent.id === 'Agente de propuestas' && <ProposalPanel />}
          {agent.id === 'AGENT-CS-001' && <CustomerSuccessPanel />}
        </div>
      )}
    </div>
  )
}

function LeadScoringPanel() {
  const [leadId, setLeadId] = useState('')
  const { data: leadsData } = useReactQuery({
    queryKey: ['leads-select'],
    queryFn: () => leadsApi.list({ page_size: 50 }).then(r => r.data),
  })
  const leads = leadsData?.items || []

  const mutation = useMutation({
    mutationFn: (id) => agentsApi.scoreLeadICP(id).then(r => r.data),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return }
      toast.success(`Score ICP: ${data.icp_score}/100 (Tier ${data.plan})`)
    },
    onError: () => toast.error('Error ejecutando agente'),
  })

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: T.fg }}>Ejecuta scoring ICP sobre un lead específico.</p>
      <div className="flex gap-2">
        <select id="agents-select-1" aria-label="Selector" value={leadId} onChange={(e) => setLeadId(e.target.value)} className="input text-sm flex-1">
          <option value="">Selecciona un lead...</option>
          {leads.map(l => (
            <option key={l.id} value={l.id}>{l.company_name || l.contact_name || l.contact_email} — {l.score || 0}pts</option>
          ))}
        </select>
        <button onClick={() => leadId && mutation.mutate(leadId)} disabled={mutation.isPending || !leadId}
          className="btn-primary text-sm flex items-center gap-1.5">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Ejecutar
        </button>
      </div>
      {mutation.data && !mutation.data.error && (
        <div className="rounded-lg p-3 space-y-1 text-sm" style={{ backgroundColor: `${T.bg}80` }}>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Score ICP</span><span className="font-bold" style={{ fontFamily: fontMono, color: T.fg }}>{mutation.data.icp_score}/100</span></div>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Tier</span><span style={{ color: T.fg }}>{mutation.data.plan}</span></div>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Acción</span><span style={{ color: T.cyan }}>{mutation.data.recommended_action}</span></div>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Frameworks</span><span style={{ color: T.fg }}>{(mutation.data.regulatory_frameworks || []).join(', ')}</span></div>
          {mutation.data.hitl_required && (
            <div className="flex items-center gap-1.5 mt-2" style={{ color: T.warning }}>
              <AlertTriangle className="w-4 h-4" /> HITL requerido: {mutation.data.hitl_reason}
            </div>
          )}
          <p className="text-xs mt-2" style={{ color: T.fgMuted }}>{mutation.data.reasoning}</p>
          <p className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>Modelo: {mutation.data.model_used} | {mutation.data.duration_ms}ms</p>
        </div>
      )}
    </div>
  )
}

function BANTPanel() {
  const [transcript, setTranscript] = useState('')
  const mutation = useMutation({
    mutationFn: (text) => agentsApi.qualifyCall({ transcript: text }).then(r => r.data),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return }
      toast.success(`BANT Score: ${data.bant_score}/100`)
    },
    onError: () => toast.error('Error ejecutando agente'),
  })

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: T.fg }}>Analiza una transcripción de llamada con BANT.</p>
      <textarea id="agents-textarea-4" aria-label="Texto" value={transcript} onChange={(e) => setTranscript(e.target.value)}
        placeholder="Pega la transcripción de la llamada aquí..." rows={4}
        className="input text-sm"
      />
      <button onClick={() => transcript && mutation.mutate(transcript)} disabled={mutation.isPending || !transcript}
        className="btn-primary text-sm flex items-center gap-1.5">
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        Analizar
      </button>
      {mutation.data && !mutation.data.error && (
        <div className="rounded-lg p-3 space-y-1 text-sm" style={{ backgroundColor: `${T.bg}80` }}>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>BANT Score</span><span className="font-bold" style={{ fontFamily: fontMono, color: T.fg }}>{mutation.data.bant_score}/100</span></div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {['budget', 'authority', 'need', 'timeline'].map(k => (
              <div key={k} className="rounded p-2" style={{ backgroundColor: T.muted }}>
                <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>{k}</span>
                <p className="font-medium" style={{ fontFamily: fontMono, color: T.fg }}>{mutation.data[k]?.score || 0}/25</p>
                <p className="text-xs mt-0.5" style={{ color: T.fgMuted }}>{mutation.data[k]?.evidence || ''}</p>
              </div>
            ))}
          </div>
          {mutation.data.objections?.length > 0 && (
            <div className="mt-2">
              <span className="text-xs" style={{ color: T.fgMuted }}>Objeciones:</span>
              <ul className="text-xs mt-1" style={{ color: T.warning }}>{mutation.data.objections.map((o, i) => <li key={i}>• {o}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProposalPanel() {
  const [leadId, setLeadId] = useState('')
  const [notes, setNotes] = useState('')
  const { data: leadsData } = useReactQuery({
    queryKey: ['leads-select'],
    queryFn: () => leadsApi.list({ page_size: 50 }).then(r => r.data),
  })
  const leads = leadsData?.items || []
  const mutation = useMutation({
    mutationFn: () => agentsApi.generateProposal({ lead_id: leadId, notes }).then(r => r.data),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return }
      toast.success('Propuesta generada')
    },
    onError: () => toast.error('Error generando propuesta'),
  })

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: T.fg }}>Genera una propuesta comercial personalizada.</p>
      <select id="agents-select-2" aria-label="Selector" value={leadId} onChange={(e) => setLeadId(e.target.value)} className="input text-sm">
        <option value="">Selecciona un lead...</option>
        {leads.map(l => (
          <option key={l.id} value={l.id}>{l.company_name || l.contact_name} — {l.score || 0}pts</option>
        ))}
      </select>
      <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas adicionales (opcional)" className="input text-sm" />
      <button onClick={() => leadId && mutation.mutate()} disabled={mutation.isPending || !leadId}
        className="btn-primary text-sm flex items-center gap-1.5">
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Generar Propuesta
      </button>
      {mutation.data?.proposal_markdown && (
        <div className="rounded-lg p-4 max-h-96 overflow-y-auto" style={{ backgroundColor: `${T.bg}80` }}>
          <pre className="text-sm whitespace-pre-wrap font-sans" style={{ color: T.fg }}>{mutation.data.proposal_markdown}</pre>
          <p className="text-xs mt-3" style={{ fontFamily: fontMono, color: T.fgMuted }}>Modelo: {mutation.data.model_used} | {mutation.data.duration_ms}ms</p>
        </div>
      )}
    </div>
  )
}

function CustomerSuccessPanel() {
  const [leadId, setLeadId] = useState('')
  const [nps, setNps] = useState('')
  const { data: leadsData } = useReactQuery({
    queryKey: ['leads-select'],
    queryFn: () => leadsApi.list({ page_size: 50 }).then(r => r.data),
  })
  const leads = leadsData?.items || []
  const mutation = useMutation({
    mutationFn: () => agentsApi.analyzeCustomer({
      lead_id: leadId,
      nps_score: nps ? parseInt(nps) : null,
    }).then(r => r.data),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return }
      toast.success(`Health Score: ${data.health_score}/100 (${data.health_status})`)
    },
    onError: () => toast.error('Error ejecutando agente'),
  })

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: T.fg }}>Analiza customer success: NPS, churn, upsell.</p>
      <div className="flex gap-2">
        <select id="agents-select-3" aria-label="Selector" value={leadId} onChange={(e) => setLeadId(e.target.value)} className="input text-sm flex-1">
          <option value="">Selecciona un lead...</option>
          {leads.map(l => (
            <option key={l.id} value={l.id}>{l.company_name || l.contact_name} — {l.score || 0}pts</option>
          ))}
        </select>
        <input type="number" value={nps} onChange={(e) => setNps(e.target.value)}
          placeholder="NPS (0-10)" min={0} max={10} className="input text-sm w-24" />
      </div>
      <button onClick={() => leadId && mutation.mutate()} disabled={mutation.isPending || !leadId}
        className="btn-primary text-sm flex items-center gap-1.5">
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
        Analizar
      </button>
      {mutation.data && !mutation.data.error && (
        <div className="rounded-lg p-3 space-y-1 text-sm" style={{ backgroundColor: `${T.bg}80` }}>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Health Score</span><span className="font-bold" style={{ fontFamily: fontMono, color: T.fg }}>{mutation.data.health_score}/100</span></div>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Estado</span><span style={{ color: mutation.data.health_status === 'healthy' ? T.success : mutation.data.health_status === 'at_risk' ? T.warning : T.destructive }}>{mutation.data.health_status}</span></div>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Churn Risk</span><span style={{ fontFamily: fontMono, color: T.fg }}>{mutation.data.churn_risk}%</span></div>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Expansion</span><span style={{ fontFamily: fontMono, color: T.fg }}>{mutation.data.expansion_potential}%</span></div>
          {mutation.data.recommended_actions?.length > 0 && (
            <div className="mt-2">
              <span className="text-xs" style={{ color: T.fgMuted }}>Acciones:</span>
              <ul className="text-xs mt-1" style={{ color: T.cyan }}>{mutation.data.recommended_actions.map((a, i) => <li key={i}>• [{a.priority}] {a.action}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then(r => r.data.agents),
  })

  const { data: auditData } = useQuery({
    queryKey: ['agents-audit'],
    queryFn: () => agentsApi.audit({ limit: 10 }).then(r => r.data),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/app/dashboard" className="transition-colors hover:opacity-80" style={{ color: T.fgMuted }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
              <Bot className="w-7 h-7" style={{ color: T.cyan }} />
              Agentes IA
            </h1>
          </div>
          <p className="text-sm ml-8" style={{ color: T.fgMuted }}>4 agentes LangGraph para scoring, qualificación, propuestas y customer success.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg px-3 py-2 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <p className="text-lg font-bold" style={{ fontFamily: fontMono, color: T.cyan }}>{agents?.length || 0}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Agentes</p>
          </div>
          <div className="rounded-lg px-3 py-2 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <p className="text-lg font-bold" style={{ fontFamily: fontMono, color: T.success }}>{agents?.filter(a => a.status === 'active').length || 0}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Activos</p>
          </div>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="space-y-3">
        {agents?.map(agent => <AgentCard key={agent.id} agent={agent} />)}
      </div>

      {/* Recent Audit */}
      {auditData?.entries?.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <Clock className="w-4 h-4" style={{ color: T.fgMuted }} /> Ejecuciones Recientes
          </h2>
          <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: T.card, borderColor: T.border }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs" style={{ borderColor: T.border, color: T.fgMuted }}>
                  <th className="text-left p-3" style={{ fontFamily: fontMono }}>Agente</th>
                  <th className="text-left p-3" style={{ fontFamily: fontMono }}>Modelo</th>
                  <th className="text-left p-3" style={{ fontFamily: fontMono }}>Tokens</th>
                  <th className="text-left p-3" style={{ fontFamily: fontMono }}>Duración</th>
                  <th className="text-left p-3" style={{ fontFamily: fontMono }}>Estado</th>
                  <th className="text-left p-3" style={{ fontFamily: fontMono }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {auditData.entries.slice(0, 10).map((entry, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: `${T.border}80` }}>
                    <td className="p-3 text-xs" style={{ fontFamily: fontMono, color: T.cyan }}>{entry.agent_id}</td>
                    <td className="p-3" style={{ color: T.fg }}>{entry.model}</td>
                    <td className="p-3" style={{ fontFamily: fontMono, color: T.fgMuted }}>{entry.tokens_in + entry.tokens_out}</td>
                    <td className="p-3" style={{ fontFamily: fontMono, color: T.fgMuted }}>{entry.duration_ms}ms</td>
                    <td className="p-3">{entry.success ? <CheckCircle className="w-4 h-4" style={{ color: T.success }} /> : <XCircle className="w-4 h-4" style={{ color: T.destructive }} />}</td>
                    <td className="p-3 text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{new Date(entry.timestamp).toLocaleString('es-ES')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
