import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const CAT_COLORS = { Ecosistema: '#1E6FD9', Financiación: '#10B981', 'Crear & Lanzar': '#F5820B', Growth: '#8B5CF6', Fundadores: '#EC4899', Legal: '#EF4444', Herramientas: '#0EA5E9', Marketing: '#F59E0B', Sectores: '#14B8A6' }

export default function BlogPage() {
  const [posts, setPosts] = useState([])
  const [filter, setFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/blog/index.json')
      .then(r => r.json())
      .then(data => {
        const today = new Date().toISOString().split('T')[0]
        const published = (data.articulos || []).filter(a => a.publicado && a.fecha <= today)
          .sort((a, b) => b.fecha.localeCompare(a.fecha))
        setPosts(published)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const categories = [...new Set(posts.map(p => p.categoria))]
  const filtered = posts
    .filter(p => !filter || p.categoria === filter)
    .filter(p => !search || p.titulo.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1A1A2E', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
          <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/blog" style={{ fontSize: 14, color: '#1E6FD9', textDecoration: 'none', fontWeight: 600 }}>Blog</Link>
            <Link to="/pricing" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>Precios</Link>
            <Link to="/login" style={{ padding: '10px 22px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px 100px' }}>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Blog</h1>
        <p style={{ color: '#64748B', fontSize: 16, marginBottom: 24 }}>Ideas, estrategias y novedades para vender más</p>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 13 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar artículos..."
            style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 15, outline: 'none' }} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter(null)} style={{ padding: '6px 16px', borderRadius: 8, border: !filter ? '2px solid #1E6FD9' : '1px solid #E2E8F0', backgroundColor: !filter ? '#EBF4FF' : 'white', color: !filter ? '#1E6FD9' : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Todos</button>
          {categories.map(cat => {
            const color = CAT_COLORS[cat] || '#64748B'
            return <button key={cat} onClick={() => setFilter(cat)} style={{ padding: '6px 16px', borderRadius: 8, border: filter === cat ? `2px solid ${color}` : '1px solid #E2E8F0', backgroundColor: filter === cat ? `${color}12` : 'white', color: filter === cat ? color : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{cat}</button>
          })}
        </div>

        {loading && <p style={{ color: '#94A3B8' }}>Cargando artículos...</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>📝</p>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Próximamente</h3>
            <p style={{ color: '#64748B' }}>Estamos preparando contenido de calidad. Los primeros artículos se publicarán pronto.</p>
            <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 16 }}>Suscríbete para no perderte nada ↓</p>
          </div>
        )}

        {/* Featured */}
        {!loading && filtered.length > 0 && !filter && !search && (
          <Link to={`/blog/${filtered[0].slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ padding: 32, borderRadius: 20, background: 'linear-gradient(135deg, #EBF4FF, #FFF7ED)', border: '1px solid #E2E8F0', marginBottom: 32, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              {filtered[0].imagen && <img src={filtered[0].imagen} alt={filtered[0].titulo} style={{ width: 280, height: 147, objectFit: 'cover', borderRadius: 12 }} onError={e => e.target.style.display = 'none'} />}
              <div style={{ flex: 1, minWidth: 280 }}>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, backgroundColor: `${CAT_COLORS[filtered[0].categoria] || '#64748B'}15`, color: CAT_COLORS[filtered[0].categoria] || '#64748B', fontWeight: 600 }}>{filtered[0].categoria}</span>
                <h2 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 800, margin: '12px 0 8px', lineHeight: 1.3 }}>{filtered[0].titulo}</h2>
                <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.6 }}>{filtered[0].excerpt}</p>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#94A3B8', marginTop: 8 }}>
                  <span style={{ fontFamily: fontMono }}>{filtered[0].fecha}</span>
                  <span>·</span>
                  <span>{filtered[0].tiempo_lectura}</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {filtered.slice((!filter && !search) ? 1 : 0).map(post => (
            <Link to={`/blog/${post.slug}`} key={post.slug} style={{ textDecoration: 'none', color: 'inherit' }}>
              <article style={{ borderRadius: 16, backgroundColor: 'white', border: '1px solid #E2E8F0', overflow: 'hidden', transition: 'box-shadow 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                {post.imagen && <img src={post.imagen} alt={post.titulo} style={{ width: '100%', height: 160, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />}
                <div style={{ padding: 20 }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, backgroundColor: `${CAT_COLORS[post.categoria] || '#64748B'}15`, color: CAT_COLORS[post.categoria] || '#64748B', fontWeight: 600 }}>{post.categoria}</span>
                  <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, margin: '10px 0 8px', lineHeight: 1.3 }}>{post.titulo}</h3>
                  <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.excerpt}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: fontMono }}>{post.fecha} · {post.tiempo_lectura}</span>
                    <span style={{ fontSize: 13, color: '#1E6FD9', fontWeight: 600 }}>Leer →</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* Newsletter */}
        <div style={{ marginTop: 48, padding: '32px 28px', borderRadius: 16, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Suscríbete al newsletter</h3>
          <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16 }}>Estrategias de ventas y novedades. Sin spam.</p>
          <div style={{ display: 'flex', gap: 8, maxWidth: 400, margin: '0 auto' }}>
            <input placeholder="tu@email.com" style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 14 }} />
            <button style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#1E6FD9', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Suscribir</button>
          </div>
        </div>
      </div>
    </div>
  )
}
