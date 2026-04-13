import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { automationsApi, automationTasksApi } from '@/services/api'
import toast from 'react-hot-toast'
import {
  Zap, Play, Pause, AlertTriangle, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Settings, Activity, BarChart3,
  Mail, Users, CalendarCheck, Bell, GitBranch, FileText,
  MessageSquare, Link2, Search, RefreshCw, Database,
  TrendingUp, Timer, ToggleLeft, ToggleRight,
  ExternalLink
} from 'lucide-react'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'

const inputStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' }

const CATEGORY_META = {
  email_automation: { label: 'Email Automation', icon: Mail, color: 'hsl(210,70%,55%)' },
  leads_captacion: { label: 'Leads & Captacion', icon: Users, color: 'hsl(160,60%,45%)' },
  visitas: { label: 'Visitas', icon: CalendarCheck, color: '#F5820B' },
  acciones_alertas: { label: 'Acciones & Alertas', icon: Bell, color: 'hsl(40,85%,55%)' },
  pipeline: { label: 'Pipeline', icon: GitBranch, color: 'hsl(350,65%,55%)' },
  seguimiento_mensual: { label: 'Seguimiento Mensual', icon: BarChart3, color: T.cyan },
  encuestas: { label: 'Encuestas', icon: MessageSquare, color: 'hsl(330,65%,55%)' },
  integraciones: { label: 'Integraciones', icon: Link2, color: 'hsl(235,60%,60%)' },
}

const STATUS_META = {
  active: { label: 'Activo', icon: Play, color: T.success },
  paused: { label: 'Pausado', icon: Pause, color: T.warning },
  draft: { label: 'Borrador', icon: FileText, color: T.fgMuted },
  error: { label: 'Error', icon: XCircle, color: T.destructive },
  disabled: { label: 'Deshabilitado', icon: Pause, color: T.fgMuted },
}

const IMPL_STATUS_META = {
  pending: { label: 'Pendiente', color: T.fgMuted },
  in_progress: { label: 'En Desarrollo', color: 'hsl(210,70%,55%)' },
  testing: { label: 'Testing', color: T.warning },
  deployed: { label: 'Desplegado', color: T.success },
  failed: { label: 'Fallido', color: T.destructive },
}

const PRIORITY_META = {
  critical: { label: 'Critica', color: T.destructive },
  high: { label: 'Alta', color: 'hsl(25,80%,50%)' },
  medium: { label: 'Media', color: 'hsl(210,70%,55%)' },
  low: { label: 'Baja', color: T.fgMuted },
}

const TRIGGER_META = {
  webhook: { label: 'Webhook', icon: Zap },
  cron: { label: 'Cron', icon: Clock },
  event: { label: 'Evento', icon: Activity },
  manual: { label: 'Manual', icon: Settings },
}

// ─── KPI Card ────────────────────────────────────────────────────

function KpiCard({ label, value, subValue, icon: Icon, color, trend }) {
  return (
    <div className="rounded-xl p-5 hover:shadow-md transition-shadow" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: T.fgMuted, fontFamily: fontDisplay }}>{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: T.fg, fontFamily: fontMono }}>{value}</p>
          {subValue && <p className="text-xs mt-0.5" style={{ color: T.fgMuted }}>{subValue}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" style={{ color: trend >= 0 ? T.success : T.destructive }} />
          <span className="text-xs font-medium" style={{ color: trend >= 0 ? T.success : T.destructive, fontFamily: fontMono }}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs" style={{ color: T.fgMuted }}>vs ayer</span>
        </div>
      )}
    </div>
  )
}

// ─── Automation Row ──────────────────────────────────────────────

function AutomationRow({ automation, onToggle, onSelect }) {
  const sm = STATUS_META[automation.status] || STATUS_META.draft
  const im = IMPL_STATUS_META[automation.impl_status] || IMPL_STATUS_META.pending
  const pm = PRIORITY_META[automation.priority] || PRIORITY_META.medium
  const tm = TRIGGER_META[automation.trigger_type] || TRIGGER_META.manual
  const TriggerIcon = tm.icon

  return (
    <div
      className="group flex items-center gap-4 px-4 py-3 transition-colors cursor-pointer"
      style={{ borderBottom: `1px solid ${T.border}` }}
      onClick={() => onSelect(automation)}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = T.muted}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {/* Status dot */}
      <div className="flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sm.color, ...(automation.status === 'active' ? { animation: 'pulse 2s infinite' } : {}) }} />
      </div>

      {/* Code */}
      <div className="w-16 flex-shrink-0">
        <span className="text-xs font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{automation.code}</span>
      </div>

      {/* Name + Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: T.fg }}>{automation.name}</p>
        <p className="text-xs truncate mt-0.5" style={{ color: T.fgMuted }}>{automation.description}</p>
      </div>

      {/* Trigger */}
      <div className="flex-shrink-0 w-20">
        <div className="flex items-center gap-1 text-xs" style={{ color: T.fgMuted }}>
          <TriggerIcon className="w-3 h-3" />
          <span>{tm.label}</span>
        </div>
      </div>

      {/* Priority */}
      <div className="flex-shrink-0 w-16">
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: pm.color, backgroundColor: `${pm.color}15` }}>{pm.label}</span>
      </div>

      {/* Impl Status */}
      <div className="flex-shrink-0 w-24">
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: im.color, backgroundColor: `${im.color}15` }}>{im.label}</span>
      </div>

      {/* Executions 24h */}
      <div className="flex-shrink-0 w-16 text-right">
        {automation.executions_24h > 0 ? (
          <div className="text-xs">
            <span className="font-medium" style={{ color: T.fg, fontFamily: fontMono }}>{automation.executions_24h}</span>
            <span className="ml-1" style={{ color: T.fgMuted }}>exec</span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: T.fgMuted }}>—</span>
        )}
      </div>

      {/* Success Rate */}
      <div className="flex-shrink-0 w-14 text-right">
        {automation.executions_24h > 0 ? (
          <span className="text-xs font-medium" style={{
            color: automation.success_rate >= 90 ? T.success : automation.success_rate >= 50 ? T.warning : T.destructive,
            fontFamily: fontMono,
          }}>
            {automation.success_rate}%
          </span>
        ) : (
          <span className="text-xs" style={{ color: T.fgMuted }}>—</span>
        )}
      </div>

      {/* Toggle */}
      <div className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); onToggle(automation); }}>
        {automation.is_enabled ? (
          <ToggleRight className="w-6 h-6 cursor-pointer" style={{ color: T.success }} />
        ) : (
          <ToggleLeft className="w-6 h-6 cursor-pointer" style={{ color: T.fgMuted }} />
        )}
      </div>
    </div>
  )
}

// ─── Category Section ────────────────────────────────────────────

function CategorySection({ category, automations, onToggle, onSelect }) {
  const [expanded, setExpanded] = useState(true)
  const meta = CATEGORY_META[category] || { label: category, icon: Zap, color: T.fgMuted }
  const CatIcon = meta.icon
  const activeCount = automations.filter(a => a.status === 'active').length
  const errorCount = automations.filter(a => a.status === 'error').length

  return (
    <div className="rounded-xl overflow-hidden mb-4 transition-all" style={{ border: `1px solid ${meta.color}30` }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors"
        style={{ backgroundColor: `${meta.color}10` }}
      >
        {expanded
          ? <ChevronDown className="w-4 h-4" style={{ color: meta.color }} />
          : <ChevronRight className="w-4 h-4" style={{ color: meta.color }} />}
        <CatIcon className="w-5 h-5" style={{ color: meta.color }} />
        <span className="font-semibold text-sm" style={{ color: meta.color, fontFamily: fontDisplay }}>{meta.label}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full ml-1" style={{ color: meta.color, backgroundColor: `${meta.color}20` }}>{automations.length}</span>
        <div className="flex-1" />
        {activeCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: T.success }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.success }} />
            {activeCount} activas
          </span>
        )}
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-medium ml-3" style={{ color: T.destructive }}>
            <AlertTriangle className="w-3 h-3" />
            {errorCount} error
          </span>
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div style={{ backgroundColor: T.card }}>
          {/* Column headers */}
          <div className="flex items-center gap-4 px-4 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: T.fgMuted, borderBottom: `1px solid ${T.border}` }}>
            <div className="w-2.5" />
            <div className="w-16">ID</div>
            <div className="flex-1">Automatizacion</div>
            <div className="w-20">Trigger</div>
            <div className="w-16">Prioridad</div>
            <div className="w-24">Implementacion</div>
            <div className="w-16 text-right">24h</div>
            <div className="w-14 text-right">Exito</div>
            <div className="w-6" />
          </div>
          {automations.map(a => (
            <AutomationRow key={a.id} automation={a} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Automation Flow Diagram ─────────────────────────────────────

function AutomationFlowDiagram({ automationId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['automation-flow', automationId],
    queryFn: () => automationsApi.flowNodes(automationId).then(r => r.data).catch(() => null),
    enabled: !!automationId,
    staleTime: 120000,
  })

  if (isLoading) return (
    <div>
      <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: T.fgMuted }}>Flujo Visual</h3>
      <div className="rounded-lg p-4" style={{ backgroundColor: T.muted }}>
        <div className="h-12 rounded animate-pulse" style={{ backgroundColor: T.border }} />
      </div>
    </div>
  )

  const nodes = data?.nodes || []
  if (!nodes.length) return null

  const NODE_COLORS = {
    trigger: T.cyan,
    action: T.purple,
    condition: T.warning,
    result: T.success,
    error: T.destructive,
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: T.fgMuted }}>Flujo Visual</h3>
      <div className="rounded-lg p-4" style={{ backgroundColor: T.muted, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', minWidth: 'max-content' }}>
          {nodes.map((n, i) => {
            const color = NODE_COLORS[n.type] || T.fgMuted
            return (
              <div key={n.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  padding: '8px 16px', borderRadius: 8,
                  backgroundColor: `${color}20`,
                  border: `1px solid ${color}40`,
                  minWidth: 100, textAlign: 'center',
                }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color, margin: 0, textTransform: 'uppercase', fontFamily: fontMono }}>
                    {n.type}
                  </p>
                  <p style={{ fontSize: 11, color: T.fg, margin: '4px 0 0' }}>
                    {n.label}
                  </p>
                </div>
                {i < nodes.length - 1 && (
                  <span style={{ color: T.fgMuted, fontSize: 16, flexShrink: 0 }}>→</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Detail Modal ────────────────────────────────────────────────

function AutomationDetail({ automation, onClose, onToggle }) {
  const sm = STATUS_META[automation.status] || STATUS_META.draft
  const im = IMPL_STATUS_META[automation.impl_status] || IMPL_STATUS_META.pending
  const pm = PRIORITY_META[automation.priority] || PRIORITY_META.medium
  const catMeta = CATEGORY_META[automation.category] || { color: T.fgMuted, label: automation.category }

  const { data: executions } = useQuery({
    queryKey: ['automation-executions', automation.id],
    queryFn: () => automationsApi.executions(automation.id, { limit: 10 }).then(r => r.data),
    enabled: !!automation.id,
  })

  // Execute AC-01 mutation
  const executeAC01Mutation = useMutation({
    mutationFn: () => automationTasksApi.executeAC01(),
    onSuccess: (res) => {
      toast.success(`Resumen enviado exitosamente! ${res.data.summary.total} acciones procesadas`)
    },
    onError: (err) => {
      toast.error(`Error: ${err.response?.data?.detail || err.message}`)
    },
  })

  const canExecute = automation.code === 'AC-01' && automation.impl_status === 'deployed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4" style={{ backgroundColor: `${catMeta.color}10`, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: T.muted, color: T.fg, fontFamily: fontMono }}>{automation.code}</span>
              <h2 className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>{automation.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-full text-xs flex items-center gap-1.5" style={{ color: sm.color, backgroundColor: `${sm.color}15` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sm.color }} />
                {sm.label}
              </span>
              {canExecute && (
                <button aria-label="Reproducir"
                  onClick={() => executeAC01Mutation.mutate()}
                  disabled={executeAC01Mutation.isPending}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ backgroundColor: T.purple, color: '#fff' }}
                >
                  <Play className="w-3 h-3" />
                  {executeAC01Mutation.isPending ? 'Ejecutando...' : 'Ejecutar Ahora'}
                </button>
              )}
              <button
                onClick={() => onToggle(automation)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: automation.is_enabled ? `${T.destructive}15` : `${T.success}15`,
                  color: automation.is_enabled ? T.destructive : T.success,
                }}
              >
                {automation.is_enabled ? 'Pausar' : 'Activar'}
              </button>
              <button onClick={onClose} className="text-xl leading-none px-2" style={{ color: T.fgMuted }}>&times;</button>
            </div>
          </div>
          <p className="text-sm mt-2" style={{ color: T.fgMuted }}>{automation.description}</p>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6 space-y-6">
          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg p-3" style={{ backgroundColor: T.muted }}>
              <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Categoria</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: T.fg }}>{catMeta.label}</p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: T.muted }}>
              <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Prioridad</p>
              <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ color: pm.color, backgroundColor: `${pm.color}15` }}>{pm.label}</span>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: T.muted }}>
              <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Implementacion</p>
              <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ color: im.color, backgroundColor: `${im.color}15` }}>{im.label}</span>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: T.muted }}>
              <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Fase / Sprint</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: T.fg }}>{automation.phase?.replace('_', ' ') || '—'} · {automation.sprint || '—'}</p>
            </div>
          </div>

          {/* Trigger config */}
          {automation.trigger_config && (
            <div>
              <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: T.fgMuted }}>Configuracion Trigger</h3>
              <pre className="text-xs rounded-lg p-4 overflow-x-auto" style={{ backgroundColor: T.muted, color: T.cyan, fontFamily: fontMono }}>
                {JSON.stringify(automation.trigger_config, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions description */}
          {automation.actions_description && (
            <div>
              <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: T.fgMuted }}>Flujo de Acciones</h3>
              <div className="rounded-lg p-4" style={{ backgroundColor: T.muted }}>
                <pre className="text-xs whitespace-pre-wrap" style={{ color: T.fg, fontFamily: fontMono }}>{automation.actions_description}</pre>
              </div>
            </div>
          )}

          {/* Automation Flow Diagram */}
          <AutomationFlowDiagram automationId={automation.id} />

          {/* API Endpoints + Integrations */}
          <div className="grid grid-cols-2 gap-4">
            {automation.api_endpoints?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: T.fgMuted }}>API Endpoints</h3>
                <div className="space-y-1">
                  {automation.api_endpoints.map((ep, i) => (
                    <code key={i} className="block text-xs px-2 py-1 rounded" style={{ backgroundColor: T.muted, color: T.fg, fontFamily: fontMono }}>{ep}</code>
                  ))}
                </div>
              </div>
            )}
            {automation.integrations?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: T.fgMuted }}>Integraciones</h3>
                <div className="flex flex-wrap gap-1">
                  {automation.integrations.map((int_name, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ color: T.purple, backgroundColor: `${T.purple}15` }}>{int_name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dependencies */}
          {automation.dependencies?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: T.fgMuted }}>Dependencias</h3>
              <div className="flex gap-1">
                {automation.dependencies.map((dep, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'hsl(25,80%,50%)', backgroundColor: 'hsl(25,80%,50%,0.1)', fontFamily: fontMono }}>{dep}</span>
                ))}
              </div>
            </div>
          )}

          {/* n8n links */}
          {(automation.n8n_workflow_url || automation.n8n_webhook_url) && (
            <div>
              <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: T.fgMuted }}>n8n</h3>
              <div className="flex gap-3">
                {automation.n8n_workflow_url && (
                  <a href={automation.n8n_workflow_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs hover:underline" style={{ color: T.cyan }}>
                    <ExternalLink className="w-3 h-3" /> Ver Workflow
                  </a>
                )}
                {automation.n8n_webhook_url && (
                  <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: T.muted, color: T.fg, fontFamily: fontMono }}>{automation.n8n_webhook_url}</code>
                )}
              </div>
            </div>
          )}

          {/* Execution history */}
          <div>
            <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: T.fgMuted }}>Ultimas Ejecuciones</h3>
            {!executions || executions.length === 0 ? (
              <p className="text-xs rounded-lg p-4 text-center" style={{ color: T.fgMuted, backgroundColor: T.muted }}>Sin ejecuciones registradas</p>
            ) : (
              <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                <table className="w-full text-xs">
                  <thead style={{ backgroundColor: T.muted }}>
                    <tr>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Fecha</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Estado</th>
                      <th className="text-left px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Trigger</th>
                      <th className="text-right px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Items</th>
                      <th className="text-right px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Duracion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map(exec => {
                      const execColor = exec.status === 'success' ? T.success
                        : exec.status === 'error' ? T.destructive
                        : exec.status === 'running' ? T.cyan
                        : T.fgMuted
                      return (
                        <tr key={exec.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td className="px-3 py-2" style={{ color: T.fgMuted }}>
                            {new Date(exec.started_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: execColor, backgroundColor: `${execColor}15` }}>
                              {exec.status}
                            </span>
                          </td>
                          <td className="px-3 py-2" style={{ color: T.fgMuted }}>{exec.trigger_source || '—'}</td>
                          <td className="px-3 py-2 text-right" style={{ color: T.fgMuted, fontFamily: fontMono }}>{exec.items_processed}</td>
                          <td className="px-3 py-2 text-right" style={{ color: T.fgMuted, fontFamily: fontMono }}>{exec.duration_ms ? `${exec.duration_ms}ms` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────

export default function AutomationsPage() {
  const T = useThemeColors()
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterImplStatus, setFilterImplStatus] = useState('')
  const [filterPhase, setFilterPhase] = useState('')
  const [selectedAutomation, setSelectedAutomation] = useState(null)
  const queryClient = useQueryClient()

  // Scheduler status
  const { data: schedulerStatus } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: () => automationTasksApi.schedulerStatus().then(r => r.data).catch(() => null),
    refetchInterval: 60000,
  })

  const { data: stats } = useQuery({
    queryKey: ['automation-stats'],
    queryFn: async () => {
      try {
        return await automationsApi.stats().then(r => r.data)
      } catch (err) {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase.from('automations').select('*')
        return {
          total: data?.length || 0,
          active_count: data?.filter(a => a.status === 'active').length || 0,
          error_count: data?.filter(a => a.status === 'error').length || 0,
          total_executions_24h: 0,
          overall_success_rate: 0,
          estimated_hours_total: data?.reduce((sum, a) => sum + (a.estimated_hours || 0), 0) || 0,
          estimated_hours_completed: data?.filter(a => a.impl_status === 'deployed').reduce((sum, a) => sum + (a.estimated_hours || 0), 0) || 0,
          by_status: {},
          by_category: {},
          by_priority: {},
          by_impl_status: {},
          by_phase: {},
        }
      }
    },
  })

  const { data: automationsData, isLoading } = useQuery({
    queryKey: ['automations', { search, filterPriority, filterImplStatus, filterPhase }],
    queryFn: async () => {
      try {
        return await automationsApi.list({
          page_size: 50,
          ...(search && { search }),
          ...(filterPriority && { priority: filterPriority }),
          ...(filterImplStatus && { impl_status: filterImplStatus }),
          ...(filterPhase && { phase: filterPhase }),
        }).then(r => r.data)
      } catch (err) {
        const { supabase } = await import('@/lib/supabase')
        let query = supabase.from('automations').select('*').order('code')

        if (search) {
          query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`)
        }
        if (filterPriority) query = query.eq('priority', filterPriority)
        if (filterImplStatus) query = query.eq('impl_status', filterImplStatus)
        if (filterPhase) query = query.eq('phase', filterPhase)

        const { data, error } = await query
        if (error) throw error

        return {
          items: data?.map(a => ({
            ...a,
            executions_24h: 0,
            success_rate: 0,
            last_execution: null,
          })) || [],
          total: data?.length || 0,
          page: 1,
          page_size: 50,
          pages: 1,
        }
      }
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (auto) => {
      try {
        return await automationsApi.toggle(auto.id)
      } catch (err) {
        const { supabase } = await import('@/lib/supabase')
        const newStatus = auto.is_enabled ? 'paused' : 'active'
        await supabase.from('automations').update({
          is_enabled: !auto.is_enabled,
          status: newStatus,
        }).eq('id', auto.id)
        return { data: { ...auto, is_enabled: !auto.is_enabled, status: newStatus } }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
      queryClient.invalidateQueries({ queryKey: ['automation-stats'] })
      toast.success('Estado actualizado')
    },
  })

  const seedMutation = useMutation({
    mutationFn: async () => {
      try {
        return await automationsApi.seed()
      } catch (err) {
        toast.error('El backend no esta disponible. Por favor, ejecuta el seed SQL manualmente en Supabase.')
        throw err
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] })
      queryClient.invalidateQueries({ queryKey: ['automation-stats'] })
      toast.success(res?.data?.message || 'Automatizaciones cargadas')
    },
  })

  // Group by category
  const groupedAutomations = useMemo(() => {
    if (!automationsData?.items) return {}
    const groups = {}
    const categoryOrder = ['email_automation', 'leads_captacion', 'visitas', 'acciones_alertas', 'pipeline', 'seguimiento_mensual', 'encuestas', 'integraciones']
    categoryOrder.forEach(cat => { groups[cat] = [] })
    automationsData.items.forEach(a => {
      if (!groups[a.category]) groups[a.category] = []
      groups[a.category].push(a)
    })
    return groups
  }, [automationsData])

  const implProgress = stats ? Math.round((stats.estimated_hours_completed / Math.max(stats.estimated_hours_total, 1)) * 100) : 0

  const phaseColors = {
    phase_1: T.success,
    phase_2: T.warning,
    phase_3: 'hsl(210,70%,55%)',
    phase_4: T.purple,
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg, color: T.fg, fontFamily: fontDisplay }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>Automatizaciones</h1>
          <p className="text-sm mt-0.5" style={{ color: T.fgMuted }}>Gestion completa de workflows n8n</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Scheduler Status Badge */}
          {schedulerStatus && (
            <div className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2" style={{
              backgroundColor: schedulerStatus.running ? `${T.success}15` : T.muted,
              color: schedulerStatus.running ? T.success : T.fgMuted,
              border: `1px solid ${schedulerStatus.running ? `${T.success}30` : T.border}`,
            }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: schedulerStatus.running ? T.success : T.fgMuted }} />
              Scheduler {schedulerStatus.running ? 'Activo' : 'Detenido'}
            </div>
          )}
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}
          >
            <Database className="w-4 h-4" />
            Seed 22 Automations
          </button>
          <button aria-label="Recargar"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['automations'] })}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard label="Total" value={stats?.total || 0} icon={Zap} color={T.purple} />
        <KpiCard label="Activas" value={stats?.active_count || 0} subValue={`de ${stats?.total || 0}`} icon={Play} color={T.success} />
        <KpiCard label="Errores" value={stats?.error_count || 0} icon={AlertTriangle} color={stats?.error_count > 0 ? T.destructive : T.fgMuted} />
        <KpiCard label="Ejecuciones 24h" value={stats?.total_executions_24h || 0} icon={Activity} color={T.cyan} />
        <KpiCard label="Tasa Exito" value={`${stats?.overall_success_rate || 0}%`} icon={CheckCircle2} color={T.success} />
        <KpiCard label="Progreso Impl." value={`${implProgress}%`} subValue={`${stats?.estimated_hours_completed || 0}/${stats?.estimated_hours_total || 0}h`} icon={Timer} color={T.purple} />
      </div>

      {/* Phase progress bar */}
      {stats?.by_phase && Object.keys(stats.by_phase).length > 0 && (
        <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: T.fg, fontFamily: fontDisplay }}>Progreso por Fase</h3>
            <span className="text-xs" style={{ color: T.fgMuted }}>{stats.by_impl_status?.deployed || 0} desplegadas de {stats.total}</span>
          </div>
          <div className="flex gap-2">
            {['phase_1', 'phase_2', 'phase_3', 'phase_4'].map(phase => {
              const count = stats.by_phase?.[phase] || 0
              const phaseLabels = { phase_1: 'Fase 1', phase_2: 'Fase 2', phase_3: 'Fase 3', phase_4: 'Fase 4' }
              return (
                <div key={phase} className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium" style={{ color: T.fgMuted }}>{phaseLabels[phase]}</span>
                    <span className="text-[10px]" style={{ color: T.fgMuted }}>{count}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: T.muted }}>
                    <div className="h-full rounded-full transition-all" style={{ backgroundColor: phaseColors[phase], width: `${count > 0 ? Math.max(10, (count / Math.max(stats.total, 1)) * 100 * 4) : 0}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Scheduler Jobs Widget */}
      {schedulerStatus && schedulerStatus.running && schedulerStatus.jobs && schedulerStatus.jobs.length > 0 && (
        <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: T.card, border: `1px solid ${T.purple}30` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: T.purple }}>
              <Clock className="w-5 h-5 text-gray-800" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: T.fg, fontFamily: fontDisplay }}>Jobs Programados</h3>
              <p className="text-xs" style={{ color: T.fgMuted }}>{schedulerStatus.jobs.length} automatizacion{schedulerStatus.jobs.length !== 1 ? 'es' : ''} activa{schedulerStatus.jobs.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="space-y-2">
            {schedulerStatus.jobs.map(job => (
              <div key={job.id} className="rounded-lg p-3 flex items-center justify-between" style={{ backgroundColor: T.muted }}>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: T.fg }}>{job.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: T.fgMuted, fontFamily: fontMono }}>{job.trigger}</p>
                </div>
                {job.next_run_time && (
                  <div className="text-right">
                    <p className="text-xs" style={{ color: T.fgMuted }}>Proxima ejecucion:</p>
                    <p className="text-sm font-medium" style={{ color: T.purple, fontFamily: fontMono }}>
                      {new Date(job.next_run_time).toLocaleString('es-ES', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.fgMuted }} />
            <input
              id="automation-filter-search"
              aria-label="Buscar por nombre, codigo o descripcion"
              type="text"
              placeholder="Buscar por nombre, codigo o descripcion..."
              style={{ ...inputStyle, paddingLeft: '2.5rem' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select id="automation-filter-priority" aria-label="Filtrar por prioridad" style={{ ...inputStyle, width: 'auto' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">Prioridad</option>
            <option value="critical">Critica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <select id="automation-filter-impl-status" aria-label="Filtrar por estado de implementacion" style={{ ...inputStyle, width: 'auto' }} value={filterImplStatus} onChange={e => setFilterImplStatus(e.target.value)}>
            <option value="">Implementacion</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En Desarrollo</option>
            <option value="testing">Testing</option>
            <option value="deployed">Desplegado</option>
          </select>
          <select id="automation-filter-phase" aria-label="Filtrar por fase" style={{ ...inputStyle, width: 'auto' }} value={filterPhase} onChange={e => setFilterPhase(e.target.value)}>
            <option value="">Fase</option>
            <option value="phase_1">Fase 1</option>
            <option value="phase_2">Fase 2</option>
            <option value="phase_3">Fase 3</option>
            <option value="phase_4">Fase 4</option>
          </select>
          {(search || filterPriority || filterImplStatus || filterPhase) && (
            <button
              onClick={() => { setSearch(''); setFilterPriority(''); setFilterImplStatus(''); setFilterPhase(''); }}
              className="text-xs underline"
              style={{ color: T.fgMuted }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Automations by category */}
      {isLoading ? (
        <div className="text-center py-12" style={{ color: T.fgMuted }}>Cargando automatizaciones...</div>
      ) : Object.entries(groupedAutomations).filter(([_, items]) => items.length > 0).length === 0 ? (
        <div className="text-center py-12">
          <Zap className="w-12 h-12 mx-auto mb-3" style={{ color: T.fgMuted }} />
          <p style={{ color: T.fgMuted }}>No hay automatizaciones</p>
          <p className="text-xs mt-1" style={{ color: T.fgMuted }}>Usa el boton "Seed 22 Automations" para cargar el plan completo</p>
        </div>
      ) : (
        Object.entries(groupedAutomations)
          .filter(([_, items]) => items.length > 0)
          .map(([category, items]) => (
            <CategorySection
              key={category}
              category={category}
              automations={items}
              onToggle={a => toggleMutation.mutate(a)}
              onSelect={setSelectedAutomation}
            />
          ))
      )}

      {/* Detail Modal */}
      {selectedAutomation && (
        <AutomationDetail
          automation={selectedAutomation}
          onClose={() => setSelectedAutomation(null)}
          onToggle={a => { toggleMutation.mutate(a); setSelectedAutomation(null); }}
        />
      )}
    </div>
  )
}
