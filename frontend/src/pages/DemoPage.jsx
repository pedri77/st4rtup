import { useState } from 'react'
import WebChatWidget from "@/components/WebChatWidget"
import { Link } from 'react-router-dom'
import { BarChart3, Users, Megaphone, Sparkles, ArrowRight } from 'lucide-react'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'pipeline', label: 'Pipeline', icon: Users },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'ia', label: 'IA', icon: Sparkles },
]

const DEALS = [
  { name: 'TechCo', value: '€12.000', stage: 'Propuesta' },
  { name: 'GrowthLab', value: '€8.500', stage: 'Cualificado' },
  { name: 'ScaleUp', value: '€25.000', stage: 'Negociación' },
  { name: 'FounderOS', value: '€5.200', stage: 'Nuevo' },
  { name: 'LaunchPad', value: '€15.000', stage: 'Demo' },
]

const STAGES = ['Nuevo', 'Demo', 'Cualificado', 'Propuesta', 'Negociación', 'Cerrado']

export default function DemoPage() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1A1A2E', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
      <meta name="robots" content="noindex" />

      {/* Header */}
      <nav style={{ backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 50 }} /></Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/" style={{ fontSize: 14, color: '#64748B', textDecoration: 'none' }}>← Volver</Link>
          <Link to="/login" style={{ padding: '8px 20px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Registrarse gratis</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Demo interactiva</h1>
        <p style={{ color: '#64748B', marginBottom: 24 }}>Explora el CRM con datos de ejemplo. Sin registro.</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10,
              border: tab === t.id ? '2px solid #1E6FD9' : '1px solid #E2E8F0',
              backgroundColor: tab === t.id ? '#EBF4FF' : 'white', color: tab === t.id ? '#1E6FD9' : '#64748B',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}><t.icon size={16} /> {t.label}</button>
          ))}
        </div>

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[{ l: 'Ingresos', v: '€47.2K', c: '#1E6FD9' }, { l: 'Leads', v: '284', c: '#F5820B' }, { l: 'Conversión', v: '12.4%', c: '#10B981' }, { l: 'Pipeline', v: '€125K', c: '#8B5CF6' }].map(k => (
                <div key={k.l} style={{ padding: 20, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{k.l}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, fontFamily: fontDisplay, color: k.c, margin: '4px 0 0' }}>{k.v}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: 24, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Actividad semanal</h3>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 100 }}>
                {[40, 55, 35, 70, 50, 85, 65, 90, 75, 95, 80, 100].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: 'linear-gradient(180deg, #1E6FD9, #F5820B)', opacity: 0.6 + h / 300 }} />
                ))}
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 12 }}>Panel en tiempo real con 14 gráficos y KPIs</p>
          </div>
        )}

        {/* Pipeline */}
        {tab === 'pipeline' && (
          <div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
              {STAGES.map(stage => (
                <div key={stage} style={{ minWidth: 170, padding: 16, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>{stage}</h4>
                  {DEALS.filter(d => d.stage === stage || (stage === 'Nuevo' && !STAGES.slice(1).includes(d.stage))).slice(0, 2).map(d => (
                    <div key={d.name} style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9', marginBottom: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{d.name}</p>
                      <p style={{ fontSize: 12, color: '#1E6FD9', margin: 0, fontWeight: 700 }}>{d.value}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>Pipeline visual con arrastrar y soltar</p>
          </div>
        )}

        {/* Marketing */}
        {tab === 'marketing' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[{ l: 'Campañas activas', v: '4', c: '#1E6FD9' }, { l: 'SEO Score', v: '85/100', c: '#10B981' }, { l: 'Emails enviados', v: '1.2K', c: '#F5820B' }].map(k => (
              <div key={k.l} style={{ padding: 24, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <p style={{ fontSize: 32, fontWeight: 800, fontFamily: fontDisplay, color: k.c, margin: 0 }}>{k.v}</p>
                <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>{k.l}</p>
              </div>
            ))}
            <div style={{ gridColumn: 'span 3' }}>
              <p style={{ fontSize: 13, color: '#94A3B8' }}>Hub de marketing completo con SEO, campañas y analytics</p>
            </div>
          </div>
        )}

        {/* IA */}
        {tab === 'ia' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              { name: 'Scoring ICP', desc: 'Puntúa leads automáticamente', score: '87/100' },
              { name: 'BANT Qualifier', desc: 'Cualifica desde transcripciones', score: '4/4 criterios' },
              { name: 'Propuestas', desc: 'Genera propuestas en PDF', score: '3 min/propuesta' },
              { name: 'SEO Pipeline', desc: '4 agentes encadenados', score: '8 artículos/día' },
            ].map(a => (
              <div key={a.name} style={{ padding: 20, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
                <h4 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{a.name}</h4>
                <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 12px' }}>{a.desc}</p>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: fontDisplay, color: '#1E6FD9' }}>{a.score}</span>
              </div>
            ))}
            <div style={{ gridColumn: 'span 2' }}>
              <p style={{ fontSize: 13, color: '#94A3B8' }}>4 agentes IA que trabajan para ti 24/7</p>
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{ marginTop: 48, padding: '40px 32px', borderRadius: 20, background: 'linear-gradient(135deg, #1E6FD9, #F5820B)', textAlign: 'center' }}>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 12 }}>¿Te gusta lo que ves?</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 24, fontSize: 15 }}>Empieza gratis hoy. Sin tarjeta de crédito.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', backgroundColor: 'white', color: '#1E6FD9', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}>Registrarse gratis <ArrowRight size={16} /></Link>
            <Link to="/pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', border: '2px solid white', color: 'white', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}>Ver precios</Link>
          </div>
        </div>
      </div>
    <WebChatWidget />
    </div>
  )
}

