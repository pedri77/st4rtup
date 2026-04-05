import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Zap, Activity, CheckCircle, XCircle, Clock, Play, Pause,
  RefreshCw, AlertTriangle, Server, ArrowRight, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const STATUS_COLORS = {
  success: T.success,
  error: T.destructive,
  running: T.cyan,
  waiting: T.warning,
  unknown: T.fgMuted,
}

const STATUS_ICONS = {
  success: CheckCircle,
  error: XCircle,
  running: Loader2,
  waiting: Clock,
  unknown: Clock,
}

function KpiCard({ icon: Icon, label, value, sub, color = T.cyan }) {
  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <Icon size={16} color={color} />
        <span style={{ fontSize: 11, color: T.fgMuted, textTransform: 'uppercase', letterSpacing: 1, fontFamily: fontMono }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.fg, fontFamily: fontDisplay }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.fgMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || T.fgMuted
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, fontFamily: fontMono,
      color, backgroundColor: color + '15', border: `1px solid ${color}30`,
    }}>
      {status}
    </span>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}

export default function N8nMonitorPage() {
  const [tab, setTab] = useState('overview')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterWorkflow, setFilterWorkflow] = useState('')

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['n8n', 'health'],
    queryFn: () => api.get('/n8n-monitor/health').then(r => r.data),
    staleTime: 30000,
  })

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['n8n', 'stats'],
    queryFn: () => api.get('/n8n-monitor/stats').then(r => r.data),
    staleTime: 30000,
    enabled: health?.status === 'connected',
  })

  const { data: workflows, refetch: refetchWorkflows } = useQuery({
    queryKey: ['n8n', 'workflows'],
    queryFn: () => api.get('/n8n-monitor/workflows').then(r => r.data),
    staleTime: 30000,
    enabled: health?.status === 'connected' && (tab === 'workflows' || tab === 'overview'),
  })

  const { data: executions, refetch: refetchExecs } = useQuery({
    queryKey: ['n8n', 'executions', filterStatus, filterWorkflow],
    queryFn: () => {
      const params = { limit: 50 }
      if (filterStatus) params.status = filterStatus
      if (filterWorkflow) params.workflow_id = filterWorkflow
      return api.get('/n8n-monitor/executions', { params }).then(r => r.data)
    },
    staleTime: 15000,
    enabled: health?.status === 'connected' && (tab === 'executions' || tab === 'overview'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) =>
      api.post(`/n8n-monitor/workflows/${id}/${active ? 'deactivate' : 'activate'}`),
    onSuccess: (_, { active }) => {
      toast.success(active ? 'Workflow desactivado' : 'Workflow activado')
      refetchWorkflows()
      refetchStats()
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error al cambiar estado'),
  })

  const refreshAll = () => {
    refetchStats()
    refetchWorkflows()
    refetchExecs()
    toast.success('Datos actualizados')
  }

  if (healthLoading) {
    return (
      <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}>
        <Loader2 size={24} className="animate-spin" color={T.cyan} />
      </div>
    )
  }

  if (health?.status !== 'connected') {
    return (
      <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
        <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
          <Server size={48} color={T.fgMuted} style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.fg, fontFamily: fontDisplay, marginBottom: 8 }}>
            n8n no conectado
          </h2>
          <p style={{ color: T.fgMuted, marginBottom: 24 }}>
            {health?.status === 'not_configured'
              ? 'Configura la conexion a n8n en Integraciones > n8n (URL base + API Key).'
              : `Error: ${health?.message || 'No se puede conectar'}`}
          </p>
          <a href="/app/integrations" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', borderRadius: 8,
            backgroundColor: T.cyan, color: '#fff', fontWeight: 600, fontSize: 13, textDecoration: 'none',
          }}>
            Ir a Integraciones <ArrowRight size={14} />
          </a>
        </div>
      </div>
    )
  }

  const s24 = stats?.executions_24h || {}
  const s7d = stats?.executions_7d || {}
  const wfStats = stats?.workflows || {}

  const TABS = [
    { id: 'overview', label: 'Resumen', icon: Activity },
    { id: 'workflows', label: 'Workflows', icon: Zap },
    { id: 'executions', label: 'Ejecuciones', icon: Play },
  ]

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="flex items-center gap-2">
            <Zap size={20} color={T.cyan} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: T.fg, fontFamily: fontDisplay }}>n8n Monitor</h1>
            <span style={{
              padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              color: T.success, backgroundColor: T.success + '15', border: `1px solid ${T.success}30`,
              fontFamily: fontMono,
            }}>CONNECTED</span>
          </div>
          <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 2 }}>{health?.url}</p>
        </div>
        <button onClick={refreshAll} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`,
          backgroundColor: T.card, color: T.fg, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1" style={{ marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            backgroundColor: tab === t.id ? T.cyan : 'transparent',
            color: tab === t.id ? '#fff' : T.fgMuted,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Overview Tab ═══ */}
      {(tab === 'overview') && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
            <KpiCard icon={Zap} label="Workflows" value={wfStats.total || 0} sub={`${wfStats.active || 0} activos`} />
            <KpiCard icon={Play} label="Ejecuciones 24h" value={s24.total || 0} sub={`${s24.success_rate || 0}% exito`} color={T.success} />
            <KpiCard icon={CheckCircle} label="Exitosas 7d" value={s7d.success || 0} sub={`de ${s7d.total || 0} totales`} color={T.success} />
            <KpiCard icon={XCircle} label="Errores 7d" value={s7d.error || 0} sub={s7d.error > 0 ? 'Revisar' : 'Sin errores'} color={s7d.error > 0 ? T.destructive : T.success} />
          </div>

          {/* Running + Top Errors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 24 }}>
            {/* Running / Waiting */}
            <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.fg, fontFamily: fontDisplay, marginBottom: 12 }}>Estado actual</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, color: T.fgMuted }}>En ejecucion</span>
                  <span style={{ fontFamily: fontMono, fontWeight: 600, color: s24.running > 0 ? T.cyan : T.fgMuted }}>{s24.running || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, color: T.fgMuted }}>En espera</span>
                  <span style={{ fontFamily: fontMono, fontWeight: 600, color: s24.waiting > 0 ? T.warning : T.fgMuted }}>{s24.waiting || 0}</span>
                </div>
                <div style={{ height: 1, backgroundColor: T.border }} />
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, color: T.fgMuted }}>Success rate 24h</span>
                  <span style={{
                    fontFamily: fontMono, fontWeight: 700, fontSize: 16,
                    color: (s24.success_rate || 0) >= 90 ? T.success : (s24.success_rate || 0) >= 70 ? T.warning : T.destructive,
                  }}>{s24.success_rate || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, color: T.fgMuted }}>Success rate 7d</span>
                  <span style={{
                    fontFamily: fontMono, fontWeight: 700, fontSize: 16,
                    color: (s7d.success_rate || 0) >= 90 ? T.success : (s7d.success_rate || 0) >= 70 ? T.warning : T.destructive,
                  }}>{s7d.success_rate || 0}%</span>
                </div>
              </div>
            </div>

            {/* Top Errors */}
            <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.fg, fontFamily: fontDisplay, marginBottom: 12 }}>Top errores (7d)</h3>
              {(stats?.top_errors || []).length === 0 ? (
                <div className="flex items-center gap-2" style={{ color: T.success, fontSize: 13 }}>
                  <CheckCircle size={16} /> Sin errores esta semana
                </div>
              ) : (
                <div className="space-y-2">
                  {(stats?.top_errors || []).map((e, i) => (
                    <div key={i} className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: i < stats.top_errors.length - 1 ? `1px solid ${T.muted}` : 'none' }}>
                      <span style={{ fontSize: 12, color: T.fg, maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.workflow}</span>
                      <span style={{ fontFamily: fontMono, fontWeight: 700, color: T.destructive, fontSize: 14 }}>{e.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent executions preview */}
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.fg, fontFamily: fontDisplay }}>Ultimas ejecuciones</h3>
              <button onClick={() => setTab('executions')} style={{ fontSize: 12, color: T.cyan, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Ver todas →
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Workflow</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Estado</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Modo</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Cuando</th>
                  </tr>
                </thead>
                <tbody>
                  {(executions?.items || []).slice(0, 10).map((e) => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${T.muted}` }}>
                      <td style={{ padding: '8px', color: T.fg, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.workflow_name}</td>
                      <td style={{ padding: '8px' }}><StatusBadge status={e.status} /></td>
                      <td style={{ padding: '8px', color: T.fgMuted, fontFamily: fontMono }}>{e.mode || '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: T.fgMuted, fontFamily: fontMono }}>{timeAgo(e.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!executions?.items || executions.items.length === 0) && (
                <p style={{ textAlign: 'center', padding: 20, color: T.fgMuted, fontSize: 13 }}>Sin ejecuciones recientes</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ Workflows Tab ═══ */}
      {tab === 'workflows' && (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.fg, fontFamily: fontDisplay, marginBottom: 16 }}>
            Workflows ({workflows?.total || 0})
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Nombre</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Tags</th>
                  <th style={{ textAlign: 'center', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Nodos</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Actualizado</th>
                  <th style={{ textAlign: 'center', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {(workflows?.items || []).map((w) => (
                  <tr key={w.id} style={{ borderBottom: `1px solid ${T.muted}` }}>
                    <td style={{ padding: '10px 8px', color: T.fg, fontWeight: 500 }}>{w.name}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: fontMono,
                        color: w.active ? T.success : T.fgMuted,
                        backgroundColor: w.active ? T.success + '15' : T.muted,
                      }}>
                        {w.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div className="flex flex-wrap gap-1">
                        {(w.tags || []).map((tag, i) => (
                          <span key={i} style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, backgroundColor: T.muted, color: T.fgMuted }}>{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: fontMono, color: T.fgMuted }}>{w.nodes_count}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: T.fgMuted, fontFamily: fontMono, fontSize: 11 }}>{timeAgo(w.updated_at)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleMutation.mutate({ id: w.id, active: w.active })}
                        disabled={toggleMutation.isPending}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
                          backgroundColor: T.card, color: w.active ? T.warning : T.success,
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {w.active ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Activar</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Executions Tab ═══ */}
      {tab === 'executions' && (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
          <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.fg, fontFamily: fontDisplay }}>
              Ejecuciones ({executions?.total || 0})
            </h3>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12, backgroundColor: T.muted, color: T.fg }}
              >
                <option value="">Todos los estados</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="running">Running</option>
                <option value="waiting">Waiting</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Workflow</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Modo</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Inicio</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: T.fgMuted, fontWeight: 600, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>Fin</th>
                </tr>
              </thead>
              <tbody>
                {(executions?.items || []).map((e) => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${T.muted}` }}>
                    <td style={{ padding: '8px', fontFamily: fontMono, color: T.fgMuted, fontSize: 11 }}>#{e.id}</td>
                    <td style={{ padding: '8px', color: T.fg, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.workflow_name}</td>
                    <td style={{ padding: '8px' }}><StatusBadge status={e.status} /></td>
                    <td style={{ padding: '8px', color: T.fgMuted, fontFamily: fontMono }}>{e.mode || '—'}</td>
                    <td style={{ padding: '8px', color: T.fgMuted, fontFamily: fontMono, fontSize: 11 }}>{timeAgo(e.started_at)}</td>
                    <td style={{ padding: '8px', color: T.fgMuted, fontFamily: fontMono, fontSize: 11 }}>{timeAgo(e.finished_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!executions?.items || executions.items.length === 0) && (
              <p style={{ textAlign: 'center', padding: 20, color: T.fgMuted, fontSize: 13 }}>Sin ejecuciones</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
