import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Eye, Plus, Play, Loader2, Trash2, Edit3, X,
  Zap, CheckCircle2, XCircle, MinusCircle, Search, Filter,
  BarChart3, Bot, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { llmVisibilityApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const CATEGORY_CONFIG = {
  brand: { label: 'Marca', bgColor: 'rgba(0,188,212,0.1)', textColor: T.cyan },
  competitor: { label: 'Competidor', bgColor: 'rgba(139,92,246,0.1)', textColor: T.purple },
  product: { label: 'Producto', bgColor: 'rgba(34,197,94,0.1)', textColor: T.success },
  regulation: { label: 'Normativa', bgColor: 'rgba(249,115,22,0.1)', textColor: T.warning },
}

const SENTIMENT_CONFIG = {
  positive: { label: 'Positivo', icon: CheckCircle2, color: T.success },
  neutral: { label: 'Neutral', icon: MinusCircle, color: T.fgMuted },
  negative: { label: 'Negativo', icon: XCircle, color: T.destructive },
  not_mentioned: { label: 'No mencionado', icon: XCircle, color: '#E2E8F0' },
}

const PROVIDER_COLORS = {
  openai: '#22C55E',
  anthropic: '#A855F7',
  google: '#1E6FD9',
}

const PIE_COLORS = ['#22C55E', '#6B7280', '#EF4444', '#374151']

const INITIAL_FORM = {
  query_text: '',
  category: 'brand',
  brand_keywords: '',
  competitor_keywords: '',
  providers: ['openai', 'anthropic', 'google'],
  run_frequency: 'weekly',
  notes: '',
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
      {payload.map((p, i) => (
        <p key={i} style={{ color: T.fg }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function LLMVisibilityPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('queries') // queries, results, dashboard
  const [showModal, setShowModal] = useState(false)
  const [editingQuery, setEditingQuery] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [expandedResult, setExpandedResult] = useState(null)
  const [resultsFilter, setResultsFilter] = useState({ query_id: '', provider: '' })

  // Queries
  const { data: queriesData, isLoading: loadingQueries } = useQuery({
    queryKey: ['llm-visibility', 'queries'],
    queryFn: () => llmVisibilityApi.list({ page_size: 50 }).then(r => r.data),
  })

  // Results
  const { data: resultsData, isLoading: loadingResults } = useQuery({
    queryKey: ['llm-visibility', 'results', resultsFilter],
    queryFn: () => llmVisibilityApi.results({
      page_size: 50,
      ...(resultsFilter.query_id && { query_id: resultsFilter.query_id }),
      ...(resultsFilter.provider && { provider: resultsFilter.provider }),
    }).then(r => r.data),
    enabled: tab === 'results' || tab === 'dashboard',
  })

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['llm-visibility', 'stats'],
    queryFn: () => llmVisibilityApi.stats().then(r => r.data),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => llmVisibilityApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-visibility'] })
      toast.success('Query creada')
      closeModal()
    },
    onError: () => toast.error('Error al crear query'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => llmVisibilityApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-visibility'] })
      toast.success('Query actualizada')
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => llmVisibilityApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-visibility'] })
      toast.success('Query eliminada')
    },
  })

  const seedMutation = useMutation({
    mutationFn: () => llmVisibilityApi.seed(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['llm-visibility'] })
      toast.success(`${res.data.created} queries generadas`)
    },
  })

  const runOneMutation = useMutation({
    mutationFn: (id) => llmVisibilityApi.runOne(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['llm-visibility'] })
      const d = res.data
      const mentions = Object.values(d.by_provider).filter(p => p.brand_mentioned).length
      toast.success(`Ejecutada: ${mentions}/${Object.keys(d.by_provider).length} mencionaron la marca`)
    },
    onError: () => toast.error('Error al ejecutar query'),
  })

  const runAllMutation = useMutation({
    mutationFn: () => llmVisibilityApi.runAll(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['llm-visibility'] })
      toast.success(`${res.data.queries_executed} queries ejecutadas, ${res.data.total_results} resultados`)
    },
    onError: () => toast.error('Error al ejecutar queries'),
  })

  function closeModal() {
    setShowModal(false)
    setEditingQuery(null)
    setForm(INITIAL_FORM)
  }

  function openEdit(q) {
    setEditingQuery(q)
    setForm({
      query_text: q.query_text,
      category: q.category,
      brand_keywords: (q.brand_keywords || []).join(', '),
      competitor_keywords: (q.competitor_keywords || []).join(', '),
      providers: q.providers || ['openai', 'anthropic', 'google'],
      run_frequency: q.run_frequency || 'weekly',
      notes: q.notes || '',
    })
    setShowModal(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      query_text: form.query_text,
      category: form.category,
      brand_keywords: form.brand_keywords ? form.brand_keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
      competitor_keywords: form.competitor_keywords ? form.competitor_keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
      providers: form.providers,
      run_frequency: form.run_frequency,
      notes: form.notes || null,
    }
    if (editingQuery) {
      updateMutation.mutate({ id: editingQuery.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function toggleProvider(p) {
    setForm(f => ({
      ...f,
      providers: f.providers.includes(p)
        ? f.providers.filter(x => x !== p)
        : [...f.providers, p],
    }))
  }

  const queries = queriesData?.items || []
  const results = resultsData?.items || []

  // Dashboard chart data
  const sentimentData = Object.entries(stats?.by_sentiment || {}).map(([k, v]) => ({
    name: SENTIMENT_CONFIG[k]?.label || k, value: v,
  }))
  const providerData = Object.entries(stats?.by_provider || {}).map(([k, v]) => ({
    name: k, total: v.total, mentions: v.brand_mentions,
  }))

  const inputStyle = {
    width: '100%', padding: '8px 12px', backgroundColor: T.muted, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none', fontFamily: fontMono,
  }
  const selectStyle = { ...inputStyle, fontFamily: 'inherit' }
  const labelStyle = { display: 'block', fontSize: 14, color: T.fgMuted, marginBottom: 4 }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/app/marketing" style={{ color: T.fgMuted, transition: 'color .2s' }} onMouseEnter={e => e.currentTarget.style.color = T.fg} onMouseLeave={e => e.currentTarget.style.color = T.fgMuted}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, fontFamily: fontDisplay, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot className="w-7 h-7" style={{ color: T.purple }} />
              LLM Visibility
            </h1>
            <p style={{ fontSize: 13, color: T.fgMuted, marginTop: 2 }}>
              Monitoriza cómo los LLMs mencionan tu marca vs competidores
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runAllMutation.mutate()}
            disabled={runAllMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: `linear-gradient(135deg, ${T.purple}, hsl(230,60%,50%))`, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', opacity: runAllMutation.isPending ? 0.5 : 1 }}
          >
            {runAllMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Ejecutar Todas
          </button>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', backgroundColor: T.muted, color: T.fg, borderRadius: 8, fontSize: 12, fontWeight: 500, border: `1px solid ${T.border}`, cursor: 'pointer', opacity: seedMutation.isPending ? 0.5 : 1 }}
          >
            <Sparkles className="w-3.5 h-3.5" /> Seed
          </button>
          <button
            onClick={() => { setEditingQuery(null); setForm(INITIAL_FORM); setShowModal(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            <Plus className="w-4 h-4" /> Nueva Query
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Queries', value: stats.queries?.active || 0, sub: `${stats.queries?.total || 0} totales`, color: T.fg },
            { label: 'Ejecuciones', value: stats.results?.total || 0, color: T.fg },
            { label: 'Menciones Marca', value: stats.results?.brand_mentions || 0, color: T.success },
            { label: 'Tasa Mención', value: `${stats.results?.mention_rate || 0}%`, color: T.purple },
          ].map((s, i) => (
            <div key={i} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: fontDisplay }}>{s.value}</p>
              {s.sub && <p style={{ fontSize: 10, color: T.fgMuted }}>{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: T.card }}>
        {[
          { key: 'queries', label: 'Query Bank', icon: Search },
          { key: 'results', label: 'Resultados', icon: Eye },
          { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              backgroundColor: tab === t.key ? T.muted : 'transparent',
              color: tab === t.key ? T.fg : T.fgMuted,
            }}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Queries */}
      {tab === 'queries' && (
        <div className="space-y-3">
          {loadingQueries ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.purple }} />
            </div>
          ) : queries.length === 0 ? (
            <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
              <Bot className="w-8 h-8 mx-auto mb-2" style={{ color: T.fgMuted }} />
              <p style={{ color: T.fgMuted }}>No hay queries configuradas</p>
              <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 4 }}>Usa "Seed" para generar queries predefinidas para growth</p>
            </div>
          ) : (
            queries.map(q => {
              const cat = CATEGORY_CONFIG[q.category] || { label: q.category, bgColor: 'rgba(107,114,128,0.1)', textColor: T.fgMuted }
              return (
                <div key={q.id} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, transition: 'border-color .2s' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4, backgroundColor: cat.bgColor, color: cat.textColor }}>
                          {cat.label}
                        </span>
                        {q.providers?.map(p => (
                          <span key={p} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, backgroundColor: T.muted, color: T.fgMuted }}>
                            {p}
                          </span>
                        ))}
                        <span style={{ fontSize: 10, color: T.fgMuted }}>{q.run_frequency}</span>
                        {!q.is_active && (
                          <span style={{ fontSize: 10, color: T.destructive, backgroundColor: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4 }}>Inactiva</span>
                        )}
                      </div>
                      <p style={{ fontSize: 14, color: T.fg }}>{q.query_text}</p>
                      <div className="flex gap-4 mt-2" style={{ fontSize: 10, color: T.fgMuted }}>
                        {q.brand_keywords?.length > 0 && (
                          <span>Brand: {q.brand_keywords.join(', ')}</span>
                        )}
                        {q.competitor_keywords?.length > 0 && (
                          <span>Comp: {q.competitor_keywords.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => runOneMutation.mutate(q.id)}
                        disabled={runOneMutation.isPending}
                        title="Ejecutar"
                        style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.purple }}
                      >
                        {runOneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEdit(q)}
                        style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (window.confirm('¿Eliminar query y resultados?')) deleteMutation.mutate(q.id) }}
                        style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Tab: Results */}
      {tab === 'results' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 items-center">
            <select id="llmvisibility-select-7" aria-label="Selector" value={resultsFilter.provider}
              onChange={(e) => setResultsFilter(f => ({ ...f, provider: e.target.value }))}
              style={selectStyle}
            >
              <option value="">Todos los providers</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
            </select>
            <select id="llmvisibility-select-8" aria-label="Selector" value={resultsFilter.query_id}
              onChange={(e) => setResultsFilter(f => ({ ...f, query_id: e.target.value }))}
              style={{ ...selectStyle, maxWidth: 320 }}
            >
              <option value="">Todas las queries</option>
              {queries.map(q => (
                <option key={q.id} value={q.id}>{q.query_text.slice(0, 60)}...</option>
              ))}
            </select>
          </div>

          {loadingResults ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.purple }} />
            </div>
          ) : results.length === 0 ? (
            <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
              <Eye className="w-8 h-8 mx-auto mb-2" style={{ color: T.fgMuted }} />
              <p style={{ color: T.fgMuted }}>No hay resultados aún</p>
              <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 4 }}>Ejecuta queries para ver resultados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map(r => {
                const sentiment = SENTIMENT_CONFIG[r.brand_sentiment] || SENTIMENT_CONFIG.not_mentioned
                const SentIcon = sentiment.icon
                const isExpanded = expandedResult === r.id

                return (
                  <div key={r.id} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div
                      style={{ padding: 16, cursor: 'pointer', transition: 'background .2s' }}
                      onClick={() => setExpandedResult(isExpanded ? null : r.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Provider badge */}
                        <span
                          style={{ fontSize: 12, fontWeight: 500, padding: '4px 8px', borderRadius: 6, backgroundColor: `${PROVIDER_COLORS[r.provider] || '#6B7280'}20`, color: PROVIDER_COLORS[r.provider] || T.fgMuted }}
                        >
                          {r.provider}
                        </span>

                        {/* Mention indicator */}
                        <div className="flex items-center gap-1">
                          {r.brand_mentioned ? (
                            <CheckCircle2 className="w-4 h-4" style={{ color: T.success }} />
                          ) : (
                            <XCircle className="w-4 h-4" style={{ color: T.fgMuted }} />
                          )}
                          <span style={{ fontSize: 12, color: r.brand_mentioned ? T.success : T.fgMuted }}>
                            {r.brand_mentioned ? 'Mencionada' : 'No mencionada'}
                          </span>
                        </div>

                        {/* Sentiment */}
                        <SentIcon className="w-4 h-4" style={{ color: sentiment.color }} />
                        <span style={{ fontSize: 12, color: sentiment.color }}>{sentiment.label}</span>

                        {/* Position */}
                        {r.position_rank > 0 && (
                          <span style={{ fontSize: 12, backgroundColor: 'rgba(234,179,8,0.1)', color: T.warning, padding: '2px 6px', borderRadius: 4 }}>
                            #{r.position_rank}
                          </span>
                        )}

                        {/* Competitor mentions */}
                        {r.competitor_mentions && Object.values(r.competitor_mentions).some(Boolean) && (
                          <span style={{ fontSize: 10, color: T.fgMuted }}>
                            Comp: {Object.entries(r.competitor_mentions).filter(([, v]) => v).map(([k]) => k).join(', ')}
                          </span>
                        )}

                        <span className="ml-auto" style={{ fontSize: 10, color: T.fgMuted }}>
                          {new Date(r.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {r.error && <span style={{ fontSize: 10, color: T.destructive }}>Error</span>}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${T.border}`, padding: 16 }} className="space-y-3">
                        {r.mention_context && (
                          <div>
                            <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', marginBottom: 4 }}>Contexto de mención</p>
                            <p style={{ fontSize: 13, color: T.success, backgroundColor: 'rgba(34,197,94,0.05)', borderRadius: 8, padding: 12, fontStyle: 'italic' }}>
                              "{r.mention_context}"
                            </p>
                          </div>
                        )}
                        {r.response_text && (
                          <div>
                            <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', marginBottom: 4 }}>Respuesta completa</p>
                            <p style={{ fontSize: 12, color: T.fg, backgroundColor: T.bg, borderRadius: 8, padding: 12, maxHeight: 240, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: fontMono }}>
                              {r.response_text}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-4" style={{ fontSize: 10, color: T.fgMuted, fontFamily: fontMono }}>
                          <span>Model: {r.model}</span>
                          <span>Tokens: {r.tokens_input + r.tokens_output}</span>
                          <span>Duración: {r.duration_ms}ms</span>
                          {r.error && <span style={{ color: T.destructive }}>Error: {r.error}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Dashboard */}
      {tab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sentiment pie */}
            {sentimentData.length > 0 && (
              <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16, fontFamily: fontDisplay }}>Sentimiento de Marca</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                      {sentimentData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {sentimentData.map((s, i) => (
                    <span key={s.name} className="flex items-center gap-1.5" style={{ fontSize: 10, color: T.fgMuted }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
                      {s.name} ({s.value})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Provider bar */}
            {providerData.length > 0 && (
              <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16, fontFamily: fontDisplay }}>Menciones por Provider</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={providerData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fill: T.fgMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: T.fgMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Total" fill={T.fgMuted} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="mentions" name="Menciones" fill={T.purple} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category breakdown */}
          {Object.keys(stats.by_category || {}).length > 0 && (
            <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Queries por Categoría</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.by_category).map(([cat, count]) => {
                  const cfg = CATEGORY_CONFIG[cat] || { label: cat, bgColor: 'rgba(107,114,128,0.1)', textColor: T.fgMuted }
                  return (
                    <div key={cat} className="flex items-center gap-2" style={{ backgroundColor: T.muted, borderRadius: 8, padding: '8px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 4, backgroundColor: cfg.bgColor, color: cfg.textColor }}>{cfg.label}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: T.fg, fontFamily: fontDisplay }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, width: '100%', maxWidth: 512, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${T.border}` }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>
                {editingQuery ? 'Editar Query' : 'Nueva Query'}
              </h2>
              <button onClick={closeModal} style={{ padding: 4, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label style={labelStyle} htmlFor="llmvisibility-field-1">Query *</label>
                <textarea id="llmvisibility-field-1" required
                  rows={3}
                  value={form.query_text}
                  onChange={(e) => setForm(f => ({ ...f, query_text: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }}
                  placeholder="What are the best growth platforms for..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="llmvisibility-field-2">Categoría</label>
                  <select id="llmvisibility-field-2" value={form.category}
                    onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                    style={selectStyle}
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="llmvisibility-field-3">Frecuencia</label>
                  <select id="llmvisibility-field-3" value={form.run_frequency}
                    onChange={(e) => setForm(f => ({ ...f, run_frequency: e.target.value }))}
                    style={selectStyle}
                  >
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="llmvisibility-field-4">Keywords de marca (separadas por coma)</label>
                <input id="llmvisibility-field-4" type="text"
                  value={form.brand_keywords}
                  onChange={(e) => setForm(f => ({ ...f, brand_keywords: e.target.value }))}
                  style={inputStyle}
                  placeholder="riskitera, st4rtup.app"
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="llmvisibility-field-5">Keywords de competidores (separadas por coma)</label>
                <input id="llmvisibility-field-5" type="text"
                  value={form.competitor_keywords}
                  onChange={(e) => setForm(f => ({ ...f, competitor_keywords: e.target.value }))}
                  style={inputStyle}
                  placeholder="onetrust, vanta, drata, pirani"
                />
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>Providers</label>
                <div className="flex gap-2">
                  {['openai', 'anthropic', 'google'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleProvider(p)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        border: `1px solid ${form.providers.includes(p) ? T.purple : T.border}`,
                        backgroundColor: form.providers.includes(p) ? 'rgba(139,92,246,0.2)' : T.muted,
                        color: form.providers.includes(p) ? T.purple : T.fgMuted,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="llmvisibility-field-6">Notas</label>
                <input id="llmvisibility-field-6" type="text"
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 16px', color: T.fgMuted, fontSize: 14, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  style={{ padding: '8px 16px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', opacity: (createMutation.isPending || updateMutation.isPending) ? 0.5 : 1 }}
                >
                  {editingQuery ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
