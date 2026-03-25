import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2, Plus, X, Sparkles, Send, Calendar, BarChart3,
  Linkedin, Twitter, Youtube, Instagram, Globe, RefreshCw, Eye, Trash2, ToggleLeft, ToggleRight, Search as SearchIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import Breadcrumbs from '@/components/Breadcrumbs'
import { socialApi, youtubeApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'recurrences', label: 'Auto-programacion' },
  { id: 'listening', label: 'Social Listening' },
]

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'hsl(210,80%,60%)', bg: 'hsla(210,80%,50%,0.1)' },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter, color: 'hsl(195,80%,60%)', bg: 'hsla(195,80%,50%,0.1)' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'hsl(0,70%,60%)', bg: 'hsla(0,70%,50%,0.1)' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'hsl(330,70%,60%)', bg: 'hsla(330,70%,50%,0.1)' },
]

const STATUS_COLORS = {
  draft: { color: T.fgMuted, bg: 'hsla(220,10%,55%,0.1)' },
  scheduled: { color: T.warning, bg: 'hsla(38,92%,50%,0.1)' },
  published: { color: T.success, bg: 'hsla(142,71%,45%,0.1)' },
  failed: { color: T.destructive, bg: 'hsla(0,72%,51%,0.1)' },
}

export default function SocialMediaPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('posts')
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ platform: 'linkedin', content: '', tags: '' })
  const [generating, setGenerating] = useState(false)
  const [genTopic, setGenTopic] = useState('')
  const [showRecForm, setShowRecForm] = useState(false)
  const [recForm, setRecForm] = useState({ name: '', platform: 'linkedin', content_template: '', frequency: 'weekly', day_of_week: 1, time_of_day: '10:00', tags: '' })

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['social-posts', filter],
    queryFn: () => socialApi.list(filter !== 'all' ? { platform: filter } : {}).then(r => r.data),
  })

  const { data: statsData } = useQuery({
    queryKey: ['social-stats'],
    queryFn: () => socialApi.stats().then(r => r.data),
  })

  const { data: recurrencesData } = useQuery({
    queryKey: ['social-recurrences'],
    queryFn: () => socialApi.recurrences().then(r => r.data),
    enabled: activeTab === 'recurrences',
  })

  const { data: listeningData, isLoading: listeningLoading } = useQuery({
    queryKey: ['social-listening'],
    queryFn: () => socialApi.listeningDashboard().then(r => r.data),
    enabled: activeTab === 'listening',
    staleTime: 5 * 60 * 1000,
  })

  const { data: ytChannelData } = useQuery({
    queryKey: ['youtube-channel-social'],
    queryFn: () => youtubeApi.channel().then(r => r.data).catch(() => null),
    staleTime: 10 * 60 * 1000,
  })

  const createRecMut = useMutation({
    mutationFn: (d) => socialApi.createRecurrence({ ...d, tags: d.tags ? d.tags.split(',').map(t => t.trim()) : [] }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-recurrences'] }); setShowRecForm(false); toast.success('Recurrencia creada') },
  })

  const deleteRecMut = useMutation({
    mutationFn: (id) => socialApi.deleteRecurrence(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['social-recurrences'] }); toast.success('Eliminada') },
  })

  const generateNowMut = useMutation({
    mutationFn: (id) => socialApi.generateFromRecurrence(id),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['social'] }); toast.success(`Post creado: ${res.data.content_preview?.slice(0, 50)}...`) },
  })

  const createMutation = useMutation({
    mutationFn: (d) => socialApi.create({ ...d, tags: d.tags ? d.tags.split(',').map(t => t.trim()) : [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social'] })
      toast.success('Post creado')
      setShowCreate(false)
      setForm({ platform: 'linkedin', content: '', tags: '' })
    },
  })

  const generateContent = async (platform) => {
    setGenerating(true)
    try {
      const resp = await socialApi.generate({ platform, topic: genTopic || 'ventas B2B para empresas españolas' })
      if (resp.data?.generated) {
        setForm(f => ({ ...f, platform, content: resp.data.content }))
        setShowCreate(true)
        toast.success(`Contenido ${platform} generado`)
      } else {
        toast.error(resp.data?.error || 'Error generando')
      }
    } catch { toast.error('Error generando contenido') }
    setGenerating(false)
  }

  const posts = postsData?.posts || []
  const stats = statsData?.by_platform || []

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <Breadcrumbs items={[{ label: 'Marketing', href: '/marketing' }, { label: 'Social Media' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
          <Globe className="w-7 h-7" style={{ color: T.cyan }} /> Social Media
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Nuevo Post
          </button>
          {posts.length === 0 && (
            <button onClick={async () => {
              try { await socialApi.seed(); queryClient.invalidateQueries(); toast.success('Posts de ejemplo cargados') }
              catch { toast.error('Error cargando') }
            }} className="btn-secondary text-sm">Cargar ejemplos</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 pb-0" style={{ borderBottom: `1px solid ${T.border}` }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
            style={{
              color: activeTab === tab.id ? T.cyan : T.fgMuted,
              borderBottom: activeTab === tab.id ? `2px solid ${T.cyan}` : '2px solid transparent',
              backgroundColor: activeTab === tab.id ? 'hsla(220,25%,10%,0.5)' : 'transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats (always visible) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PLATFORMS.map(p => {
          const PIcon = p.icon
          const stat = stats.find(s => s.platform === p.id) || {}
          return (
            <div key={p.id} className="rounded-xl p-3" style={{ border: `1px solid ${T.border}`, backgroundColor: p.bg }}>
              <div className="flex items-center gap-2 mb-2">
                <PIcon className="w-4 h-4" style={{ color: p.color }} />
                <span className="text-sm font-medium" style={{ color: T.fg }}>{p.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span style={{ color: T.fgMuted }}>Posts: <span style={{ color: T.fg, fontFamily: fontMono }}>{stat.posts || 0}</span></span>
                <span style={{ color: T.fgMuted }}>Likes: <span style={{ color: T.fg, fontFamily: fontMono }}>{stat.likes || 0}</span></span>
                <span style={{ color: T.fgMuted }}>Impr: <span style={{ color: T.fg, fontFamily: fontMono }}>{stat.impressions || 0}</span></span>
                <span style={{ color: T.fgMuted }}>Engage: <span style={{ color: T.fg, fontFamily: fontMono }}>{stat.engagement || 0}</span></span>
              </div>
            </div>
          )
        })}
      </div>

      {/* YouTube Channel Card */}
      {ytChannelData && (ytChannelData.channel || ytChannelData) && (() => {
        const yt = ytChannelData.channel || ytChannelData
        const subs = yt.subscriber_count ?? yt.subscribers
        const views = yt.view_count ?? yt.total_views ?? yt.views
        if (!subs && !views) return null
        return (
          <Link to="/app/marketing/youtube" className="block">
            <div className="rounded-xl p-3 transition-all group" style={{ border: `1px solid ${T.border}`, backgroundColor: 'hsla(0,70%,50%,0.06)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsla(0,72%,51%,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsla(0,70%,50%,0.1)' }}>
                  <Youtube className="w-5 h-5" style={{ color: 'hsl(0,70%,60%)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: T.fg }}>{yt.title || yt.name || 'YouTube Channel'}</span>
                  <div className="flex gap-4 text-xs mt-0.5" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                    <span>Subs: <span style={{ color: T.fg }}>{subs != null ? (subs >= 1000 ? (subs / 1000).toFixed(1) + 'K' : subs) : '—'}</span></span>
                    <span>Views: <span style={{ color: T.fg }}>{views != null ? (views >= 1_000_000 ? (views / 1_000_000).toFixed(1) + 'M' : views >= 1000 ? (views / 1000).toFixed(1) + 'K' : views) : '—'}</span></span>
                  </div>
                </div>
                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: T.fgMuted }}>Ver dashboard →</span>
              </div>
            </div>
          </Link>
        )
      })()}

      {/* ── TAB: Posts ────────────────────────────────── */}
      {activeTab !== 'posts' ? null : <>

      {/* AI Generator */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid hsla(185,72%,48%,0.2)` }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
          <Sparkles className="w-4 h-4" style={{ color: T.cyan }} /> Generar contenido con IA
        </h3>
        <div className="flex gap-2 mb-3">
          <input type="text" value={genTopic} onChange={e => setGenTopic(e.target.value)}
            placeholder="Tema (ej: deadline NIS2, SOC integrado, PoC 90 dias...)" className="input text-sm flex-1" />
        </div>
        <div className="flex gap-2">
          {PLATFORMS.slice(0, 3).map(p => {
            const PIcon = p.icon
            return (
              <button key={p.id} onClick={() => generateContent(p.id)} disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{ color: p.color, border: `1px solid ${T.border}` }}>
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <PIcon className="w-3 h-3" />}
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button onClick={() => setFilter('all')}
          className="px-3 py-1.5 text-sm rounded-lg"
          style={{
            backgroundColor: filter === 'all' ? 'hsla(185,72%,48%,0.2)' : T.card,
            border: `1px solid ${filter === 'all' ? 'hsla(185,72%,48%,0.5)' : T.border}`,
            color: filter === 'all' ? T.cyan : T.fgMuted,
          }}>Todos</button>
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => setFilter(p.id)}
            className="px-3 py-1.5 text-sm rounded-lg"
            style={{
              backgroundColor: filter === p.id ? 'hsla(185,72%,48%,0.2)' : T.card,
              border: `1px solid ${filter === p.id ? 'hsla(185,72%,48%,0.5)' : T.border}`,
              color: filter === p.id ? T.cyan : T.fgMuted,
            }}>{p.label}</button>
        ))}
      </div>

      {/* Posts list */}
      <div className="space-y-3">
        {posts.map(post => {
          const plat = PLATFORMS.find(p => p.id === post.platform) || PLATFORMS[0]
          const PIcon = plat.icon
          const sc = STATUS_COLORS[post.status] || STATUS_COLORS.draft
          return (
            <div key={post.id} className="rounded-xl p-4" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: plat.bg }}>
                  <PIcon className="w-5 h-5" style={{ color: plat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: sc.color, backgroundColor: sc.bg }}>{post.status}</span>
                    {post.scheduled_at && <span className="text-[10px]" style={{ color: T.fgMuted, fontFamily: fontMono }}>{new Date(post.scheduled_at).toLocaleDateString('es-ES')}</span>}
                    {post.tags?.length > 0 && post.tags.map(t => <span key={t} className="text-[9px]" style={{ color: T.fgMuted }}>#{t}</span>)}
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: '#94A3B8' }}>{post.content}</p>
                  {post.impressions > 0 && (
                    <div className="flex gap-3 mt-2 text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                      <span>👁 {post.impressions}</span>
                      <span>❤️ {post.likes}</span>
                      <span>💬 {post.comments}</span>
                      <span>🔄 {post.shares}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {posts.length === 0 && <p className="text-center py-8" style={{ color: T.fgMuted }}>Sin posts. Genera contenido con IA o crea uno manualmente.</p>}
      </div>

      </>}

      {/* ── TAB: Recurrences ─────────────────────────── */}
      {activeTab === 'recurrences' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>Auto-programacion recurrente</h2>
            <button onClick={() => setShowRecForm(!showRecForm)} className="btn-primary text-sm flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Nueva recurrencia
            </button>
          </div>

          {showRecForm && (
            <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
              <div className="grid grid-cols-2 gap-3">
                <input value={recForm.name} onChange={e => setRecForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre (ej: Tips ENS semanal)" className="input text-sm" />
                <select id="socialmedia-select-1" aria-label="Selector" value={recForm.platform} onChange={e => setRecForm(f => ({ ...f, platform: e.target.value }))} className="input text-sm">
                  {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <textarea id="socialmedia-textarea-5" aria-label="Texto" value={recForm.content_template} onChange={e => setRecForm(f => ({ ...f, content_template: e.target.value }))}
                placeholder="Template del post. Variables: {date}, {week}, {month}" rows={4} className="input text-sm" />
              <div className="grid grid-cols-3 gap-3">
                <select id="socialmedia-select-2" aria-label="Selector" value={recForm.frequency} onChange={e => setRecForm(f => ({ ...f, frequency: e.target.value }))} className="input text-sm">
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                </select>
                <select id="socialmedia-select-3" aria-label="Selector" value={recForm.day_of_week} onChange={e => setRecForm(f => ({ ...f, day_of_week: Number(e.target.value) }))} className="input text-sm">
                  {['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input type="time" value={recForm.time_of_day} onChange={e => setRecForm(f => ({ ...f, time_of_day: e.target.value }))} className="input text-sm" />
              </div>
              <input value={recForm.tags} onChange={e => setRecForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags (coma-separados)" className="input text-sm" />
              <button onClick={() => createRecMut.mutate(recForm)} disabled={!recForm.name || !recForm.content_template}
                className="btn-primary text-sm">{createRecMut.isPending ? 'Creando...' : 'Crear recurrencia'}</button>
            </div>
          )}

          <div className="space-y-3">
            {(recurrencesData?.recurrences || []).map(rec => {
              const P = PLATFORMS.find(p => p.id === rec.platform)
              return (
                <div key={rec.id} className="rounded-xl p-4 flex items-center gap-4" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: P?.bg || T.muted }}>
                    {P ? <P.icon className="w-5 h-5" style={{ color: P.color }} /> : <Globe className="w-5 h-5" style={{ color: T.fgMuted }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: T.fg }}>{rec.name}</div>
                    <div className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>{rec.frequency} · {rec.time_of_day} · {rec.total_generated} generados</div>
                    <div className="text-xs mt-1 truncate" style={{ color: T.fgMuted }}>{rec.content_template}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      color: rec.is_active ? T.success : T.fgMuted,
                      backgroundColor: rec.is_active ? 'hsla(142,71%,45%,0.1)' : T.muted,
                    }}>{rec.is_active ? 'Activa' : 'Pausada'}</span>
                  <button onClick={() => generateNowMut.mutate(rec.id)} disabled={generateNowMut.isPending} className="text-xs" style={{ color: T.cyan }}>
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if (confirm('Eliminar?')) deleteRecMut.mutate(rec.id) }} className="text-xs" style={{ color: T.destructive }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
            {(recurrencesData?.recurrences || []).length === 0 && <p className="text-center py-8" style={{ color: T.fgMuted }}>Sin recurrencias. Crea una para auto-publicar contenido.</p>}
          </div>
        </div>
      )}

      {/* ── TAB: Social Listening ────────────────────── */}
      {activeTab === 'listening' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <SearchIcon className="w-5 h-5" style={{ color: T.cyan }} /> Social Listening
          </h2>

          {listeningLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>
          ) : listeningData ? (
            <>
              {/* Sentiment analysis */}
              {listeningData.sentiment && (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid hsla(265,60%,58%,0.2)` }}>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: T.fg, fontFamily: fontDisplay }}>Analisis de sentimiento</h3>
                  <p className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>{listeningData.sentiment.total_mentions} menciones analizadas</p>
                  {listeningData.sentiment.analysis && (
                    <div className="mt-2 text-sm whitespace-pre-wrap rounded-lg p-3 max-h-48 overflow-y-auto"
                      style={{ color: '#94A3B8', backgroundColor: 'hsla(220,25%,6%,0.5)' }}>
                      {listeningData.sentiment.analysis}
                    </div>
                  )}
                </div>
              )}

              {/* Brand mentions */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg, fontFamily: fontDisplay }}>Menciones de marca (<span style={{ fontFamily: fontMono }}>{listeningData.brand_mentions?.length || 0}</span>)</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(listeningData.brand_mentions || []).map((m, i) => (
                    <div key={i} className="pb-2" style={{ borderBottom: `1px solid hsla(220,15%,20%,0.5)` }}>
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: T.cyan }}>{m.title}</a>
                      <p className="text-xs mt-0.5" style={{ color: T.fgMuted }}>{m.snippet}</p>
                      <span className="text-[10px]" style={{ color: T.fgMuted }}>{m.keyword} · {m.source}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Competitors */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg, fontFamily: fontDisplay }}>Monitor de competidores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(listeningData.competitors || []).map((c, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ border: `1px solid ${T.border}` }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium" style={{ color: T.fg }}>{c.competitor}</span>
                        <span className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>{c.mentions_count} menciones</span>
                      </div>
                      {c.mentions?.slice(0, 2).map((m, j) => (
                        <p key={j} className="text-[11px] truncate" style={{ color: T.fgMuted }}>{m.title}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-8" style={{ color: T.fgMuted }}>Error cargando datos de listening.</p>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>Nuevo Post</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" style={{ color: T.fgMuted }} /></button>
            </div>
            <div className="space-y-3">
              <select id="socialmedia-select-4" aria-label="Selector" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="input text-sm">
                {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <textarea id="socialmedia-textarea-6" aria-label="Texto" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Contenido del post..." rows={6} className="input text-sm" />
              <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="Tags separados por coma (tecnología, growth, ENS...)" className="input text-sm" />
              <div className="flex gap-2">
                <button onClick={() => createMutation.mutate(form)} disabled={!form.content || createMutation.isPending}
                  className="btn-primary flex-1 text-sm">{createMutation.isPending ? 'Creando...' : 'Guardar como Draft'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
