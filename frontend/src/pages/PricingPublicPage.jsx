import { useState } from 'react'
import WebChatWidget from "@/components/WebChatWidget"
import SEO from '@/components/SEO'
import { Link } from 'react-router-dom'
import { Check, Minus, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
// Light mode forced on public pages
const LIGHT_COLORS = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0',
  fg: '#0F172A', fgMuted: '#64748B', primary: '#1E6FD9', accent: '#F5820B',
  cyan: '#1E6FD9', purple: '#F5820B',
}

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
]

const PLANS = [
  {
    name: 'Starter', desc: 'Para empezar a vender', popular: false,
    monthly: 0, annual: 0,
    users: '1', leads: '100',
    cta: 'Empezar gratis',
    btn: { bg: 'white', color: '#1E6FD9', border: '2px solid #1E6FD9', shadow: 'none' },
  },
  {
    name: 'Growth', desc: 'Para crecer rápido', popular: true,
    monthly: 19, annual: 16,
    users: '3', leads: '5.000',
    cta: 'Prueba 7 días gratis',
    btn: { bg: 'linear-gradient(135deg, #1E6FD9, #3B8DE8)', color: 'white', border: 'none', shadow: '0 4px 14px rgba(30,111,217,0.4)' },
  },
  {
    name: 'Scale', desc: 'Para escalar sin límites', popular: false,
    monthly: 49, annual: 41,
    users: '10', leads: 'Ilimitados',
    cta: 'Empezar prueba',
    btn: { bg: 'linear-gradient(135deg, #F5820B, #F59E0B)', color: 'white', border: 'none', shadow: '0 4px 14px rgba(245,130,11,0.35)' },
  },
]

import featuresMatrix from '@/data/features-matrix.json'

const FEATURES = featuresMatrix.categories.map(cat => ({
  category: cat.name,
  items: cat.features.map(f => ({ name: f.name, desc: f.desc, starter: f.starter, growth: f.growth, scale: f.scale })),
}))

const FAQS = [
  { q: '¿Puedo empezar gratis?', a: 'Sí. El plan Starter es gratuito para siempre, con hasta 1 usuario y 100 leads. No necesitas tarjeta de crédito.' },
  { q: '¿Qué pasa cuando supero los límites del plan Starter?', a: 'Recibirás una notificación. Tus datos no se eliminan — simplemente no podrás crear más leads hasta que migres a Growth o elimines registros existentes.' },
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes subir o bajar de plan cuando quieras. Al subir, se aplica la diferencia prorrateada. Al bajar, el cambio se aplica en el siguiente ciclo de facturación.' },
  { q: '¿Qué métodos de pago aceptáis?', a: 'Aceptamos tarjeta de crédito/débito (Visa, Mastercard, Amex) vía Stripe, y PayPal. Para planes Scale con facturación anual, también transferencia bancaria.' },
  { q: '¿Ofrecéis descuento para startups early-stage?', a: 'Sí. Si tu startup tiene menos de 2 años y está en fase pre-seed o seed, escríbenos a hello@st4rtup.com y te regalamos 3 meses gratis del plan Growth para que arranques sin coste.' },
  { q: '¿Mis datos están seguros?', a: 'Absolutamente. Usamos cifrado AES-256 en reposo y TLS 1.3 en tránsito. Los datos se almacenan en la UE (Supabase región CDG). Cumplimos con RGPD.' },
  { q: '¿Puedo exportar mis datos si cancelo?', a: 'Sí. Puedes exportar todos tus datos en CSV o JSON en cualquier momento, incluso después de cancelar (durante 30 días). También soportamos export a Google Sheets y Airtable.' },
  { q: '¿Qué incluye el soporte prioritario?', a: 'Respuesta garantizada en menos de 4 horas laborables. Canal de Slack dedicado. Onboarding personalizado con sesión 1:1. Disponible solo en el plan Scale.' },
  { q: '¿Ofrecéis API pública?', a: 'Sí, en el plan Scale. API REST completa con documentación en /public/docs, rate limiting de 100 req/min, y webhooks bidireccionales con firma HMAC.' },
  { q: '¿Cómo funciona la facturación con IVA?', a: 'Los precios mostrados son sin IVA. Para empresas españolas se aplica el 21% de IVA. Para empresas intracomunitarias con NIF-IVA válido, la factura se emite sin IVA (inversión del sujeto pasivo).' },
]

function Nav() {
  const T = LIGHT_COLORS
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
        <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {NAV_LINKS.map(l => <a key={l.label} href={l.href} style={{ fontSize: 14, color: T.fgMuted, textDecoration: 'none', fontWeight: 500 }}>{l.label}</a>)}
          <Link to="/register" style={{ padding: '8px 20px', backgroundColor: T.primary, color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis</Link>
        </div>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer style={{ padding: '60px 24px 40px', backgroundColor: '#1A1A2E', color: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 }}>
          <div>
            <img src="/logo.png" alt="st4rtup" style={{ height: 60 }} />
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 12 }}>CRM de ventas y marketing para startups.</p>
          </div>
          {[
            { title: 'Producto', links: [{ t: 'Features', h: '/#features' }, { t: 'Pricing', h: '/pricing' }] },
            { title: 'Legal', links: [{ t: 'Privacidad', h: '/privacy' }, { t: 'Términos', h: '/terms' }, { t: 'Cookies', h: '/cookies' }] },
          ].map(col => (
            <div key={col.title}>
              <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#94A3B8', marginBottom: 16 }}>{col.title}</p>
              {col.links.map(l => <Link key={l.t} to={l.h} style={{ display: 'block', fontSize: 14, color: '#CBD5E1', margin: '8px 0', textDecoration: 'none' }}>{l.t}</Link>)}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ fontSize: 13, color: '#64748B' }}>© 2026 St4rtup. Todos los derechos reservados.</p>
          <p style={{ fontSize: 13, color: '#64748B' }}>hello@st4rtup.com</p>
        </div>
      </div>
    </footer>
  )
}

export default function PricingPublicPage() {
  const [annual, setAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState(null)
  const [openCats, setOpenCats] = useState({})
  const T = LIGHT_COLORS

  return (
    <div className="public-page" style={{ fontFamily: "'Inter', sans-serif", color: T.fg }}>
      <SEO title="Precios" description="Planes de St4rtup CRM: Starter gratis, Growth €19/mes, Scale €49/mes. Sin tarjeta de crédito." path="/pricing" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
      <Nav />

      {/* Hero */}
      <section style={{ padding: '80px 24px 40px', textAlign: 'center', background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7ED 100%)' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, marginBottom: 16 }}>Planes para cada etapa de tu startup</h1>
        <p style={{ fontSize: 16, color: T.fgMuted, marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>Sin tarjeta de crédito. Cancela cuando quieras. Migra tus datos en cualquier momento.</p>

        {/* Toggle */}
        <div style={{ display: 'inline-flex', padding: 4, backgroundColor: T.muted, borderRadius: 12, marginBottom: 48 }}>
          <button onClick={() => setAnnual(false)} style={{ padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: !annual ? T.card : 'transparent', color: !annual ? T.fg : T.fgMuted, boxShadow: !annual ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Mensual</button>
          <button onClick={() => setAnnual(true)} style={{ padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: annual ? T.card : 'transparent', color: annual ? T.fg : T.fgMuted, boxShadow: annual ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', position: 'relative' }}>
            Anual <span style={{ position: 'absolute', top: -8, right: -12, padding: '2px 6px', backgroundColor: T.success, color: 'white', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>-17%</span>
          </button>
        </div>

        {/* Plan Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
          {PLANS.map((p, i) => (
            <div key={p.name} style={{ padding: 32, borderRadius: 16, backgroundColor: T.card, border: p.popular ? `2px solid ${T.primary}` : `1px solid ${T.border}`, boxShadow: p.popular ? '0 10px 40px rgba(30,111,217,0.15)' : '0 2px 12px rgba(0,0,0,0.04)', position: 'relative', textAlign: 'left', transform: p.popular ? 'scale(1.02)' : 'none', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { if (!p.popular) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)' } }}
              onMouseLeave={e => { if (!p.popular) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)' } }}
            >
              {p.popular && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', background: 'linear-gradient(135deg, #1E6FD9, #3B8DE8)', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Más popular</span>}
              <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.name}</h3>
              <p style={{ fontSize: 13, color: T.fgMuted, marginBottom: 16 }}>{p.desc}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                {annual && p.monthly > 0 && <span style={{ fontSize: 18, fontWeight: 500, color: T.fgMuted, textDecoration: 'line-through', marginRight: 4 }}>€{p.monthly}</span>}
                <span style={{ fontSize: 48, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>€{annual ? p.annual : p.monthly}</span>
                <span style={{ fontSize: 16, color: T.fgMuted }}>/mes</span>
              </div>
              {annual && p.monthly > 0 && <p style={{ fontSize: 12, color: T.success, fontWeight: 600, marginBottom: 16 }}>Ahorras €{(p.monthly - p.annual) * 12}/año · facturado anual</p>}
              {p.monthly === 0 && <p style={{ fontSize: 12, color: T.fgMuted, marginBottom: 16 }}>Gratis para siempre</p>}
              <p style={{ fontSize: 13, color: T.fgMuted, marginBottom: 16 }}>{p.users} usuarios · {p.leads} leads</p>
              <button onClick={async () => {
                if (p.monthly === 0) { window.location.href = '/register'; return }
                const plan = p.name.toLowerCase() + (annual ? '_annual' : '_monthly')
                try {
                  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
                  if(window.umami)window.umami.track('checkout_click',{plan});const res = await fetch(`${apiUrl}/payments/public/create-session?plan=${plan}`, { method: 'POST' })
                  const data = await res.json()
                  if (data.checkout_url) window.location.href = data.checkout_url
                  else alert('Error al crear el pago. Inténtalo de nuevo.')
                } catch { alert('Error de conexión') }
              }} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '13px 24px', borderRadius: 10, background: p.btn.bg, color: p.btn.color, border: p.btn.border, boxShadow: p.btn.shadow, fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'opacity 0.2s, transform 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.01)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)' }}
              >{p.cta}</button>
              {p.monthly > 0 && <button onClick={async () => {
                const plan = p.name.toLowerCase() + (annual ? '_annual' : '_monthly')
                try {
                  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
                  if(window.umami)window.umami.track('paypal_click',{plan});const res = await fetch(`${apiUrl}/payments/public/paypal-order?plan=${plan}`, { method: 'POST' })
                  const data = await res.json()
                  if (data.approval_url) window.location.href = data.approval_url
                  else alert('Error al crear el pago con PayPal')
                } catch { alert('Error de conexión') }
              }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', textAlign: 'center', padding: '10px 24px', borderRadius: 10, backgroundColor: '#FFC439', color: '#003087', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#003087"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603a.77.77 0 0 0-.76.648l-.762 4.834-.235 1.49a.41.41 0 0 1-.405.347H7.076z"/></svg>
                PayPal
              </button>}
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div style={{ maxWidth: 1000, margin: '40px auto 0', padding: '28px 32px', borderRadius: 16, border: `1px solid ${T.border}`, backgroundColor: T.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Plus Jakarta Sans'" }}>Enterprise</h3>
            <p style={{ fontSize: 14, color: T.fgMuted }}>Usuarios ilimitados, SSO, SLA 99.9%, gestor dedicado</p>
          </div>
          <Link to="/contact-sales" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #0F172A, #334155)', color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 14px rgba(15,23,42,0.3)' }}>
            Contactar ventas <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Feature Comparison */}
      <section style={{ padding: '80px 24px', backgroundColor: T.card }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>Comparativa de features</h2>
          <div style={{ borderRadius: 16, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', padding: '16px 24px', backgroundColor: T.bg, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.fgMuted }}>Feature</span>
              {['Starter', 'Growth', 'Scale'].map(n => <span key={n} style={{ fontSize: 13, fontWeight: 700, color: T.fg, textAlign: 'center' }}>{n}</span>)}
            </div>
            {FEATURES.map(cat => (
              <div key={cat.category}>
                <button onClick={() => setOpenCats(prev => ({ ...prev, [cat.category]: !prev[cat.category] }))}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 24px', width: '100%', padding: '14px 24px', backgroundColor: T.bg, border: 'none', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>{cat.category}</span>
                  {openCats[cat.category] ? <ChevronUp size={16} color={T.fgMuted} /> : <ChevronDown size={16} color={T.fgMuted} />}
                </button>
                {openCats[cat.category] && cat.items.map(item => (
                  <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', padding: '10px 24px', borderBottom: `1px solid ${T.muted}` }}>
                    <span style={{ fontSize: 13, color: T.fgMuted }}>{item.name}</span>
                    {[item.starter, item.growth, item.scale].map((v, i) => (
                      <span key={i} style={{ textAlign: 'center', fontSize: 11, color: typeof v === 'string' ? T.primary : undefined, fontWeight: typeof v === 'string' ? 600 : undefined }}>{v === true ? <Check size={16} color={T.success} /> : v === false ? <Minus size={14} color="#CBD5E1" /> : v}</span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: T.fgMuted, textAlign: 'center', marginTop: 16 }}>Precios sin IVA. Para empresas españolas se aplica el 21% de IVA.</p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 24px', backgroundColor: T.bg }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>Preguntas frecuentes</h2>
          {FAQS.map((f, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '16px 0', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: T.fg }}>{f.q}</span>
                {openFaq === i ? <ChevronUp size={18} color={T.fgMuted} /> : <ChevronDown size={18} color={T.fgMuted} />}
              </button>
              {openFaq === i && <p style={{ fontSize: 14, color: T.fgMuted, lineHeight: 1.7, paddingBottom: 16 }}>{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', padding: '50px 40px', borderRadius: 24, background: 'linear-gradient(135deg, #1E6FD9, #F5820B)' }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 16 }}>¿Listo para vender más?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 32 }}>Empieza gratis hoy. Setup en 5 minutos.</p>
          <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', backgroundColor: 'white', color: '#1E6FD9', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>Empezar gratis <ArrowRight size={18} /></Link>
        </div>
      </section>

      <Footer />
      <WebChatWidget />
    </div>
  )
}
