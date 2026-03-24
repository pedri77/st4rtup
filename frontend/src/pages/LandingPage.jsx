import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Mail, Phone, Globe, Zap,
  Layout, MessageSquare, Shield, Menu, X, ChevronRight,
  Check, Star, Megaphone
} from 'lucide-react'

const T = {
  es: {
    nav: { features: 'Funcionalidades', pricing: 'Precios', testimonials: 'Testimonios', login: 'Iniciar sesión', cta: 'Empezar gratis' },
    hero: { h1a: 'Tu CRM de ventas.', h1b: 'Simple. Potente. Para startups.', sub: 'Pipeline, marketing, emails, llamadas IA, SEO y automatizaciones. Todo en un solo lugar. Listo en 5 minutos.', cta1: 'Empezar gratis', cta2: 'Ver funcionalidades' },
    trust: 'Usado por equipos de ventas en',
    features: { tag: 'Funcionalidades', h2: 'Todo lo que necesitas para vender más', sub: '9 módulos integrados que cubren el ciclo completo: desde captación hasta cierre y postventa.', items: [
      { title: 'Pipeline Visual', desc: 'Kanban con arrastrar y soltar, previsión de ingresos, embudo de conversión y flujo Sankey. Todo en tiempo real.' },
      { title: 'Hub de Marketing', desc: 'Campañas multicanal, embudos, recursos, calendario editorial, generador UTM y analíticas unificadas.' },
      { title: 'Emails Integrados', desc: 'Gmail OAuth gratis + seguimiento de apertura y clics. Plantillas, programación y secuencias automáticas.' },
      { title: 'Llamadas con IA', desc: 'Retell AI con puntuación automática, transcripción, análisis de sentimiento y cualificación BANT.' },
      { title: 'Centro de SEO', desc: '9 pestañas: contenido, palabras clave, backlinks, panel, reutilizador, salud, marca, seguimiento y pipeline de contenido IA.' },
      { title: 'Automatizaciones', desc: 'Más de 22 flujos preconfigurados: secuencias de bienvenida, recordatorios, escalado, puntuación y seguimientos.' },
      { title: 'Panel + 14 Gráficos', desc: 'KPIs en tiempo real: Sankey, cascada, radar, embudo, mapas de calor, burbujas y más.' },
      { title: 'WhatsApp Business', desc: 'Chatbot IA para cualificación, mensajes directos desde el CRM, plantillas y automatizaciones.' },
      { title: 'Sala de Negociación', desc: 'Marca de agua en PDF, analíticas por página y visitante, firma NDA digital (Signaturit/Yousign/DocuSign).' },
    ]},
    how: { tag: 'Cómo funciona', h2: '3 pasos para vender más', steps: [
      { n: '01', title: 'Conecta', desc: 'Integra Gmail, Stripe, WhatsApp y más de 25 herramientas en 5 minutos. Sin código.' },
      { n: '02', title: 'Automatiza', desc: '22 automatizaciones listas: puntuación, emails, alertas, seguimientos. Actívalas con un clic.' },
      { n: '03', title: 'Vende', desc: 'Cierra más acuerdos con IA como copiloto. Panel en tiempo real con 14 gráficos y KPIs.' },
    ]},
    pricing: { tag: 'Precios', h2: 'Planes para cada etapa', sub: 'Sin tarjeta de crédito. Cancela cuando quieras.', popular: 'Más popular', contact: 'Contactar', plans: [
      { name: 'Starter', price: '0', desc: 'Para empezar a vender', features: ['1 usuario', '100 leads', 'Pipeline básico', 'Email integrado', '1 integración'], cta: 'Empezar gratis' },
      { name: 'Growth', price: '19', desc: 'Para crecer rápido', features: ['3 usuarios', 'Leads ilimitados', 'Hub de Marketing completo', 'IA integrada (4 agentes)', 'Todas las integraciones', '22 automatizaciones', 'Centro de SEO', 'Analíticas avanzadas'], cta: 'Prueba 14 días gratis' },
      { name: 'Scale', price: '49', desc: 'Para escalar sin límites', features: ['10 usuarios', 'Todo en Growth', 'Sala de Negociación + NDA', 'WhatsApp Business + Bot', 'API pública', 'Soporte prioritario', 'Onboarding personalizado', 'Stripe + PayPal integrado'], cta: 'Empezar prueba' },
      { name: 'Enterprise', price: null, desc: 'Para grandes equipos', features: ['Usuarios ilimitados', 'Todo en Scale', 'SSO / SAML', 'SLA 99.9%', 'Gestor de cuenta dedicado', 'Formación personalizada', 'Facturación por transferencia', 'Integraciones a medida'], cta: 'Contactar ventas' },
    ]},
    testimonials: { tag: 'Testimonios', h2: 'Lo que dicen nuestros clientes', items: [
      { quote: 'Pasamos de una hoja de cálculo a cerrar 3 veces más acuerdos en 2 meses. El pipeline visual y las automatizaciones lo cambiaron todo.', name: 'María García', role: 'CEO, TechStartup' },
      { quote: 'El Centro de SEO nos posicionó en el top 3 de Google en 6 semanas. Los 4 agentes IA generan contenido profesional.', name: 'Carlos Ruiz', role: 'Director de Marketing, GrowthLab' },
      { quote: 'Las llamadas IA cualifican leads mientras dormimos. La cualificación BANT automática ahorra 15h/semana a nuestro equipo.', name: 'Ana López', role: 'Directora Comercial, ScaleUp' },
    ]},
    cta: { h2: 'Empieza a vender más. Hoy.', sub: 'Sin tarjeta de crédito. Listo en 5 minutos. Cancela cuando quieras.', btn: 'Empezar gratis' },
    footer: { desc: 'CRM de ventas y marketing para startups. Simple, potente, con IA.', producto: 'Producto', recursos: 'Recursos', legal: 'Legal', copy: '© 2026 St4rtup. Todos los derechos reservados.' },
    mock: { revenue: 'Ingresos', leads: 'Leads', conversion: 'Conversión' },
  },
  en: {
    nav: { features: 'Features', pricing: 'Pricing', testimonials: 'Testimonials', login: 'Log in', cta: 'Get started free' },
    hero: { h1a: 'Your sales CRM.', h1b: 'Simple. Powerful. For startups.', sub: 'Pipeline, marketing, emails, AI calls, SEO and automations. All in one place. Ready in 5 minutes.', cta1: 'Get started free', cta2: 'See features' },
    trust: 'Used by sales teams at',
    features: { tag: 'Features', h2: 'Everything you need to sell more', sub: '9 integrated modules covering the full cycle: from capture to close and post-sale.', items: [
      { title: 'Visual Pipeline', desc: 'Drag & drop Kanban, revenue forecast, conversion funnel and Sankey flow. All in real time.' },
      { title: 'Marketing Hub', desc: 'Multichannel campaigns, funnels, assets, editorial calendar, UTM generator and unified analytics.' },
      { title: 'Integrated Emails', desc: 'Free Gmail OAuth + open/click tracking. Templates, scheduling and automatic sequences.' },
      { title: 'AI Calls', desc: 'Retell AI with automatic scoring, transcription, sentiment analysis and BANT qualification.' },
      { title: 'SEO Command Center', desc: '9 tabs: content, keywords, backlinks, dashboard, repurposer, health, brand, tracker + AI content pipeline.' },
      { title: 'Automations', desc: '22+ preconfigured workflows: welcome sequences, reminders, escalation, scoring and follow-ups.' },
      { title: 'Dashboard + 14 Charts', desc: 'Real-time KPIs: Sankey, Waterfall, Radar, Funnel, Heatmaps, Bubble charts and more.' },
      { title: 'WhatsApp Business', desc: 'AI chatbot for qualification, direct messages from CRM, templates and automations.' },
      { title: 'Deal Room', desc: 'PDF watermark, per-page and per-visitor analytics, digital NDA signing (Signaturit/Yousign/DocuSign).' },
    ]},
    how: { tag: 'How it works', h2: '3 steps to sell more', steps: [
      { n: '01', title: 'Connect', desc: 'Integrate Gmail, Stripe, WhatsApp and 25+ tools in 5 minutes. No code.' },
      { n: '02', title: 'Automate', desc: '22 ready-to-use automations: scoring, emails, alerts, follow-ups. Activate with one click.' },
      { n: '03', title: 'Sell', desc: 'Close more deals with AI as your copilot. Real-time dashboard with 14 charts and KPIs.' },
    ]},
    pricing: { tag: 'Pricing', h2: 'Plans for every stage', sub: 'No credit card required. Cancel anytime.', popular: 'Most popular', contact: 'Contact us', plans: [
      { name: 'Starter', price: '0', desc: 'To start selling', features: ['1 user', '100 leads', 'Basic pipeline', 'Integrated email', '1 integration'], cta: 'Get started free' },
      { name: 'Growth', price: '19', desc: 'To grow fast', features: ['3 users', 'Unlimited leads', 'Full Marketing Hub', 'Integrated AI (4 agents)', 'All integrations', '22 automations', 'SEO Command Center', 'Advanced analytics'], cta: '14-day free trial' },
      { name: 'Scale', price: '49', desc: 'To scale without limits', features: ['10 users', 'Everything in Growth', 'Deal Room + NDA', 'WhatsApp Business + Bot', 'Public API', 'Priority support', 'Custom onboarding', 'Stripe + PayPal'], cta: 'Start free trial' },
      { name: 'Enterprise', price: null, desc: 'For large teams', features: ['Unlimited users', 'Everything in Scale', 'SSO / SAML', '99.9% SLA', 'Dedicated account manager', 'Custom training', 'Invoice billing', 'Custom integrations'], cta: 'Contact sales' },
    ]},
    testimonials: { tag: 'Testimonials', h2: 'What our customers say', items: [
      { quote: 'We went from a spreadsheet to closing 3x more deals in 2 months. The visual pipeline and automations changed everything.', name: 'María García', role: 'CEO, TechStartup' },
      { quote: 'The SEO Command Center got us to Google top 3 in 6 weeks. The 4 AI agents generate professional content.', name: 'Carlos Ruiz', role: 'CMO, GrowthLab' },
      { quote: 'AI calls qualify leads while we sleep. Automatic BANT qualification saves our team 15h/week.', name: 'Ana López', role: 'Head of Sales, ScaleUp' },
    ]},
    cta: { h2: 'Start selling more. Today.', sub: 'No credit card. Setup in 5 minutes. Cancel anytime.', btn: 'Get started free' },
    footer: { desc: 'Sales & marketing CRM for startups. Simple, powerful, AI-driven.', producto: 'Product', recursos: 'Resources', legal: 'Legal', copy: '© 2026 St4rtup. All rights reserved.' },
    mock: { revenue: 'Revenue', leads: 'Leads', conversion: 'Conversion' },
  },
}

const ICONS = [BarChart3, Megaphone, Mail, Phone, Globe, Zap, Layout, MessageSquare, Shield]
const LOGOS = ['TechCo', 'GrowthLab', 'ScaleUp', 'FounderOS', 'LaunchPad', 'VentureHQ']
const STEP_COLORS = ['#1E6FD9', '#F5820B', '#10B981']

function useInView(ref) {
  const [v, setV] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true) }, { threshold: 0.1 })
    o.observe(ref.current)
    return () => o.disconnect()
  }, [ref])
  return v
}

function FadeIn({ children, delay = 0 }) {
  const ref = useRef(null)
  const v = useInView(ref)
  return <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? 'translateY(0)' : 'translateY(20px)', transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s` }}>{children}</div>
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [lang, setLang] = useState('es')
  const t = T[lang]

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1A1A2E' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
          <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="hidden md:flex">
            <a href="#features" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>{t.nav.features}</a>
            <a href="#pricing" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>{t.nav.pricing}</a>
            <a href="#testimonials" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>{t.nav.testimonials}</a>
            <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} style={{ padding: '4px 10px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', backgroundColor: 'white', color: '#64748B' }}>{lang === 'es' ? 'EN' : 'ES'}</button>
            <Link to="/login" style={{ fontSize: 14, color: '#1E6FD9', textDecoration: 'none', fontWeight: 600 }}>{t.nav.login}</Link>
            <Link to="/login" style={{ padding: '10px 22px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>{t.nav.cta}</Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden" style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <a href="#features" onClick={() => setMenuOpen(false)} style={{ fontSize: 14, color: '#64748B', textDecoration: 'none' }}>{t.nav.features}</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ fontSize: 14, color: '#64748B', textDecoration: 'none' }}>{t.nav.pricing}</a>
            <button onClick={() => { setLang(lang === 'es' ? 'en' : 'es'); setMenuOpen(false) }} style={{ padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', backgroundColor: 'white', color: '#64748B', width: 'fit-content' }}>{lang === 'es' ? 'English' : 'Español'}</button>
            <Link to="/login" style={{ padding: '10px 20px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>{t.nav.cta}</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7ED 100%)', padding: '80px 24px 100px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px' }}>
            <FadeIn>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>
                {t.hero.h1a}<br />
                <span style={{ color: '#1E6FD9' }}>{lang === 'es' ? 'Simple' : 'Simple'}.</span>{' '}
                <span style={{ color: '#3B8DE8' }}>{lang === 'es' ? 'Potente' : 'Powerful'}.</span>{' '}
                <span style={{ color: '#5BA3EF' }}>{lang === 'es' ? 'Para' : 'For'}</span>{' '}
                <span style={{ color: '#F5820B' }}>startups.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}><p style={{ fontSize: 18, color: '#64748B', lineHeight: 1.7, marginBottom: 32, maxWidth: 500 }}>{t.hero.sub}</p></FadeIn>
            <FadeIn delay={0.2}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(30,111,217,0.4)' }}>{t.hero.cta1} <ArrowRight size={18} /></Link>
                <a href="#features" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', border: '2px solid #E2E8F0', color: '#1A1A2E', borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>{t.hero.cta2}</a>
              </div>
            </FadeIn>
          </div>
          <FadeIn delay={0.3}>
            <div style={{ flex: '1 1 400px', background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[{ label: t.mock.revenue, value: '€47.2K', color: '#1E6FD9' }, { label: t.mock.leads, value: '284', color: '#F5820B' }, { label: t.mock.conversion, value: '12.4%', color: '#10B981' }].map(k => (
                  <div key={k.label} style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#64748B', margin: 0 }}>{k.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: k.color, margin: '4px 0 0', fontFamily: "'Plus Jakarta Sans'" }}>{k.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
                {[40, 55, 35, 70, 50, 85, 65, 90, 75, 95, 80, 100].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: 'linear-gradient(180deg, #1E6FD9, #F5820B)', opacity: 0.7 + h / 500 }} />
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Trust */}
      <section style={{ padding: '40px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: '#94A3B8', marginBottom: 20 }}>{t.trust}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
            {LOGOS.map(l => <span key={l} style={{ fontSize: 18, fontWeight: 700, color: '#CBD5E1', fontFamily: "'Plus Jakarta Sans'" }}>{l}</span>)}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '100px 24px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E6FD9', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{t.features.tag}</p>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 36, fontWeight: 800, marginBottom: 16 }}>{t.features.h2}</h2>
              <p style={{ fontSize: 16, color: '#64748B', maxWidth: 600, margin: '0 auto' }}>{t.features.sub}</p>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {t.features.items.map((f, i) => {
              const Icon = ICONS[i]
              return (
                <FadeIn key={f.title} delay={i * 0.05}>
                  <div style={{ padding: 28, borderRadius: 16, border: '1px solid #E2E8F0', backgroundColor: 'white', transition: 'all 0.3s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#1E6FD9' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #EBF4FF, #FFF7ED)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Icon size={22} color="#1E6FD9" />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "'Plus Jakarta Sans'" }}>{f.title}</h3>
                    <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '100px 24px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F5820B', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{t.how.tag}</p>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 36, fontWeight: 800 }}>{t.how.h2}</h2>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            {t.how.steps.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.1}>
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <span style={{ fontSize: 48, fontWeight: 800, fontFamily: "'Plus Jakarta Sans'", color: STEP_COLORS[i], opacity: 0.2 }}>{s.n}</span>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, fontFamily: "'Plus Jakarta Sans'" }}>{s.title}</h3>
                  <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '100px 24px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E6FD9', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{t.pricing.tag}</p>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 36, fontWeight: 800, marginBottom: 16 }}>{t.pricing.h2}</h2>
              <p style={{ fontSize: 16, color: '#64748B' }}>{t.pricing.sub}</p>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, alignItems: 'start' }}>
            {t.pricing.plans.map((p, i) => {
              const pop = i === 1
              return (
                <FadeIn key={p.name} delay={i * 0.1}>
                  <div style={{ padding: 28, borderRadius: 16, backgroundColor: 'white', border: pop ? '2px solid #1E6FD9' : '1px solid #E2E8F0', boxShadow: pop ? '0 10px 40px rgba(30,111,217,0.15)' : 'none', position: 'relative', transform: pop ? 'scale(1.02)' : 'none' }}>
                    {pop && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{t.pricing.popular}</span>}
                    <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Plus Jakarta Sans'" }}>{p.name}</h3>
                    <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>{p.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                      {p.price !== null ? (
                        <><span style={{ fontSize: 44, fontWeight: 800, fontFamily: "'Plus Jakarta Sans'" }}>€{p.price}</span><span style={{ fontSize: 15, color: '#64748B' }}>/mes</span></>
                      ) : (
                        <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Plus Jakarta Sans'", color: '#1E6FD9' }}>{t.pricing.contact}</span>
                      )}
                    </div>
                    <Link to="/login" style={{ display: 'block', textAlign: 'center', padding: '12px 24px', borderRadius: 10, backgroundColor: pop ? '#1E6FD9' : '#F8FAFC', color: pop ? 'white' : '#1A1A2E', border: pop ? 'none' : '1px solid #E2E8F0', fontWeight: 600, fontSize: 14, textDecoration: 'none', marginBottom: 24 }}>{p.cta}</Link>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {p.features.map(f => <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#475569' }}><Check size={16} color="#10B981" /> {f}</li>)}
                    </ul>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ padding: '100px 24px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F5820B', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{t.testimonials.tag}</p>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 36, fontWeight: 800 }}>{t.testimonials.h2}</h2>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {t.testimonials.items.map((item, i) => (
              <FadeIn key={item.name} delay={i * 0.1}>
                <div style={{ padding: 28, borderRadius: 16, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>{[1,2,3,4,5].map(j => <Star key={j} size={16} fill="#F59E0B" color="#F59E0B" />)}</div>
                  <p style={{ fontSize: 15, color: '#2D2D44', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>"{item.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #1E6FD9, #F5820B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>{item.name[0]}</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{item.name}</p>
                      <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{item.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '60px 40px', borderRadius: 24, background: 'linear-gradient(135deg, #1E6FD9, #F5820B)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: 'white', marginBottom: 16, position: 'relative' }}>{t.cta.h2}</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 32, position: 'relative' }}>{t.cta.sub}</p>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', backgroundColor: 'white', color: '#1E6FD9', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', position: 'relative', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>{t.cta.btn} <ChevronRight size={18} /></Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 24px 40px', backgroundColor: '#1A1A2E', color: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 }}>
            <div>
              <img src="/logo.png" alt="st4rtup" style={{ height: 60 }} />
              <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 12, lineHeight: 1.6 }}>{t.footer.desc}</p>
            </div>
            {[
              { title: t.footer.producto, links: [{ t: t.nav.features, h: '#features' }, { t: t.nav.pricing, h: '/pricing' }] },
              { title: t.footer.recursos, links: [{ t: 'Blog', h: '#' }, { t: 'API', h: '#' }] },
              { title: t.footer.legal, links: [{ t: lang === 'es' ? 'Privacidad' : 'Privacy', h: '/privacy' }, { t: lang === 'es' ? 'Términos' : 'Terms', h: '/terms' }, { t: 'Cookies', h: '/cookies' }] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#94A3B8', marginBottom: 16 }}>{col.title}</p>
                {col.links.map(l => <a key={l.t} href={l.h} style={{ display: 'block', fontSize: 14, color: '#CBD5E1', margin: '8px 0', textDecoration: 'none' }}>{l.t}</a>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontSize: 13, color: '#64748B' }}>{t.footer.copy}</p>
            <p style={{ fontSize: 13, color: '#64748B' }}>hello@st4rtup.com</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
