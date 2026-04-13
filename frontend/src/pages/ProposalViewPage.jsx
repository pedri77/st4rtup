import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Download, Loader2, Share2, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { agentsApi } from '@/services/api'
import { useThemeColors } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

export default function ProposalViewPage() {
  const T = useThemeColors()
  const [searchParams] = useSearchParams()
  const encodedMd = searchParams.get('md')
  const leadId = searchParams.get('lead_id')
  const company = searchParams.get('company') || 'Cliente'
  const [copied, setCopied] = useState(false)
  const [markdown, setMarkdown] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (encodedMd) {
      try { setMarkdown(decodeURIComponent(escape(atob(encodedMd)))) }
      catch { try { setMarkdown(atob(encodedMd)) } catch { setMarkdown('') } }
    }
  }, [encodedMd])

  const generateProposal = async () => {
    if (!leadId) return
    setGenerating(true)
    try {
      const resp = await agentsApi.generateProposal({ lead_id: leadId })
      if (resp.data?.proposal_markdown) setMarkdown(resp.data.proposal_markdown)
      else toast.error(resp.data?.error || 'Error generando propuesta')
    } catch { toast.error('Error generando propuesta') }
    setGenerating(false)
  }

  useEffect(() => { if (!markdown && leadId && !encodedMd) generateProposal() }, [leadId])

  const downloadPDF = async () => {
    try {
      const resp = await agentsApi.exportPDF({ markdown, title: `Propuesta — ${company}`, filename: `propuesta_${company}.pdf` })
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const a = document.createElement('a'); a.href = url; a.download = `propuesta_${company.replace(/\s/g, '_')}.pdf`; a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF descargado')
    } catch { toast.error('Error generando PDF') }
  }

  const copyLink = () => {
    const encoded = btoa(unescape(encodeURIComponent(markdown)))
    const url = `${window.location.origin}/proposal?md=${encoded}&company=${encodeURIComponent(company)}`
    navigator.clipboard.writeText(url)
    setCopied(true); toast.success('Link copiado')
    setTimeout(() => setCopied(false), 2000)
  }

  if (generating) return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: T.cyan }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.fg, fontFamily: fontDisplay }}>Generando propuesta...</h2>
        <p style={{ fontSize: 14, color: T.fgMuted, marginTop: 8 }}>Agente de propuestas está personalizando el documento</p>
      </div>
    </div>
  )

  if (!markdown) return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div className="text-center">
        <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: T.muted }} />
        <p style={{ color: T.fgMuted }}>Sin propuesta disponible</p>
        {leadId && <button onClick={generateProposal} style={{ marginTop: 16, padding: '8px 24px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer' }}>Generar propuesta</button>}
      </div>
    </div>
  )

  return (
    <div className="-m-4 md:-m-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between sticky top-0 z-10" style={{ backgroundColor: `${T.card}f0`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})` }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: fontDisplay }}>RS</span>
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 500, color: T.fg }}>Propuesta Comercial</span>
            <span style={{ fontSize: 12, color: T.fgMuted, marginLeft: 8 }}>· {company}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={copyLink} className="flex items-center gap-1.5" style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, backgroundColor: T.muted, color: T.fg, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
            {copied ? <Check className="w-3.5 h-3.5" style={{ color: T.success }} /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Compartir'}
          </button>
          <button onClick={downloadPDF} className="flex items-center gap-1.5" style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, backgroundColor: T.cyan, color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 py-12 proposal-content">
        <ProposalRenderer markdown={markdown} />
        <footer className="mt-16 pt-8 text-center space-y-4" style={{ borderTop: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 12, color: T.fgMuted }}>{`St4rtup · Confidencial · ${new Date().toLocaleDateString('es-ES')}`}</p>
          <div className="flex justify-center gap-3">
            <button onClick={copyLink} className="flex items-center gap-1.5" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 14, backgroundColor: T.muted, color: T.fg, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
              <Share2 className="w-4 h-4" /> Compartir
            </button>
            <button onClick={downloadPDF} className="flex items-center gap-1.5" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 14, backgroundColor: T.cyan, color: '#fff', border: 'none', cursor: 'pointer' }}>
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </footer>
      </article>
    </div>
  )
}

function ProposalRenderer({ markdown }) {
  const lines = markdown.split('\n')
  const elements = []
  let tableRows = []
  let listItems = []

  const flush = () => {
    if (listItems.length) {
      elements.push(<ul key={`ul${elements.length}`} className="space-y-2 my-4">{listItems.map((t, i) => (
        <li key={i} className="flex items-start gap-3" style={{ fontSize: 14, color: T.fg, lineHeight: 1.6 }}>
          <span className="mt-2 flex-shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: T.cyan, display: 'inline-block' }} />
          <span dangerouslySetInnerHTML={{ __html: inline(t) }} />
        </li>
      ))}</ul>)
      listItems = []
    }
    if (tableRows.length) {
      elements.push(
        <div key={`tb${elements.length}`} className="my-6 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
          <table className="w-full" style={{ fontSize: 14 }}>
            <thead><tr style={{ backgroundColor: T.muted }}>{tableRows[0].map((c, i) =>
              <th key={i} style={{ textAlign: 'left', padding: 12, fontSize: 12, fontWeight: 600, color: T.cyan, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: fontMono }}>{c}</th>
            )}</tr></thead>
            <tbody>{tableRows.slice(1).map((row, i) =>
              <tr key={i} style={{ borderTop: `1px solid ${T.border}50` }}>{row.map((c, j) =>
                <td key={j} style={{ padding: 12, color: T.fg }} dangerouslySetInnerHTML={{ __html: inline(c) }} />
              )}</tr>
            )}</tbody>
          </table>
        </div>
      )
      tableRows = []
    }
  }

  for (const line of lines) {
    const t = line.trim()
    if (!t) { flush(); continue }
    if (t === '---' || t === '***') { flush(); elements.push(<hr key={`hr${elements.length}`} style={{ margin: '32px 0', borderColor: T.border }} />); continue }

    // Table
    if (t.startsWith('|') && t.endsWith('|')) {
      const cells = t.split('|').slice(1, -1).map(c => c.trim())
      if (cells.every(c => /^[-:\s]+$/.test(c))) continue
      tableRows.push(cells); continue
    }

    // List
    if (t.startsWith('- ') || t.startsWith('* ')) { listItems.push(t.slice(2)); continue }
    if (t.match(/^\d+\.\s/)) { listItems.push(t.replace(/^\d+\.\s/, '')); continue }

    flush()

    // Headers
    if (t.startsWith('# ')) {
      elements.push(<h1 key={`h${elements.length}`} style={{ fontSize: 28, fontWeight: 700, color: T.fg, marginTop: 8, marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${T.border}`, fontFamily: fontDisplay }}>{t.slice(2)}</h1>)
    } else if (t.startsWith('## ')) {
      elements.push(<h2 key={`h${elements.length}`} className="flex items-center gap-2" style={{ fontSize: 20, fontWeight: 700, color: T.cyan, marginTop: 40, marginBottom: 16, fontFamily: fontDisplay }}>
        <span style={{ width: 4, height: 24, backgroundColor: T.cyan, borderRadius: 99, display: 'inline-block' }} />{t.slice(3)}
      </h2>)
    } else if (t.startsWith('### ')) {
      elements.push(<h3 key={`h${elements.length}`} style={{ fontSize: 16, fontWeight: 600, color: T.fg, marginTop: 24, marginBottom: 12, fontFamily: fontDisplay }}>{t.slice(4)}</h3>)
    } else {
      elements.push(<p key={`p${elements.length}`} style={{ fontSize: 14, color: T.fgMuted, lineHeight: 1.6, marginBottom: 12 }} dangerouslySetInnerHTML={{ __html: inline(t) }} />)
    }
  }
  flush()
  return <>{elements}</>
}

function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${T.fg};font-weight:600">$1</strong>`)
    .replace(/\*(.+?)\*/g, `<em style="color:${T.fg}">$1</em>`)
    .replace(/`(.+?)`/g, `<code style="background:${T.muted};color:${T.cyan};padding:2px 4px;border-radius:4px;font-size:12px;font-family:${fontMono}">$1</code>`)
}
