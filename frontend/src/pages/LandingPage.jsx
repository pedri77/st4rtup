import SEO from '@/components/SEO'
import ThemeTogglePublic from '@/components/ThemeTogglePublic'
import ExitIntentPopup from '@/components/ExitIntentPopup'
import WebChatWidget from '@/components/WebChatWidget'
import { useThemeColors } from '@/utils/theme'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Mail, Phone, Globe, Zap,
  Layout, MessageSquare, Shield, Menu, X, ChevronRight,
  Check, Star, Megaphone
} from 'lucide-react'

function AnimatedCounter({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0; const step = target / 120
        const timer = setInterval(() => {
          start += step
          if (start >= target) { setCount(target); clearInterval(timer) }
          else setCount(Math.floor(start))
        }, 16)
        obs.disconnect()
      }
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{count}{suffix}</span>
}

function TypingText({ text, speed = 50 }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    let i = 0
    setDone(false)
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) { clearInterval(timer); setTimeout(() => setDone(true), 400) }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])
  return <>{displayed}{done
    ? <span style={{ marginLeft: 6, display: 'inline-block', animation: 'rocketBounce 2s ease-in-out infinite' }}>🚀</span>
    : <span style={{ borderRight: '2px solid var(--color-primary, #1E6FD9)', marginLeft: 2, animation: 'blink 1s infinite' }} />
  }</>
}

const FEATURE_COLORS = ['#1E6FD9', '#F5820B', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B', '#0EA5E9', '#10B981', '#7C3AED']

const cardHoverLight = {
  onMouseEnter: e => {
    const color = e.currentTarget.dataset.color || '#1E6FD9'
    e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'
    e.currentTarget.style.boxShadow = `0 20px 40px ${color}20, 0 0 0 1px ${color}30`
    e.currentTarget.style.borderColor = `${color}50`
  },
  onMouseLeave: e => {
    e.currentTarget.style.transform = 'translateY(0) scale(1)'
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
    e.currentTarget.style.borderColor = 'var(--color-border, #E2E8F0)'
  },
}

const BENTO_GRADIENTS = [
  'linear-gradient(135deg, #1E6FD910 0%, #1E6FD905 40%, transparent 100%)',
  'linear-gradient(135deg, #F5820B10 0%, #F5820B05 40%, transparent 100%)',
  'linear-gradient(135deg, #10B98110 0%, #10B98105 40%, transparent 100%)',
  'linear-gradient(135deg, #8B5CF610 0%, #8B5CF605 40%, transparent 100%)',
  'linear-gradient(135deg, #EF444410 0%, #EF444405 40%, transparent 100%)',
  'linear-gradient(135deg, #F59E0B10 0%, #F59E0B05 40%, transparent 100%)',
  'linear-gradient(135deg, #0EA5E910 0%, #0EA5E905 40%, transparent 100%)',
  'linear-gradient(135deg, #10B98110 0%, #10B98105 40%, transparent 100%)',
  'linear-gradient(135deg, #7C3AED10 0%, #7C3AED05 40%, transparent 100%)',
]

// A/B test variants for hero subtitle
const AB_VARIANTS = {
  es: [
    'Pipeline, marketing, emails, llamadas IA, SEO y automatizaciones. Todo en un solo lugar. Listo en 5 minutos.',
    'El CRM que tu equipo de ventas necesita. IA integrada, 22 automatizaciones y setup en 5 minutos.',
    'Cierra más deals con IA como copiloto. Pipeline visual + 14 gráficos en tiempo real.',
  ],
  en: [
    'Pipeline, marketing, emails, AI calls, SEO and automations. All in one place. Ready in 5 minutes.',
    'The CRM your sales team needs. Built-in AI, 22 automations and 5-minute setup.',
    'Close more deals with AI as your copilot. Visual pipeline + 14 real-time charts.',
  ],
}
const AB_IDX = Math.floor(Math.random() * AB_VARIANTS.es.length)

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
    pricing: { tag: 'Precios', h2: 'Planes para cada etapa', sub: 'Cancela cuando quieras. Migra tus datos en cualquier momento.', popular: 'Más popular', contact: 'Contactar', plans: [
      { name: 'Starter', price: '0', desc: 'Para empezar a vender', features: ['1 usuario', '100 leads', 'Pipeline básico', 'Email integrado', '1 integración'], cta: 'Empezar gratis' },
      { name: 'Growth', price: '19', desc: 'Para crecer rápido', features: ['3 usuarios', 'Leads ilimitados', 'Hub de Marketing completo', 'IA integrada (4 agentes)', 'Todas las integraciones', '22 automatizaciones', 'Centro de SEO', 'Analíticas avanzadas'], cta: 'Prueba 7 días gratis' },
      { name: 'Scale', price: '49', desc: 'Para escalar sin límites', features: ['10 usuarios', 'Todo en Growth', 'Sala de Negociación + NDA', 'WhatsApp Business + Bot', 'API pública', 'Soporte prioritario', 'Onboarding personalizado', 'Stripe + PayPal integrado'], cta: 'Empezar prueba' },
      { name: 'Enterprise', price: null, desc: 'Para grandes equipos', features: ['Usuarios ilimitados', 'Todo en Scale', 'SSO / SAML', 'SLA 99.9%', 'Gestor de cuenta dedicado', 'Formación personalizada', 'Facturación por transferencia', 'Integraciones a medida'], cta: 'Contactar ventas' },
    ]},
    testimonials: { tag: 'Testimonios', h2: 'Lo que dicen nuestros clientes', items: [
      { quote: 'Pasamos de una hoja de cálculo a cerrar 3 veces más acuerdos en 2 meses. El pipeline visual y las automatizaciones lo cambiaron todo.', name: 'María García', role: 'CEO, TechStartup', avatar: '/images/avatar-maria-garcia.webp' },
      { quote: 'El Centro de SEO nos posicionó en el top 3 de Google en 6 semanas. Los 4 agentes IA generan contenido profesional.', name: 'Carlos Ruiz', role: 'Director de Marketing, GrowthLab', avatar: '/images/avatar-carlos-ruiz.webp' },
      { quote: 'Las llamadas IA cualifican leads mientras dormimos. La cualificación BANT automática ahorra 15h/semana a nuestro equipo.', name: 'Ana López', role: 'Directora Comercial, ScaleUp', avatar: '/images/avatar-ana-lopez.webp' },
    ]},
    cta: { h2: 'Empieza a vender más. Hoy.', sub: 'Listo en 5 minutos. Cancela cuando quieras.', btn: 'Empezar gratis' },
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
    pricing: { tag: 'Pricing', h2: 'Plans for every stage', sub: 'Cancel anytime. Migrate your data whenever you want.', popular: 'Most popular', contact: 'Contact us', plans: [
      { name: 'Starter', price: '0', desc: 'To start selling', features: ['1 user', '100 leads', 'Basic pipeline', 'Integrated email', '1 integration'], cta: 'Get started free' },
      { name: 'Growth', price: '19', desc: 'To grow fast', features: ['3 users', 'Unlimited leads', 'Full Marketing Hub', 'Integrated AI (4 agents)', 'All integrations', '22 automations', 'SEO Command Center', 'Advanced analytics'], cta: '7-day free trial' },
      { name: 'Scale', price: '49', desc: 'To scale without limits', features: ['10 users', 'Everything in Growth', 'Deal Room + NDA', 'WhatsApp Business + Bot', 'Public API', 'Priority support', 'Custom onboarding', 'Stripe + PayPal'], cta: 'Start free trial' },
      { name: 'Enterprise', price: null, desc: 'For large teams', features: ['Unlimited users', 'Everything in Scale', 'SSO / SAML', '99.9% SLA', 'Dedicated account manager', 'Custom training', 'Invoice billing', 'Custom integrations'], cta: 'Contact sales' },
    ]},
    testimonials: { tag: 'Testimonials', h2: 'What our customers say', items: [
      { quote: 'We went from a spreadsheet to closing 3x more deals in 2 months. The visual pipeline and automations changed everything.', name: 'María García', role: 'CEO, TechStartup', avatar: '/images/avatar-maria-garcia.webp' },
      { quote: 'The SEO Command Center got us to Google top 3 in 6 weeks. The 4 AI agents generate professional content.', name: 'Carlos Ruiz', role: 'CMO, GrowthLab', avatar: '/images/avatar-carlos-ruiz.webp' },
      { quote: 'AI calls qualify leads while we sleep. Automatic BANT qualification saves our team 15h/week.', name: 'Ana López', role: 'Head of Sales, ScaleUp', avatar: '/images/avatar-ana-lopez.webp' },
    ]},
    cta: { h2: 'Start selling more. Today.', sub: 'Setup in 5 minutes. Cancel anytime.', btn: 'Get started free' },
    footer: { desc: 'Sales & marketing CRM for startups. Simple, powerful, AI-driven.', producto: 'Product', recursos: 'Resources', legal: 'Legal', copy: '© 2026 St4rtup. All rights reserved.' },
    mock: { revenue: 'Revenue', leads: 'Leads', conversion: 'Conversion' },
  },
}

const ICONS = [BarChart3, Megaphone, Mail, Phone, Globe, Zap, Layout, MessageSquare, Shield]
const LOGOS = ['TechCo', 'GrowthLab', 'ScaleUp', 'FounderOS', 'LaunchPad', 'VentureHQ']

const SHOWCASE = {
  es: [
    { title: 'Pipeline visual con IA', desc: 'Arrastra deals entre etapas, ve el forecast en tiempo real. El embudo Sankey y los 14 graficos te dan vision completa de tu pipeline.', img: '/images/showcase-pipeline.webp', video: '/videos/showcase-pipeline.mp4' },
    { title: '22 automatizaciones listas', desc: 'Email sequences, lead scoring, alertas de deals estancados, follow-ups — todo en autopilot desde el dia 1. Sin codigo.', img: '/images/showcase-automations.webp', video: '/videos/showcase-automations.mp4' },
    { title: 'Dashboard con resumen IA', desc: 'KPIs en tiempo real, heatmap de actividad, sugerencias inteligentes y comparativas. Tu copiloto comercial siempre actualizado.', img: '/images/showcase-dashboard.webp', video: '/videos/showcase-dashboard.mp4' },
  ],
  en: [
    { title: 'Visual pipeline with AI', desc: 'Drag deals between stages, see the forecast in real time. The Sankey funnel and 14 charts give you complete pipeline visibility.', img: '/images/showcase-pipeline.webp', video: '/videos/showcase-pipeline.mp4' },
    { title: '22 ready-to-use automations', desc: 'Email sequences, lead scoring, stale deal alerts, follow-ups — all on autopilot from day 1. No code.', img: '/images/showcase-automations.webp', video: '/videos/showcase-automations.mp4' },
    { title: 'Dashboard with AI summary', desc: 'Real-time KPIs, activity heatmap, smart suggestions and comparisons. Your always-updated sales copilot.', img: '/images/showcase-dashboard.webp', video: '/videos/showcase-dashboard.mp4' },
  ],
}

const STATS = {
  es: [
    { value: 22, suffix: '+', label: 'Automatizaciones' },
    { value: 14, suffix: '', label: 'Graficos en tiempo real' },
    { value: 9, suffix: '', label: 'Modulos integrados' },
    { value: 5, suffix: ' min', label: 'Setup inicial' },
  ],
  en: [
    { value: 22, suffix: '+', label: 'Automations' },
    { value: 14, suffix: '', label: 'Real-time charts' },
    { value: 9, suffix: '', label: 'Integrated modules' },
    { value: 5, suffix: ' min', label: 'Initial setup' },
  ],
}
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
  // Force light mode on landing — no dark mode toggle here
  const TC = {
    bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0',
    fg: '#0F172A', fgMuted: '#64748B', primary: '#1E6FD9', accent: '#F5820B',
    destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
  }
  const [menuOpen, setMenuOpen] = useState(false)
  const [lang, setLang] = useState('es')
  const [annual, setAnnual] = useState(false)
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const t = T[lang]

  // Track A/B variant
  useEffect(() => {
    window.umami?.track('hero_ab_view', { variant: AB_IDX })
    sessionStorage.setItem('ab_hero_variant', AB_IDX)
  }, [])

  // Auto-scroll testimonials on mobile
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx(prev => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="public-page" style={{ fontFamily: "'Inter', sans-serif", color: TC.fg }}>
      <SEO path="/" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />

      {/* Nav */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes rocketBounce { 0%,100%{transform:translateY(0) rotate(-10deg)} 50%{transform:translateY(-4px) rotate(0deg)} }
        @keyframes navGradientSlide { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes ctaPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(30,111,217,0.4); } 50% { box-shadow: 0 0 20px 4px rgba(30,111,217,0.15); } }
        @keyframes navSlideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes mobileMenuSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .nav-link { font-size: 14px; color: ${TC.fgMuted}; text-decoration: none; font-weight: 500; padding: 6px 14px; border-radius: 8px; transition: all 0.25s; position: relative; }
        .nav-link:hover { color: ${TC.primary}; background: ${TC.primary}10; transform: translateY(-1px); }
        .nav-link:active { transform: translateY(0); }

        /* ===== MOBILE RESPONSIVE ===== */
        @media (max-width: 768px) {
          .nav-link { padding: 12px 16px; min-height: 44px; display: flex; align-items: center; font-size: 15px; }
          .landing-features-grid { grid-template-columns: 1fr !important; }
          .landing-features-grid > div { grid-column: span 1 !important; grid-row: span 1 !important; }
          .landing-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-pricing-grid { grid-template-columns: 1fr !important; }
          .landing-pricing-grid > div { transform: none !important; }
          .landing-footer-grid { grid-template-columns: 1fr !important; text-align: center; }
          .landing-section { padding-top: clamp(40px, 10vw, 100px) !important; padding-bottom: clamp(40px, 10vw, 100px) !important; padding-left: 16px !important; padding-right: 16px !important; }
          .landing-section-title { font-size: clamp(24px, 6vw, 36px) !important; }
          .landing-hero-wrap { gap: 24px !important; }
          .landing-showcase-row { gap: 24px !important; }
          .landing-showcase-list { gap: 40px !important; }
          .landing-how-grid { grid-template-columns: 1fr !important; }
          .landing-step-number { font-size: clamp(36px, 8vw, 48px) !important; }
          .landing-cta-inner { padding: 32px 20px !important; }
          .landing-cta-h2 { font-size: clamp(24px, 6vw, 36px) !important; }
          .landing-price-value { font-size: clamp(28px, 8vw, 44px) !important; }
          .landing-testimonial-card { padding: 20px !important; }
        }
        @media (max-width: 480px) {
          .landing-stats-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .landing-hero-sub { font-size: 15px !important; }
        }
        .nav-cta-btn { padding: 10px 24px; background: linear-gradient(135deg, #1E6FD9, #3B82F6, #1E6FD9); background-size: 200% 200%; color: white; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; transition: all 0.3s; animation: ctaPulse 3s ease-in-out infinite; border: 1px solid rgba(255,255,255,0.15); letter-spacing: 0.01em; }
        .nav-cta-btn:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 8px 24px rgba(30,111,217,0.3) !important; filter: brightness(1.08); }
        .nav-login { font-size: 14px; color: ${TC.primary}; text-decoration: none; font-weight: 600; padding: 8px 16px; border-radius: 8px; border: 1.5px solid ${TC.primary}30; transition: all 0.25s; }
        .nav-login:hover { background: ${TC.primary}08; border-color: ${TC.primary}60; transform: translateY(-1px); }
        .nav-lang-btn { padding: 5px 12px; border: 1.5px solid ${TC.border}; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; background: ${TC.card}; color: ${TC.fgMuted}; transition: all 0.25s; }
        .nav-lang-btn:hover { border-color: ${TC.primary}50; color: ${TC.primary}; background: ${TC.primary}05; }
      `}</style>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px) saturate(200%)', WebkitBackdropFilter: 'blur(20px) saturate(200%)',
        animation: 'navSlideDown 0.5s ease-out',
      }}>
        {/* Animated gradient line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #1E6FD9, #3B82F6, #F5820B, #F59E0B, #10B981, #8B5CF6, #1E6FD9)',
          backgroundSize: '300% 100%',
          animation: 'navGradientSlide 8s ease infinite',
        }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', transition: 'transform 0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <img src="/logo.png" alt="st4rtup" style={{ height: 'clamp(50px, 12vw, 90px)' }} />
          </Link>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} className="hidden md:flex">
            {/* Nav pill group */}
            <div style={{
              display: 'flex', gap: 2, alignItems: 'center',
              background: 'rgba(241,245,249,0.7)',
              borderRadius: 10, padding: '3px 4px',
              border: `1px solid ${TC.border}40`,
            }}>
              <a href="#features" className="nav-link">{t.nav.features}</a>
              <a href="#pricing" className="nav-link">{t.nav.pricing}</a>
              <Link to="/blog" className="nav-link">Blog</Link>
              <Link to="/help" className="nav-link">{lang === 'es' ? 'Ayuda' : 'Help'}</Link>
            </div>
            <div style={{ width: 1, height: 24, background: TC.border, margin: '0 10px', opacity: 0.5 }} />
            <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} className="nav-lang-btn">{lang === 'es' ? 'EN' : 'ES'}</button>
            <div style={{ width: 1, height: 24, background: TC.border, margin: '0 6px', opacity: 0.5 }} />
            <Link to="/login" className="nav-login">{t.nav.login}</Link>
            <Link to="/register" className="nav-cta-btn">{t.nav.cta}</Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden" style={{ padding: '12px 16px', borderTop: `1px solid ${TC.border}30`, display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(255,255,255,0.98)', animation: 'mobileMenuSlide 0.3s ease-out' }}>
            <a href="#features" onClick={() => setMenuOpen(false)} className="nav-link">{t.nav.features}</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="nav-link">{t.nav.pricing}</a>
            <Link to="/blog" onClick={() => setMenuOpen(false)} className="nav-link">Blog</Link>
            <Link to="/help" onClick={() => setMenuOpen(false)} className="nav-link">{lang === 'es' ? 'Ayuda' : 'Help'}</Link>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setLang(lang === 'es' ? 'en' : 'es'); setMenuOpen(false) }} className="nav-lang-btn">{lang === 'es' ? 'English' : 'Español'}</button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="nav-login" style={{ flex: 1, textAlign: 'center' }}>{t.nav.login}</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="nav-cta-btn" style={{ flex: 1, textAlign: 'center' }}>{t.nav.cta}</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="landing-section" style={{ background: `linear-gradient(180deg, ${TC.card} 0%, ${'#FFF7ED'} 100%)`, padding: 'clamp(40px, 10vw, 80px) 24px clamp(60px, 12vw, 100px)', position: 'relative', backgroundImage: `radial-gradient(circle, ${TC.primary}10 1px, transparent 1px)`, backgroundSize: '24px 24px', overflow: 'hidden' }}>
        <div style={{ position:'absolute', top:'-10%', right:'-5%', width:'clamp(200px, 50vw, 400px)', height:'clamp(200px, 50vw, 400px)', borderRadius:'50%', background:'radial-gradient(circle, #1E6FD908, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'10%', left:'-10%', width:'clamp(180px, 45vw, 350px)', height:'clamp(180px, 45vw, 350px)', borderRadius:'50%', background:'radial-gradient(circle, #F5820B06, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
        <div className="landing-hero-wrap" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 'clamp(24px, 6vw, 60px)', flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ flex: '1 1 500px' }}>
            <FadeIn>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>
                <TypingText text={t.hero.h1a} speed={60} /><br />
                <span style={{ color: TC.primary }}>{lang === 'es' ? 'Simple' : 'Simple'}.</span>{' '}
                <span style={{ color: '#3B8DE8' }}>{lang === 'es' ? 'Potente' : 'Powerful'}.</span>{' '}
                <span style={{ color: '#5BA3EF' }}>{lang === 'es' ? 'Para' : 'For'}</span>{' '}
                <span style={{ color: '#F5820B' }}>startups.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}><p className="landing-hero-sub" style={{ fontSize: 'clamp(15px, 3.5vw, 18px)', color: TC.fgMuted, lineHeight: 1.7, marginBottom: 32, maxWidth: 500 }}>{AB_VARIANTS[lang]?.[AB_IDX] || t.hero.sub}</p></FadeIn>
            <FadeIn delay={0.2}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/register" onClick={() => window.umami?.track('hero_cta_click', { variant: 'register' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', backgroundColor: TC.primary, color: 'white', borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none', boxShadow: `0 4px 14px ${TC.primary}66` }}>{t.hero.cta1} <ArrowRight size={18} /></Link>
                <Link to="/demo" onClick={() => window.umami?.track('hero_cta_click', { variant: 'demo' })} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", border: `2px solid ${TC.border}`, color: TC.fg, borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: "none" }}>{t.hero.cta2}</Link>
              </div>
            </FadeIn>
          </div>
          <FadeIn delay={0.3}>
            <div style={{ flex: '1 1 400px', position: 'relative' }}>
              <div style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', border: `1px solid ${TC.border}`, position: 'relative', overflow: 'hidden', background: TC.card }}>
                <video
                  src="/videos/hero-demo.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/images/showcase-dashboard.webp"
                  style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 15 }}
                />
              </div>
              <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 16, padding: '8px 20px', backgroundColor: TC.card, borderRadius: 12, border: `1px solid ${TC.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: TC.fgMuted }}>🚀 {lang === 'es' ? 'Sin tarjeta' : 'No credit card'}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: TC.fgMuted }}>⚡ Setup 5 min</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: TC.fgMuted }}>🤖 22 automations</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Trust — Integration logos carousel */}
      <section style={{ padding: '48px 0', backgroundColor: TC.bg, borderTop: `1px solid ${TC.border}`, borderBottom: `1px solid ${TC.border}`, overflow: 'hidden' }}>
        <style>{`
          @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .integration-track { display: flex; gap: 48px; animation: marquee 35s linear infinite; width: max-content; }
          .integration-track:hover { animation-play-state: paused; }
          .integration-item { display: flex; align-items: center; gap: 12px; padding: 12px 24px; border-radius: 12px; border: 1px solid transparent; transition: all 0.3s; cursor: default; flex-shrink: 0; }
          .integration-item:hover { border-color: #1E6FD930; background: #1E6FD908; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(30,111,217,0.08); }
          .integration-item:hover .int-name { color: #1E293B !important; }
        `}</style>
        <div style={{ textAlign: 'center', marginBottom: 28, padding: '0 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 3, color: TC.primary, marginBottom: 4 }}>{lang === 'es' ? 'Integraciones' : 'Integrations'}</p>
          <p style={{ fontSize: 15, color: '#94A3B8', fontWeight: 500 }}>{lang === 'es' ? 'Conectado con las herramientas que ya usas' : 'Connected with the tools you already use'}</p>
        </div>
        <div className="integration-track">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} style={{ display: 'flex', gap: 48, flexShrink: 0 }}>
              {[
                { name: 'Gmail', color: '#EA4335', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M22 6.25V17.5C22 18.33 21.33 19 20.5 19H18V9.15L12 13.5L6 9.15V19H3.5C2.67 19 2 18.33 2 17.5V6.25C2 4.87 3.63 4.07 4.75 4.92L6 5.88L12 10.25L18 5.88L19.25 4.92C20.37 4.07 22 4.87 22 6.25Z" fill="#EA4335"/></svg> },
                { name: 'Stripe', color: '#635BFF', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.918 3.757 7.099c0 4.275 2.606 5.571 5.42 6.685 2.28.893 3.06 1.527 3.06 2.492 0 .987-.804 1.56-2.292 1.56-1.905 0-4.844-.93-6.772-2.158l-.894 5.548C3.76 22.283 6.877 24 10.634 24c2.61 0 4.738-.644 6.244-1.905 1.634-1.363 2.465-3.272 2.465-5.674 0-4.386-2.666-5.69-5.367-6.771z" fill="#635BFF"/></svg> },
                { name: 'Slack', color: '#4A154B', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.123 2.521a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.521V8.834zm-1.272 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.164 0a2.528 2.528 0 0 1 2.521 2.522v6.312zm-2.521 10.123a2.528 2.528 0 0 1 2.521 2.521A2.528 2.528 0 0 1 15.164 24a2.528 2.528 0 0 1-2.521-2.522v-2.521h2.521zm0-1.272a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.314A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.314z" fill="#4A154B"/></svg> },
                { name: 'n8n', color: '#FF6D5A', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="8" height="8" rx="2" fill="#FF6D5A"/><rect x="14" y="2" width="8" height="8" rx="2" fill="#FF6D5A" opacity="0.7"/><rect x="2" y="14" width="8" height="8" rx="2" fill="#FF6D5A" opacity="0.7"/><rect x="14" y="14" width="8" height="8" rx="2" fill="#FF6D5A" opacity="0.4"/><path d="M10 6h4M6 10v4M18 10v4M10 18h4" stroke="#FF6D5A" strokeWidth="1.5"/></svg> },
                { name: 'Telegram', color: '#26A5E4', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.22l-1.98 9.34c-.15.67-.54.83-1.1.52l-3.03-2.23-1.46 1.41c-.16.16-.3.3-.61.3l.22-3.06 5.58-5.04c.24-.22-.05-.34-.38-.13L8.69 14l-2.98-.93c-.65-.2-.66-.65.14-.96l11.65-4.49c.54-.2 1.01.13.83.96l.01-.36z" fill="#26A5E4"/></svg> },
                { name: 'WhatsApp', color: '#25D366', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.63 14.09c-.25.68-1.44 1.33-1.99 1.38-.5.04-.96.23-3.24-.68-2.76-1.1-4.5-3.93-4.63-4.11-.14-.18-1.1-1.47-1.1-2.8 0-1.33.7-1.99.95-2.26.25-.27.54-.34.72-.34.18 0 .36 0 .52.01.18.01.41-.07.63.48.23.56.77 1.89.84 2.02.07.14.11.3.02.48-.09.18-.14.29-.27.45-.14.16-.29.35-.41.47-.14.14-.29.29-.12.57.16.27.72 1.19 1.55 1.93 1.07.95 1.96 1.24 2.24 1.38.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.18 1.34z" fill="#25D366"/></svg> },
                { name: 'Google Calendar', color: '#4285F4', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" fill="#fff" stroke="#4285F4" strokeWidth="1.5"/><path d="M3 9h18" stroke="#4285F4" strokeWidth="1.5"/><path d="M8 2v4M16 2v4" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/><rect x="7" y="12" width="3" height="3" rx="0.5" fill="#4285F4"/><rect x="14" y="12" width="3" height="3" rx="0.5" fill="#EA4335"/><rect x="7" y="17" width="3" height="3" rx="0.5" fill="#34A853"/><rect x="14" y="17" width="3" height="3" rx="0.5" fill="#FBBC05"/></svg> },
                { name: 'Apollo.io', color: '#6C5CE7', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#6C5CE7"/><path d="M12 5l2.5 5.5H16L12 19 8 10.5h1.5L12 5z" fill="#fff"/></svg> },
                { name: 'Hunter.io', color: '#FF5722', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="#FF5722"/></svg> },
                { name: 'Resend', color: '#000', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M3 5.5A2.5 2.5 0 015.5 3h13A2.5 2.5 0 0121 5.5v13a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 18.5v-13zM7 8l5 4 5-4M7 16l3-3M17 16l-3-3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                { name: 'Supabase', color: '#3ECF8E', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M13.7 21.8c-.4.5-1.3.2-1.3-.5V13h8.2c.9 0 1.3 1 .8 1.6L13.7 21.8z" fill="#3ECF8E"/><path d="M10.3 2.2c.4-.5 1.3-.2 1.3.5V11H3.4c-.9 0-1.3-1-.8-1.6L10.3 2.2z" fill="#3ECF8E" opacity="0.7"/></svg> },
                { name: 'Retell AI', color: '#6366F1', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" fill="#6366F1" opacity="0.15"/><path d="M8 12a1.5 1.5 0 013 0v4a1.5 1.5 0 01-3 0v-4zM13 9a1.5 1.5 0 013 0v7a1.5 1.5 0 01-3 0V9z" fill="#6366F1"/><circle cx="9.5" cy="8" r="1.5" fill="#6366F1"/></svg> },
                { name: 'Waalaxy', color: '#5B4FFF', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M2 12l4-8 4 8-4 8-4-8z" fill="#5B4FFF"/><path d="M9 12l4-8 4 8-4 8-4-8z" fill="#5B4FFF" opacity="0.7"/><path d="M16 12l4-8 4 8-4 8-4-8z" fill="#5B4FFF" opacity="0.4"/></svg> },
                { name: 'Signaturit', color: '#00B4D8', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 18c2-3 4-6 8-6s6 3 8 6" stroke="#00B4D8" strokeWidth="2.5" strokeLinecap="round" fill="none"/><path d="M14 6l2 2-6 6-3-1 7-7z" fill="#00B4D8"/></svg> },
                { name: 'Stripe', color: '#635BFF', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.918 3.757 7.099c0 4.275 2.606 5.571 5.42 6.685 2.28.893 3.06 1.527 3.06 2.492 0 .987-.804 1.56-2.292 1.56-1.905 0-4.844-.93-6.772-2.158l-.894 5.548C3.76 22.283 6.877 24 10.634 24c2.61 0 4.738-.644 6.244-1.905 1.634-1.363 2.465-3.272 2.465-5.674 0-4.386-2.666-5.69-5.367-6.771z" fill="#635BFF"/></svg> },
                { name: 'PayPal', color: '#003087', svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 2.37A.77.77 0 015.704 1.7h6.306c2.09 0 3.758.544 4.737 1.548.916.94 1.27 2.283 1.057 3.994-.024.194-.06.398-.106.607-.676 3.462-2.988 5.06-6.24 5.06H9.37a.77.77 0 00-.76.648l-.935 5.924a.64.64 0 01-.633.548l.034.108z" fill="#003087"/><path d="M19.254 7.65c-.677 3.462-2.988 5.06-6.24 5.06H10.92a.77.77 0 00-.76.648L9.04 19.97a.55.55 0 00.544.637h3.378a.67.67 0 00.663-.567l.667-4.221a.67.67 0 01.663-.567h1.418c3.037 0 5.179-1.482 5.815-4.666.27-1.347.114-2.441-.537-3.22a3.26 3.26 0 00-.897-.716z" fill="#0070E0"/></svg> },
              ].map(tool => (
                <div key={`${dup}-${tool.name}`} className="integration-item">
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${tool.color}10`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${tool.color}15`,
                  }}>
                    {tool.svg}
                  </div>
                  <span className="int-name" style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', fontFamily: "'Plus Jakarta Sans'", transition: 'color 0.3s', whiteSpace: 'nowrap' }}>{tool.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Stats Counter */}
      <section style={{ padding: '60px 24px', backgroundColor: TC.card }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gap: 'clamp(16px, 4vw, 32px)', textAlign: 'center' }} className="landing-stats-grid grid grid-cols-2 md:grid-cols-4">
            {STATS[lang].map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.1}>
                <div>
                  <p style={{ fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 800, fontFamily: "'Plus Jakarta Sans'", color: TC.primary, margin: 0, lineHeight: 1.2 }}>
                    <AnimatedCounter target={s.value} suffix={s.suffix} />
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: TC.fgMuted, marginTop: 4 }}>{s.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-section" style={{ padding: 'clamp(40px, 10vw, 100px) 24px', backgroundColor: TC.card }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(30px, 8vw, 60px)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: TC.primary, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{t.features.tag}</p>
              <h2 className="landing-section-title" style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, marginBottom: 16 }}>{t.features.h2}</h2>
              <p style={{ fontSize: 16, color: TC.fgMuted, maxWidth: 600, margin: '0 auto' }}>{t.features.sub}</p>
            </div>
          </FadeIn>
          <div className="landing-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(16px, 3vw, 24px)' }}>
            {t.features.items.map((f, i) => {
              const Icon = ICONS[i]
              const color = FEATURE_COLORS[i]
              return (
                <FadeIn key={f.title} delay={i * 0.05}>
                  <div
                    data-color={color}
                    style={{
                      padding: 28, borderRadius: 16,
                      border: `1px solid ${TC.border}`,
                      borderTop: `3px solid ${color}`,
                      backgroundColor: TC.card,
                      transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s, border-color 0.3s',
                      background: `${BENTO_GRADIENTS[i]}, ${TC.card}`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      gridColumn: i === 0 ? 'span 2' : undefined,
                      gridRow: i === 4 ? 'span 2' : undefined,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    {...cardHoverLight}
                  >
                    <div style={{
                      position: 'absolute', top: -40, right: -40, width: 120, height: 120,
                      borderRadius: '50%', background: `${color}08`, pointerEvents: 'none',
                    }} />
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: `linear-gradient(135deg, ${color}20, ${color}10)`,
                      border: `1px solid ${color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                    }}>
                      <Icon size={24} color={color} />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "'Plus Jakarta Sans'" }}>{f.title}</h3>
                    <p style={{ fontSize: 14, color: TC.fgMuted, lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Feature Showcase — alternating screenshot + text */}
      <section className="landing-section" style={{ padding: 'clamp(40px, 10vw, 100px) 24px', backgroundColor: TC.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(30px, 8vw, 60px)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: TC.accent, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{lang === 'es' ? 'En detalle' : 'In depth'}</p>
              <h2 className="landing-section-title" style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800 }}>{lang === 'es' ? 'Herramientas que impulsan resultados' : 'Tools that drive results'}</h2>
            </div>
          </FadeIn>
          <div className="landing-showcase-list" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(40px, 10vw, 80px)' }}>
            {SHOWCASE[lang].map((item, i) => (
              <FadeIn key={item.title} delay={0.1}>
                <div className="landing-showcase-row" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(24px, 6vw, 60px)', flexWrap: 'wrap', flexDirection: i % 2 === 1 ? 'row-reverse' : 'row' }}>
                  {/* Video with image fallback */}
                  <div style={{ flex: '1 1 480px' }}>
                    <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', border: `1px solid ${TC.border}` }}>
                      <video
                        src={item.video}
                        poster={item.img}
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    </div>
                  </div>
                  {/* Text */}
                  <div style={{ flex: '1 1 400px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${TC.primary}20, ${TC.accent}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      {[BarChart3, Zap, Layout][i] && (() => { const Icon = [BarChart3, Zap, Layout][i]; return <Icon size={24} color={TC.primary} /> })()}
                    </div>
                    <h3 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, marginBottom: 16, lineHeight: 1.3 }}>{item.title}</h3>
                    <p style={{ fontSize: 16, color: TC.fgMuted, lineHeight: 1.7 }}>{item.desc}</p>
                    <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, fontSize: 15, fontWeight: 600, color: TC.primary, textDecoration: 'none' }}>
                      {lang === 'es' ? 'Pruebalo gratis' : 'Try it free'} <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section" style={{ padding: 'clamp(40px, 10vw, 100px) 24px', backgroundColor: TC.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(30px, 8vw, 60px)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: TC.accent, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{t.how.tag}</p>
              <h2 className="landing-section-title" style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800 }}>{t.how.h2}</h2>
            </div>
          </FadeIn>
          <div className="landing-how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(16px, 4vw, 32px)' }}>
            {t.how.steps.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.1}>
                <div style={{ textAlign: 'center', padding: 'clamp(16px, 4vw, 32px)' }}>
                  <span className="landing-step-number" style={{ fontSize: 'clamp(36px, 8vw, 48px)', fontWeight: 800, fontFamily: "'Plus Jakarta Sans'", color: STEP_COLORS[i], opacity: 0.2 }}>{s.n}</span>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, fontFamily: "'Plus Jakarta Sans'" }}>{s.title}</h3>
                  <p style={{ fontSize: 15, color: TC.fgMuted, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="landing-section" style={{ padding: 'clamp(40px, 10vw, 100px) 24px', backgroundColor: TC.card }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: TC.primary, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{t.pricing.tag}</p>
              <h2 className="landing-section-title" style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, marginBottom: 16 }}>{t.pricing.h2}</h2>
              <p style={{ fontSize: 16, color: TC.fgMuted, marginBottom: 24 }}>{t.pricing.sub}</p>
              {/* Billing toggle */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '4px 6px', backgroundColor: TC.muted, borderRadius: 12 }}>
                <button onClick={() => setAnnual(false)}
                  style={{ padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: !annual ? TC.card : 'transparent', color: !annual ? TC.fg : TC.fgMuted, boxShadow: !annual ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
                  {lang === 'es' ? 'Mensual' : 'Monthly'}
                </button>
                <button onClick={() => setAnnual(true)}
                  style={{ padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', backgroundColor: annual ? TC.card : 'transparent', color: annual ? TC.fg : TC.fgMuted, boxShadow: annual ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s', position: 'relative' }}>
                  {lang === 'es' ? 'Anual' : 'Annual'}
                  <span style={{ position: 'absolute', top: -8, right: -12, padding: '2px 6px', backgroundColor: '#10B981', color: 'white', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>-20%</span>
                </button>
              </div>
            </div>
          </FadeIn>
          <div className="landing-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, alignItems: 'start' }}>
            {t.pricing.plans.map((p, i) => {
              const pop = i === 1
              const btnStyles = [
                { bg: TC.card, color: TC.primary, border: `2px solid ${TC.primary}`, shadow: 'none' },
                { bg: `linear-gradient(135deg, ${TC.primary}, #3B8DE8)`, color: 'white', border: 'none', shadow: `0 4px 14px ${TC.primary}66` },
                { bg: `linear-gradient(135deg, ${TC.accent}, #F59E0B)`, color: 'white', border: 'none', shadow: `0 4px 14px ${TC.accent}59` },
                { bg: 'linear-gradient(135deg, #0F172A, #334155)', color: 'white', border: 'none', shadow: '0 4px 14px rgba(15,23,42,0.3)' },
              ][i] || { bg: TC.bg, color: TC.fg, border: `1px solid ${TC.border}`, shadow: 'none' }
              return (
                <FadeIn key={`${p.name}-${i}`} delay={i * 0.1}>
                  <div style={{ padding: 28, borderRadius: 16, backgroundColor: TC.card, border: pop ? `2px solid ${TC.primary}` : `1px solid ${TC.border}`, boxShadow: pop ? `0 10px 40px ${TC.primary}26` : '0 2px 12px rgba(0,0,0,0.04)', position: 'relative', transform: pop ? 'scale(1.02)' : 'none', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { if (!pop) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)' } }}
                    onMouseLeave={e => { if (!pop) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)' } }}
                  >
                    {pop && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', background: 'linear-gradient(135deg, #1E6FD9, #3B8DE8)', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{t.pricing.popular}</span>}
                    <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Plus Jakarta Sans'" }}>{p.name}</h3>
                    <p style={{ fontSize: 13, color: TC.fgMuted, marginBottom: 16 }}>{p.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                      {p.price !== null ? (() => {
                        const monthly = Number(p.price)
                        const displayed = annual && monthly > 0 ? Math.round(monthly * 0.8) : monthly
                        return (
                          <>
                            {annual && monthly > 0 && <span style={{ fontSize: 18, fontWeight: 500, color: '#94A3B8', textDecoration: 'line-through', marginRight: 4 }}>€{monthly}</span>}
                            <span className="landing-price-value" style={{ fontSize: 'clamp(32px, 8vw, 44px)', fontWeight: 800, fontFamily: "'Plus Jakarta Sans'", transition: 'all 0.3s' }}>€{displayed}</span>
                            <span style={{ fontSize: 15, color: TC.fgMuted }}>/{annual ? (lang === 'es' ? 'mes' : 'mo') : (lang === 'es' ? 'mes' : 'mo')}</span>
                            {annual && monthly > 0 && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700, marginLeft: 6 }}>{lang === 'es' ? 'facturado anual' : 'billed yearly'}</span>}
                          </>
                        )
                      })() : (
                        <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Plus Jakarta Sans'", color: TC.primary }}>{t.pricing.contact}</span>
                      )}
                    </div>
                    <button onClick={async () => {
                      if (p.price === '0') { window.location.href = '/register'; return }
                      if (p.price === null) { window.location.href = '/contact-sales'; return }
                      const plan = p.name.toLowerCase() + (annual ? '_yearly' : '_monthly')
                      try {
                        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
                        if(window.umami)window.umami.track('checkout_click',{plan});const res = await fetch(`${apiUrl}/payments/public/checkout?plan=${plan}`, { method: 'POST' })
                        const data = await res.json()
                        if (data.checkout_url) window.location.href = data.checkout_url
                        else alert('Error al crear el pago')
                      } catch { alert('Error de conexión') }
                    }} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '13px 24px', borderRadius: 10, background: btnStyles.bg, color: btnStyles.color, border: btnStyles.border, boxShadow: btnStyles.shadow, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 8, transition: 'opacity 0.2s, transform 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.01)' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)' }}
                    >{p.cta}</button>
                    {p.price !== '0' && p.price !== null && <button onClick={async () => {
                      const plan = p.name.toLowerCase() + (annual ? '_yearly' : '_monthly')
                      try {
                        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
                        if(window.umami)window.umami.track('paypal_click',{plan});const res = await fetch(`${apiUrl}/payments/public/paypal-order?plan=${plan}`, { method: 'POST' })
                        const data = await res.json()
                        if (data.approval_url) window.location.href = data.approval_url
                        else alert('Error PayPal')
                      } catch { alert('Error de conexión') }
                    }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px 24px', borderRadius: 10, backgroundColor: '#FFC439', color: '#003087', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 24 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#003087"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603a.77.77 0 0 0-.76.648l-.762 4.834-.235 1.49a.41.41 0 0 1-.405.347H7.076z"/></svg>
                      PayPal
                    </button>}
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {p.features.map(f => <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: TC.fgMuted }}><Check size={16} color="#10B981" /> {f}</li>)}
                    </ul>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="landing-section" style={{ padding: 'clamp(40px, 10vw, 100px) 24px', backgroundColor: TC.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 'clamp(30px, 8vw, 60px)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: TC.accent, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{t.testimonials.tag}</p>
              <h2 className="landing-section-title" style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800 }}>{t.testimonials.h2}</h2>
            </div>
          </FadeIn>
          {/* Desktop grid */}
          <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {t.testimonials.items.map((item, i) => (
              <FadeIn key={item.name} delay={i * 0.1}>
                <div style={{ padding: 28, borderRadius: 16, backgroundColor: TC.card, border: `1px solid ${TC.border}`, transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>{[1,2,3,4,5].map(j => <Star key={j} size={16} fill="#F59E0B" color="#F59E0B" />)}</div>
                  <p style={{ fontSize: 15, color: TC.fg, lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>"{item.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {item.avatar ? (
                      <img src={item.avatar} alt={item.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${TC.border}` }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1E6FD9, #F5820B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{item.name[0]}</div>
                    )}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{item.name}</p>
                      <p style={{ fontSize: 12, color: TC.fgMuted, margin: 0 }}>{item.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          {/* Mobile carousel */}
          <div className="md:hidden" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', transition: 'transform 0.4s ease', transform: `translateX(-${testimonialIdx * 100}%)` }}>
              {t.testimonials.items.map((item, i) => (
                <div key={item.name} style={{ minWidth: '100%', padding: '0 4px', boxSizing: 'border-box' }}>
                  <div style={{ padding: 24, borderRadius: 16, backgroundColor: TC.card, border: `1px solid ${TC.border}` }}>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>{[1,2,3,4,5].map(j => <Star key={j} size={16} fill="#F59E0B" color="#F59E0B" />)}</div>
                    <p style={{ fontSize: 15, color: TC.fg, lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>"{item.quote}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${TC.border}` }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1E6FD9, #F5820B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{item.name[0]}</div>
                      )}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{item.name}</p>
                        <p style={{ fontSize: 12, color: TC.fgMuted, margin: 0 }}>{item.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              {t.testimonials.items.map((_, i) => (
                <button key={i} onClick={() => setTestimonialIdx(i)}
                  style={{ width: testimonialIdx === i ? 24 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all 0.3s', backgroundColor: testimonialIdx === i ? TC.primary : '#CBD5E1' }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-section" style={{ padding: 'clamp(40px, 10vw, 100px) 24px' }}>
        <div className="landing-cta-inner" style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: 'clamp(32px, 8vw, 60px) clamp(20px, 5vw, 40px)', borderRadius: 24, background: 'linear-gradient(135deg, #1E6FD9, #F5820B)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <h2 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: 'white', marginBottom: 16, position: 'relative' }}>{t.cta.h2}</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 32, position: 'relative' }}>{t.cta.sub}</p>
          <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', backgroundColor: 'white', color: TC.primary, borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', position: 'relative', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>{t.cta.btn} <ChevronRight size={18} /></Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: 'clamp(30px, 8vw, 60px) 16px clamp(20px, 5vw, 40px)', backgroundColor: '#1A1A2E', color: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="landing-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'clamp(24px, 5vw, 40px)', marginBottom: 'clamp(24px, 5vw, 40px)' }}>
            <div>
              <img src="/logo.png" alt="st4rtup" style={{ height: 60 }} />
              <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 12, lineHeight: 1.6 }}>{t.footer.desc}</p>
            </div>
            {[
              { title: t.footer.producto, links: [{ t: t.nav.features, h: '#features' }, { t: t.nav.pricing, h: '/pricing' }, { t: 'Demo', h: '/demo' }, { t: 'ROI', h: '/roi' }] },
              { title: t.footer.recursos, links: [{ t: 'Blog', h: '/blog' }, { t: 'Changelog', h: '/changelog' }, { t: lang === 'es' ? 'Ayuda' : 'Help', h: '/help' }, { t: 'Status', h: '/status' }, { t: lang === 'es' ? 'Afiliados' : 'Affiliates', h: '/affiliates' }] },
              { title: t.footer.legal, links: [{ t: lang === 'es' ? 'Privacidad' : 'Privacy', h: '/privacy' }, { t: lang === 'es' ? 'Términos' : 'Terms', h: '/terms' }, { t: 'Cookies', h: '/cookies' }] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#94A3B8', marginBottom: 16 }}>{col.title}</p>
                {col.links.map(l => <a key={l.t} href={l.h} style={{ display: 'block', fontSize: 14, color: '#CBD5E1', margin: '8px 0', textDecoration: 'none' }}>{l.t}</a>)}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontSize: 13, color: TC.fgMuted }}>{t.footer.copy}</p>
            <p style={{ fontSize: 13, color: TC.fgMuted }}>info@st4rtup.com</p>
          </div>
        </div>
      </footer>
      <WebChatWidget />
    </div>
  )
}
