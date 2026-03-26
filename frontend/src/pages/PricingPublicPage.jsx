import { useState } from 'react'
import WebChatWidget from "@/components/WebChatWidget"
import { Link } from 'react-router-dom'
import { Check, Minus, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '#' },
]

const PLANS = [
  {
    name: 'Starter', desc: 'Para empezar a vender', popular: false,
    monthly: 0, annual: 0,
    users: '1', leads: '100',
    cta: 'Empezar gratis', ctaStyle: 'outline',
  },
  {
    name: 'Growth', desc: 'Para crecer rápido', popular: true,
    monthly: 19, annual: 16,
    users: '3', leads: '5.000',
    cta: 'Prueba 7 días gratis', ctaStyle: 'filled',
  },
  {
    name: 'Scale', desc: 'Para escalar sin límites', popular: false,
    monthly: 49, annual: 41,
    users: '10', leads: 'Ilimitados',
    cta: 'Empezar prueba', ctaStyle: 'outline',
  },
]

const FEATURES = [
  { category: 'CRM Core', items: [
    { name: 'Leads + Scoring IA', starter: true, growth: true, scale: true },
    { name: 'Pipeline Kanban + Forecast', starter: true, growth: true, scale: true },
    { name: 'Visitas + Google Calendar Sync', starter: true, growth: true, scale: true },
    { name: 'Emails (Gmail OAuth + tracking)', starter: true, growth: true, scale: true },
    { name: 'Acciones + Kanban', starter: true, growth: true, scale: true },
    { name: 'Contactos + Stakeholder Map', starter: false, growth: true, scale: true },
    { name: 'Encuestas NPS/CSAT', starter: false, growth: true, scale: true },
    { name: 'Reviews mensuales', starter: false, growth: true, scale: true },
  ]},
  { category: 'Marketing Hub', items: [
    { name: 'Campañas multicanal', starter: false, growth: true, scale: true },
    { name: 'SEO Command Center (9 tabs)', starter: false, growth: true, scale: true },
    { name: 'Content Pipeline IA (4 agentes)', starter: false, growth: true, scale: true },
    { name: 'Funnels visuales', starter: false, growth: true, scale: true },
    { name: 'Assets + UTM Generator', starter: false, growth: true, scale: true },
    { name: 'YouTube Analytics', starter: false, growth: true, scale: true },
    { name: 'LLM Visibility Monitor', starter: false, growth: false, scale: true },
  ]},
  { category: 'Inteligencia Artificial', items: [
    { name: '4 Agentes IA (Scoring, BANT, Propuestas, CS)', starter: false, growth: true, scale: true },
    { name: 'AI Summary diario', starter: false, growth: true, scale: true },
    { name: 'Sugerencias proactivas', starter: false, growth: true, scale: true },
    { name: 'Auto-tagging leads', starter: false, growth: true, scale: true },
    { name: 'Smart Forms IA', starter: false, growth: true, scale: true },
    { name: 'Selector de proveedor IA', starter: false, growth: true, scale: true },
  ]},
  { category: 'Llamadas IA', items: [
    { name: 'Consola + Prompts', starter: false, growth: true, scale: true },
    { name: 'Queue / Batch calling', starter: false, growth: false, scale: true },
    { name: 'A/B Testing prompts', starter: false, growth: false, scale: true },
    { name: 'RGPD Consent Flow', starter: false, growth: true, scale: true },
  ]},
  { category: 'Integraciones', items: [
    { name: 'Gmail + Google Drive', starter: true, growth: true, scale: true },
    { name: 'Stripe + PayPal', starter: false, growth: true, scale: true },
    { name: 'WhatsApp Business + Bot IA', starter: false, growth: false, scale: true },
    { name: 'YouTube', starter: false, growth: true, scale: true },
    { name: 'Airtable + MCP Gateway', starter: false, growth: false, scale: true },
    { name: 'Slack + Teams + Telegram', starter: false, growth: true, scale: true },
    { name: 'Webhooks + n8n', starter: false, growth: true, scale: true },
  ]},
  { category: 'Avanzado', items: [
    { name: 'Deal Room + PDF Watermark', starter: false, growth: false, scale: true },
    { name: 'NDA Digital (Signaturit/Yousign/DocuSign)', starter: false, growth: false, scale: true },
    { name: 'API Pública', starter: false, growth: false, scale: true },
    { name: 'Widgets embebibles', starter: false, growth: false, scale: true },
    { name: 'i18n (ES/EN/PT)', starter: true, growth: true, scale: true },
    { name: '22 Automatizaciones', starter: false, growth: true, scale: true },
    { name: '14 Grafos visuales', starter: false, growth: true, scale: true },
    { name: 'Soporte prioritario', starter: false, growth: false, scale: true },
  ]},
]

const FAQS = [
  { q: '¿Puedo empezar gratis?', a: 'Sí. El plan Starter es gratuito para siempre, con hasta 3 usuarios y 100 leads. No necesitas tarjeta de crédito.' },
  { q: '¿Qué pasa cuando supero los límites del plan Starter?', a: 'Recibirás una notificación. Tus datos no se eliminan — simplemente no podrás crear más leads hasta que migres a Growth o elimines registros existentes.' },
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Puedes subir o bajar de plan cuando quieras. Al subir, se aplica la diferencia prorrateada. Al bajar, el cambio se aplica en el siguiente ciclo de facturación.' },
  { q: '¿Qué métodos de pago aceptáis?', a: 'Aceptamos tarjeta de crédito/débito (Visa, Mastercard, Amex) vía Stripe, y PayPal. Para planes Scale con facturación anual, también transferencia bancaria.' },
  { q: '¿Ofrecéis descuento para startups early-stage?', a: 'Sí. Si tu startup tiene menos de 2 años y está en fase pre-seed o seed, escríbenos a hello@st4rtup.com para un descuento del 50% durante el primer año.' },
  { q: '¿Mis datos están seguros?', a: 'Absolutamente. Usamos cifrado AES-256 en reposo y TLS 1.3 en tránsito. Los datos se almacenan en la UE (Supabase región CDG). Cumplimos con RGPD.' },
  { q: '¿Puedo exportar mis datos si cancelo?', a: 'Sí. Puedes exportar todos tus datos en CSV o JSON en cualquier momento, incluso después de cancelar (durante 30 días). También soportamos export a Google Sheets y Airtable.' },
  { q: '¿Qué incluye el soporte prioritario?', a: 'Respuesta garantizada en menos de 4 horas laborables. Canal de Slack dedicado. Onboarding personalizado con sesión 1:1. Disponible solo en el plan Scale.' },
  { q: '¿Ofrecéis API pública?', a: 'Sí, en el plan Scale. API REST completa con documentación en /public/docs, rate limiting de 100 req/min, y webhooks bidireccionales con firma HMAC.' },
  { q: '¿Cómo funciona la facturación con IVA?', a: 'Los precios mostrados son sin IVA. Para empresas españolas se aplica el 21% de IVA. Para empresas intracomunitarias con NIF-IVA válido, la factura se emite sin IVA (inversión del sujeto pasivo).' },
]

function Nav() {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
        <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {NAV_LINKS.map(l => <a key={l.label} href={l.href} style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>{l.label}</a>)}
          <Link to="/login" style={{ padding: '8px 20px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis</Link>
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

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1A1A2E' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
      <Nav />

      {/* Hero */}
      <section style={{ padding: '80px 24px 40px', textAlign: 'center', background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7ED 100%)' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, marginBottom: 16 }}>Planes para cada etapa de tu startup</h1>
        <p style={{ fontSize: 16, color: '#64748B', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>Sin tarjeta de crédito. Cancela cuando quieras. Migra tus datos en cualquier momento.</p>

        {/* Toggle */}
        <div style={{ display: 'inline-flex', padding: 4, backgroundColor: '#F1F5F9', borderRadius: 10, marginBottom: 48 }}>
          <button onClick={() => setAnnual(false)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: !annual ? 'white' : 'transparent', color: !annual ? '#1A1A2E' : '#64748B', boxShadow: !annual ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Mensual</button>
          <button onClick={() => setAnnual(true)} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: annual ? 'white' : 'transparent', color: annual ? '#1A1A2E' : '#64748B', boxShadow: annual ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            Anual <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700, marginLeft: 4 }}>-17%</span>
          </button>
        </div>

        {/* Plan Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
          {PLANS.map(p => (
            <div key={p.name} style={{ padding: 32, borderRadius: 16, backgroundColor: 'white', border: p.popular ? '2px solid #1E6FD9' : '1px solid #E2E8F0', boxShadow: p.popular ? '0 10px 40px rgba(59,130,246,0.12)' : '0 1px 3px rgba(0,0,0,0.04)', position: 'relative', textAlign: 'left' }}>
              {p.popular && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Más popular</span>}
              <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.name}</h3>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>{p.desc}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 48, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>€{annual ? p.annual : p.monthly}</span>
                <span style={{ fontSize: 16, color: '#64748B' }}>/mes</span>
              </div>
              {annual && p.monthly > 0 && <p style={{ fontSize: 12, color: '#10B981', marginBottom: 16 }}>Ahorras €{(p.monthly - p.annual) * 12}/año</p>}
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>{p.users} usuarios · {p.leads} leads</p>
              <button onClick={async () => {
                if (p.monthly === 0) { window.location.href = '/login'; return }
                const plan = p.name.toLowerCase() + (annual ? '_annual' : '_monthly')
                try {
                  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
                  const res = await fetch(`${apiUrl}/payments/public/checkout?plan=${plan}`, { method: 'POST' })
                  const data = await res.json()
                  if (data.checkout_url) window.location.href = data.checkout_url
                  else alert('Error al crear el pago. Inténtalo de nuevo.')
                } catch { alert('Error de conexión') }
              }} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px 24px', borderRadius: 10, backgroundColor: p.ctaStyle === 'filled' ? '#1E6FD9' : '#F8FAFC', color: p.ctaStyle === 'filled' ? 'white' : '#1A1A2E', border: p.ctaStyle === 'filled' ? 'none' : '1px solid #E2E8F0', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{p.cta}</button>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section style={{ padding: '80px 24px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>Comparativa de features</h2>
          <div style={{ borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', padding: '16px 24px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Feature</span>
              {['Starter', 'Growth', 'Scale'].map(n => <span key={n} style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', textAlign: 'center' }}>{n}</span>)}
            </div>
            {/* Categories */}
            {FEATURES.map(cat => (
              <div key={cat.category}>
                <button onClick={() => setOpenCats(prev => ({ ...prev, [cat.category]: !prev[cat.category] }))}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 24px', width: '100%', padding: '14px 24px', backgroundColor: '#F8FAFC', border: 'none', borderBottom: '1px solid #E2E8F0', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{cat.category}</span>
                  {openCats[cat.category] ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
                </button>
                {openCats[cat.category] && cat.items.map(item => (
                  <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', padding: '10px 24px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>{item.name}</span>
                    {[item.starter, item.growth, item.scale].map((v, i) => (
                      <span key={i} style={{ textAlign: 'center' }}>{v ? <Check size={16} color="#10B981" /> : <Minus size={14} color="#CBD5E1" />}</span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 16 }}>Precios sin IVA. Para empresas españolas se aplica el 21% de IVA.</p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 24px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>Preguntas frecuentes</h2>
          {FAQS.map((f, i) => (
            <div key={i} style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: 0 }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '16px 0', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E' }}>{f.q}</span>
                {openFaq === i ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
              </button>
              {openFaq === i && <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, paddingBottom: 16 }}>{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', padding: '50px 40px', borderRadius: 24, background: 'linear-gradient(135deg, #1E6FD9, #F5820B)' }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 16 }}>¿Listo para vender más?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 32 }}>Empieza gratis hoy. Setup en 5 minutos.</p>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', backgroundColor: 'white', color: '#1E6FD9', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>Empezar gratis <ArrowRight size={18} /></Link>
        </div>
      </section>

      <Footer />
    <WebChatWidget />
    </div>
  )
}

