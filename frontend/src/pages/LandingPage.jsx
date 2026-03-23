import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Users, Megaphone, Sparkles, Zap, Plug, Check } from 'lucide-react'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#06B6D4', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}

const FEATURES = [
  { icon: Users, title: 'Leads & CRM', desc: 'Gestiona leads, contactos y empresas. Scoring automático con IA. Pipeline visual Kanban.', color: T.purple },
  { icon: BarChart3, title: 'Pipeline & Forecast', desc: 'Pipeline visual con drag & drop. Forecast de revenue con proyecciones. Funnel de conversión.', color: T.cyan },
  { icon: Megaphone, title: 'Marketing Hub', desc: 'Campañas, SEO, contenido IA, social media, YouTube analytics. Todo en un solo lugar.', color: T.success },
  { icon: Sparkles, title: 'IA Integrada', desc: '4 agentes IA: scoring leads, BANT, propuestas, contenido SEO. Selector de provider (OpenAI, DeepSeek, Mistral...)', color: T.warning },
  { icon: Zap, title: 'Automatizaciones', desc: '22+ automations: welcome sequences, reminders, alerts, escalation. Sin código.', color: T.destructive },
  { icon: Plug, title: '28+ Integraciones', desc: 'Stripe, WhatsApp, YouTube, Airtable, Google Drive, Slack, HubSpot, n8n y más.', color: T.purple },
]

const PLANS = [
  { name: 'Starter', price: '0', period: '/mes', desc: 'Para empezar', features: ['3 usuarios', '100 leads', 'Pipeline básico', 'Email integrado', '1 integración'], cta: 'Empezar gratis', popular: false },
  { name: 'Growth', price: '49', period: '/mes', desc: 'Para crecer', features: ['10 usuarios', 'Leads ilimitados', 'Marketing Hub', 'IA integrada', 'Todas las integraciones', 'Automatizaciones', 'Analytics avanzado'], cta: 'Empezar prueba', popular: true },
  { name: 'Scale', price: '149', period: '/mes', desc: 'Para escalar', features: ['Usuarios ilimitados', 'Todo en Growth', 'Deal Room + NDA', 'WhatsApp Business', 'API pública', 'Soporte prioritario', 'Custom onboarding'], cta: 'Contactar', popular: false },
]

const INTEGRATIONS = ['Stripe', 'PayPal', 'WhatsApp', 'YouTube', 'Airtable', 'Google Drive', 'Gmail', 'Slack', 'HubSpot', 'Notion', 'n8n', 'Telegram', 'OpenAI', 'DeepSeek', 'Mistral']

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: T.bg, color: T.fg, minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color="white" />
          </div>
          <span style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 20, color: T.fg }}>St4rtup</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#features" style={{ color: T.fgMuted, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Features</a>
          <a href="#pricing" style={{ color: T.fgMuted, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Pricing</a>
          <Link to="/login" style={{ padding: '8px 20px', borderRadius: 8, backgroundColor: T.purple, color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Acceder
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 99, backgroundColor: `${T.purple}12`, color: T.purple, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          CRM + Marketing + IA para startups
        </div>
        <h1 style={{ fontFamily: 'Inter', fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 20px', maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
          El CRM que tu startup
          <span style={{ background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> necesita</span>
        </h1>
        <p style={{ fontSize: 18, color: T.fgMuted, maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Leads, pipeline, marketing, contenido IA, automatizaciones y 28+ integraciones. Todo en una plataforma diseñada para startups que quieren crecer rápido.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" style={{ padding: '14px 32px', borderRadius: 10, background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, color: 'white', textDecoration: 'none', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 20px ${T.purple}40` }}>
            Empezar gratis <ArrowRight size={18} />
          </Link>
          <a href="#features" style={{ padding: '14px 32px', borderRadius: 10, border: `2px solid ${T.border}`, color: T.fg, textDecoration: 'none', fontSize: 16, fontWeight: 600 }}>
            Ver features
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'Inter', fontSize: 32, fontWeight: 800, margin: '0 0 12px' }}>Todo lo que necesitas para vender más</h2>
          <p style={{ color: T.fgMuted, fontSize: 16, maxWidth: 500, margin: '0 auto' }}>Un CRM completo con IA, marketing y automatizaciones incluidas.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ backgroundColor: T.card, borderRadius: 16, padding: 28, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${f.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <f.icon size={22} color={f.color} />
              </div>
              <h3 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: T.fgMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section style={{ backgroundColor: T.muted, padding: '60px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: 700, margin: '0 0 32px' }}>28+ integraciones listas para usar</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            {INTEGRATIONS.map(name => (
              <span key={name} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: T.card, border: `1px solid ${T.border}`, fontSize: 13, fontWeight: 500, color: T.fg }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'Inter', fontSize: 32, fontWeight: 800, margin: '0 0 12px' }}>Planes simples y transparentes</h2>
          <p style={{ color: T.fgMuted, fontSize: 16 }}>Empieza gratis, escala cuando quieras.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 960, margin: '0 auto' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              backgroundColor: T.card, borderRadius: 16, padding: 32,
              border: plan.popular ? `2px solid ${T.purple}` : `1px solid ${T.border}`,
              boxShadow: plan.popular ? `0 8px 30px ${T.purple}20` : '0 1px 3px rgba(0,0,0,0.04)',
              position: 'relative',
            }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', borderRadius: 99, background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, color: 'white', fontSize: 12, fontWeight: 700 }}>
                  Popular
                </div>
              )}
              <h3 style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{plan.name}</h3>
              <p style={{ color: T.fgMuted, fontSize: 13, margin: '0 0 16px' }}>{plan.desc}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                <span style={{ fontFamily: 'Inter', fontSize: 40, fontWeight: 800 }}>{plan.price}€</span>
                <span style={{ color: T.fgMuted, fontSize: 14 }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 14, color: T.fg }}>
                    <Check size={16} color={T.success} /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/login" style={{
                display: 'block', textAlign: 'center', padding: '12px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14,
                backgroundColor: plan.popular ? T.purple : T.muted,
                color: plan.popular ? 'white' : T.fg,
              }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})` }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Inter', fontSize: 32, fontWeight: 800, color: 'white', margin: '0 0 12px' }}>Empieza hoy. Es gratis.</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, margin: '0 0 32px' }}>Sin tarjeta de crédito. Sin compromisos. Tu CRM listo en 2 minutos.</p>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 40px', borderRadius: 12, backgroundColor: 'white', color: T.purple, textDecoration: 'none', fontWeight: 800, fontSize: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            Crear cuenta gratis <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: T.fg, padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="white" />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>© 2026 St4rtup. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="#" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none' }}>Privacidad</a>
            <a href="#" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none' }}>Términos</a>
            <a href="mailto:hello@st4rtup.app" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none' }}>Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
