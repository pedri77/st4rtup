import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Calendar, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Target, Activity, X, MessageSquare, Mail, Users, ClipboardList,
  BarChart3, Shield, Zap, Heart, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { reviewsApi } from '@/services/api'
import { useLeadsSelect } from '@/hooks/useLeadsSelect'
import { SearchWithFilters, FilterSummary } from '@/components/AdvancedFilters'
import { usePersistedFilterSearch } from '@/hooks/usePersistedFilters'
import { useSavedFilterPresets } from '@/hooks/useSavedFilterPresets'
import SavedFilterPresets from '@/components/SavedFilterPresets'
import ExportButton from '@/components/ExportButton'
import { formatDateForExport } from '@/utils/export'
import { ListItemSkeleton } from '@/components/LoadingStates'

const T = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  muted: '#F1F5F9',
  border: '#E2E8F0',
  fg: '#0F172A',
  fgMuted: '#64748B',
  cyan: '#1E6FD9',
  purple: '#F5820B',
  destructive: 'hsl(0,70%,50%)',
  success: 'hsl(150,60%,40%)',
  warning: 'hsl(40,90%,50%)',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' }

const healthColorMap = {
  excellent: T.success,
  good: 'hsl(210,70%,55%)',
  warning: T.warning,
  critical: T.destructive,
}

const healthIcons = {
  excellent: TrendingUp,
  good: CheckCircle2,
  warning: AlertTriangle,
  critical: TrendingDown,
}

const REVIEW_TEMPLATES = [
  { id: 'general', name: 'Review General', icon: ClipboardList, color: T.cyan, description: 'Revision completa del estado de la cuenta: salud, actividades, proximos pasos', fields: { project_status: 'on_track', health_score: 7 }, suggested_actions: ['Revisar KPIs del mes anterior', 'Evaluar satisfaccion del cliente', 'Actualizar plan de cuenta', 'Preparar agenda proxima reunion'] },
  { id: 'onboarding', name: 'Seguimiento Onboarding', icon: Zap, color: T.purple, description: 'Control del proceso de onboarding: implementacion, formacion, adopcion', fields: { project_status: 'on_track', health_score: 6 }, suggested_actions: ['Verificar progreso de implementacion', 'Comprobar formacion de usuarios completada', 'Medir tasa de adopcion de la plataforma', 'Identificar bloqueadores tecnicos', 'Programar sesion de Q&A con usuario final'] },
  { id: 'risk', name: 'Alerta de Riesgo', icon: AlertTriangle, color: T.destructive, description: 'Cuenta en riesgo de churn: problemas detectados, plan de retencion', fields: { project_status: 'at_risk', health_score: 3 }, suggested_actions: ['Contactar de urgencia al sponsor/decision maker', 'Identificar causa raiz de insatisfaccion', 'Proponer plan de accion correctivo con SLAs', 'Ofrecer sesion de soporte premium gratuita', 'Escalar internamente al equipo de Customer Success', 'Evaluar descuento o extension de servicio'] },
  { id: 'upsell', name: 'Oportunidad Upsell/Cross-sell', icon: TrendingUp, color: T.success, description: 'Cliente satisfecho con potencial de expansion: nuevos modulos, usuarios, servicios', fields: { project_status: 'on_track', health_score: 9 }, suggested_actions: ['Presentar modulos complementarios (Growth, B2B, SaaS Best Practices)', 'Proponer ampliacion de usuarios', 'Ofrecer servicios profesionales adicionales', 'Solicitar caso de exito / referencia', 'Explorar necesidades en otras areas de la empresa', 'Preparar propuesta comercial de ampliacion'] },
  { id: 'renewal', name: 'Pre-Renovacion', icon: FileText, color: 'hsl(35,80%,50%)', description: 'Preparacion para renovacion de contrato: valor entregado, negociacion', fields: { project_status: 'on_track', health_score: 7 }, suggested_actions: ['Preparar informe de valor entregado (ROI)', 'Revisar uso de la plataforma y estadisticas', 'Contactar al decisor para tantear renovacion', 'Preparar propuesta de renovacion con mejoras', 'Identificar nuevas normativas aplicables al cliente', 'Negociar terminos de renovacion anticipada'] },
  { id: 'nps', name: 'Seguimiento NPS/CSAT', icon: Heart, color: 'hsl(330,65%,55%)', description: 'Analisis de resultados de encuesta de satisfaccion y plan de mejora', fields: { project_status: 'on_track', health_score: 6 }, suggested_actions: ['Analizar resultados de la encuesta NPS/CSAT', 'Contactar detractores para entender problemas', 'Agradecer a promotores y solicitar referencia', 'Implementar mejoras basadas en feedback', 'Compartir resultados con equipo interno'] },
  { id: 'quarterly', name: 'QBR (Quarterly Business Review)', icon: BarChart3, color: 'hsl(235,60%,60%)', description: 'Revision trimestral estrategica: resultados, roadmap, alineacion de objetivos', fields: { project_status: 'on_track', health_score: 7 }, suggested_actions: ['Preparar presentacion de resultados del trimestre', 'Mostrar roadmap de producto relevante para el cliente', 'Revisar alineacion con objetivos del cliente', 'Discutir expansion y nuevas necesidades', 'Definir OKRs del proximo trimestre', 'Confirmar stakeholders y roles de decision'] },
  { id: 'compliance', name: 'Revision de Cumplimiento', icon: Shield, color: 'hsl(170,50%,45%)', description: 'Estado de cumplimiento normativo: SaaS, Growth, B2B, SaaS Best Practices, EU AI Act', fields: { project_status: 'on_track', health_score: 7 }, suggested_actions: ['Revisar estado de cumplimiento por normativa', 'Verificar evidencias generadas en el periodo', 'Identificar gaps de cumplimiento pendientes', 'Actualizar mapa de riesgos del cliente', 'Preparar para proxima auditoria/certificacion', 'Informar sobre cambios regulatorios recientes'] },
]

export default function ReviewsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const queryClient = useQueryClient()

  const { filters, setFilters, searchQuery, setSearchQuery } = usePersistedFilterSearch('reviews', {
    health_status: { type: 'multiselect', label: 'Estado de Salud', options: [{ value: 'excellent', label: 'Excelente (80-100)' }, { value: 'good', label: 'Bueno (60-79)' }, { value: 'warning', label: 'Advertencia (40-59)' }, { value: 'critical', label: 'Critico (<40)' }], value: [] },
    has_issues: { type: 'multiselect', label: 'Issues', options: [{ value: 'yes', label: 'Con Issues' }, { value: 'no', label: 'Sin Issues' }], value: [] },
    date_range: { type: 'daterange', label: 'Periodo', value: { from: '', to: '' } },
  })

  const filterPresets = useSavedFilterPresets('reviews', filters, searchQuery, ({ filters: loadedFilters, searchQuery: loadedSearch }) => { setFilters(loadedFilters); setSearchQuery(loadedSearch) })

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['monthly-reviews'],
    queryFn: async () => { const res = await reviewsApi.list(); return res.data?.items || res.data || [] },
  })

  const createReview = useMutation({
    mutationFn: (data) => reviewsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['monthly-reviews'] }); toast.success('Review creado correctamente'); setShowCreateModal(false) },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error creando review'),
  })

  const handleFiltersChange = (key, value) => { setFilters({ ...filters, [key]: { ...filters[key], value } }) }

  const getHealthStatus = (score) => {
    if (score >= 80) return 'excellent'
    if (score >= 60) return 'good'
    if (score >= 40) return 'warning'
    return 'critical'
  }

  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!review.lead_name?.toLowerCase().includes(query) && !review.notes?.toLowerCase().includes(query) && !review.summary?.toLowerCase().includes(query)) return false
      }
      if (filters.health_status.value.length > 0) {
        if (!filters.health_status.value.includes(getHealthStatus(review.health_score))) return false
      }
      if (filters.has_issues.value.length > 0) {
        const hasIssues = review.improvements_identified && review.improvements_identified.length > 0
        if (filters.has_issues.value.includes('yes') && !hasIssues) return false
        if (filters.has_issues.value.includes('no') && hasIssues) return false
      }
      if (filters.date_range.value.from || filters.date_range.value.to) {
        const reviewDate = new Date(review.review_year, review.review_month - 1, 1)
        if (filters.date_range.value.from && reviewDate < new Date(filters.date_range.value.from)) return false
        if (filters.date_range.value.to && reviewDate > new Date(filters.date_range.value.to)) return false
      }
      return true
    })
  }, [reviews, searchQuery, filters])

  const sortedReviews = useMemo(() => [...filteredReviews].sort((a, b) => b.review_year !== a.review_year ? b.review_year - a.review_year : b.review_month - a.review_month), [filteredReviews])

  const avgHealthScore = reviews.length > 0 ? Math.round(reviews.reduce((sum, r) => sum + (r.health_score || 0), 0) / reviews.length) : 0
  const criticalCount = reviews.filter(r => getHealthStatus(r.health_score) === 'critical').length
  const totalImprovements = reviews.reduce((sum, r) => sum + (r.improvements_identified?.length || 0), 0)

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg, color: T.fg, fontFamily: fontDisplay }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>Seguimiento Mensual</h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted }}>
            {reviews.length} reviews - Salud promedio: {avgHealthScore}/10 - {criticalCount} criticos
          </p>
        </div>
        <div className="flex gap-3">
          <SavedFilterPresets presets={filterPresets.presets} currentFilters={filters} onSave={filterPresets.savePreset} onLoad={filterPresets.loadPreset} onDelete={filterPresets.deletePreset} onUpdate={filterPresets.updatePreset} onRename={filterPresets.renamePreset} isCurrentPreset={filterPresets.isCurrentPreset} />
          <ExportButton data={reviews || []} filename="reviews" transform={(r) => ({ 'Empresa': r.lead_name || '', 'Periodo': r.period || '', 'Health Score': r.health_score ?? '', 'NPS': r.nps_score ?? '', 'Revenue': r.revenue || '', 'Riesgos': r.risks || '', 'Creado': formatDateForExport(r.created_at) })} size="sm" />
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: T.cyan, color: T.bg }}>
            <Plus className="w-4 h-4" /> Nuevo Review
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Calendar, color: T.purple, value: reviews.length, label: 'Total Reviews' },
          { icon: TrendingUp, color: T.success, value: `${avgHealthScore}/10`, label: 'Salud Promedio' },
          { icon: AlertTriangle, color: T.destructive, value: criticalCount, label: 'Cuentas Criticas' },
          { icon: Target, color: 'hsl(25,80%,50%)', value: totalImprovements, label: 'Mejoras Identificadas' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}20` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{s.value}</p>
                <p className="text-xs" style={{ color: T.fgMuted }}>{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <SearchWithFilters searchValue={searchQuery} onSearchChange={setSearchQuery} placeholder="Buscar reviews por empresa, notas..." filters={filters} onFiltersChange={handleFiltersChange} className="mb-6" />
      <FilterSummary filters={filters} onClear={handleFiltersChange} resultsCount={sortedReviews.length} />

      {/* Review List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <ListItemSkeleton key={i} />)}</div>
      ) : sortedReviews.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <p style={{ color: T.fgMuted }}>No hay reviews que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateReviewModal onClose={() => setShowCreateModal(false)} onSubmit={(data) => createReview.mutate(data)} isLoading={createReview.isPending} />
      )}
    </div>
  )
}

function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false)
  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const getHealthStatus = (score) => {
    if (score >= 8) return 'excellent'
    if (score >= 6) return 'good'
    if (score >= 4) return 'warning'
    return 'critical'
  }

  const statusLabels = { on_track: 'En curso', at_risk: 'En riesgo', delayed: 'Retrasado', completed: 'Completado' }
  const healthStatus = getHealthStatus(review.health_score)
  const hColor = healthColorMap[healthStatus]
  const HealthIcon = healthIcons[healthStatus]
  const activityCount = (review.meetings_held || 0) + (review.emails_sent || 0)

  const healthBorderColor = review.health_score >= 8 ? T.success : review.health_score >= 6 ? 'hsl(210,70%,55%)' : review.health_score >= 4 ? T.warning : T.destructive

  return (
    <div className="rounded-xl p-4 transition-all" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-start gap-4">
        {/* Health Score */}
        <div className="text-center flex-shrink-0">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ border: `4px solid ${healthBorderColor}`, backgroundColor: `${healthBorderColor}15` }}>
            <span className="text-2xl font-bold" style={{ color: healthBorderColor, fontFamily: fontMono }}>{review.health_score}</span>
          </div>
          <p className="text-xs mt-1" style={{ color: T.fgMuted }}>Score</p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold" style={{ color: T.fg }}>{review.lead_name || 'Sin lead'}</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ color: hColor, backgroundColor: `${hColor}15`, border: `1px solid ${hColor}30` }}>
                  <HealthIcon className="w-3 h-3" />
                  {healthStatus === 'excellent' ? 'Excelente' : healthStatus === 'good' ? 'Bueno' : healthStatus === 'warning' ? 'Advertencia' : 'Critico'}
                </span>
                {review.project_status && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ color: T.fgMuted, backgroundColor: T.muted }}>
                    {statusLabels[review.project_status] || review.project_status}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm mb-2" style={{ color: T.fgMuted }}>
                <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{MONTHS[review.review_month - 1]} {review.review_year}</div>
                {activityCount > 0 && <div className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" />{activityCount} actividades</div>}
                {review.meetings_held > 0 && <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{review.meetings_held} reuniones</div>}
                {review.emails_sent > 0 && <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{review.emails_sent} emails</div>}
                {review.improvements_identified?.length > 0 && (
                  <div className="flex items-center gap-1" style={{ color: 'hsl(25,80%,50%)' }}>
                    <AlertTriangle className="w-3.5 h-3.5" />{review.improvements_identified.length} mejoras
                  </div>
                )}
              </div>

              {review.summary && <p className="text-sm line-clamp-2" style={{ color: T.fg }}>{review.summary}</p>}
            </div>

            <button onClick={() => setExpanded(!expanded)} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
              {expanded ? 'Ocultar' : 'Ver mas'}
            </button>
          </div>

          {expanded && (
            <div className="mt-4 pt-4 space-y-4" style={{ borderTop: `1px solid ${T.border}` }}>
              {review.improvements_identified?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: T.fg }}>
                    <AlertTriangle className="w-4 h-4" style={{ color: 'hsl(25,80%,50%)' }} />Mejoras Identificadas
                  </h4>
                  <ul className="space-y-2">
                    {review.improvements_identified.map((item, idx) => (
                      <li key={idx} className="rounded-lg p-3" style={{ backgroundColor: 'hsl(25,80%,50%,0.08)', border: '1px solid hsl(25,80%,50%,0.2)' }}>
                        <p className="text-sm font-medium" style={{ color: 'hsl(25,80%,60%)' }}>{item.title || item}</p>
                        {item.description && <p className="text-xs mt-1" style={{ color: 'hsl(25,80%,50%)' }}>{item.description}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {review.actions_planned?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: T.fg }}>
                    <Target className="w-4 h-4" style={{ color: T.purple }} />Acciones Planificadas
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {review.actions_planned.map((action, idx) => (
                      <li key={idx} className="text-sm" style={{ color: T.fg }}>{typeof action === 'string' ? action : action.description || action.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {review.actions_completed?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: T.fg }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: T.success }} />Acciones Completadas
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {review.actions_completed.map((action, idx) => (
                      <li key={idx} className="text-sm" style={{ color: T.fgMuted }}>{typeof action === 'string' ? action : action.description || action.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {review.client_feedback && (
                <div className="rounded-lg p-3" style={{ backgroundColor: `${T.purple}10`, border: `1px solid ${T.purple}20` }}>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: T.purple }}>
                    <MessageSquare className="w-4 h-4" /> Feedback del cliente
                  </h4>
                  <p className="text-sm" style={{ color: T.fg }}>{review.client_feedback}</p>
                </div>
              )}

              {review.notes && (
                <div>
                  <h4 className="text-sm font-semibold mb-1" style={{ color: T.fg }}>Notas</h4>
                  <p className="text-sm" style={{ color: T.fgMuted }}>{review.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


function CreateReviewModal({ onClose, onSubmit, isLoading }) {
  const { leads } = useLeadsSelect()
  const [step, setStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const now = new Date()

  const [formData, setFormData] = useState({
    lead_id: '', review_month: now.getMonth() + 1, review_year: now.getFullYear(),
    project_status: 'on_track', health_score: 7, summary: '',
    emails_sent: 0, emails_received: 0, meetings_held: 0,
    actions_planned: [], actions_completed: [], improvements_identified: [],
    client_feedback: '', notes: '',
  })

  const [newAction, setNewAction] = useState('')
  const [newImprovement, setNewImprovement] = useState('')

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template)
    setFormData(prev => ({ ...prev, ...template.fields, actions_planned: template.suggested_actions.map(a => ({ description: a })) }))
    setStep(2)
  }

  const handleSubmit = (e) => { e.preventDefault(); if (!formData.lead_id) { toast.error('Selecciona una cuenta'); return }; onSubmit(formData) }

  const addAction = () => { if (!newAction.trim()) return; setFormData(prev => ({ ...prev, actions_planned: [...prev.actions_planned, { description: newAction.trim() }] })); setNewAction('') }
  const removeAction = (idx) => setFormData(prev => ({ ...prev, actions_planned: prev.actions_planned.filter((_, i) => i !== idx) }))
  const addImprovement = () => { if (!newImprovement.trim()) return; setFormData(prev => ({ ...prev, improvements_identified: [...prev.improvements_identified, { title: newImprovement.trim() }] })); setNewImprovement('') }
  const removeImprovement = (idx) => setFormData(prev => ({ ...prev, improvements_identified: prev.improvements_identified.filter((_, i) => i !== idx) }))

  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl w-full max-w-2xl my-8" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>
              {step === 1 ? 'Seleccionar tipo de Review' : `Nuevo Review: ${selectedTemplate?.name || 'Personalizado'}`}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: T.fgMuted }}>
              {step === 1 ? 'Elige el tipo de seguimiento para precargar acciones sugeridas' : 'Completa los detalles del review mensual'}
            </p>
          </div>
          <button aria-label="Cerrar" onClick={onClose} className="p-2 rounded-lg" style={{ color: T.fgMuted }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div style={{ borderBottom: `2px solid ${T.cyan}` }} />

        {step === 1 ? (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REVIEW_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="text-left p-4 rounded-lg transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: `${tmpl.color}10`, border: `1px solid ${tmpl.color}30`, color: tmpl.color }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold text-sm">{tmpl.name}</span>
                    </div>
                    <p className="text-xs opacity-80" style={{ color: T.fgMuted }}>{tmpl.description}</p>
                    <p className="text-xs mt-2 opacity-60" style={{ color: T.fgMuted }}>{tmpl.suggested_actions.length} acciones sugeridas</p>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 text-center">
              <button onClick={() => { setSelectedTemplate(null); setStep(2) }} className="text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
                Crear sin plantilla
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Lead + Period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label htmlFor="review-account" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Cuenta *</label>
                <select id="review-account" value={formData.lead_id} onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })} style={inputStyle} required>
                  <option value="">Seleccionar...</option>
                  {leads?.map(lead => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="review-month" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Mes</label>
                <select id="review-month" value={formData.review_month} onChange={(e) => setFormData({ ...formData, review_month: parseInt(e.target.value) })} style={inputStyle}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="review-year" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Ano</label>
                <select id="review-year" value={formData.review_year} onChange={(e) => setFormData({ ...formData, review_year: parseInt(e.target.value) })} style={inputStyle}>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Status + Health */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="review-status" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Estado del proyecto</label>
                <select id="review-status" value={formData.project_status} onChange={(e) => setFormData({ ...formData, project_status: e.target.value })} style={inputStyle}>
                  <option value="on_track">En curso</option><option value="at_risk">En riesgo</option><option value="delayed">Retrasado</option><option value="completed">Completado</option>
                </select>
              </div>
              <div>
                <label htmlFor="review-health" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Salud: {formData.health_score}/10</label>
                <input id="review-health" type="range" min="1" max="10" value={formData.health_score} onChange={(e) => setFormData({ ...formData, health_score: parseInt(e.target.value) })} className="w-full" style={{ accentColor: T.cyan }} />
                <div className="flex justify-between text-xs" style={{ color: T.fgMuted }}><span>Critico</span><span>Excelente</span></div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label htmlFor="review-summary" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Resumen</label>
              <textarea id="review-summary" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} style={inputStyle} rows={2} placeholder="Resumen ejecutivo del estado de la cuenta..." />
            </div>

            {/* Activity counters */}
            <div className="grid grid-cols-3 gap-4">
              <div><label htmlFor="review-meetings" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Reuniones</label><input id="review-meetings" type="number" min="0" value={formData.meetings_held} onChange={(e) => setFormData({ ...formData, meetings_held: parseInt(e.target.value) || 0 })} style={inputStyle} /></div>
              <div><label htmlFor="review-emails-sent" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Emails enviados</label><input id="review-emails-sent" type="number" min="0" value={formData.emails_sent} onChange={(e) => setFormData({ ...formData, emails_sent: parseInt(e.target.value) || 0 })} style={inputStyle} /></div>
              <div><label htmlFor="review-emails-received" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Emails recibidos</label><input id="review-emails-received" type="number" min="0" value={formData.emails_received} onChange={(e) => setFormData({ ...formData, emails_received: parseInt(e.target.value) || 0 })} style={inputStyle} /></div>
            </div>

            {/* Actions Planned */}
            <div>
              <label htmlFor="review-new-action" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Acciones planificadas ({formData.actions_planned.length})</label>
              <div className="space-y-1.5 mb-2">
                {formData.actions_planned.map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded px-3 py-1.5 text-sm" style={{ backgroundColor: T.muted }}>
                    <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.purple }} />
                    <span className="flex-1" style={{ color: T.fg }}>{action.description}</span>
                    <button aria-label="Cerrar" type="button" onClick={() => removeAction(idx)} style={{ color: T.fgMuted }}><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input id="review-new-action" type="text" value={newAction} onChange={(e) => setNewAction(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAction() } }} style={inputStyle} placeholder="Agregar accion..." />
                <button aria-label="Añadir" type="button" onClick={addAction} className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Improvements */}
            <div>
              <label htmlFor="review-new-improvement" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Mejoras identificadas ({formData.improvements_identified.length})</label>
              <div className="space-y-1.5 mb-2">
                {formData.improvements_identified.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded px-3 py-1.5 text-sm" style={{ backgroundColor: 'hsl(25,80%,50%,0.08)' }}>
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(25,80%,50%)' }} />
                    <span className="flex-1" style={{ color: T.fg }}>{item.title}</span>
                    <button aria-label="Cerrar" type="button" onClick={() => removeImprovement(idx)} style={{ color: T.fgMuted }}><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input id="review-new-improvement" type="text" value={newImprovement} onChange={(e) => setNewImprovement(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImprovement() } }} style={inputStyle} placeholder="Agregar mejora o issue..." />
                <button aria-label="Añadir" type="button" onClick={addImprovement} className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Client Feedback */}
            <div>
              <label htmlFor="review-feedback" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Feedback del cliente</label>
              <textarea id="review-feedback" value={formData.client_feedback} onChange={(e) => setFormData({ ...formData, client_feedback: e.target.value })} style={inputStyle} rows={2} placeholder="Comentarios o feedback del cliente..." />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="review-notes" className="block text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Notas internas</label>
              <textarea id="review-notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={inputStyle} rows={2} placeholder="Notas adicionales..." />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
              <button type="button" onClick={() => setStep(1)} className="text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>Cambiar tipo</button>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>Cancelar</button>
                <button aria-label="Añadir" type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: T.cyan, color: T.bg }} disabled={isLoading}>
                  <Plus className="w-4 h-4" />{isLoading ? 'Creando...' : 'Crear Review'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
