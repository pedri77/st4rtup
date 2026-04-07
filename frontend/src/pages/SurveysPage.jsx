import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Star, ThumbsUp, MessageSquare, TrendingUp, BarChart3, Calendar,
  Send, Edit3, Trash2, X, ExternalLink, Loader2, Check, Eye, PieChart,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import toast from 'react-hot-toast'
import { surveysApi } from '@/services/api'
import { useLeadsSelect } from '@/hooks/useLeadsSelect'
import { mockSurveys, mockDelay, USE_MOCK_DATA } from '@/mocks/mockData'
import { SearchWithFilters, FilterSummary } from '@/components/AdvancedFilters'
import { usePersistedFilterSearch } from '@/hooks/usePersistedFilters'
import ExportButton from '@/components/ExportButton'
import { ListItemSkeleton } from '@/components/LoadingStates'

/* ── Design tokens ─────────────────────────────────────────────────── */
const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}

/* ── Constants ─────────────────────────────────────────────────────── */
const SURVEY_TYPES = [
  { value: 'nps', label: 'NPS (Net Promoter Score)', description: '0-10' },
  { value: 'csat', label: 'CSAT (Customer Satisfaction)', description: '1-5 estrellas' },
  { value: 'onboarding', label: 'Onboarding', description: 'Post-implementacion' },
  { value: 'quarterly', label: 'Trimestral', description: 'Seguimiento periodico' },
  { value: 'custom', label: 'Personalizada', description: 'Preguntas propias' },
]

const SURVEY_PROVIDERS = [
  { value: '', label: 'Sin proveedor (interna)' },
  { value: 'typeform', label: 'Typeform' },
  { value: 'google_forms', label: 'Google Forms' },
  { value: 'surveymonkey', label: 'SurveyMonkey' },
  { value: 'tally', label: 'Tally' },
  { value: 'jotform', label: 'JotForm' },
  { value: 'survicate', label: 'Survicate' },
  { value: 'hotjar', label: 'Hotjar' },
]

const STATUS_LABELS = {
  draft: { label: 'Borrador', color: T.fgMuted },
  sent: { label: 'Enviada', color: 'hsl(210,70%,55%)' },
  completed: { label: 'Completada', color: T.success },
  expired: { label: 'Expirada', color: T.destructive },
}

const surveyTypeConfig = {
  nps: { label: 'NPS', icon: TrendingUp, color: T.purple },
  csat: { label: 'CSAT', icon: ThumbsUp, color: 'hsl(210,70%,55%)' },
  onboarding: { label: 'Onboarding', icon: Check, color: 'hsl(170,60%,45%)' },
  quarterly: { label: 'Trimestral', icon: Calendar, color: T.warning },
  custom: { label: 'Personalizada', icon: MessageSquare, color: T.fgMuted },
}

const getNPSCategory = (score) => {
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

const formatDate = (dateStr) => {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

const NPS_COLORS = { promoters: '#22c55e', passives: '#eab308', detractors: '#ef4444' }
const CSAT_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']
const CHART_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899']

/* ── KPI Card ──────────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, iconColor, value, label }) {
  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div style={{ backgroundColor: `${iconColor}15` }} className="w-10 h-10 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        <div>
          <p style={{ fontFamily: fontMono, color: T.fg }} className="text-2xl font-bold">{value}</p>
          <p style={{ color: T.fgMuted }} className="text-xs">{label}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────────── */
export default function SurveysPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState(null)
  const [detailSurvey, setDetailSurvey] = useState(null)
  const [respondSurvey, setRespondSurvey] = useState(null)
  const [activeTab, setActiveTab] = useState('list')

  const {
    filters, setFilters, searchQuery, setSearchQuery,
  } = usePersistedFilterSearch('surveys', {
    survey_type: {
      type: 'multiselect', label: 'Tipo de Encuesta',
      options: SURVEY_TYPES.map(t => ({ value: t.value, label: t.label })),
      value: [],
    },
    status: {
      type: 'multiselect', label: 'Estado',
      options: [
        { value: 'draft', label: 'Borrador' }, { value: 'sent', label: 'Enviada' },
        { value: 'completed', label: 'Completada' }, { value: 'expired', label: 'Expirada' },
      ],
      value: [],
    },
    date_range: { type: 'daterange', label: 'Fecha', value: { from: '', to: '' } },
  })

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn: async () => {
      if (USE_MOCK_DATA) { await mockDelay(600); return mockSurveys.items }
      try { return await surveysApi.list().then(r => r.data.items || r.data || []) }
      catch { await mockDelay(400); return mockSurveys.items }
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['surveys-stats'],
    queryFn: async () => {
      if (USE_MOCK_DATA) return mockSurveys.stats
      try { return await surveysApi.stats().then(r => r.data) } catch { return null }
    },
  })

  const createMutation = useMutation({
    mutationFn: (data) => surveysApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['surveys-stats'] })
      setShowModal(false); toast.success('Encuesta creada')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error creando encuesta'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => surveysApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['surveys-stats'] })
      setEditingSurvey(null); toast.success('Encuesta actualizada')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error actualizando'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => surveysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['surveys-stats'] })
      toast.success('Encuesta eliminada')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error eliminando'),
  })

  const sendMutation = useMutation({
    mutationFn: ({ id, data }) => surveysApi.send(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['surveys-stats'] })
      toast.success('Encuesta enviada por email')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error enviando'),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, data }) => surveysApi.respond(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['surveys-stats'] })
      setRespondSurvey(null); toast.success('Respuesta registrada')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error registrando respuesta'),
  })

  const handleFiltersChange = (key, value) => {
    setFilters({ ...filters, [key]: { ...filters[key], value } })
  }

  const filteredSurveys = useMemo(() => {
    return surveys.filter(survey => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match = survey.title?.toLowerCase().includes(q) ||
          survey.lead_name?.toLowerCase().includes(q) ||
          survey.notes?.toLowerCase().includes(q)
        if (!match) return false
      }
      if (filters.survey_type.value.length > 0) {
        if (!filters.survey_type.value.includes(survey.survey_type || survey.type)) return false
      }
      if (filters.status.value.length > 0) {
        if (!filters.status.value.includes(survey.status)) return false
      }
      if (filters.date_range.value.from || filters.date_range.value.to) {
        const d = new Date(survey.completed_at || survey.created_at)
        if (filters.date_range.value.from && d < new Date(filters.date_range.value.from)) return false
        if (filters.date_range.value.to && d > new Date(filters.date_range.value.to)) return false
      }
      return true
    })
  }, [surveys, searchQuery, filters])

  const sortedSurveys = useMemo(() => {
    return [...filteredSurveys].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [filteredSurveys])

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['surveys-analytics'],
    queryFn: async () => {
      try { return await surveysApi.analytics(12).then(r => r.data) } catch { return null }
    },
    enabled: activeTab === 'analytics',
  })

  const completedSurveys = surveys.filter(s => s.status === 'completed')
  const npsSurveys = completedSurveys.filter(s => (s.survey_type || s.type) === 'nps' && (s.nps_score ?? s.score) != null)
  const promotersCount = npsSurveys.filter(s => getNPSCategory(s.nps_score ?? s.score) === 'promoter').length
  const detractorsCount = npsSurveys.filter(s => getNPSCategory(s.nps_score ?? s.score) === 'detractor').length
  const npsScore = stats?.nps_score ?? (npsSurveys.length > 0
    ? Math.round(((promotersCount - detractorsCount) / npsSurveys.length) * 100) : 0)
  const csatSurveys = completedSurveys.filter(s => (s.survey_type || s.type) === 'csat' && (s.overall_score ?? s.score) != null)
  const csatAvg = stats?.csat_average ?? (csatSurveys.length > 0
    ? csatSurveys.reduce((sum, s) => sum + (s.overall_score ?? s.score), 0) / csatSurveys.length : 0)
  const responseRate = stats?.response_rate ?? (surveys.length > 0
    ? Math.round((completedSurveys.length / surveys.length) * 100) : 0)

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-3xl font-bold tracking-tight">Encuestas</h1>
          <p style={{ color: T.fgMuted }} className="text-sm mt-1">
            {surveys.length} total · {completedSurveys.length} completadas · NPS {npsScore} · Tasa respuesta {responseRate}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={surveys || []} filename="encuestas"
            transform={(s) => ({
              'Titulo': s.title, 'Tipo': s.survey_type || s.type || '', 'Estado': s.status,
              'NPS': s.nps_score ?? '', 'CSAT': s.overall_score ?? '', 'Lead': s.lead_name || '',
              'Notas': s.notes || '', 'Creado': formatDate(s.created_at), 'Completado': formatDate(s.completed_at),
            })}
            size="sm"
          />
          <button
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: T.cyan, color: T.bg }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Nueva Encuesta
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={TrendingUp} iconColor={T.purple} value={npsScore} label="NPS Score" />
        <KpiCard icon={ThumbsUp} iconColor="hsl(210,70%,55%)" value={`${Number(csatAvg).toFixed(1)}/5`} label="CSAT Promedio" />
        <KpiCard icon={Star} iconColor={T.success} value={stats?.nps_promoters ?? promotersCount} label="Promotores" />
        <KpiCard icon={BarChart3} iconColor={T.warning} value={completedSurveys.length} label="Completadas" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ backgroundColor: T.muted }}>
        {['list', 'analytics'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab ? `${T.cyan}20` : 'transparent',
              color: activeTab === tab ? T.cyan : T.fgMuted,
            }}
          >
            {tab === 'analytics' && <PieChart className="w-4 h-4" />}
            {tab === 'list' ? 'Encuestas' : 'Analytics'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'list' ? (
        <>
          <SearchWithFilters
            searchValue={searchQuery} onSearchChange={setSearchQuery}
            placeholder="Buscar encuestas por titulo, empresa, notas..."
            filters={filters} onFiltersChange={handleFiltersChange} className="mb-6"
          />
          <FilterSummary filters={filters} onClear={handleFiltersChange} resultsCount={sortedSurveys.length} />

          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <ListItemSkeleton key={i} />)}</div>
          ) : sortedSurveys.length === 0 ? (
            <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl text-center py-12">
              <p style={{ color: T.fgMuted }}>No hay encuestas que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSurveys.map((survey) => (
                <SurveyCard
                  key={survey.id} survey={survey}
                  onEdit={() => setEditingSurvey(survey)}
                  onDelete={() => { if (confirm('\u00bfEliminar esta encuesta?')) deleteMutation.mutate(survey.id) }}
                  onSend={() => sendMutation.mutate({ id: survey.id, data: {} })}
                  onRespond={() => setRespondSurvey(survey)}
                  onDetail={() => setDetailSurvey(survey)}
                  sending={sendMutation.isPending}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <AnalyticsDashboard analytics={analytics} loading={analyticsLoading} />
      )}

      {/* Modals */}
      {showModal && (
        <SurveyFormModal onClose={() => setShowModal(false)}
          onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
      )}
      {editingSurvey && (
        <SurveyFormModal survey={editingSurvey} onClose={() => setEditingSurvey(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingSurvey.id, data })} isLoading={updateMutation.isPending} />
      )}
      {respondSurvey && (
        <RespondModal survey={respondSurvey} onClose={() => setRespondSurvey(null)}
          onSubmit={(data) => respondMutation.mutate({ id: respondSurvey.id, data })} isLoading={respondMutation.isPending} />
      )}
      {detailSurvey && <DetailModal survey={detailSurvey} onClose={() => setDetailSurvey(null)} />}
    </div>
  )
}


/* ── Analytics Dashboard ───────────────────────────────────────────── */

function AnalyticsDashboard({ analytics, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl text-center py-12">
        <BarChart3 className="w-12 h-12 mx-auto mb-3" style={{ color: T.fgMuted }} />
        <p style={{ color: T.fgMuted }}>No hay datos de analytics disponibles</p>
        <p style={{ color: T.fgMuted }} className="text-xs mt-1">Completa encuestas para ver estadisticas</p>
      </div>
    )
  }

  const npsDistribution = analytics.nps_distribution || { promoters: 0, passives: 0, detractors: 0 }
  const npsTotal = npsDistribution.promoters + npsDistribution.passives + npsDistribution.detractors
  const npsPieData = [
    { name: 'Promotores', value: npsDistribution.promoters, color: NPS_COLORS.promoters },
    { name: 'Pasivos', value: npsDistribution.passives, color: NPS_COLORS.passives },
    { name: 'Detractores', value: npsDistribution.detractors, color: NPS_COLORS.detractors },
  ].filter(d => d.value > 0)

  const csatDistribution = analytics.csat_distribution || {}
  const csatBarData = [1, 2, 3, 4, 5].map(n => ({
    name: `${n}`,
    value: csatDistribution[n] || 0,
    fill: CSAT_COLORS[n - 1],
  }))

  const monthlyTrends = analytics.monthly_trends || []
  const recentFeedback = analytics.recent_feedback || []

  const npsScoreCalc = npsTotal > 0
    ? Math.round(((npsDistribution.promoters - npsDistribution.detractors) / npsTotal) * 100)
    : null

  const tooltipStyle = { backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '8px' }

  return (
    <div className="space-y-6">
      {monthlyTrends.length > 0 && (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl p-5">
          <h3 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-base font-semibold mb-4">Tendencia NPS y CSAT (12 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="month" stroke={T.fgMuted} tick={{ fontSize: 12 }} />
              <YAxis yAxisId="nps" stroke={T.fgMuted} tick={{ fontSize: 12 }} domain={[-100, 100]} />
              <YAxis yAxisId="csat" orientation="right" stroke={T.fgMuted} tick={{ fontSize: 12 }} domain={[0, 5]} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.fg }} />
              <Legend />
              <Line yAxisId="nps" type="monotone" dataKey="nps_score" name="NPS Score" stroke={T.purple} strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="csat" type="monotone" dataKey="csat_avg" name="CSAT Promedio" stroke={T.cyan} strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="nps" type="monotone" dataKey="total_responses" name="Respuestas" stroke={T.fgMuted} strokeWidth={1} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NPS Distribution */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-base font-semibold">Distribucion NPS</h3>
            {npsScoreCalc !== null && (
              <span className="text-2xl font-bold" style={{
                fontFamily: fontMono,
                color: npsScoreCalc >= 50 ? T.success : npsScoreCalc >= 0 ? T.warning : T.destructive,
              }}>
                {npsScoreCalc}
              </span>
            )}
          </div>
          {npsPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <RechartsPie>
                  <Pie data={npsPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {npsPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} respuestas`, '']} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                {npsPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span style={{ color: T.fgMuted }}>{d.name}</span>
                    <span style={{ color: T.fg }} className="font-medium">{d.value}</span>
                    {npsTotal > 0 && <span style={{ color: T.fgMuted }}>({Math.round(d.value / npsTotal * 100)}%)</span>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: T.fgMuted }} className="text-center py-8">Sin datos NPS</p>
          )}
        </div>

        {/* CSAT Distribution */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl p-5">
          <h3 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-base font-semibold mb-4">Distribucion CSAT</h3>
          {csatBarData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={csatBarData}>
                <defs>
                  <linearGradient id="gradCsat1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="gradCsat2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F97316" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#F97316" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="gradCsat3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EAB308" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#EAB308" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="gradCsat4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="gradCsat5" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="name" stroke={T.fgMuted} tick={{ fontSize: 12 }} />
                <YAxis stroke={T.fgMuted} tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.fg }} formatter={(value) => [`${value} respuestas`, '']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {csatBarData.map((entry, i) => <Cell key={i} fill={`url(#gradCsat${i + 1})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: T.fgMuted }} className="text-center py-8">Sin datos CSAT</p>
          )}
        </div>
      </div>

      {/* Recent Feedback */}
      {recentFeedback.length > 0 && (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl p-5">
          <h3 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-base font-semibold mb-4">Feedback Reciente</h3>
          <div className="space-y-3">
            {recentFeedback.map((fb, i) => (
              <div key={i} style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }} className="p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ color: T.fg }} className="text-sm font-medium">{fb.lead_name || 'Anonimo'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      color: fb.survey_type === 'nps' ? T.purple : 'hsl(210,70%,55%)',
                      backgroundColor: `${fb.survey_type === 'nps' ? T.purple : 'hsl(210,70%,55%)'}15`,
                    }}>
                      {fb.survey_type === 'nps' ? 'NPS' : 'CSAT'}
                    </span>
                    {fb.score != null && (
                      <span style={{ color: T.fgMuted }} className="text-xs">
                        Puntuacion: <strong style={{ color: T.fg }}>{fb.score}</strong>
                      </span>
                    )}
                  </div>
                  <span style={{ color: T.fgMuted }} className="text-xs">{formatDate(fb.completed_at)}</span>
                </div>
                <p style={{ color: T.fg }} className="text-sm opacity-80">{fb.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


/* ── Survey Card ───────────────────────────────────────────────────── */

function SurveyCard({ survey, onEdit, onDelete, onSend, onRespond, onDetail, sending }) {
  const type = survey.survey_type || survey.type || 'custom'
  const config = surveyTypeConfig[type] || surveyTypeConfig.custom
  const TypeIcon = config.icon
  const status = STATUS_LABELS[survey.status] || STATUS_LABELS.draft
  const score = survey.nps_score ?? survey.overall_score ?? survey.score

  return (
    <div
      style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
      className="rounded-xl p-4 hover:brightness-110 transition-all"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <TypeIcon className="w-5 h-5" style={{ color: config.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 style={{ color: T.fg }} className="font-semibold text-sm">{survey.title || survey.lead_name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: config.color, backgroundColor: `${config.color}15` }}>
                  {config.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: status.color, backgroundColor: `${status.color}15` }}>
                  {status.label}
                </span>
                {survey.external_provider && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: T.purple, backgroundColor: `${T.purple}15` }}>
                    {SURVEY_PROVIDERS.find(p => p.value === survey.external_provider)?.label || survey.external_provider}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm mb-2" style={{ color: T.fgMuted }}>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(survey.created_at)}
                </span>
                {survey.sent_at && <span>Enviada: {formatDate(survey.sent_at)}</span>}
                {survey.completed_at && <span>Completada: {formatDate(survey.completed_at)}</span>}
              </div>

              {survey.status === 'completed' && score != null && (
                <div className="mb-2">
                  {type === 'nps' ? <NPSScoreDisplay score={score} />
                    : type === 'csat' ? <CSATScoreDisplay score={score} />
                    : <span style={{ color: T.fg }} className="text-sm">Puntuacion: <strong>{score}</strong></span>}
                </div>
              )}

              {(survey.notes || survey.feedback) && (
                <div style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }} className="rounded-lg p-2.5 mt-2">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: T.fgMuted }} />
                    <p style={{ color: T.fg }} className="text-sm line-clamp-2 opacity-80">{survey.notes || survey.feedback}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={onDetail} className="p-1.5 transition-colors" style={{ color: T.fgMuted }} title="Ver detalle">
                <Eye className="w-4 h-4" />
              </button>
              {survey.status !== 'completed' && (
                <>
                  <button onClick={onSend} disabled={sending} className="p-1.5 transition-colors" style={{ color: T.fgMuted }} title="Enviar por email">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                  <button onClick={onRespond} className="p-1.5 transition-colors" style={{ color: T.fgMuted }} title="Registrar respuesta">
                    <Check className="w-4 h-4" />
                  </button>
                </>
              )}
              <button onClick={onEdit} className="p-1.5 transition-colors" style={{ color: T.fgMuted }} title="Editar">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-1.5 transition-colors" style={{ color: T.fgMuted }} title="Eliminar">
                <Trash2 className="w-4 h-4" />
              </button>
              {survey.external_survey_url && (
                <a href={survey.external_survey_url} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 transition-colors" style={{ color: T.fgMuted }} title="Abrir encuesta externa">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


/* ── Score Displays ────────────────────────────────────────────────── */

function NPSScoreDisplay({ score }) {
  const category = getNPSCategory(score)
  const colorMap = { promoter: T.success, passive: T.warning, detractor: T.destructive }
  const labelMap = { promoter: 'Promotor', passive: 'Pasivo', detractor: 'Detractor' }
  const c = colorMap[category]

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
        style={{ border: `3px solid ${c}`, backgroundColor: `${c}15`, color: c }}
      >
        {score}
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: c, backgroundColor: `${c}15` }}>
        {labelMap[category]}
      </span>
    </div>
  )
}

function CSATScoreDisplay({ score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4" style={{
            color: i < score ? T.warning : T.fgMuted,
            fill: i < score ? T.warning : 'none',
          }} />
        ))}
      </div>
      <span style={{ color: T.fg, fontFamily: fontMono }} className="text-sm font-semibold">{score}/5</span>
    </div>
  )
}


/* ── Create/Edit Modal ─────────────────────────────────────────────── */

function SurveyFormModal({ survey, onClose, onSubmit, isLoading }) {
  const { leads } = useLeadsSelect()
  const isEdit = !!survey

  const [formData, setFormData] = useState({
    lead_id: survey?.lead_id || '',
    title: survey?.title || '',
    survey_type: survey?.survey_type || survey?.type || 'nps',
    notes: survey?.notes || '',
    expires_at: survey?.expires_at ? survey.expires_at.slice(0, 16) : '',
    external_provider: survey?.external_provider || '',
    external_survey_id: survey?.external_survey_id || '',
    external_survey_url: survey?.external_survey_url || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isEdit && !formData.lead_id) return toast.error('Selecciona un lead')
    if (!formData.title) return toast.error('Introduce un titulo')
    const payload = { ...formData }
    if (!payload.expires_at) delete payload.expires_at
    if (!payload.external_provider) {
      delete payload.external_provider; delete payload.external_survey_id; delete payload.external_survey_url
    }
    if (isEdit) delete payload.lead_id
    onSubmit(payload)
  }

  const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }))

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-xl font-bold">{isEdit ? 'Editar Encuesta' : 'Nueva Encuesta'}</h2>
          <button aria-label="Cerrar" onClick={onClose} style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
        </div>
        <div style={{ borderBottom: `2px solid ${T.cyan}` }} className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div>
              <label htmlFor="survey-lead" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Lead <span style={{ color: T.destructive }}>*</span></label>
              <select id="survey-lead" value={formData.lead_id} onChange={(e) => set('lead_id', e.target.value)} style={inputStyle} required>
                <option value="">Selecciona un lead...</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="survey-title" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Titulo <span style={{ color: T.destructive }}>*</span></label>
            <input id="survey-title" type="text" value={formData.title} onChange={(e) => set('title', e.target.value)}
              style={inputStyle} placeholder="Ej: Encuesta NPS Q1 2026" required />
          </div>

          <div>
            <label htmlFor="survey-type" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Tipo de encuesta</label>
            <select id="survey-type" value={formData.survey_type} onChange={(e) => set('survey_type', e.target.value)} style={inputStyle}>
              {SURVEY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} ({t.description})</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="survey-external-provider" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Proveedor de encuesta</label>
            <select id="survey-external-provider" value={formData.external_provider} onChange={(e) => set('external_provider', e.target.value)} style={inputStyle}>
              {SURVEY_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {formData.external_provider && (
            <div style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }} className="space-y-3 p-3 rounded-lg">
              <p style={{ color: T.fgMuted }} className="text-xs">
                Configura la URL de tu encuesta en {SURVEY_PROVIDERS.find(p => p.value === formData.external_provider)?.label}.
                Las respuestas se recibiran automaticamente via webhook.
              </p>
              <div>
                <label htmlFor="survey-external-id" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">ID de encuesta externa</label>
                <input id="survey-external-id" type="text" value={formData.external_survey_id}
                  onChange={(e) => set('external_survey_id', e.target.value)} style={inputStyle} placeholder="Ej: abc123" />
              </div>
              <div>
                <label htmlFor="survey-external-url" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">URL de la encuesta</label>
                <input id="survey-external-url" type="url" value={formData.external_survey_url}
                  onChange={(e) => set('external_survey_url', e.target.value)} style={inputStyle} placeholder="https://..." />
              </div>
              <div style={{ backgroundColor: `${T.cyan}10`, border: `1px solid ${T.cyan}30` }} className="p-2.5 rounded">
                <p style={{ color: T.cyan }} className="text-xs">
                  <strong>Webhook URL:</strong>{' '}
                  <code style={{ fontFamily: fontMono, backgroundColor: T.bg, color: T.cyan }} className="px-1.5 py-0.5 rounded text-[11px]">
                    {window.location.origin.replace('app.st4rtup.app', 'api.st4rtup.com')}/api/v1/surveys/webhook/{formData.external_provider}
                  </code>
                </p>
                <p style={{ color: T.fgMuted }} className="text-xs mt-1">
                  Configura este URL en tu proveedor para recibir respuestas automaticamente.
                </p>
              </div>
            </div>
          )}

          <div>
            <label style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1" htmlFor="surveys-field-1">Fecha de expiracion</label>
            <input id="surveys-field-1" type="datetime-local" value={formData.expires_at} onChange={(e) => set('expires_at', e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label htmlFor="survey-notes" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Notas</label>
            <textarea id="survey-notes" value={formData.notes} onChange={(e) => set('notes', e.target.value)}
              style={inputStyle} rows={3} placeholder="Contexto adicional..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}
              className="px-4 py-2 rounded-lg text-sm font-medium">Cancelar</button>
            <button type="submit" disabled={isLoading}
              style={{ backgroundColor: T.cyan, color: T.bg }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? 'Actualizar' : 'Crear Encuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


/* ── Respond Modal ─────────────────────────────────────────────────── */

function RespondModal({ survey, onClose, onSubmit, isLoading }) {
  const type = survey.survey_type || survey.type || 'custom'
  const [score, setScore] = useState(type === 'nps' ? 8 : type === 'csat' ? 4 : 0)
  const [feedback, setFeedback] = useState('')
  const [improvements, setImprovements] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { responses: [{ question: 'score', answer: score, score }] }
    if (type === 'nps') data.nps_score = score
    if (type === 'csat') data.overall_score = score
    if (feedback) data.responses.push({ question: 'feedback', answer: feedback })
    if (improvements) data.improvements_suggested = [{ text: improvements }]
    onSubmit(data)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-xl font-bold">Registrar Respuesta</h2>
          <button aria-label="Cerrar" onClick={onClose} style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
        </div>
        <div style={{ borderBottom: `2px solid ${T.cyan}` }} className="mb-4" />

        <p style={{ color: T.fgMuted }} className="text-sm mb-4">{survey.title}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'nps' && (
            <div>
              <label style={{ color: T.fg }} className="block text-sm font-medium mb-2">
                Puntuacion NPS (0-10): <span style={{ fontFamily: fontMono }} className="font-bold">{score}</span>
              </label>
              <input type="range" min="0" max="10" value={score}
                onChange={(e) => setScore(parseInt(e.target.value))}
                className="w-full" style={{ accentColor: T.cyan }} />
              <div className="flex justify-between text-xs mt-1" style={{ color: T.fgMuted }}>
                <span>0 - Nada probable</span>
                <span>10 - Muy probable</span>
              </div>
              <div className="mt-2"><NPSScoreDisplay score={score} /></div>
            </div>
          )}

          {type === 'csat' && (
            <div>
              <label style={{ color: T.fg }} className="block text-sm font-medium mb-2">Satisfaccion (1-5)</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button aria-label="Favorito" key={n} type="button" onClick={() => setScore(n)}>
                    <Star className="w-8 h-8 cursor-pointer transition-colors" style={{
                      color: n <= score ? T.warning : T.fgMuted,
                      fill: n <= score ? T.warning : 'none',
                    }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {type !== 'nps' && type !== 'csat' && (
            <div>
              <label style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1" htmlFor="surveys-field-2">Puntuacion</label>
              <input id="surveys-field-2" type="number" value={score} onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                style={inputStyle} min="0" max="100" />
            </div>
          )}

          <div>
            <label htmlFor="survey-feedback" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Feedback del cliente</label>
            <textarea id="survey-feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)}
              style={inputStyle} rows={3} placeholder="Comentarios del cliente..." />
          </div>

          <div>
            <label htmlFor="survey-improvements" style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Mejoras sugeridas</label>
            <textarea id="survey-improvements" value={improvements} onChange={(e) => setImprovements(e.target.value)}
              style={inputStyle} rows={2} placeholder="Que mejoraria..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}
              className="px-4 py-2 rounded-lg text-sm font-medium">Cancelar</button>
            <button type="submit" disabled={isLoading}
              style={{ backgroundColor: T.cyan, color: T.bg }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


/* ── Detail Modal ──────────────────────────────────────────────────── */

function DetailModal({ survey, onClose }) {
  const type = survey.survey_type || survey.type || 'custom'
  const config = surveyTypeConfig[type] || surveyTypeConfig.custom
  const status = STATUS_LABELS[survey.status] || STATUS_LABELS.draft
  const score = survey.nps_score ?? survey.overall_score ?? survey.score

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }} className="rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-xl font-bold">Detalle de Encuesta</h2>
          <button aria-label="Cerrar" onClick={onClose} style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
        </div>
        <div style={{ borderBottom: `2px solid ${T.cyan}` }} className="mb-4" />

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: config.color, backgroundColor: `${config.color}15` }}>
              {config.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: status.color, backgroundColor: `${status.color}15` }}>
              {status.label}
            </span>
            {survey.external_provider && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: T.purple, backgroundColor: `${T.purple}15` }}>
                {SURVEY_PROVIDERS.find(p => p.value === survey.external_provider)?.label}
              </span>
            )}
          </div>

          <h3 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-lg font-semibold">{survey.title}</h3>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span style={{ color: T.fgMuted }}>Creada:</span> <span style={{ color: T.fg }}>{formatDate(survey.created_at)}</span></div>
            {survey.sent_at && <div><span style={{ color: T.fgMuted }}>Enviada:</span> <span style={{ color: T.fg }}>{formatDate(survey.sent_at)}</span></div>}
            {survey.completed_at && <div><span style={{ color: T.fgMuted }}>Completada:</span> <span style={{ color: T.fg }}>{formatDate(survey.completed_at)}</span></div>}
            {survey.expires_at && <div><span style={{ color: T.fgMuted }}>Expira:</span> <span style={{ color: T.fg }}>{formatDate(survey.expires_at)}</span></div>}
          </div>

          {score != null && (
            <div style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }} className="p-4 rounded-lg">
              <p style={{ color: T.fgMuted }} className="text-sm font-medium mb-2">Puntuacion</p>
              {type === 'nps' ? <NPSScoreDisplay score={score} />
                : type === 'csat' ? <CSATScoreDisplay score={score} />
                : <span style={{ fontFamily: fontMono, color: T.fg }} className="text-2xl font-bold">{score}</span>}
            </div>
          )}

          {survey.responses?.length > 0 && (
            <div>
              <p style={{ color: T.fgMuted }} className="text-sm font-medium mb-2">Respuestas</p>
              <div className="space-y-2">
                {survey.responses.map((r, i) => (
                  <div key={i} style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }} className="p-2.5 rounded text-sm">
                    <p style={{ color: T.fgMuted }}>{r.question_title || r.question}</p>
                    <p style={{ color: T.fg }}>{r.answer}{r.score != null && ` (${r.score})`}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(survey.notes || survey.feedback) && (
            <div>
              <p style={{ color: T.fgMuted }} className="text-sm font-medium mb-1">Notas</p>
              <p style={{ color: T.fg }} className="text-sm opacity-80">{survey.notes || survey.feedback}</p>
            </div>
          )}

          {survey.improvements_suggested?.length > 0 && (
            <div>
              <p style={{ color: T.fgMuted }} className="text-sm font-medium mb-1">Mejoras sugeridas</p>
              <ul style={{ color: T.fg }} className="list-disc list-inside text-sm opacity-80">
                {survey.improvements_suggested.map((item, i) => <li key={i}>{item.text || JSON.stringify(item)}</li>)}
              </ul>
            </div>
          )}

          {survey.external_survey_url && (
            <a href={survey.external_survey_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm" style={{ color: T.cyan }}>
              <ExternalLink className="w-4 h-4" /> Abrir encuesta en {survey.external_provider || 'proveedor'}
            </a>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose}
            style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}
            className="px-4 py-2 rounded-lg text-sm font-medium">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
