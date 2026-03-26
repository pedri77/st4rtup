import { Link, useParams } from 'react-router-dom'
import { Check, X as XIcon, ArrowRight } from 'lucide-react'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"

const DATA = {
  hubspot: {
    name: 'HubSpot', tagline: 'CRM pensado para startups, no para enterprises',
    price_them: 'Desde €50/mes (Starter), €800/mes (Pro)', price_us: 'Desde €0 (gratis), €19/mes (Growth)',
    pros_them: ['Marca conocida', 'Ecosistema amplio', 'Academia formación'],
    cons_them: ['Precio elevado para startups', 'Complejidad innecesaria', 'Vendor lock-in', 'Sin IA en plan básico'],
    pros_us: ['Gratis para empezar', 'IA integrada desde Growth', 'SEO Command Center', 'Setup en 5 min', 'Sin complejidad'],
    features: [
      { n: 'Pipeline Kanban', us: true, them: true }, { n: 'Email tracking', us: true, them: true },
      { n: '4 Agentes IA integrados', us: true, them: false }, { n: 'SEO Command Center', us: true, them: false },
      { n: 'Llamadas IA + scoring', us: true, them: false }, { n: 'WhatsApp Business + Bot', us: true, them: false },
      { n: 'Deal Room + NDA digital', us: true, them: false }, { n: 'Automatizaciones incluidas', us: true, them: 'Solo Pro (€800/mes)' },
      { n: 'Precio 3 usuarios', us: '€19/mes', them: '€150/mes' }, { n: 'Tiempo de setup', us: '5 minutos', them: '2-4 semanas' },
    ],
  },
  pipedrive: {
    name: 'Pipedrive', tagline: 'Más funcionalidades por menos precio',
    price_them: 'Desde €14/mes (Essential), €49/mes (Pro)', price_us: 'Desde €0 (gratis), €19/mes (Growth)',
    pros_them: ['Buen pipeline visual', 'Interfaz limpia', 'Marketplace integraciones'],
    cons_them: ['Sin marketing integrado', 'Sin IA nativa', 'Sin SEO', 'Sin WhatsApp', 'Automatizaciones limitadas'],
    pros_us: ['Marketing Hub completo', '4 Agentes IA', 'SEO Command Center', 'WhatsApp + chatbot', '22 automatizaciones'],
    features: [
      { n: 'Pipeline Kanban', us: true, them: true }, { n: 'Email tracking', us: true, them: true },
      { n: 'Marketing Hub completo', us: true, them: false }, { n: '4 Agentes IA', us: true, them: false },
      { n: 'SEO Command Center (9 tabs)', us: true, them: false }, { n: 'Content Pipeline IA', us: true, them: false },
      { n: 'WhatsApp Business', us: true, them: false }, { n: '14 gráficos visuales', us: true, them: '3 básicos' },
      { n: 'Automatizaciones', us: '22 incluidas', them: '5 en Pro' }, { n: 'Plan gratuito', us: 'Sí, siempre', them: 'Solo 7 días trial' },
    ],
  },
  salesforce: {
    name: 'Salesforce', tagline: 'Potencia enterprise sin la complejidad',
    price_them: 'Desde €25/mes (Essentials), €150/mes (Pro)', price_us: 'Desde €0 (gratis), €19/mes (Growth)',
    pros_them: ['Líder del mercado', 'Personalización extrema', 'AppExchange'],
    cons_them: ['Curva aprendizaje alta', 'Necesitas consultor', 'Precio escala rápido', 'Overkill para startups'],
    pros_us: ['Listo en 5 min', 'Sin consultor', 'IA sin coste extra', 'Diseñado para startups'],
    features: [
      { n: 'Pipeline Kanban', us: true, them: true }, { n: 'Email tracking', us: true, them: true },
      { n: 'Setup sin consultor', us: true, them: false }, { n: '4 Agentes IA incluidos', us: true, them: 'Einstein (€75/mes extra)' },
      { n: 'Marketing integrado', us: true, them: 'Marketing Cloud (€1.250/mes)' }, { n: 'SEO Command Center', us: true, them: false },
      { n: 'Tiempo implementación', us: '5 minutos', them: '3-6 meses' }, { n: 'Coste año (3 usuarios)', us: '€228', them: '€5.400+' },
    ],
  },
}

function Val({ v }) {
  if (v === true) return <Check size={18} color="#10B981" />
  if (v === false) return <XIcon size={18} color="#EF4444" />
  return <span style={{ fontSize: 13, color: '#475569' }}>{v}</span>
}

export default function ComparePage() {
  const { competitor } = useParams()
  const d = DATA[competitor]

  if (!d) return (
    <div style={{ padding: 80, textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
      <h1>Competidor no encontrado</h1>
      <p>Prueba: <Link to="/vs/hubspot">/vs/hubspot</Link>, <Link to="/vs/pipedrive">/vs/pipedrive</Link>, <Link to="/vs/salesforce">/vs/salesforce</Link></p>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1A1A2E' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
      <title>St4rtup vs {d.name} — Comparativa CRM</title>

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
          <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
          <Link to="/login" style={{ padding: '10px 22px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 100px' }}>
        {/* Hero */}
        <h1 style={{ fontFamily: fontDisplay, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, marginBottom: 8 }}>
          <span style={{ color: '#1E6FD9' }}>St4rtup</span> vs <span style={{ color: '#64748B' }}>{d.name}</span>
        </h1>
        <p style={{ fontSize: 18, color: '#64748B', marginBottom: 40 }}>{d.tagline}</p>

        {/* Price comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
          <div style={{ padding: 24, borderRadius: 14, border: '2px solid #1E6FD9', backgroundColor: '#EBF4FF' }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: '#1E6FD9', marginBottom: 8 }}>St4rtup</h3>
            <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>{d.price_us}</p>
          </div>
          <div style={{ padding: 24, borderRadius: 14, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>{d.name}</h3>
            <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>{d.price_them}</p>
          </div>
        </div>

        {/* Feature table */}
        <h2 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Comparativa de funcionalidades</h2>
        <div style={{ borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', padding: '14px 20px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Funcionalidad</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E6FD9', textAlign: 'center' }}>St4rtup</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748B', textAlign: 'center' }}>{d.name}</span>
          </div>
          {d.features.map(f => (
            <div key={f.n} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', padding: '12px 20px', borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#334155' }}>{f.n}</span>
              <span style={{ textAlign: 'center' }}><Val v={f.us} /></span>
              <span style={{ textAlign: 'center' }}><Val v={f.them} /></span>
            </div>
          ))}
        </div>

        {/* Pros/Cons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
          <div>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: '#1E6FD9', marginBottom: 12 }}>Ventajas St4rtup</h3>
            {d.pros_us.map(p => <p key={p} style={{ fontSize: 14, color: '#334155', display: 'flex', gap: 8, marginBottom: 6 }}><Check size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} /> {p}</p>)}
          </div>
          <div>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: '#64748B', marginBottom: 12 }}>Limitaciones {d.name}</h3>
            {d.cons_them.map(c => <p key={c} style={{ fontSize: 14, color: '#334155', display: 'flex', gap: 8, marginBottom: 6 }}><XIcon size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} /> {c}</p>)}
          </div>
        </div>

        {/* Other comparisons */}
        <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 40 }}>
          Otras comparativas: {Object.entries(DATA).filter(([k]) => k !== competitor).map(([k, v]) => (
            <Link key={k} to={`/vs/${k}`} style={{ color: '#1E6FD9', marginRight: 12 }}>vs {v.name}</Link>
          ))}
        </p>

        {/* CTA */}
        <div style={{ padding: '40px 32px', borderRadius: 20, background: 'linear-gradient(135deg, #1E6FD9, #F5820B)', textAlign: 'center' }}>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 12 }}>Cambia a St4rtup</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 24 }}>Sin tarjeta de crédito. Setup en 5 minutos.</p>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', backgroundColor: 'white', color: '#1E6FD9', borderRadius: 10, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis <ArrowRight size={16} /></Link>
        </div>
      </div>
    </div>
  )
}
