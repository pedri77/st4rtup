import { useState, useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import WebChatWidget from "@/components/WebChatWidget"
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, Clock, Calendar, User, Share2 } from 'lucide-react'
import { useThemeColors } from '@/utils/theme'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const CAT_COLORS = { Ecosistema: '#1E6FD9', Financiación: '#10B981', 'Crear & Lanzar': '#F5820B', Growth: '#8B5CF6', Fundadores: '#EC4899', Legal: '#EF4444', Herramientas: '#0EA5E9', Marketing: '#F59E0B' }

function renderMarkdown(md) {
  if (!md) return ''
  const html = md
    .replace(/^### (.*$)/gm, '<h3 style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:18px;font-weight:700;margin:28px 0 12px;color:#1A1A2E">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:22px;font-weight:700;margin:36px 0 16px;color:#1A1A2E">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:28px;font-weight:800;margin:0 0 20px;color:#1A1A2E">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^> (.*$)/gm, '<blockquote style="border-left:4px solid #1E6FD9;margin:20px 0;padding:12px 20px;background:#EBF4FF;border-radius:0 8px 8px 0;color:#334155;font-style:italic">$1</blockquote>')
    .replace(/^- (.*$)/gm, '<li style="margin:4px 0;color:#475569">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left:20px;margin:12px 0">$&</ul>')
    .replace(/^\d+\. (.*$)/gm, '<li style="margin:4px 0;color:#475569">$1</li>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="width:100%;border-radius:12px;margin:20px 0" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const isExternal = /^https?:\/\//.test(url)
      const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a href="${url}" style="color:#1E6FD9;font-weight:500"${attrs}>${text}</a>`
    })
    .replace(/\n{2,}/g, '</p><p style="margin:0 0 16px;line-height:1.8;color:#334155">')
    .replace(/^(?!<[hubloia])(.+)$/gm, '<p style="margin:0 0 16px;line-height:1.8;color:#334155">$1</p>')
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1','h2','h3','p','strong','em','a','ul','ol','li','blockquote','img','code','pre','br'],
    ALLOWED_ATTR: ['style','href','src','alt','target','rel'],
  })
}

export default function BlogArticlePage() {
  const T = useThemeColors()
  const { slug } = useParams()
  const navigate = useNavigate()
  const contentRef = useRef(null)
  const [article, setArticle] = useState(null)
  const [content, setContent] = useState('')
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)

  // Intercept clicks on internal links rendered from markdown to use SPA navigation
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const handler = (e) => {
      const link = e.target.closest('a')
      if (!link) return
      const href = link.getAttribute('href') || ''
      if (href.startsWith('/') && !link.target) {
        e.preventDefault()
        navigate(href)
        window.scrollTo(0, 0)
      }
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [content, navigate])

  useEffect(() => {
    async function load() {
      try {
        // Load index
        const indexRes = await fetch('/blog/index.json')
        const index = await indexRes.json()
        const today = new Date().toISOString().split('T')[0]
        const art = (index.articulos || []).find(a => a.slug === slug && a.publicado && a.fecha <= today)

        if (!art) { setLoading(false); return }
        setArticle(art)

        // Load markdown
        try {
          const mdRes = await fetch(`/blog/articulos/${slug}.md`)
          if (mdRes.ok) {
            const md = await mdRes.text()
            setContent(md)
          }
        } catch {}

        // Related articles (same cluster, exclude self)
        const rel = (index.articulos || [])
          .filter(a => a.publicado && a.fecha <= today && a.cluster === art.cluster && a.slug !== slug)
          .slice(0, 3)
        setRelated(rel)
      } catch {}
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <div style={{ padding: 80, textAlign: 'center', fontFamily: "'Inter'" }}>Cargando...</div>
  if (!article) return (
    <div style={{ padding: 80, textAlign: 'center', fontFamily: "'Inter'" }}>
      <h1 style={{ fontFamily: fontDisplay, fontSize: 28 }}>Artículo no encontrado</h1>
      <Link to="/blog" style={{ color: T.primary, marginTop: 16, display: 'inline-block' }}>← Volver al blog</Link>
    </div>
  )

  const catColor = CAT_COLORS[article.categoria] || T.fgMuted

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: T.fg, backgroundColor: T.bg }}>
      <Helmet>
        <title>{article.titulo} | st4rtup Blog</title>
        <meta name="description" content={article.excerpt} />
        <meta name="keywords" content={(article.keywords || []).join(', ')} />
        <link rel="canonical" href={`https://st4rtup.com/blog/${article.slug}`} />
        <meta property="og:title" content={article.titulo} />
        <meta property="og:description" content={article.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://st4rtup.com/blog/${article.slug}`} />
        {article.imagen && <meta property="og:image" content={`https://st4rtup.com${article.imagen}`} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.titulo} />
        <meta name="twitter:description" content={article.excerpt} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": article.titulo,
          "description": article.excerpt,
          "author": { "@type": "Person", "name": article.autor },
          "datePublished": article.fecha,
          "image": article.imagen ? `https://st4rtup.com${article.imagen}` : undefined,
          "publisher": { "@type": "Organization", "name": "st4rtup", "logo": { "@type": "ImageObject", "url": "https://st4rtup.com/logo.png" } },
          "mainEntityOfPage": `https://st4rtup.com/blog/${article.slug}`,
          "keywords": (article.keywords || []).join(', '),
        })}</script>
      </Helmet>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: `${T.card}F2`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
          <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/blog" style={{ fontSize: 14, color: T.primary, textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
            <Link to="/login" style={{ padding: '10px 22px', backgroundColor: T.primary, color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis</Link>
          </div>
        </div>
      </nav>

      <article style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Breadcrumb */}
        <Link to="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.fgMuted, textDecoration: 'none', marginBottom: 24 }}>
          <ArrowLeft size={14} /> Volver al blog
        </Link>

        {/* Header */}
        <span style={{ display: 'inline-block', fontSize: 12, padding: '4px 12px', borderRadius: 6, backgroundColor: `${catColor}15`, color: catColor, fontWeight: 600, marginBottom: 16 }}>{article.categoria}</span>

        <h1 style={{ fontFamily: fontDisplay, fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>{article.titulo}</h1>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 32, fontSize: 13, color: T.fgMuted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={14} /> {article.autor}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {article.fecha}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {article.tiempo_lectura}</span>
          <button onClick={() => navigator.clipboard.writeText(window.location.href)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}><Share2 size={14} /> Compartir</button>
        </div>

        {/* Featured image */}
        {article.imagen && <img src={article.imagen} alt={article.titulo} style={{ width: '100%', borderRadius: 16, marginBottom: 32 }} onError={e => e.target.style.display = 'none'} />}

        {/* Content */}
        {content ? (
          <div ref={contentRef} style={{ fontSize: 16, lineHeight: 1.8, color: T.fgMuted }} dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        ) : (
          <div style={{ padding: '40px 24px', borderRadius: 14, backgroundColor: T.muted, border: `1px solid ${T.border}`, textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: T.fgMuted }}>Este artículo se publicará próximamente.</p>
            <p style={{ fontSize: 14, color: T.fgMuted, marginTop: 8 }}>{article.excerpt}</p>
          </div>
        )}

        {/* Tags */}
        {article.keywords?.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
            {article.keywords.map(k => (
              <span key={k} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, backgroundColor: T.muted, color: T.fgMuted }}>{k}</span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: 40, padding: '28px 24px', borderRadius: 16, background: `linear-gradient(135deg, ${T.primary}15, ${T.accent}15)`, border: `1px solid ${T.border}`, textAlign: 'center' }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>¿Te ha sido útil?</h3>
          <p style={{ color: T.fgMuted, fontSize: 14, marginBottom: 16 }}>St4rtup es el CRM que ayuda a startups a vender más. Gratis para empezar.</p>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 10, backgroundColor: T.primary, color: 'white', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>Empezar gratis →</Link>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Artículos relacionados</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {related.map(r => (
                <Link to={`/blog/${r.slug}`} key={r.slug} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${T.border}`, backgroundColor: T.card, transition: 'box-shadow 0.3s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    <span style={{ fontSize: 11, color: CAT_COLORS[r.categoria] || T.fgMuted, fontWeight: 600 }}>{r.categoria}</span>
                    <h4 style={{ fontFamily: fontDisplay, fontSize: 14, fontWeight: 700, margin: '6px 0', lineHeight: 1.3 }}>{r.titulo}</h4>
                    <span style={{ fontSize: 12, color: T.fgMuted, fontFamily: fontMono }}>{r.tiempo_lectura}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    <WebChatWidget />
    </div>
  )
}

