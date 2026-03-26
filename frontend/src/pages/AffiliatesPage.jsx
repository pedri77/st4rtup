import { Link } from 'react-router-dom'
import WebChatWidget from "@/components/WebChatWidget"
import { useState } from 'react'

const TIERS = [
  { name: 'Bronce', refs: '1-10', pct: '20%', color: '#CD7F32' },
  { name: 'Plata', refs: '11-25', pct: '23%', color: '#94A3B8' },
  { name: 'Oro', refs: '26-50', pct: '25%', color: '#F59E0B' },
  { name: 'Diamante', refs: '51+', pct: '30%', color: '#1E6FD9' },
]

const EARNINGS = [
  ['10', 'Growth (€19)', 'Bronce 20%', '€38/mes'],
  ['25', 'Growth (€19)', 'Plata 23%', '€109/mes'],
  ['50', 'Scale (€49)', 'Oro 25%', '€613/mes'],
  ['51+', 'Mix', 'Diamante 30%', '€800+/mes'],
]

const AUDIENCE = [
  ['🚀', 'Founders y CTOs', 'Recomienda el CRM que usas a otros founders'],
  ['🏗️', 'Aceleradoras e incubadoras', 'Ofrece St4rtup a las startups de tu programa'],
  ['📈', 'Consultores de ventas', 'Incluye St4rtup en tu stack de recomendaciones'],
  ['✍️', 'Bloggers de startups', 'Escribe reviews y gana con cada conversión'],
]

const FAQS = [
  ['¿Cuánto puedo ganar?', 'Sin límite. Empiezas en 20% (Bronce) y subes hasta 30% (Diamante) con más de 51 referidos activos.'],
  ['¿Cómo recibo el pago?', 'Transferencia SEPA o PayPal. Pagos mensuales el día 1.'],
  ['¿Cuánto dura la cookie?', '90 días desde el primer clic en tu enlace.'],
  ['¿Necesito ser cliente?', 'No, pero ayuda para hablar con conocimiento real del producto.'],
  ['¿Hay materiales de marketing?', 'Sí: banners, textos, comparativas y enlaces trackables.'],
]

export default function AffiliatesPage() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{ background: '#FFFFFF', color: '#1A1A2E', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px) saturate(180%)', borderBottom: '1px solid rgba(226,232,240,0.5)', padding: '12px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/"><img src="/logo.png" alt="St4rtup" style={{ height: 100 }} /></Link>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/pricing" style={{ color: '#64748B', textDecoration: 'none' }}>Precios</Link>
            <Link to="/login" style={{ background: '#1E6FD9', color: 'white', padding: '8px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Empezar</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '80px 24px 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 20, background: '#1E6FD910', border: '1px solid #1E6FD930', color: '#1E6FD9', fontSize: '.8rem', fontWeight: 600, marginBottom: 16 }}>20-30% COMISIÓN RECURRENTE</div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>Programa de afiliados</h1>
        <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.7, marginBottom: 32 }}>
          Gana desde un <strong style={{ color: '#1E6FD9' }}>20% hasta un 30% recurrente</strong> por cada startup que refieras a St4rtup. Cuantos más referidos, mayor tu comisión.
        </p>
        <Link to="/contact" style={{ display: 'inline-block', background: '#1E6FD9', color: 'white', padding: '14px 36px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: '1rem', boxShadow: '0 4px 14px rgba(30,111,217,0.3)' }}>Unirme al programa →</Link>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[['1', 'Regístrate', 'Obtén tu enlace de referido único'], ['2', 'Comparte', 'Comparte con founders y equipos de ventas'], ['3', 'Gana', '20% recurrente por cada pago']].map(([num, title, desc], i) => (
            <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, textAlign: 'center', transition: 'transform .2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1E6FD915', color: '#1E6FD9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, margin: '0 auto 12px' }}>{num}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: '.85rem', color: '#64748B' }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Earning examples */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: '1.4rem', fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>Comisión por plans</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 40 }}>
          {TIERS.map((t, i) => (
            <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, textAlign: 'center', transition: 'transform .2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: t.color, fontFamily: 'monospace', marginBottom: 4 }}>{t.pct}</div>
              <div style={{ fontWeight: 600, fontSize: '.95rem', marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: '.78rem', color: '#64748B' }}>{t.refs} referidos</div>
            </div>
          ))}
        </div>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: '1.4rem', fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>Ejemplos de ganancias</h2>
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid #E2E8F0', fontSize: '.8rem', color: '#64748B' }}>
            <span>Referidos</span><span>Plan</span><span>Tier</span><span style={{ textAlign: 'right' }}>Tu comisión</span>
          </div>
          {EARNINGS.map(([refs, plan, tierName, commission], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '12px 20px', borderBottom: i < EARNINGS.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
              <span>{refs}</span><span>>{tierName}</span><span style={{ fontSize: '.8rem', color: '#1E6FD9' }}>{plan}</span><span style={{ textAlign: 'right', color: '#1E6FD9', fontWeight: 600, fontFamily: 'monospace' }}>{commission}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Who is it for */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: '1.4rem', fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>¿Para quién es?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {AUDIENCE.map(([icon, title, desc], i) => (
            <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, transition: 'transform .2s, box-shadow .2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(30,111,217,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: '.85rem', color: '#64748B' }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: '1.4rem', fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>Preguntas frecuentes</h2>
        {FAQS.map(([q, a], i) => (
          <div key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontWeight: 500 }}>{q}</span>
              <span style={{ color: '#64748B' }}>{openFaq === i ? '−' : '+'}</span>
            </div>
            {openFaq === i && <div style={{ paddingBottom: 16, color: '#64748B', fontSize: '.87rem', lineHeight: 1.6 }}>{a}</div>}
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '60px 24px 40px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', background: 'linear-gradient(135deg, #1E6FD908, #F5820B08)', border: '1px solid #E2E8F0', borderRadius: 16, padding: 40 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>Empieza a ganar con St4rtup</h2>
          <p style={{ color: '#64748B', marginBottom: 20, fontSize: '.9rem' }}>Sin coste de entrada. Sin límite de ganancias.</p>
          <Link to="/contact" style={{ display: 'inline-block', background: '#1E6FD9', color: 'white', padding: '12px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, boxShadow: '0 4px 14px rgba(30,111,217,0.3)' }}>Unirme al programa →</Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #E2E8F0', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ color: '#64748B', fontSize: '.8rem' }}>© 2026 St4rtup. Todos los derechos reservados.</div>
          <div style={{ display: 'flex', gap: 16, fontSize: '.8rem' }}>
            <Link to="/pricing" style={{ color: '#64748B', textDecoration: 'none' }}>Precios</Link>
            <Link to="/privacy" style={{ color: '#64748B', textDecoration: 'none' }}>Privacidad</Link>
            <Link to="/terms" style={{ color: '#64748B', textDecoration: 'none' }}>Términos</Link>
          </div>
        </div>
      </footer>
    <WebChatWidget />
    </div>
  )
}

