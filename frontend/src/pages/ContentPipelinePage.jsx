import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Sparkles, Search, FileText, BarChart3, Tag, Loader2, Play, ChevronRight, Copy, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { contentPipelineApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#06B6D4', purple: '#6366F1',
  success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.625rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}

const AGENTS = [
  { id: 'keywords', name: 'Keyword Agent', icon: Search, color: T.cyan, desc: 'Investiga keywords relevantes, search intent y dificultad' },
  { id: 'draft', name: 'Draft Agent', icon: FileText, color: T.purple, desc: 'Genera borrador con H1, H2s, listas y CTA' },
  { id: 'seo', name: 'SEO Agent', icon: BarChart3, color: T.success, desc: 'Optimiza densidad keyword, headings e internal links' },
  { id: 'meta', name: 'Meta Agent', icon: Tag, color: T.warning, desc: 'Genera title, description, OG tags y slug' },
]

function AgentCard({ agent, result, isActive }) {
  const [copied, setCopied] = useState(false)
  const content = result?.output || ''

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      backgroundColor: T.card, border: `1px solid ${isActive ? agent.color + '66' : T.border}`,
      borderRadius: '0.75rem', padding: '1.25rem',
      transition: 'border-color 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '0.5rem',
          backgroundColor: agent.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <agent.icon size={18} color={agent.color} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: '1rem', fontWeight: 700, color: T.fg, margin: 0 }}>{agent.name}</h3>
          <p style={{ fontSize: '0.7rem', color: T.fgMuted, margin: 0 }}>{agent.desc}</p>
        </div>
        {isActive && <Loader2 size={18} color={agent.color} className="animate-spin" />}
        {content && !isActive && (
          <div style={{
            padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 600,
            backgroundColor: T.success + '22', color: T.success, border: `1px solid ${T.success}44`,
          }}>OK</div>
        )}
      </div>

      {content && (
        <div>
          <div style={{
            backgroundColor: T.muted, borderRadius: '0.5rem', padding: '1rem',
            fontSize: '0.8rem', color: T.fg, lineHeight: 1.6,
            maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: fontMono,
          }}>
            {content.slice(0, 2000)}{content.length > 2000 ? '...' : ''}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button onClick={handleCopy} style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.625rem',
              backgroundColor: 'transparent', color: T.fgMuted, border: `1px solid ${T.border}`,
              borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.7rem',
            }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ContentPipelinePage() {
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('CISOs y responsables de compliance en Espana')
  const [wordCount, setWordCount] = useState(1500)
  const [results, setResults] = useState({})
  const [activeAgent, setActiveAgent] = useState(null)

  const fullPipeline = useMutation({
    mutationFn: () => contentPipelineApi.run({ topic, target_audience: audience, word_count: wordCount }),
    onSuccess: (res) => {
      setResults(res.data.stages || {})
      setActiveAgent(null)
      toast.success('Pipeline completado')
    },
    onError: () => { setActiveAgent(null); toast.error('Error en pipeline') },
    onMutate: () => setActiveAgent('keywords'),
  })

  const runSingleAgent = useMutation({
    mutationFn: ({ agentId, params }) => {
      const api = {
        keywords: () => contentPipelineApi.keywords({ topic, target_audience: audience }),
        draft: () => contentPipelineApi.draft({ topic, keywords: results.keywords?.output || '', word_count: wordCount }),
        seo: () => contentPipelineApi.seo({ draft: results.draft?.output || '', primary_keyword: topic }),
        meta: () => contentPipelineApi.meta({ article: results.seo?.output || results.draft?.output || '', primary_keyword: topic }),
      }
      return api[agentId]()
    },
    onSuccess: (res, { agentId }) => {
      setResults(prev => ({ ...prev, [agentId]: res.data }))
      setActiveAgent(null)
    },
    onError: () => { setActiveAgent(null); toast.error('Error en agente') },
  })

  const handleRunAgent = (agentId) => {
    setActiveAgent(agentId)
    runSingleAgent.mutate({ agentId })
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Sparkles size={24} color={T.cyan} />
        <div>
          <h1 style={{ fontFamily: fontDisplay, fontSize: '1.75rem', fontWeight: 700, color: T.fg, margin: 0 }}>
            CONTENT PIPELINE
          </h1>
          <p style={{ fontSize: '0.8rem', color: T.fgMuted, margin: 0 }}>
            4 agentes IA en secuencia: Keyword → Borrador → SEO → Meta
          </p>
        </div>
      </div>

      {/* Config */}
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: T.fgMuted, marginBottom: '0.25rem', fontFamily: fontMono }} htmlFor="contentpipeline-field-1">Tema del articulo</label>
            <input id="contentpipeline-field-1" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ej: Como implementar ENS Alto en 90 dias" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: T.fgMuted, marginBottom: '0.25rem', fontFamily: fontMono }} htmlFor="contentpipeline-field-2">Audiencia</label>
            <input id="contentpipeline-field-2" value={audience} onChange={e => setAudience(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: T.fgMuted, marginBottom: '0.25rem', fontFamily: fontMono }} htmlFor="contentpipeline-field-3">Palabras</label>
            <input id="contentpipeline-field-3" type="number" value={wordCount} onChange={e => setWordCount(Number(e.target.value))} min={500} max={5000} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => fullPipeline.mutate()}
            disabled={!topic || fullPipeline.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem',
              background: topic ? `linear-gradient(135deg, ${T.purple}, ${T.cyan})` : T.muted,
              color: topic ? T.bg : T.fgMuted, border: 'none', borderRadius: '0.5rem',
              cursor: topic ? 'pointer' : 'not-allowed',
              fontFamily: fontDisplay, fontWeight: 700, fontSize: '0.9rem',
            }}
          >
            {fullPipeline.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Ejecutar pipeline completo
          </button>
        </div>
      </div>

      {/* Pipeline flow indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '1.5rem' }}>
        {AGENTS.map((agent, i) => (
          <div key={agent.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              onClick={() => handleRunAgent(agent.id)}
              disabled={activeAgent !== null}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem',
                backgroundColor: results[agent.id] ? agent.color + '22' : T.muted,
                color: results[agent.id] ? agent.color : T.fgMuted,
                border: `1px solid ${results[agent.id] ? agent.color + '44' : T.border}`,
                borderRadius: '0.5rem', cursor: activeAgent ? 'wait' : 'pointer',
                fontSize: '0.75rem', fontWeight: 600,
              }}
            >
              <agent.icon size={14} />
              {agent.name.split(' ')[0]}
            </button>
            {i < AGENTS.length - 1 && <ChevronRight size={14} color={T.fgMuted} />}
          </div>
        ))}
      </div>

      {/* Agent cards */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {AGENTS.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            result={results[agent.id]}
            isActive={activeAgent === agent.id}
          />
        ))}
      </div>
    </div>
  )
}
