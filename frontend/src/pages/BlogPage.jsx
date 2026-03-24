import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"

const CATEGORIES = { Ventas: '#1E6FD9', Marketing: '#F5820B', IA: '#10B981', Producto: '#8B5CF6' }

const POSTS = [
  { title: '5 métricas que toda startup debe trackear en su CRM', category: 'Ventas', time: '8 min', date: '24/03/2026', excerpt: 'Revenue, conversión, pipeline, churn y NPS. Las 5 métricas que definen si tu startup va en la dirección correcta.' },
  { title: 'Cómo automatizar el follow-up de leads con IA', category: 'IA', time: '6 min', date: '22/03/2026', excerpt: 'Los 4 agentes IA que cualifican, puntúan y hacen seguimiento de tus leads mientras duermes.' },
  { title: 'SEO para startups: guía completa 2026', category: 'Marketing', time: '12 min', date: '20/03/2026', excerpt: 'Keywords, content pipeline, backlinks y rankings. Todo lo que necesitas para posicionar tu startup en Google.' },
  { title: 'Pipeline visual: por qué el Kanban vende más', category: 'Ventas', time: '5 min', date: '18/03/2026', excerpt: 'El pipeline Kanban convierte más que una hoja de cálculo. Te explicamos por qué y cómo configurarlo.' },
  { title: 'WhatsApp Business para ventas B2B', category: 'Marketing', time: '7 min', date: '15/03/2026', excerpt: 'Chatbot IA, mensajes directos y automatizaciones. WhatsApp como canal de ventas profesional.' },
  { title: 'Deal Room: cómo cerrar acuerdos más rápido', category: 'Producto', time: '9 min', date: '12/03/2026', excerpt: 'Propuestas con watermark, analytics por página y firma NDA digital. El deal room que acelera el cierre.' },
]

function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
        <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="hidden md:flex">
          <Link to="/blog" style={{ fontSize: 14, color: '#1E6FD9', textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
          <Link to="/pricing" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>Precios</Link>
          <Link to="/login" style={{ padding: '10px 22px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis</Link>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>
    </nav>
  )
}

export default function BlogPage() {
  const [filter, setFilter] = useState(null)
  const filtered = filter ? POSTS.filter(p => p.category === filter) : POSTS

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1A1A2E' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
      <Nav />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px 100px' }}>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Blog</h1>
        <p style={{ color: '#64748B', fontSize: 16, marginBottom: 32 }}>Ideas, estrategias y novedades para vender más</p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter(null)} style={{ padding: '6px 16px', borderRadius: 8, border: !filter ? '2px solid #1E6FD9' : '1px solid #E2E8F0', backgroundColor: !filter ? '#EBF4FF' : 'white', color: !filter ? '#1E6FD9' : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Todos</button>
          {Object.entries(CATEGORIES).map(([cat, color]) => (
            <button key={cat} onClick={() => setFilter(cat)} style={{ padding: '6px 16px', borderRadius: 8, border: filter === cat ? `2px solid ${color}` : '1px solid #E2E8F0', backgroundColor: filter === cat ? `${color}12` : 'white', color: filter === cat ? color : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{cat}</button>
          ))}
        </div>

        {/* Featured */}
        {!filter && (
          <div style={{ padding: 32, borderRadius: 20, background: 'linear-gradient(135deg, #EBF4FF, #FFF7ED)', border: '1px solid #E2E8F0', marginBottom: 32 }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, backgroundColor: `${CATEGORIES[POSTS[0].category]}15`, color: CATEGORIES[POSTS[0].category], fontWeight: 600 }}>{POSTS[0].category}</span>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, margin: '12px 0 8px' }}>{POSTS[0].title}</h2>
            <p style={{ color: '#64748B', fontSize: 15, marginBottom: 12, lineHeight: 1.6 }}>{POSTS[0].excerpt}</p>
            <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#94A3B8' }}>
              <span>{POSTS[0].date}</span>
              <span>·</span>
              <span>{POSTS[0].time} lectura</span>
            </div>
          </div>
        )}

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {filtered.slice(filter ? 0 : 1).map(post => (
            <article key={post.title} style={{ padding: 24, borderRadius: 16, backgroundColor: 'white', border: '1px solid #E2E8F0', transition: 'box-shadow 0.3s', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, backgroundColor: `${CATEGORIES[post.category]}15`, color: CATEGORIES[post.category], fontWeight: 600 }}>{post.category}</span>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 700, margin: '12px 0 8px', lineHeight: 1.3 }}>{post.title}</h3>
              <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.excerpt}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{post.date} · {post.time}</span>
                <span style={{ fontSize: 13, color: '#1E6FD9', fontWeight: 600 }}>Leer más →</span>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter */}
        <div style={{ marginTop: 48, padding: '32px 28px', borderRadius: 16, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Suscríbete al newsletter</h3>
          <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16 }}>Estrategias de ventas y novedades del producto. Sin spam.</p>
          <div style={{ display: 'flex', gap: 8, maxWidth: 400, margin: '0 auto' }}>
            <input placeholder="tu@email.com" style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14 }} />
            <button style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#1E6FD9', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Suscribir</button>
          </div>
        </div>
      </div>
    </div>
  )
}
