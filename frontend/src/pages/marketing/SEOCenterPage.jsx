import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, FileText, BarChart3, Repeat2, Shield, Globe, Plus, Loader2, Trash2,
  Eye, Send, Archive, Sparkles, ChevronDown, ChevronRight, AlertTriangle, Check, X,
  Copy, BookOpen, Video, Mail, Linkedin, PenTool, RefreshCw, Download, Key,
  Link as LinkIcon, ExternalLink, Save, Play, Tag
} from 'lucide-react'
import { Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import toast from 'react-hot-toast'
import { seoCenterApi, contentPipelineApi } from '@/services/api'
import { useConfirm } from '@/components/common/ConfirmDialog'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'

const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}

const STATUS_COLORS = { draft: T.warning, review: T.purple, published: T.success, archived: T.fgMuted }
const STATUS_LABELS = { draft: 'Borrador', review: 'Revisión', published: 'Publicado', archived: 'Archivado' }
const TYPE_LABELS = { blog: 'Blog', case_study: 'Caso de Estudio', whitepaper: 'Whitepaper', guide: 'Guía', normativa: 'Normativa', comparativa: 'Comparativa', news: 'Noticia' }

function Badge({ status }) {
  const c = STATUS_COLORS[status] || T.fgMuted
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: c, backgroundColor: `${c}15` }}>{STATUS_LABELS[status] || status}</span>
}

function ScoreBadge({ score }) {
  const c = score >= 80 ? T.success : score >= 50 ? T.warning : T.destructive
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ fontFamily: fontMono, color: c, backgroundColor: `${c}15` }}>{score ?? '-'}</span>
}

export default function SEOCenterPage() {
  const T = useThemeColors()
  const confirm = useConfirm()
  const [tab, setTab] = useState('content')
  const tabs = [
    { id: 'content', label: 'Content Hub', icon: FileText },
    { id: 'pipeline', label: 'Content Pipeline', icon: Sparkles },
    { id: 'keywords', label: 'Keyword Studio', icon: Key },
    { id: 'backlinks', label: 'Backlinks', icon: LinkIcon },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'repurpose', label: 'Repurposer', icon: Repeat2 },
    { id: 'health', label: 'Site Health', icon: Shield },
    { id: 'brand', label: 'Brand Monitor', icon: Globe },
    { id: 'tracker', label: 'Content Tracker', icon: ExternalLink },
  ]

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div>
        <Link to="/app/marketing" className="inline-flex items-center gap-1.5 text-xs mb-3 transition-colors hover:opacity-80" style={{ color: T.fgMuted }}>
          <span style={{ fontSize: '14px' }}>&larr;</span> Marketing Hub
        </Link>
        <h1 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Search className="w-7 h-7" style={{ color: T.cyan }} />
          SEO Command Center
        </h1>
        <p style={{ color: T.fgMuted }} className="text-sm mt-1">Contenido, auditoría, keywords, marca y rendimiento SEO en un solo lugar</p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: T.muted }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ backgroundColor: tab === t.id ? `${T.cyan}20` : 'transparent', color: tab === t.id ? T.cyan : T.fgMuted }}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'content' && <ContentHubTab />}
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'keywords' && <KeywordStudioTab />}
      {tab === 'backlinks' && <BacklinksTab />}
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'repurpose' && <RepurposeTab />}
      {tab === 'health' && <HealthTab />}
      {tab === 'brand' && <BrandTab />}
      {tab === 'tracker' && <ContentTrackerTab />}
    </div>
  )
}

// ─── Markdown Preview ────────────────────────────────────────
function renderMarkdown(md) {
  if (!md) return ''
  let html = md
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:600;margin:12px 0 4px;color:#0F172A">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;margin:16px 0 6px;color:#0F172A">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:700;margin:20px 0 8px;color:#1E6FD9">$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0F172A">$1</strong>')
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left:16px;color:#64748B">$1</li>')
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #1E6FD9;padding-left:12px;margin:8px 0;color:#64748B;font-style:italic">$1</blockquote>')
  html = html.replace(/\n\n/g, '<br/><br/>')
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1','h2','h3','strong','li','blockquote','br','p','em','a','ul','ol'],
    ALLOWED_ATTR: ['style'],
  })
}

// ─── Block Editor (Notion-style) ────────────────────────────

function BlockEditor({ value, onChange }) {
  const [blocks, setBlocks] = useState(() => {
    if (!value) return [{ id: '1', type: 'text', content: '' }]
    return value.split('\n\n').map((text, i) => {
      let type = 'text'
      if (text.startsWith('# ')) type = 'h1'
      else if (text.startsWith('## ')) type = 'h2'
      else if (text.startsWith('### ')) type = 'h3'
      else if (text.startsWith('- ') || text.startsWith('* ')) type = 'list'
      else if (text.startsWith('> ')) type = 'quote'
      else if (text.startsWith('```')) type = 'code'
      else if (text.startsWith('|')) type = 'table'
      return { id: String(i), type, content: text }
    })
  })

  function updateBlock(id, content) {
    const updated = blocks.map(b => b.id === id ? { ...b, content } : b)
    setBlocks(updated)
    onChange(updated.map(b => b.content).join('\n\n'))
  }

  function addBlock(afterId) {
    const idx = blocks.findIndex(b => b.id === afterId)
    const newBlock = { id: String(Date.now()), type: 'text', content: '' }
    const updated = [...blocks]
    updated.splice(idx + 1, 0, newBlock)
    setBlocks(updated)
  }

  function deleteBlock(id) {
    if (blocks.length <= 1) return
    const updated = blocks.filter(b => b.id !== id)
    setBlocks(updated)
    onChange(updated.map(b => b.content).join('\n\n'))
  }

  function moveBlock(id, direction) {
    const idx = blocks.findIndex(b => b.id === id)
    if (direction === 'up' && idx > 0) {
      const updated = [...blocks];
      [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]]
      setBlocks(updated)
      onChange(updated.map(b => b.content).join('\n\n'))
    } else if (direction === 'down' && idx < blocks.length - 1) {
      const updated = [...blocks];
      [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]]
      setBlocks(updated)
      onChange(updated.map(b => b.content).join('\n\n'))
    }
  }

  const BLOCK_TYPES = [
    { value: 'text', label: 'Texto' },
    { value: 'h1', label: 'H1' },
    { value: 'h2', label: 'H2' },
    { value: 'h3', label: 'H3' },
    { value: 'list', label: 'Lista' },
    { value: 'quote', label: 'Cita' },
    { value: 'code', label: 'Codigo' },
  ]

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: '0.5rem', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '6px 12px', backgroundColor: T.muted, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: T.fgMuted, fontFamily: fontMono }}>{blocks.length} bloques</span>
      </div>

      {blocks.map((block, i) => (
        <div key={block.id} style={{ borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 4 }}>
          {/* Block controls */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 2px', alignItems: 'center', backgroundColor: T.muted, minWidth: 28 }}>
            <button onClick={() => moveBlock(block.id, 'up')} disabled={i === 0}
              style={{ fontSize: 10, color: T.fgMuted, background: 'none', border: 'none', cursor: 'pointer', opacity: i === 0 ? 0.3 : 1 }}>&#9650;</button>
            <button onClick={() => moveBlock(block.id, 'down')} disabled={i === blocks.length - 1}
              style={{ fontSize: 10, color: T.fgMuted, background: 'none', border: 'none', cursor: 'pointer', opacity: i === blocks.length - 1 ? 0.3 : 1 }}>&#9660;</button>
            <button onClick={() => deleteBlock(block.id)}
              style={{ fontSize: 10, color: T.destructive, background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>&#10005;</button>
          </div>

          {/* Block type + content */}
          <div style={{ flex: 1, padding: 4 }}>
            <select value={block.type} onChange={e => {
              const updated = blocks.map(b => b.id === block.id ? { ...b, type: e.target.value } : b)
              setBlocks(updated)
            }} style={{ fontSize: 9, padding: '1px 4px', backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}`, borderRadius: 3, marginBottom: 2 }}>
              {BLOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <textarea
              value={block.content}
              onChange={e => updateBlock(block.id, e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); addBlock(block.id) } }}
              rows={Math.max(1, block.content.split('\n').length)}
              style={{ width: '100%', backgroundColor: 'transparent', color: T.fg, border: 'none', outline: 'none', resize: 'vertical', fontFamily: fontMono, fontSize: 12, lineHeight: 1.6, padding: 4 }}
              placeholder="Escribe aqui... (Shift+Enter = nuevo bloque)"
            />
          </div>
        </div>
      ))}

      {/* Add block */}
      <button onClick={() => addBlock(blocks[blocks.length - 1]?.id)}
        style={{ width: '100%', padding: '6px', backgroundColor: T.muted, color: T.fgMuted, border: 'none', cursor: 'pointer', fontSize: 11 }}>
        + Nuevo bloque
      </button>
    </div>
  )
}

// ─── Article Editor ─────────────────────────────────────────

function ArticleEditor({ value, onChange }) {
  const [mode, setMode] = useState('write') // 'write' | 'preview' | 'blocks'
  const textareaRef = useRef(null)

  function insertAtCursor(before, after = '') {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.substring(start, end)
    const newText = value.substring(0, start) + before + selected + after + value.substring(end)
    onChange(newText)
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + before.length + selected.length + after.length }, 0)
  }

  const toolbar = [
    { label: 'H1', action: () => insertAtCursor('# ') },
    { label: 'H2', action: () => insertAtCursor('## ') },
    { label: 'H3', action: () => insertAtCursor('### ') },
    { label: 'B', action: () => insertAtCursor('**', '**'), style: { fontWeight: 'bold' } },
    { label: 'I', action: () => insertAtCursor('*', '*'), style: { fontStyle: 'italic' } },
    { label: '\u2022', action: () => insertAtCursor('- ') },
    { label: '1.', action: () => insertAtCursor('1. ') },
    { label: '>', action: () => insertAtCursor('> ') },
    { label: '[]', action: () => insertAtCursor('[enlace](', ')') },
    { label: 'img', action: () => insertAtCursor('![alt](', ')') },
    { label: '---', action: () => insertAtCursor('\n---\n') },
    { label: '```', action: () => insertAtCursor('```\n', '\n```') },
  ]

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 2, padding: '6px', backgroundColor: T.muted, borderRadius: '0.5rem 0.5rem 0 0', border: `1px solid ${T.border}`, borderBottom: 'none', flexWrap: 'wrap', alignItems: 'center' }}>
        {toolbar.map(btn => (
          <button key={btn.label} onClick={btn.action} type="button"
            style={{ padding: '2px 8px', fontSize: 11, color: T.fgMuted, backgroundColor: 'transparent', border: `1px solid ${T.border}`, borderRadius: 4, cursor: 'pointer', fontFamily: fontMono, ...(btn.style || {}) }}>
            {btn.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={() => setMode('write')} type="button"
            style={{ padding: '2px 10px', fontSize: 10, color: mode === 'write' ? T.cyan : T.fgMuted, backgroundColor: mode === 'write' ? `${T.cyan}20` : 'transparent', border: `1px solid ${mode === 'write' ? `${T.cyan}40` : T.border}`, borderRadius: 4, cursor: 'pointer' }}>
            Escribir
          </button>
          <button onClick={() => setMode('preview')} type="button"
            style={{ padding: '2px 10px', fontSize: 10, color: mode === 'preview' ? T.cyan : T.fgMuted, backgroundColor: mode === 'preview' ? `${T.cyan}20` : 'transparent', border: `1px solid ${mode === 'preview' ? `${T.cyan}40` : T.border}`, borderRadius: 4, cursor: 'pointer' }}>
            Preview
          </button>
          <button onClick={() => setMode('blocks')} type="button"
            style={{ padding: '2px 10px', fontSize: 10, color: mode === 'blocks' ? T.cyan : T.fgMuted, backgroundColor: mode === 'blocks' ? `${T.cyan}20` : 'transparent', border: `1px solid ${mode === 'blocks' ? `${T.cyan}40` : T.border}`, borderRadius: 4, cursor: 'pointer' }}>
            Bloques
          </button>
        </div>
      </div>

      {/* Editor / Preview / Blocks */}
      {mode === 'write' ? (
        <textarea ref={textareaRef} value={value} onChange={e => onChange(e.target.value)}
          placeholder="Escribe en Markdown... (usa la toolbar para formatear)"
          rows={16}
          style={{ ...inputStyle, borderRadius: '0 0 0.5rem 0.5rem', minHeight: 300, resize: 'vertical', fontFamily: fontMono, fontSize: '0.8rem', lineHeight: 1.7 }} />
      ) : mode === 'blocks' ? (
        <BlockEditor value={value} onChange={onChange} />
      ) : (
        <div style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, borderRadius: '0 0 0.5rem 0.5rem', padding: '1rem', minHeight: 300, maxHeight: 500, overflowY: 'auto', fontSize: '0.85rem', lineHeight: 1.8, color: T.fg }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value || '') }} />
      )}

      {/* Word count */}
      <p style={{ fontSize: 10, color: T.fgMuted, marginTop: 4, fontFamily: fontMono, textAlign: 'right' }}>
        {(value || '').split(/\s+/).filter(Boolean).length} palabras &middot; {Math.max(1, Math.round((value || '').split(/\s+/).filter(Boolean).length / 200))} min lectura
      </p>
    </div>
  )
}

// ─── Content Hub ────────────────────────────────────────────

function ContentHubTab() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState(null)
  const [contentView, setContentView] = useState('preview')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')

  // Create form
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [articleType, setArticleType] = useState('blog')
  const [keyword, setKeyword] = useState('')
  const [tags, setTags] = useState('')

  // Generate form
  const [genTopic, setGenTopic] = useState('')
  const [genAudience, setGenAudience] = useState('CEO, DPO, CTO de empresas españolas')
  const [genWords, setGenWords] = useState(1500)
  const [genProvider, setGenProvider] = useState('')
  const [genModel, setGenModel] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['seo-articles', page, filterStatus, search],
    queryFn: async () => {
      try {
        const r = await seoCenterApi.articles({ page, status: filterStatus || undefined, search: search || undefined })
        return r.data
      } catch { return { items: [], total: 0, pages: 0 } }
    },
  })

  const { data: providersData } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: async () => {
      try {
        const r = await seoCenterApi.providers()
        return r.data
      } catch { return { providers: [] } }
    },
  })

  const providers = providersData?.providers || []
  const selectedProviderModels = providers.find(p => p.id === genProvider)?.models || []

  const createMut = useMutation({
    mutationFn: (d) => seoCenterApi.createArticle(d),
    onSuccess: () => { toast.success('Artículo creado'); qc.invalidateQueries({ queryKey: ['seo-articles'] }); setShowCreate(false); setTitle(''); setContent('') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const generateMut = useMutation({
    mutationFn: (p) => seoCenterApi.generateArticle(p),
    onSuccess: () => { toast.success('Artículo generado con IA'); qc.invalidateQueries({ queryKey: ['seo-articles'] }); setShowGenerate(false) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error generando'),
  })

  const publishMut = useMutation({
    mutationFn: (id) => seoCenterApi.publishArticle(id),
    onSuccess: () => { toast.success('Publicado'); qc.invalidateQueries({ queryKey: ['seo-articles'] }) },
  })

  const deleteMut = useMutation({
    mutationFn: (id) => seoCenterApi.deleteArticle(id),
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['seo-articles'] }) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => seoCenterApi.updateArticle(id, data),
    onSuccess: () => { toast.success('Artículo actualizado'); qc.invalidateQueries({ queryKey: ['seo-articles'] }); setEditingId(null); setEditContent('') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error actualizando'),
  })

  const articles = data?.items || []

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: T.fgMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar artículos..." style={{ ...inputStyle, paddingLeft: '2.25rem' }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">Todos</option>
          <option value="draft">Borrador</option>
          <option value="review">Revisión</option>
          <option value="published">Publicado</option>
          <option value="archived">Archivado</option>
        </select>
        <button onClick={() => setShowCreate(!showCreate)} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5" style={{ backgroundColor: T.cyan, color: T.bg }}>
          <Plus className="w-4 h-4" /> Nuevo
        </button>
        <button onClick={() => setShowGenerate(!showGenerate)} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 border" style={{ borderColor: T.purple, color: T.purple }}>
          <Sparkles className="w-4 h-4" /> Generar con IA
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={e => { e.preventDefault(); createMut.mutate({ title, content, article_type: articleType, primary_keyword: keyword, tags: tags ? tags.split(',').map(t => t.trim()) : [] }) }}
          className="rounded-xl p-5 space-y-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-semibold" style={{ color: T.fg }}>Nuevo artículo</h3>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" required style={inputStyle} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={articleType} onChange={e => setArticleType(e.target.value)} style={inputStyle}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Keyword principal" style={inputStyle} />
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma sep)" style={inputStyle} />
          </div>
          <ArticleEditor value={content} onChange={setContent} />
          <div className="flex gap-2">
            <button type="submit" disabled={createMut.isPending} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: T.cyan, color: T.bg }}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: T.border, color: T.fgMuted }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Generate form */}
      {showGenerate && (
        <form onSubmit={e => { e.preventDefault(); generateMut.mutate({ topic: genTopic, audience: genAudience, word_count: genWords, provider: genProvider || undefined, model: genModel || undefined }) }}
          className="rounded-xl p-5 space-y-3" style={{ backgroundColor: T.card, border: `1px solid ${T.purple}40` }}>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: T.purple }}><Sparkles className="w-4 h-4" /> Generar artículo con IA (4 agentes)</h3>
          <input value={genTopic} onChange={e => setGenTopic(e.target.value)} placeholder="Tema: ej. Guía de cumplimiento Scale para PYMEs" required style={inputStyle} />
          <div className="grid grid-cols-2 gap-3">
            <input value={genAudience} onChange={e => setGenAudience(e.target.value)} placeholder="Audiencia" style={inputStyle} />
            <input type="number" value={genWords} onChange={e => setGenWords(+e.target.value)} min={500} max={5000} style={inputStyle} />
          </div>

          {/* AI Provider Selector */}
          <div className="rounded-lg p-3" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ fontFamily: fontMono, color: T.fgMuted }}>Motor IA</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={genProvider} onChange={e => { setGenProvider(e.target.value); setGenModel('') }} style={inputStyle}>
                <option value="">Auto (por defecto)</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={genModel} onChange={e => setGenModel(e.target.value)} style={inputStyle} disabled={!genProvider}>
                <option value="">Modelo por defecto</option>
                {selectedProviderModels.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={generateMut.isPending} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" style={{ backgroundColor: T.purple, color: 'white' }}>
            {generateMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando{genProvider ? ` con ${genProvider}` : ''} (30-60s)...</> : <><Sparkles className="w-4 h-4" /> Generar{genProvider ? ` con ${providers.find(p => p.id === genProvider)?.name || genProvider}` : ''}</>}
          </button>
        </form>
      )}

      {/* Articles list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: T.fgMuted }} />
          <p className="text-sm" style={{ color: T.fgMuted }}>Sin artículos. Crea uno o genera con IA.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map(a => (
            <div key={a.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                {expanded === a.id ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: T.fgMuted }} /> : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: T.fgMuted }} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: T.fg }}>{a.title}</span>
                    <Badge status={a.status} />
                    <ScoreBadge score={a.seo_score} />
                  </div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[10px]" style={{ fontFamily: fontMono, color: T.fgMuted }}>{TYPE_LABELS[a.article_type] || a.article_type}</span>
                    <span className="text-[10px]" style={{ fontFamily: fontMono, color: T.fgMuted }}>{a.word_count} palabras</span>
                    <span className="text-[10px]" style={{ fontFamily: fontMono, color: T.fgMuted }}>{a.reading_time_min} min lectura</span>
                    {a.primary_keyword && <span className="text-[10px]" style={{ fontFamily: fontMono, color: T.cyan }}>{a.primary_keyword}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {a.status === 'draft' && <button onClick={e => { e.stopPropagation(); publishMut.mutate(a.id) }} className="p-1.5" style={{ color: T.success }} title="Publicar"><Send className="w-4 h-4" /></button>}
                  <button onClick={e => { e.stopPropagation(); deleteMut.mutate(a.id) }} className="p-1.5" style={{ color: T.fgMuted }} title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {expanded === a.id && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: T.border }}>
                  {editingId === a.id ? (
                    /* Edit mode */
                    <div className="mt-3 space-y-3">
                      <ArticleEditor value={editContent} onChange={setEditContent} />
                      <div className="flex gap-2">
                        <button onClick={() => updateMut.mutate({ id: a.id, data: { content: editContent } })} disabled={updateMut.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5" style={{ backgroundColor: T.cyan, color: T.bg }}>
                          {updateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar
                        </button>
                        <button onClick={() => { setEditingId(null); setEditContent('') }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border" style={{ borderColor: T.border, color: T.fgMuted }}>
                          <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="flex gap-1 mt-3 mb-2">
                        <button onClick={() => setContentView('preview')} className="px-2.5 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: contentView === 'preview' ? `${T.cyan}20` : T.muted, color: contentView === 'preview' ? T.cyan : T.fgMuted, border: `1px solid ${contentView === 'preview' ? T.cyan : T.border}` }}>
                          <Eye className="w-3 h-3 inline mr-1" style={{ verticalAlign: '-2px' }} />Preview
                        </button>
                        <button onClick={() => setContentView('code')} className="px-2.5 py-1 rounded text-[10px] font-medium" style={{ backgroundColor: contentView === 'code' ? `${T.cyan}20` : T.muted, color: contentView === 'code' ? T.cyan : T.fgMuted, border: `1px solid ${contentView === 'code' ? T.cyan : T.border}` }}>
                          <FileText className="w-3 h-3 inline mr-1" style={{ verticalAlign: '-2px' }} />Código
                        </button>
                      </div>
                      <div className="p-3 rounded-lg max-h-64 overflow-auto" style={{ backgroundColor: T.muted }}>
                        {contentView === 'preview' ? (
                          <div className="text-xs leading-relaxed" style={{ color: T.fgMuted }} dangerouslySetInnerHTML={{ __html: renderMarkdown(a.content) }} />
                        ) : (
                          <pre className="text-xs whitespace-pre-wrap" style={{ fontFamily: fontMono, color: T.fg }}>{a.content?.slice(0, 2000)}{a.content?.length > 2000 ? '...' : ''}</pre>
                        )}
                      </div>
                      {a.meta_title && <p className="mt-2 text-xs" style={{ color: T.fgMuted }}>Meta: {a.meta_title}</p>}
                      {a.tags?.length > 0 && <div className="flex gap-1 mt-2">{a.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${T.cyan}15`, color: T.cyan }}>{t}</span>)}</div>}
                      {/* Export + Edit buttons */}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => { setEditingId(a.id); setEditContent(a.content || '') }}
                          className="px-2.5 py-1 rounded text-[10px] flex items-center gap-1" style={{ backgroundColor: `${T.cyan}20`, color: T.cyan, border: `1px solid ${T.cyan}40` }}>
                          <PenTool className="w-3 h-3" /> Editar
                        </button>
                        <button onClick={() => seoCenterApi.exportMarkdown(a.id).then(r => { const url = URL.createObjectURL(r.data); const link = document.createElement('a'); link.href = url; link.download = `${a.slug || 'article'}.md`; link.click() })}
                          className="px-2.5 py-1 rounded text-[10px] flex items-center gap-1" style={{ backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}` }}>
                          <Download className="w-3 h-3" /> Markdown
                        </button>
                        <button onClick={() => seoCenterApi.exportHtml(a.id).then(r => { const url = URL.createObjectURL(r.data); const link = document.createElement('a'); link.href = url; link.download = `${a.slug || 'article'}.html`; link.click() })}
                          className="px-2.5 py-1 rounded text-[10px] flex items-center gap-1" style={{ backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}` }}>
                          <Download className="w-3 h-3" /> HTML
                        </button>
                        <button onClick={() => seoCenterApi.exportToDrive(a.id).then(() => toast.success('Exportado a Drive')).catch(() => toast.error('Error exportando a Drive'))}
                          className="px-2.5 py-1 rounded text-[10px] flex items-center gap-1" style={{ backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}` }}>
                          <ExternalLink className="w-3 h-3" /> Google Drive
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(a.content || ''); toast.success('Contenido copiado') }}
                          className="px-2.5 py-1 rounded text-[10px] flex items-center gap-1" style={{ backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}` }}>
                          <Copy className="w-3 h-3" /> Copiar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded text-sm border disabled:opacity-30" style={{ borderColor: T.border, color: T.fgMuted }}>Anterior</button>
          <span className="text-xs py-1" style={{ color: T.fgMuted }}>{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded text-sm border disabled:opacity-30" style={{ borderColor: T.border, color: T.fgMuted }}>Siguiente</button>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ──────────────────────────────────────────────

function DashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['seo-dashboard'],
    queryFn: () => seoCenterApi.dashboard().then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
  const a = data?.articles || {}
  const k = data?.keywords || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Artículos', value: a.total || 0 },
          { label: 'Publicados', value: a.published || 0, color: T.success },
          { label: 'Borradores', value: a.drafts || 0, color: T.warning },
          { label: 'SEO Score Medio', value: a.avg_seo_score || 0, color: T.cyan },
          { label: 'Keywords', value: k.total || 0 },
          { label: 'Pos. Media', value: k.avg_position || '-' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>{kpi.label}</p>
            <p className="text-lg font-bold mt-1" style={{ fontFamily: fontDisplay, color: kpi.color || T.fg }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {data?.top_articles?.length > 0 && (
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg }}>Top artículos</h3>
          {data.top_articles.map((art, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: T.border }}>
              <span className="text-xs w-6 text-right" style={{ fontFamily: fontMono, color: T.fgMuted }}>{i + 1}</span>
              <span className="text-sm flex-1 truncate" style={{ color: T.fg }}>{art.title}</span>
              <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{art.views} views</span>
              <ScoreBadge score={art.seo_score} />
            </div>
          ))}
        </div>
      )}

      <ContentCalendarHeatmap />

      <TopicNetworkGraph />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.by_type && Object.keys(data.by_type).length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg }}>Por tipo</h3>
            {Object.entries(data.by_type).map(([type, count]) => (
              <div key={type} className="flex justify-between py-1.5">
                <span className="text-xs" style={{ color: T.fgMuted }}>{TYPE_LABELS[type] || type}</span>
                <span className="text-xs font-bold" style={{ fontFamily: fontMono, color: T.fg }}>{count}</span>
              </div>
            ))}
          </div>
        )}
        {data?.by_regulatory_focus && Object.keys(data.by_regulatory_focus).length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg }}>Por normativa</h3>
            {Object.entries(data.by_regulatory_focus).map(([reg, count]) => (
              <div key={reg} className="flex justify-between py-1.5">
                <span className="text-xs" style={{ color: T.cyan }}>{reg}</span>
                <span className="text-xs font-bold" style={{ fontFamily: fontMono, color: T.fg }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ContentCalendarHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ['seo-content-calendar'],
    queryFn: () => seoCenterApi.contentCalendar().then(r => r.data).catch(() => null),
    staleTime: 120000,
  })

  if (isLoading) return (
    <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="h-4 w-40 rounded animate-pulse mb-3" style={{ backgroundColor: T.muted }} />
      <div className="h-24 rounded animate-pulse" style={{ backgroundColor: T.muted }} />
    </div>
  )

  if (!data?.published) return null
  const published = data.published
  const days = Object.keys(published).sort()
  if (!days.length && Object.keys(published).length === 0) {
    // Generate empty heatmap even with no data
  }

  const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const cells = []
  const now = new Date()
  for (let i = 180; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const count = published[key] || 0
    cells.push({ date: key, count, day: d.getDay() })
  }

  const cellSize = 12, gap = 2
  const weeks = Math.ceil(cells.length / 7)
  const totalCount = cells.reduce((s, c) => s + c.count, 0)

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: T.fg }}>
          <BarChart3 className="w-4 h-4" style={{ color: T.cyan }} /> Calendario de Publicación
        </h3>
        <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{totalCount} artículos en 6 meses</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: gap, paddingTop: 0, marginRight: 4 }}>
            {DAY_LABELS.map(label => (
              <div key={label} style={{ height: cellSize, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: T.fgMuted, fontFamily: fontMono, width: 24 }}>{label}</span>
              </div>
            ))}
          </div>
          <svg width={weeks * (cellSize + gap)} height={7 * (cellSize + gap)} style={{ display: 'block' }}>
            {cells.map((c, i) => {
              const week = Math.floor(i / 7)
              const day = i % 7
              const opacity = c.count === 0 ? 0.1 : Math.min(1, 0.3 + c.count * 0.25)
              return (
                <rect key={c.date} x={week * (cellSize + gap)} y={day * (cellSize + gap)}
                  width={cellSize} height={cellSize} rx={2}
                  fill={c.count > 0 ? T.cyan : T.fgMuted} fillOpacity={opacity}>
                  <title>{c.date}: {c.count} artículo(s)</title>
                </rect>
              )
            })}
          </svg>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span style={{ fontSize: 9, color: T.fgMuted, fontFamily: fontMono }}>Menos</span>
        {[0.1, 0.3, 0.55, 0.8, 1].map((op, i) => (
          <div key={i} style={{ width: cellSize, height: cellSize, borderRadius: 2, backgroundColor: i === 0 ? T.fgMuted : T.cyan, opacity: op }} />
        ))}
        <span style={{ fontSize: 9, color: T.fgMuted, fontFamily: fontMono }}>Más</span>
      </div>
    </div>
  )
}

function TopicNetworkGraph() {
  const [tooltip, setTooltip] = useState(null)
  const { data, isLoading } = useQuery({
    queryKey: ['seo-topic-graph'],
    queryFn: () => seoCenterApi.topicGraph().then(r => r.data),
    staleTime: 120000,
  })

  if (isLoading || !data?.nodes?.length) return null

  const nodes = data.nodes
  const links = data.links || data.edges || []
  const width = 600, height = 400, cx = width / 2, cy = height / 2, radius = 150

  const positioned = nodes.map((n, i) => ({
    ...n,
    x: cx + radius * Math.cos(2 * Math.PI * i / nodes.length),
    y: cy + radius * Math.sin(2 * Math.PI * i / nodes.length),
  }))

  function handleNodeClick(node) {
    if (node.type === 'article' && node.slug) {
      window.open(`/marketing/seo?article=${node.slug}`, '_blank')
    } else if (node.type === 'keyword' || node.type === 'topic') {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(node.label || '')}`, '_blank')
    }
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, position: 'relative' }}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: T.fg }}>
        <Globe className="w-4 h-4" style={{ color: T.cyan }} /> Red de Topics
      </h3>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxHeight: 400 }}>
        {links.map((link, i) => {
          const source = positioned.find(n => n.id === link.source)
          const target = positioned.find(n => n.id === link.target)
          if (!source || !target) return null
          return <line key={i} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={T.cyan} strokeOpacity={0.2} />
        })}
        {positioned.map(n => (
          <g key={n.id} style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, label: n.label, type: n.type, score: n.score })}
            onMouseLeave={() => setTooltip(null)}
            onClick={() => handleNodeClick(n)}>
            <circle cx={n.x} cy={n.y} r={n.size || 10} fill={n.type === 'article' ? T.cyan : T.purple} fillOpacity={0.7} />
            <text x={n.x} y={n.y + (n.size || 10) + 12} textAnchor="middle" fill={T.fgMuted} fontSize={8} fontFamily={fontMono}>
              {n.label?.slice(0, 20)}
            </text>
          </g>
        ))}
      </svg>
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 10, top: tooltip.y - 30, zIndex: 50,
          backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: '8px 12px', fontSize: 11, color: T.fg, maxWidth: 250,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', pointerEvents: 'none',
        }}>
          <p style={{ fontWeight: 600, margin: 0 }}>{tooltip.label}</p>
          {tooltip.type && <p style={{ color: T.fgMuted, margin: '2px 0 0', fontSize: 10 }}>{tooltip.type}</p>}
          {tooltip.score !== undefined && <p style={{ color: T.cyan, margin: '2px 0 0', fontSize: 10 }}>Score: {tooltip.score}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Repurposer ─────────────────────────────────────────────

function RepurposeTab() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState('')
  const [formats, setFormats] = useState('linkedin,twitter,email,video_script')
  const [result, setResult] = useState(null)

  const { data: articlesData } = useQuery({
    queryKey: ['seo-articles-all'],
    queryFn: () => seoCenterApi.articles({ page_size: 100 }).then(r => r.data),
  })

  const repurposeMut = useMutation({
    mutationFn: ({ id, formats }) => seoCenterApi.repurposeArticle(id, { formats }),
    onSuccess: (res) => { setResult(res.data.repurposed); toast.success('Contenido repurposed'); qc.invalidateQueries({ queryKey: ['seo-articles'] }) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const FORMAT_ICONS = { linkedin: Linkedin, twitter: PenTool, email: Mail, video_script: Video, infografia: BookOpen }
  const articles = articlesData?.items || []

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg }}>Repurpose artículo a múltiples formatos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={inputStyle}>
            <option value="">Seleccionar artículo...</option>
            {articles.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <input value={formats} onChange={e => setFormats(e.target.value)} placeholder="Formatos" style={inputStyle} />
          <button onClick={() => selectedId && repurposeMut.mutate({ id: selectedId, formats })}
            disabled={!selectedId || repurposeMut.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-40"
            style={{ backgroundColor: T.purple, color: 'white' }}>
            {repurposeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat2 className="w-4 h-4" />}
            Repurpose
          </button>
        </div>
        <p className="text-[10px]" style={{ color: T.fgMuted }}>Formatos: linkedin, twitter, email, video_script, infografia</p>
      </div>

      {result && (
        <div className="space-y-3">
          {Object.entries(result).map(([fmt, content]) => {
            const Icon = FORMAT_ICONS[fmt] || FileText
            return (
              <div key={fmt} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: T.cyan }} />
                    <span className="text-sm font-medium" style={{ color: T.fg }}>{fmt}</span>
                  </div>
                  <button aria-label="Copiar" onClick={() => { navigator.clipboard.writeText(content); toast.success('Copiado') }} className="p-1" style={{ color: T.fgMuted }}><Copy className="w-4 h-4" /></button>
                </div>
                <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-auto" style={{ fontFamily: fontMono, color: T.fgMuted }}>{content}</pre>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Site Health ────────────────────────────────────────────

function HealthTab() {
  const qc = useQueryClient()
  const { data: articlesData } = useQuery({
    queryKey: ['seo-articles-health'],
    queryFn: () => seoCenterApi.articles({ page_size: 100 }).then(r => r.data),
  })

  const auditMut = useMutation({
    mutationFn: (id) => seoCenterApi.auditArticle(id),
    onSuccess: () => { toast.success('Auditoría completada'); qc.invalidateQueries({ queryKey: ['seo-articles-health'] }) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const articles = articlesData?.items || []
  const SEVERITY_COLORS = { high: T.destructive, medium: T.warning, low: T.fgMuted }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs" style={{ color: T.fgMuted }}>Audita cada artículo: meta tags, estructura, keywords, contenido</p>
        <button onClick={() => articles.forEach(a => auditMut.mutate(a.id))} disabled={auditMut.isPending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5" style={{ backgroundColor: T.cyan, color: T.bg }}>
          <RefreshCw className="w-3.5 h-3.5" /> Auditar todos
        </button>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: T.fgMuted }} />
          <p className="text-sm" style={{ color: T.fgMuted }}>Sin artículos para auditar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map(a => (
            <div key={a.id} className="rounded-xl p-4 flex items-center gap-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <ScoreBadge score={a.audit_score} />
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block" style={{ color: T.fg }}>{a.title}</span>
                {a.audit_issues?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.audit_issues.slice(0, 3).map((issue, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: SEVERITY_COLORS[issue.severity], backgroundColor: `${SEVERITY_COLORS[issue.severity]}15` }}>
                        {issue.message}
                      </span>
                    ))}
                    {a.audit_issues.length > 3 && <span className="text-[10px]" style={{ color: T.fgMuted }}>+{a.audit_issues.length - 3} más</span>}
                  </div>
                )}
              </div>
              <button aria-label="Recargar" onClick={() => auditMut.mutate(a.id)} disabled={auditMut.isPending} className="p-1.5 rounded" style={{ color: T.cyan }}>
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Brand Monitor ──────────────────────────────────────────

function BrandTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['seo-brand'],
    queryFn: () => seoCenterApi.brandMonitor().then(r => r.data),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Keywords totales</p>
          <p className="text-lg font-bold mt-1" style={{ fontFamily: fontDisplay, color: T.fg }}>{data?.total_keywords || 0}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Top 10</p>
          <p className="text-lg font-bold mt-1" style={{ fontFamily: fontDisplay, color: T.success }}>{data?.top10_count || 0}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Share of Voice</p>
          <p className="text-lg font-bold mt-1" style={{ fontFamily: fontDisplay, color: T.cyan }}>{data?.share_of_voice_pct || 0}%</p>
        </div>
      </div>

      {data?.brand_keywords?.length > 0 && (
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg }}>Keywords de marca</h3>
          {data.brand_keywords.map((kw, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: T.border }}>
              <span className="text-sm flex-1" style={{ color: T.fg }}>{kw.keyword}</span>
              <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{kw.search_volume} vol</span>
              <span className="text-xs font-bold" style={{ fontFamily: fontMono, color: kw.position && kw.position <= 10 ? T.success : kw.position ? T.warning : T.fgMuted }}>
                {kw.position ? `#${kw.position}` : '-'}
              </span>
            </div>
          ))}
        </div>
      )}

      <CompetitorsBubbleChart />
    </div>
  )
}

function CompetitorsBubbleChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['seo-competitors-bubble'],
    queryFn: () => seoCenterApi.competitorsBubble().then(r => r.data),
    staleTime: 120000,
  })

  if (isLoading) return null

  const competitors = data?.competitors || data?.bubbles || []
  if (!competitors.length) return null

  const chartData = competitors.map((c, i) => ({
    name: c.name || c.label,
    x: c.keywords || c.x || i * 10,
    y: c.visibility || c.y || Math.random() * 100,
    z: c.size || c.traffic || 500,
    isOwn: (c.name || c.label || '').toLowerCase().includes('st4rtup'),
  }))

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: T.fg }}>
        <Globe className="w-4 h-4" style={{ color: T.cyan }} /> Mapa de Competidores
      </h3>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name="Keywords"
            tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false}
            label={{ value: 'Keywords', position: 'bottom', fontSize: 10, fill: T.fgMuted, fontFamily: fontMono, offset: 0 }} />
          <YAxis type="number" dataKey="y" name="Visibilidad"
            tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={false}
            label={{ value: 'Visibilidad', angle: -90, position: 'insideLeft', fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} />
          <ZAxis type="number" dataKey="z" range={[80, 600]} />
          <RechartsTooltip
            contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            itemStyle={{ color: T.fg, fontSize: 11, fontFamily: fontMono }}
            labelStyle={{ color: T.cyan, fontWeight: 600, fontSize: 12, fontFamily: fontMono, marginBottom: 2 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div style={{
                  backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: '8px 12px', fontSize: 11, color: T.fg, maxWidth: 250,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                  <p style={{ fontWeight: 600, margin: 0, color: d.isOwn ? T.cyan : T.fg }}>{d.name}</p>
                  <p style={{ color: T.fgMuted, margin: '2px 0 0', fontSize: 10 }}>Keywords: {d.x}</p>
                  <p style={{ color: T.fgMuted, margin: '2px 0 0', fontSize: 10 }}>Visibilidad: {d.y}</p>
                  <p style={{ color: T.cyan, margin: '2px 0 0', fontSize: 10 }}>Trafico: {d.z}</p>
                </div>
              )
            }} />
          <Scatter data={chartData}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.isOwn ? T.cyan : T.fgMuted} fillOpacity={entry.isOwn ? 0.9 : 0.4} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: T.fgMuted }}>
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: T.cyan, opacity: 0.9 }} /> St4rtup
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: T.fgMuted }}>
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: T.fgMuted, opacity: 0.4 }} /> Competidores
        </span>
      </div>
    </div>
  )
}

// ─── Keyword Studio ─────────────────────────────────────────

function KeywordStudioTab() {
  const [topic, setTopic] = useState('')
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [saveKw, setSaveKw] = useState(true)
  const [result, setResult] = useState(null)

  const { data: providersData } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: async () => { try { return (await seoCenterApi.providers()).data } catch { return { providers: [] } } },
  })

  const { data: suggestionsData } = useQuery({
    queryKey: ['kw-suggestions', topic],
    queryFn: async () => { try { return (await seoCenterApi.keywordSuggestions({ topic: topic || undefined })).data } catch { return { suggestions: [] } } },
    enabled: topic.length >= 3,
  })

  const researchMut = useMutation({
    mutationFn: (p) => seoCenterApi.keywordResearch(p),
    onSuccess: (r) => { setResult(r.data); toast.success(`Research completado${r.data.saved_keywords ? ` — ${r.data.saved_keywords} keywords guardadas` : ''}`) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const providers = providersData?.providers || []
  const models = providers.find(p => p.id === provider)?.models || []

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: T.fg }}>
          <Key className="w-4 h-4" style={{ color: T.cyan }} /> Keyword Research con IA
        </h3>
        <p className="text-xs mb-4" style={{ color: T.fgMuted }}>Ejecuta el Agente de Keywords: clustering semántico, PAA, entidades, análisis SERP</p>

        <div className="space-y-3">
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Tema: ej. cumplimiento SaaS para empresas sanitarias" style={inputStyle} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={provider} onChange={e => { setProvider(e.target.value); setModel('') }} style={inputStyle}>
              <option value="">Motor IA: Auto</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={model} onChange={e => setModel(e.target.value)} style={inputStyle} disabled={!provider}>
              <option value="">Modelo por defecto</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs" style={{ color: T.fgMuted }}>
              <input type="checkbox" checked={saveKw} onChange={e => setSaveKw(e.target.checked)} />
              Guardar keywords en BD
            </label>
          </div>

          <button onClick={() => topic && researchMut.mutate({ topic, provider: provider || undefined, model: model || undefined, save: saveKw })}
            disabled={!topic || researchMut.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-40"
            style={{ backgroundColor: T.cyan, color: T.bg }}>
            {researchMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Investigando...</> : <><Search className="w-4 h-4" /> Investigar keywords</>}
          </button>
        </div>
      </div>

      {suggestionsData?.suggestions?.length > 0 && Array.isArray(suggestionsData.suggestions) && (
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg }}>Keywords existentes relacionadas</h3>
          <div className="space-y-1">
            {suggestionsData.suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded text-xs" style={{ backgroundColor: T.muted }}>
                <span className="flex-1" style={{ color: T.fg }}>{s.keyword}</span>
                {s.volume && <span style={{ fontFamily: fontMono, color: T.fgMuted }}>{s.volume} vol</span>}
                {s.difficulty && <span style={{ fontFamily: fontMono, color: s.difficulty > 70 ? T.destructive : s.difficulty > 40 ? T.warning : T.success }}>{s.difficulty} dif</span>}
                <span className="text-[10px]" style={{ color: T.cyan }}>{s.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: T.fg }}>Resultado del research</h3>
            <div className="flex gap-2">
              {result.saved_keywords > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.success}15`, color: T.success }}>{result.saved_keywords} guardadas</span>}
              <button aria-label="Copiar" onClick={() => { navigator.clipboard.writeText(result.output); toast.success('Copiado') }} className="p-1" style={{ color: T.fgMuted }}><Copy className="w-4 h-4" /></button>
            </div>
          </div>
          <pre className="text-xs whitespace-pre-wrap max-h-96 overflow-auto p-3 rounded-lg" style={{ backgroundColor: T.muted, fontFamily: fontMono, color: T.fg }}>
            {result.output}
          </pre>
        </div>
      )}

      {/* Keyword Rankings Overview */}
      <KeywordRankingsOverview />
    </div>
  )
}

function KeywordRankingsOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['seo-keywords-overview'],
    queryFn: async () => { try { return (await seoCenterApi.keywordsOverview()).data } catch { return { keywords: [] } } },
    staleTime: 120000,
  })

  const keywords = data?.keywords || data || []
  if (isLoading || !Array.isArray(keywords) || keywords.length === 0) return null

  function Sparkline({ history }) {
    if (!history || !Array.isArray(history) || history.length < 2) return null
    const positions = history.slice(-10)
    const maxPos = Math.max(...positions, 1)
    const minPos = Math.min(...positions, 1)
    const range = Math.max(maxPos - minPos, 1)
    const w = 60, h = 20, padding = 2
    const points = positions.map((pos, i) => {
      const x = padding + (i / (positions.length - 1)) * (w - 2 * padding)
      // Invert Y: lower position = higher on chart (better ranking)
      const y = padding + ((pos - minPos) / range) * (h - 2 * padding)
      return `${x},${y}`
    }).join(' ')

    return (
      <svg width={w} height={h} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <polyline
          points={points}
          fill="none"
          stroke={T.cyan}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {positions.map((pos, i) => {
          const x = padding + (i / (positions.length - 1)) * (w - 2 * padding)
          const y = padding + ((pos - minPos) / range) * (h - 2 * padding)
          return <circle key={i} cx={x} cy={y} r={1.5} fill={T.cyan} />
        })}
      </svg>
    )
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: T.fg }}>
        <BarChart3 className="w-4 h-4" style={{ color: T.cyan }} /> Ranking de Keywords
      </h3>
      <div className="rounded-lg overflow-hidden overflow-x-auto" style={{ border: `1px solid ${T.border}` }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: T.muted }}>
              <th className="text-left px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Keyword</th>
              <th className="text-center px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Posicion</th>
              <th className="text-center px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Tendencia</th>
              <th className="text-right px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Volumen</th>
              <th className="text-center px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Historial</th>
            </tr>
          </thead>
          <tbody>
            {keywords.slice(0, 20).map((kw, i) => {
              const trend = kw.trend || kw.change || 0
              const trendColor = trend > 0 ? T.destructive : trend < 0 ? T.success : T.fgMuted
              const trendArrow = trend > 0 ? '\u2191' : trend < 0 ? '\u2193' : '\u2014'
              // For rankings: negative change = improved (went up), positive = worsened
              const trendLabel = trend > 0 ? `+${trend}` : trend < 0 ? `${trend}` : '='
              return (
                <tr key={kw.keyword || i} className="border-t" style={{ borderColor: T.border }}>
                  <td className="px-3 py-2" style={{ color: T.fg }}>{kw.keyword}</td>
                  <td className="px-3 py-2 text-center" style={{ fontFamily: fontMono, color: (kw.position || kw.rank) <= 10 ? T.success : (kw.position || kw.rank) <= 30 ? T.warning : T.fgMuted }}>
                    {kw.position || kw.rank || '-'}
                  </td>
                  <td className="px-3 py-2 text-center" style={{ fontFamily: fontMono, color: trendColor, fontWeight: 600 }}>
                    {trendArrow} {trendLabel}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                    {kw.volume != null ? kw.volume.toLocaleString('es-ES') : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Sparkline history={kw.history || kw.position_history} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Backlinks Manager ──────────────────────────────────────

function BacklinksTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [targetUrl, setTargetUrl] = useState('https://st4rtup.app')
  const [anchorText, setAnchorText] = useState('')
  const [linkType, setLinkType] = useState('dofollow')
  const [category, setCategory] = useState('')
  const [da, setDa] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['backlinks', page],
    queryFn: async () => { try { return (await seoCenterApi.backlinks({ page })).data } catch { return { items: [], total: 0, pages: 0 } } },
  })

  const { data: stats } = useQuery({
    queryKey: ['backlink-stats'],
    queryFn: async () => { try { return (await seoCenterApi.backlinkStats()).data } catch { return {} } },
  })

  const createMut = useMutation({
    mutationFn: (p) => seoCenterApi.createBacklink(p),
    onSuccess: () => { toast.success('Backlink añadido'); qc.invalidateQueries({ queryKey: ['backlinks'] }); qc.invalidateQueries({ queryKey: ['backlink-stats'] }); setShowAdd(false); setSourceUrl('') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => seoCenterApi.deleteBacklink(id),
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['backlinks'] }); qc.invalidateQueries({ queryKey: ['backlink-stats'] }) },
  })

  const backlinks = data?.items || []
  const s = stats || {}
  const STATUS_COLORS = { active: T.success, lost: T.destructive, broken: T.warning, pending: T.fgMuted }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: s.total || 0 },
          { label: 'Activos', value: s.active || 0, color: T.success },
          { label: 'Perdidos', value: s.lost || 0, color: T.destructive },
          { label: 'Dominios', value: s.unique_domains || 0, color: T.cyan },
          { label: 'DA Medio', value: s.avg_domain_authority || 0 },
          { label: 'Dofollow', value: `${s.dofollow_pct || 0}%`, color: T.success },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>{kpi.label}</p>
            <p className="text-lg font-bold mt-1" style={{ fontFamily: fontDisplay, color: kpi.color || T.fg }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <BacklinksRadialGraph />

      <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5" style={{ backgroundColor: T.cyan, color: T.bg }}>
        <Plus className="w-4 h-4" /> Nuevo backlink
      </button>

      {showAdd && (
        <form onSubmit={e => { e.preventDefault(); createMut.mutate({ source_url: sourceUrl, target_url: targetUrl, anchor_text: anchorText || undefined, link_type: linkType, category: category || undefined, domain_authority: da ? +da : undefined }) }}
          className="rounded-xl p-5 space-y-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-semibold" style={{ color: T.fg }}>Registrar backlink</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="URL origen" required style={inputStyle} />
            <input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="URL destino" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input value={anchorText} onChange={e => setAnchorText(e.target.value)} placeholder="Anchor text" style={inputStyle} />
            <select value={linkType} onChange={e => setLinkType(e.target.value)} style={inputStyle}>
              <option value="dofollow">Dofollow</option><option value="nofollow">Nofollow</option><option value="ugc">UGC</option><option value="sponsored">Sponsored</option>
            </select>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option value="">Categoría</option><option value="guest_post">Guest Post</option><option value="directory">Directorio</option><option value="mention">Mención</option><option value="press">Prensa</option><option value="forum">Foro</option><option value="social">Social</option>
            </select>
            <input value={da} onChange={e => setDa(e.target.value)} placeholder="DA" type="number" min="0" max="100" style={inputStyle} />
          </div>
          <button type="submit" disabled={createMut.isPending} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: T.cyan, color: T.bg }}>Guardar</button>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : backlinks.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <LinkIcon className="w-10 h-10 mx-auto mb-3" style={{ color: T.fgMuted }} />
          <p className="text-sm" style={{ color: T.fgMuted }}>Sin backlinks. Añade el primero.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: T.muted }}>
                <th className="text-left px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Dominio</th>
                <th className="text-left px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Anchor</th>
                <th className="text-left px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Tipo</th>
                <th className="text-left px-3 py-2 font-medium" style={{ color: T.fgMuted }}>DA</th>
                <th className="text-left px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Estado</th>
                <th className="text-left px-3 py-2 font-medium" style={{ color: T.fgMuted }}>Cat.</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {backlinks.map(bl => (
                <tr key={bl.id} className="border-t" style={{ borderColor: T.border }}>
                  <td className="px-3 py-2" style={{ color: T.cyan, fontFamily: fontMono }}>{bl.source_domain}</td>
                  <td className="px-3 py-2 max-w-[150px] truncate" style={{ color: T.fg }}>{bl.anchor_text || '-'}</td>
                  <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: bl.link_type === 'dofollow' ? `${T.success}15` : `${T.fgMuted}15`, color: bl.link_type === 'dofollow' ? T.success : T.fgMuted }}>{bl.link_type}</span></td>
                  <td className="px-3 py-2" style={{ fontFamily: fontMono, color: T.fg }}>{bl.domain_authority || '-'}</td>
                  <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded text-[10px]" style={{ color: STATUS_COLORS[bl.status] || T.fgMuted, backgroundColor: `${STATUS_COLORS[bl.status] || T.fgMuted}15` }}>{bl.status}</span></td>
                  <td className="px-3 py-2 text-[10px]" style={{ color: T.fgMuted }}>{bl.category || '-'}</td>
                  <td className="px-3 py-2"><button aria-label="Eliminar" onClick={() => deleteMut.mutate(bl.id)} className="p-1" style={{ color: T.fgMuted }}><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BacklinksRadialGraph() {
  const [tooltip, setTooltip] = useState(null)
  const { data, isLoading } = useQuery({
    queryKey: ['seo-backlinks-graph'],
    queryFn: () => seoCenterApi.backlinksGraph().then(r => r.data),
    staleTime: 120000,
  })

  if (isLoading) return null

  const nodes = data?.nodes || []
  if (nodes.length <= 1) return null

  const width = 500, height = 500, cx = width / 2, cy = height / 2
  const center = nodes.find(n => n.type === 'center')
  const domains = nodes.filter(n => n.type === 'domain')

  if (!domains.length) return null

  function handleDomainClick(domain) {
    if (domain.url) {
      window.open(domain.url, '_blank')
    } else if (domain.label) {
      window.open(`https://${domain.label}`, '_blank')
    }
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, position: 'relative' }}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: T.fg }}>
        <LinkIcon className="w-4 h-4" style={{ color: T.cyan }} /> Mapa de Backlinks
      </h3>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxHeight: 400 }}>
        {domains.map((d, i) => {
          const angle = (2 * Math.PI * i) / domains.length
          const r = 180
          const x = cx + r * Math.cos(angle)
          const y = cy + r * Math.sin(angle)
          return (
            <g key={d.id} style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, label: d.label, type: d.link_type || 'domain', da: d.da ?? d.domain_authority })}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => handleDomainClick(d)}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={T.cyan} strokeOpacity={0.15} />
              <circle cx={x} cy={y} r={d.size || 10} fill={T.cyan} fillOpacity={0.6} />
              <text x={x} y={y + (d.size || 10) + 10} textAnchor="middle" fill={T.fgMuted} fontSize={7} fontFamily={fontMono}>
                {d.label?.slice(0, 18)}
              </text>
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r={25} fill={T.cyan} fillOpacity={0.9} />
        <text x={cx} y={cy + 4} textAnchor="middle" fill={T.bg} fontSize={8} fontWeight="bold" fontFamily={fontMono}>
          st4rtup
        </text>
      </svg>
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 10, top: tooltip.y - 30, zIndex: 50,
          backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: '8px 12px', fontSize: 11, color: T.fg, maxWidth: 250,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', pointerEvents: 'none',
        }}>
          <p style={{ fontWeight: 600, margin: 0 }}>{tooltip.label}</p>
          {tooltip.type && <p style={{ color: T.fgMuted, margin: '2px 0 0', fontSize: 10 }}>{tooltip.type}</p>}
          {tooltip.da !== undefined && <p style={{ color: T.cyan, margin: '2px 0 0', fontSize: 10 }}>DA: {tooltip.da}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Content Pipeline (4 agentes IA) ────────────────────────

const PIPELINE_AGENTS = [
  { id: 'keywords', name: 'Keyword Agent', icon: Search, color: T.cyan, desc: 'Keywords, clustering semántico, PAA, entidades, análisis SERP' },
  { id: 'draft', name: 'Draft Agent', icon: FileText, color: T.purple, desc: 'Artículo con E-E-A-T, headings, CTAs, internal links' },
  { id: 'seo', name: 'SEO Agent', icon: BarChart3, color: T.success, desc: 'Auditoría on-page, densidad keyword, schema markup, score /100' },
  { id: 'meta', name: 'Meta Agent', icon: Tag, color: T.warning, desc: 'Title/desc A/B, OG tags, JSON-LD, plan distribución' },
]

function PipelineTab() {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('CEOs y responsables de compliance en España')
  const [wordCount, setWordCount] = useState(1500)
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [results, setResults] = useState({})
  const [activeAgent, setActiveAgent] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const { data: providersData } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: async () => { try { return (await seoCenterApi.providers()).data } catch { return { providers: [] } } },
  })

  const providers = providersData?.providers || []
  const models = providers.find(p => p.id === provider)?.models || []

  const fullPipeline = useMutation({
    mutationFn: () => contentPipelineApi.run({ topic, target_audience: audience, word_count: wordCount }),
    onSuccess: (res) => { setResults(res.data.stages || {}); setActiveAgent(null); toast.success('Pipeline completado — 4 agentes ejecutados') },
    onError: () => { setActiveAgent(null); toast.error('Error en pipeline') },
    onMutate: () => setActiveAgent('keywords'),
  })

  const runSingleAgent = useMutation({
    mutationFn: ({ agentId }) => {
      const apis = {
        keywords: () => contentPipelineApi.keywords({ topic, target_audience: audience }),
        draft: () => contentPipelineApi.draft({ topic, keywords: results.keywords?.output || '', word_count: wordCount }),
        seo: () => contentPipelineApi.seo({ draft: results.draft?.output || '', primary_keyword: topic }),
        meta: () => contentPipelineApi.meta({ article: results.seo?.output || results.draft?.output || '', primary_keyword: topic }),
      }
      return apis[agentId]()
    },
    onSuccess: (res, { agentId }) => { setResults(prev => ({ ...prev, [agentId]: res.data })); setActiveAgent(null) },
    onError: () => { setActiveAgent(null); toast.error('Error en agente') },
  })

  function handleCopy(id, text) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Config */}
      <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: T.fg }}>
          <Sparkles className="w-4 h-4" style={{ color: T.cyan }} /> 4 agentes IA en secuencia
        </h3>
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Tema: ej. Guía de cumplimiento Scale para PYMEs" style={inputStyle} />
        <div className="grid grid-cols-2 gap-3">
          <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Audiencia" style={inputStyle} />
          <input type="number" value={wordCount} onChange={e => setWordCount(+e.target.value)} min={500} max={5000} style={inputStyle} />
        </div>

        {/* Provider selector */}
        <div className="grid grid-cols-2 gap-3">
          <select value={provider} onChange={e => { setProvider(e.target.value); setModel('') }} style={inputStyle}>
            <option value="">Motor IA: Auto</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={model} onChange={e => setModel(e.target.value)} style={inputStyle} disabled={!provider}>
            <option value="">Modelo por defecto</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <button onClick={() => fullPipeline.mutate()} disabled={!topic || fullPipeline.isPending}
          className="px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-40"
          style={{ background: topic ? `linear-gradient(135deg, ${T.purple}, ${T.cyan})` : T.muted, color: topic ? T.bg : T.fgMuted, border: 'none', fontFamily: fontDisplay }}>
          {fullPipeline.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Ejecutar pipeline completo
        </button>
      </div>

      {/* Agent flow buttons */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {PIPELINE_AGENTS.map((agent, i) => (
          <div key={agent.id} className="flex items-center gap-1">
            <button
              onClick={() => { setActiveAgent(agent.id); runSingleAgent.mutate({ agentId: agent.id }) }}
              disabled={activeAgent !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: results[agent.id] ? `${agent.color}22` : T.muted,
                color: results[agent.id] ? agent.color : T.fgMuted,
                border: `1px solid ${results[agent.id] ? `${agent.color}44` : T.border}`,
              }}
            >
              <agent.icon className="w-3.5 h-3.5" />
              {agent.name.split(' ')[0]}
              {activeAgent === agent.id && <Loader2 className="w-3 h-3 animate-spin" />}
              {results[agent.id] && <Check className="w-3 h-3" />}
            </button>
            {i < PIPELINE_AGENTS.length - 1 && <ChevronRight className="w-3.5 h-3.5" style={{ color: T.fgMuted }} />}
          </div>
        ))}
      </div>

      {/* Agent results */}
      <div className="space-y-3">
        {PIPELINE_AGENTS.map(agent => {
          const result = results[agent.id]
          const content = result?.output || ''
          if (!content && activeAgent !== agent.id) return null
          return (
            <div key={agent.id} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${activeAgent === agent.id ? `${agent.color}66` : T.border}` }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${agent.color}22` }}>
                  <agent.icon className="w-4 h-4" style={{ color: agent.color }} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>{agent.name}</h4>
                  <p className="text-[10px]" style={{ color: T.fgMuted }}>{agent.desc}</p>
                </div>
                {activeAgent === agent.id && <Loader2 className="w-4 h-4 animate-spin" style={{ color: agent.color }} />}
                {content && activeAgent !== agent.id && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: `${T.success}22`, color: T.success }}>OK</span>
                )}
              </div>
              {content && (
                <>
                  <div className="p-3 rounded-lg max-h-72 overflow-auto" style={{ backgroundColor: T.muted }}>
                    <pre className="text-xs whitespace-pre-wrap" style={{ fontFamily: fontMono, color: T.fg, lineHeight: 1.6 }}>
                      {content.slice(0, 3000)}{content.length > 3000 ? '...' : ''}
                    </pre>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button onClick={() => handleCopy(agent.id, content)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px]"
                      style={{ color: T.fgMuted, border: `1px solid ${T.border}` }}>
                      {copiedId === agent.id ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Content Tracker ─────────────────────────────────────────

const PLATFORM_COLORS = {
  blog: T.cyan, linkedin: 'hsl(210,70%,55%)', medium: T.fg,
  devto: T.success, youtube: T.destructive, twitter: T.cyan,
  instagram: T.purple, github: T.fg, substack: T.warning, other: T.fgMuted,
}

const PLATFORM_LABELS = {
  blog: 'Blog', linkedin: 'LinkedIn', medium: 'Medium',
  devto: 'Dev.to', youtube: 'YouTube', twitter: 'Twitter',
  instagram: 'Instagram', github: 'GitHub', substack: 'Substack', other: 'Otro',
}

function PlatformBadge({ platform }) {
  const c = PLATFORM_COLORS[platform] || T.fgMuted
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: c, backgroundColor: `${c}15` }}>
      {PLATFORM_LABELS[platform] || platform}
    </span>
  )
}

function ContentTrackerTab() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [platformFilter, setPlatformFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [editingMetric, setEditingMetric] = useState(null) // { id, field, value }

  // Create form state
  const [formUrl, setFormUrl] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formPlatform, setFormPlatform] = useState('blog')
  const [formAuthor, setFormAuthor] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formKeywords, setFormKeywords] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Stats query
  const { data: statsData } = useQuery({
    queryKey: ['publication-stats'],
    queryFn: async () => {
      try {
        const r = await seoCenterApi.publicationStats()
        return r.data
      } catch { return {} }
    },
  })

  // Publications query
  const { data, isLoading } = useQuery({
    queryKey: ['publications', page, platformFilter],
    queryFn: async () => {
      try {
        const params = { page }
        if (platformFilter !== 'all') params.platform = platformFilter
        const r = await seoCenterApi.publications(params)
        return r.data
      } catch { return { items: [], total: 0, pages: 0 } }
    },
  })

  const createMut = useMutation({
    mutationFn: (params) => seoCenterApi.createPublication(params),
    onSuccess: () => {
      toast.success('Publicacion creada')
      qc.invalidateQueries({ queryKey: ['publications'] })
      qc.invalidateQueries({ queryKey: ['publication-stats'] })
      setShowCreate(false)
      setFormUrl(''); setFormTitle(''); setFormPlatform('blog'); setFormAuthor('')
      setFormDate(''); setFormKeywords(''); setFormDescription(''); setFormNotes('')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error creando publicacion'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, params }) => seoCenterApi.updatePublication(id, params),
    onSuccess: () => {
      toast.success('Metrica actualizada')
      qc.invalidateQueries({ queryKey: ['publications'] })
      qc.invalidateQueries({ queryKey: ['publication-stats'] })
      setEditingMetric(null)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error actualizando'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => seoCenterApi.deletePublication(id),
    onSuccess: () => {
      toast.success('Publicacion eliminada')
      qc.invalidateQueries({ queryKey: ['publications'] })
      qc.invalidateQueries({ queryKey: ['publication-stats'] })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error eliminando'),
  })

  const publications = data?.items || []
  const totalPages = data?.pages || 0
  const stats = statsData || {}

  const platformFilters = ['all', 'blog', 'linkedin', 'medium', 'youtube', 'twitter']

  function handleCreateSubmit(e) {
    e.preventDefault()
    const params = {
      url: formUrl,
      title: formTitle,
      platform: formPlatform,
    }
    if (formAuthor) params.author = formAuthor
    if (formDate) params.published_at = formDate
    if (formKeywords) params.keywords = formKeywords
    if (formDescription) params.description = formDescription
    if (formNotes) params.notes = formNotes
    createMut.mutate(params)
  }

  function handleMetricClick(pubId, field, currentValue) {
    setEditingMetric({ id: pubId, field, value: currentValue ?? 0 })
  }

  function handleMetricSave() {
    if (!editingMetric) return
    const params = { [editingMetric.field]: Number(editingMetric.value) }
    updateMut.mutate({ id: editingMetric.id, params })
  }

  function calcEngagement(pub) {
    const total = (pub.views || 0)
    if (!total) return 0
    const interactions = (pub.likes || 0) + (pub.shares || 0) + (pub.comments || 0)
    return ((interactions / total) * 100).toFixed(1)
  }

  const kpis = [
    { label: 'Total publicaciones', value: stats.total ?? 0, color: T.cyan },
    { label: 'Activas', value: stats.active ?? 0, color: T.success },
    { label: 'Total views', value: stats.views ?? 0, color: T.purple },
    { label: 'Total likes', value: stats.likes ?? 0, color: T.warning },
    { label: 'Avg engagement', value: stats.avg_engagement != null ? `${Number(stats.avg_engagement).toFixed(1)}%` : '0%', color: T.cyan },
  ]

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: T.fgMuted, fontFamily: fontMono }}>{k.label}</p>
            <p className="text-xl font-bold" style={{ color: k.color, fontFamily: fontDisplay }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Platform filter + Add button */}
      <div className="flex flex-wrap items-center gap-2">
        {platformFilters.map(pf => (
          <button key={pf} onClick={() => { setPlatformFilter(pf); setPage(1) }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: platformFilter === pf ? `${T.cyan}20` : T.muted,
              color: platformFilter === pf ? T.cyan : T.fgMuted,
              border: `1px solid ${platformFilter === pf ? `${T.cyan}40` : T.border}`,
            }}>
            {pf === 'all' ? 'Todas' : PLATFORM_LABELS[pf] || pf}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
          style={{ backgroundColor: T.cyan, color: T.bg }}>
          <Plus className="w-4 h-4" /> Nueva publicacion
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreateSubmit} className="rounded-xl p-5 space-y-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-semibold" style={{ color: T.fg, fontFamily: fontDisplay }}>Nueva publicacion externa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="URL *" required style={inputStyle} />
            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Titulo *" required style={inputStyle} />
            <select value={formPlatform} onChange={e => setFormPlatform(e.target.value)} style={inputStyle}>
              {Object.entries(PLATFORM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input value={formAuthor} onChange={e => setFormAuthor(e.target.value)} placeholder="Autor" style={inputStyle} />
            <input type="datetime-local" value={formDate} onChange={e => setFormDate(e.target.value)} style={inputStyle} />
            <input value={formKeywords} onChange={e => setFormKeywords(e.target.value)} placeholder="Keywords (comma-separated)" style={inputStyle} />
          </div>
          <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Descripcion" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          <input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notas" style={inputStyle} />
          <div className="flex gap-2">
            <button type="submit" disabled={createMut.isPending} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
              style={{ backgroundColor: T.cyan, color: T.bg }}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: T.fgMuted, border: `1px solid ${T.border}` }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Inline metric edit modal */}
      {editingMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-5 space-y-3 w-80" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h3 className="text-sm font-semibold" style={{ color: T.fg, fontFamily: fontDisplay }}>
              Editar {editingMetric.field}
            </h3>
            <input type="number" min="0" value={editingMetric.value}
              onChange={e => setEditingMetric({ ...editingMetric, value: e.target.value })}
              style={inputStyle} autoFocus />
            <div className="flex gap-2">
              <button onClick={handleMetricSave} disabled={updateMut.isPending}
                className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
                style={{ backgroundColor: T.cyan, color: T.bg }}>
                {updateMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Guardar
              </button>
              <button onClick={() => setEditingMetric(null)}
                className="px-3 py-1.5 rounded-lg text-sm" style={{ color: T.fgMuted, border: `1px solid ${T.border}` }}>
                <X className="w-3 h-3 inline" /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publications table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : publications.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <ExternalLink className="w-8 h-8 mx-auto mb-2" style={{ color: T.fgMuted }} />
          <p style={{ color: T.fgMuted }} className="text-sm">No hay publicaciones externas registradas</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: T.fg }}>
              <thead>
                <tr style={{ backgroundColor: T.muted }}>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider" style={{ color: T.fgMuted, fontFamily: fontMono }}>Plataforma</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider" style={{ color: T.fgMuted, fontFamily: fontMono }}>Titulo</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider" style={{ color: T.fgMuted, fontFamily: fontMono }}>Fecha</th>
                  <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider cursor-pointer" style={{ color: T.fgMuted, fontFamily: fontMono }}>Views</th>
                  <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider cursor-pointer" style={{ color: T.fgMuted, fontFamily: fontMono }}>Likes</th>
                  <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider cursor-pointer" style={{ color: T.fgMuted, fontFamily: fontMono }}>Shares</th>
                  <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider cursor-pointer" style={{ color: T.fgMuted, fontFamily: fontMono }}>Comments</th>
                  <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider" style={{ color: T.fgMuted, fontFamily: fontMono }}>Engagement</th>
                  <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider" style={{ color: T.fgMuted, fontFamily: fontMono }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {publications.map(pub => (
                  <tr key={pub.id} className="transition-colors" style={{ borderTop: `1px solid ${T.border}` }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = `${T.muted}80`}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td className="px-4 py-2.5"><PlatformBadge platform={pub.platform} /></td>
                    <td className="px-4 py-2.5">
                      <a href={pub.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1"
                        style={{ color: T.cyan, fontSize: '0.8125rem' }}>
                        {pub.title}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ opacity: 0.5 }} />
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                      {pub.published_at ? new Date(pub.published_at).toLocaleDateString('es-ES') : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs cursor-pointer hover:underline" style={{ fontFamily: fontMono }}
                      onClick={() => handleMetricClick(pub.id, 'views', pub.views)}>
                      {pub.views ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs cursor-pointer hover:underline" style={{ fontFamily: fontMono }}
                      onClick={() => handleMetricClick(pub.id, 'likes', pub.likes)}>
                      {pub.likes ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs cursor-pointer hover:underline" style={{ fontFamily: fontMono }}
                      onClick={() => handleMetricClick(pub.id, 'shares', pub.shares)}>
                      {pub.shares ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs cursor-pointer hover:underline" style={{ fontFamily: fontMono }}
                      onClick={() => handleMetricClick(pub.id, 'comments', pub.comments)}>
                      {pub.comments ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{
                        fontFamily: fontMono,
                        color: calcEngagement(pub) >= 5 ? T.success : calcEngagement(pub) >= 2 ? T.warning : T.fgMuted,
                        backgroundColor: `${calcEngagement(pub) >= 5 ? T.success : calcEngagement(pub) >= 2 ? T.warning : T.fgMuted}15`,
                      }}>
                        {calcEngagement(pub)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleMetricClick(pub.id, 'views', pub.views)}
                          className="p-1 rounded hover:opacity-80" title="Editar metricas" style={{ color: T.cyan }}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={async () => { if (await confirm({ title: '¿Eliminar?', description: 'Eliminar esta publicacion?', confirmText: 'Eliminar' })) deleteMut.mutate(pub.id) }}
                          className="p-1 rounded hover:opacity-80" title="Eliminar" style={{ color: T.destructive }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: page === p ? `${T.cyan}20` : T.muted,
                color: page === p ? T.cyan : T.fgMuted,
                border: `1px solid ${page === p ? `${T.cyan}40` : T.border}`,
              }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
