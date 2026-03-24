import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Users, Megaphone, Sparkles, Zap, Plug, Check,
  Mail, Phone, Globe, Target, Layout, MessageSquare, FileText, Shield,
  Menu, X, ChevronRight, Star
} from 'lucide-react'

const FEATURES = [
  { icon: BarChart3, title: 'Pipeline Visual', desc: 'Kanban drag & drop con forecast de revenue, funnel de conversión y Sankey flow. Todo en tiempo real.' },
  { icon: Megaphone, title: 'Marketing Hub', desc: 'Campañas multicanal, funnels, assets, calendario editorial, UTM generator y analytics unificado.' },
  { icon: Mail, title: 'Emails Integrados', desc: 'Gmail OAuth gratis + tracking apertura/click. Templates, scheduling y secuencias automáticas.' },
  { icon: Phone, title: 'Llamadas IA', desc: 'Retell AI con scoring automático, transcripción, sentiment analysis y BANT qualification.' },
  { icon: Globe, title: 'SEO Command Center', desc: '9 tabs: Content Hub, Keywords, Backlinks, Dashboard, Repurposer, Health, Brand, Tracker + Content Pipeline IA.' },
  { icon: Zap, title: 'Automatizaciones', desc: '22+ workflows preconfigurados: welcome sequences, reminders, escalation, scoring, follow-ups.' },
  { icon: Layout, title: 'Dashboard + 14 Grafos', desc: 'KPIs en tiempo real, Sankey, Waterfall, Radar, Funnel, Heatmaps, Bubble charts y más.' },
  { icon: MessageSquare, title: 'WhatsApp Business', desc: 'Chatbot IA para cualificación, mensajes directos desde el CRM, templates y automaciones.' },
  { icon: Shield, title: 'Deal Room', desc: 'PDF watermark, page analytics por visitante, NDA gate con firma digital (Signaturit/Yousign/DocuSign).' },
]

const PLANS = [
  { name: 'Starter', price: '0', desc: 'Para empezar a vender', features: ['3 usuarios', '100 leads', 'Pipeline básico', 'Email integrado', '1 integración'], cta: 'Empezar gratis', popular: false },
  { name: 'Growth', price: '49', desc: 'Para crecer rápido', features: ['10 usuarios', 'Leads ilimitados', 'Marketing Hub completo', 'IA integrada (4 agentes)', 'Todas las integraciones', '22 automatizaciones', 'SEO Command Center', 'Analytics avanzado'], cta: 'Prueba 14 días gratis', popular: true },
  { name: 'Scale', price: '149', desc: 'Para escalar sin límites', features: ['Usuarios ilimitados', 'Todo en Growth', 'Deal Room + NDA digital', 'WhatsApp Business + Bot', 'API pública', 'Soporte prioritario', 'Custom onboarding', 'Stripe + PayPal integrado'], cta: 'Contactar ventas', popular: false },
]

const TESTIMONIALS = [
  { quote: 'Pasamos de un spreadsheet a cerrar 3x más deals en 2 meses. El pipeline visual y las automatizaciones cambiaron todo.', name: 'María García', role: 'CEO, TechStartup', stars: 5 },
  { quote: 'El SEO Command Center nos posicionó top 3 en Google en 6 semanas. Los 4 agentes IA generan contenido profesional.', name: 'Carlos Ruiz', role: 'CMO, GrowthLab', stars: 5 },
  { quote: 'Las llamadas IA cualifican leads mientras dormimos. El BANT automático ahorra 15h/semana a nuestro equipo.', name: 'Ana López', role: 'Head of Sales, ScaleUp', stars: 5 },
]

const LOGOS = ['TechCo', 'GrowthLab', 'ScaleUp', 'FounderOS', 'LaunchPad', 'VentureHQ']

function useInView(ref) {
  const [isInView, setIsInView] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true)
    }, { threshold: 0.1 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return isInView
}

function FadeIn({ children, delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref)
  return (
    <div ref={ref} style={{
      opacity: isInView ? 1 : 0,
      transform: isInView ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
    }}>
      {children}
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#0F172A' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 36 }} /></Link>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden md:flex">
            <a href="#features" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>Features</a>
            <a href="#pricing" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>Pricing</a>
            <a href="#testimonials" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>Testimonios</a>
            <Link to="/login" style={{ fontSize: 14, color: '#1E6FD9', textDecoration: 'none', fontWeight: 600 }}>Login</Link>
            <Link to="/login" style={{ padding: '8px 20px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis</Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden" style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <a href="#features" onClick={() => setMenuOpen(false)} style={{ fontSize: 14, color: '#64748B', textDecoration: 'none' }}>Features</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ fontSize: 14, color: '#64748B', textDecoration: 'none' }}>Pricing</a>
            <Link to="/login" style={{ padding: '10px 20px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Empezar gratis</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7ED 100%)', padding: '80px 24px 100px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px' }}>
            <FadeIn>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20, color: '#0F172A' }}>
                Tu CRM de ventas.<br /><span style={{ background: 'linear-gradient(135deg, #1E6FD9, #F5820B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Simple. Potente. Para startups.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p style={{ fontSize: 18, color: '#64748B', lineHeight: 1.7, marginBottom: 32, maxWidth: 500 }}>
                Pipeline, marketing, emails, llamadas IA, SEO y automatizaciones. Todo en un solo lugar. Setup en 5 minutos.
              </p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}>
                  Empezar gratis <ArrowRight size={18} />
                </Link>
                <a href="#features" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', border: '2px solid #E2E8F0', color: '#0F172A', borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
                  Ver features
                </a>
              </div>
            </FadeIn>
          </div>
          <FadeIn delay={0.3}>
            <div style={{ flex: '1 1 400px', background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                {[{ label: 'Revenue', value: '€47.2K', color: '#1E6FD9' }, { label: 'Leads', value: '284', color: '#F5820B' }, { label: 'Conversión', value: '12.4%', color: '#10B981' }].map(k => (
                  <div key={k.label} style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#64748B', margin: 0 }}>{k.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: k.color, margin: '4px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{k.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
                {[40, 55, 35, 70, 50, 85, 65, 90, 75, 95, 80, 100].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: `linear-gradient(180deg, #1E6FD9, #F5820B)`, opacity: 0.7 + (h / 500) }} />
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Trust bar */}
      <section style={{ padding: '40px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: '#94A3B8', marginBottom: 20 }}>Usado por equipos de ventas en</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
            {LOGOS.map(l => (
              <span key={l} style={{ fontSize: 18, fontWeight: 700, color: '#CBD5E1', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '100px 24px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E6FD9', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Features</p>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Todo lo que necesitas para vender más</h2>
              <p style={{ fontSize: 16, color: '#64748B', maxWidth: 600, margin: '0 auto' }}>9 módulos integrados que cubren el ciclo completo: desde captación hasta cierre y post-venta.</p>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.05}>
                <div style={{ padding: 28, borderRadius: 16, border: '1px solid #E2E8F0', backgroundColor: 'white', transition: 'all 0.3s', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#1E6FD9' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #FFF7ED, #FFF7ED)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <f.icon size={22} color="#1E6FD9" />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '100px 24px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F5820B', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Cómo funciona</p>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 36, fontWeight: 800 }}>3 pasos para vender más</h2>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            {[
              { step: '01', title: 'Conecta', desc: 'Integra Gmail, Stripe, WhatsApp y 25+ herramientas en 5 minutos. Sin código.', color: '#1E6FD9' },
              { step: '02', title: 'Automatiza', desc: '22 automatizaciones listas: scoring, emails, alertas, follow-ups. Actívalas con un click.', color: '#F5820B' },
              { step: '03', title: 'Vende', desc: 'Cierra más deals con IA como copiloto. Dashboard en tiempo real con 14 grafos y KPIs.', color: '#10B981' },
            ].map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.1}>
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <span style={{ fontSize: 48, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", color: s.color, opacity: 0.2 }}>{s.step}</span>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.title}</h3>
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
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E6FD9', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Pricing</p>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Planes para cada etapa</h2>
              <p style={{ fontSize: 16, color: '#64748B' }}>Sin tarjeta de crédito. Cancela cuando quieras.</p>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'start' }}>
            {PLANS.map((p, i) => (
              <FadeIn key={p.name} delay={i * 0.1}>
                <div style={{
                  padding: 32, borderRadius: 16, backgroundColor: 'white',
                  border: p.popular ? '2px solid #1E6FD9' : '1px solid #E2E8F0',
                  boxShadow: p.popular ? '0 10px 40px rgba(59,130,246,0.15)' : 'none',
                  position: 'relative', transform: p.popular ? 'scale(1.02)' : 'none',
                }}>
                  {p.popular && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Más popular</span>}
                  <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.name}</h3>
                  <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>{p.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                    <span style={{ fontSize: 48, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>€{p.price}</span>
                    <span style={{ fontSize: 16, color: '#64748B' }}>/mes</span>
                  </div>
                  <Link to="/login" style={{
                    display: 'block', textAlign: 'center', padding: '12px 24px', borderRadius: 10,
                    backgroundColor: p.popular ? '#1E6FD9' : '#F8FAFC', color: p.popular ? 'white' : '#0F172A',
                    border: p.popular ? 'none' : '1px solid #E2E8F0', fontWeight: 600, fontSize: 14, textDecoration: 'none', marginBottom: 24,
                  }}>{p.cta}</Link>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {p.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#475569' }}>
                        <Check size={16} color="#10B981" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ padding: '100px 24px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F5820B', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Testimonios</p>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 36, fontWeight: 800 }}>Lo que dicen nuestros clientes</h2>
            </div>
          </FadeIn>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <div style={{ padding: 28, borderRadius: 16, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                    {Array.from({ length: t.stars }).map((_, j) => <Star key={j} size={16} fill="#F59E0B" color="#F59E0B" />)}
                  </div>
                  <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>"{t.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #1E6FD9, #F5820B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>{t.name[0]}</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{t.name}</p>
                      <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{t.role}</p>
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
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: 'white', marginBottom: 16, position: 'relative' }}>Empieza a vender más. Hoy.</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 32, position: 'relative' }}>Sin tarjeta de crédito. Setup en 5 minutos. Cancela cuando quieras.</p>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', backgroundColor: 'white', color: '#1E6FD9', borderRadius: 12, fontSize: 16, fontWeight: 700, textDecoration: 'none', position: 'relative', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
            Empezar gratis <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 24px 40px', backgroundColor: '#0F172A', color: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 }}>
            <div>
              <img src="/logo.png" alt="st4rtup" style={{ height: 30 }} />
              <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 12, lineHeight: 1.6 }}>CRM de ventas y marketing para startups. Simple, potente, con IA.</p>
            </div>
            {[
              { title: 'Producto', links: [{ t: 'Features', h: '#features' }, { t: 'Pricing', h: '/pricing' }, { t: 'Integraciones', h: '#features' }] },
              { title: 'Recursos', links: [{ t: 'Blog', h: '#' }, { t: 'Documentación', h: '#' }, { t: 'Status', h: '#' }] },
              { title: 'Legal', links: [{ t: 'Privacidad', h: '/privacy' }, { t: 'Términos', h: '/terms' }, { t: 'Cookies', h: '/cookies' }] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#94A3B8', marginBottom: 16 }}>{col.title}</p>
                {col.links.map(l => (
                  <a key={l.t} href={l.h} style={{ display: 'block', fontSize: 14, color: '#CBD5E1', margin: '8px 0', textDecoration: 'none' }}>{l.t}</a>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontSize: 13, color: '#64748B' }}>© 2026 St4rtup. Todos los derechos reservados.</p>
            <p style={{ fontSize: 13, color: '#64748B' }}>hello@st4rtup.com</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
