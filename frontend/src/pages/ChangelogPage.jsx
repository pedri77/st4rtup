import { useState } from 'react'
import { Link } from 'react-router-dom'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const TYPES = { Funcionalidad: '#1E6FD9', Mejora: '#10B981', Corrección: '#F5820B' }

const ENTRIES = [
  { version: 'v2.5', date: '24/03/2026', type: 'Funcionalidad', title: 'Deal Room + Firma NDA digital', desc: 'Sala de negociación con documentos protegidos y firma digital.', changes: ['PDF watermark automático con datos del receptor', 'Page analytics por página y visitante', 'NDA gate con Signaturit, Yousign y DocuSign', 'Vista pública para compradores (/deal/{token})'] },
  { version: 'v2.4', date: '23/03/2026', type: 'Funcionalidad', title: 'Pagos con Stripe + PayPal', desc: 'Sistema de pagos completo integrado en el CRM.', changes: ['Checkout Stripe con sesiones seguras', 'PayPal orders y captura', 'Gestión de planes y facturas', 'Webhook receiver para eventos de pago'] },
  { version: 'v2.3', date: '23/03/2026', type: 'Funcionalidad', title: '14 gráficos visuales en el dashboard', desc: 'Visualizaciones de datos para tomar mejores decisiones.', changes: ['Pipeline Sankey flow', 'Revenue Waterfall', 'Team Activity Radar', 'Funnel de conversión', 'Keyword rankings con sparklines', 'Content Calendar Heatmap'] },
  { version: 'v2.2', date: '22/03/2026', type: 'Funcionalidad', title: 'WhatsApp Business + Chatbot IA', desc: 'Canal de WhatsApp integrado con chatbot inteligente.', changes: ['Envío de mensajes desde el CRM', 'Chatbot IA para cualificación automática', 'Conversaciones en tiempo real', 'Widget de chat público para la web'] },
  { version: 'v2.1', date: '22/03/2026', type: 'Funcionalidad', title: 'SEO Command Center con 9 tabs', desc: 'Centro de SEO completo para posicionar tu startup.', changes: ['Content Hub con editor WYSIWYG', 'Keyword Studio con research IA', 'Backlink Manager + checker automático', 'Content Pipeline IA (4 agentes)', 'Content Tracker para publicaciones externas'] },
  { version: 'v2.0', date: '21/03/2026', type: 'Mejora', title: 'Rediseño visual completo', desc: 'Interfaz renovada con design system unificado.', changes: ['Tema claro con paleta azul/naranja', 'Tipografías Plus Jakarta Sans + IBM Plex Mono', '73 páginas migradas al nuevo design system', 'i18n ES/EN/PT', 'Keyboard shortcuts globales'] },
]

export default function ChangelogPage() {
  const [filter, setFilter] = useState(null)
  const filtered = filter ? ENTRIES.filter(e => e.type === filter) : ENTRIES

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1A1A2E' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
          <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
          <Link to="/login" style={{ padding: '10px 22px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px 100px' }}>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Changelog</h1>
        <p style={{ color: '#64748B', fontSize: 16, marginBottom: 32 }}>Todas las novedades de St4rtup</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
          <button onClick={() => setFilter(null)} style={{ padding: '6px 16px', borderRadius: 8, border: !filter ? '2px solid #1A1A2E' : '1px solid #E2E8F0', fontWeight: 600, fontSize: 13, cursor: 'pointer', backgroundColor: !filter ? '#1A1A2E' : 'white', color: !filter ? 'white' : '#64748B' }}>Todo</button>
          {Object.entries(TYPES).map(([t, c]) => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: '6px 16px', borderRadius: 8, border: filter === t ? `2px solid ${c}` : '1px solid #E2E8F0', backgroundColor: filter === t ? `${c}12` : 'white', color: filter === t ? c : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>

        <div style={{ position: 'relative', paddingLeft: 28 }}>
          <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, backgroundColor: '#E2E8F0' }} />
          {filtered.map(e => (
            <div key={e.version} style={{ position: 'relative', marginBottom: 32 }}>
              <div style={{ position: 'absolute', left: -24, width: 16, height: 16, borderRadius: '50%', backgroundColor: TYPES[e.type], border: '3px solid white', boxShadow: '0 0 0 2px #E2E8F0' }} />
              <div style={{ padding: 24, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: fontMono, fontSize: 13, fontWeight: 700, color: '#1A1A2E', backgroundColor: '#F1F5F9', padding: '3px 10px', borderRadius: 6 }}>{e.version}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: fontMono }}>{e.date}</span>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, backgroundColor: `${TYPES[e.type]}15`, color: TYPES[e.type], fontWeight: 600 }}>{e.type}</span>
                </div>
                <h3 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{e.title}</h3>
                <p style={{ color: '#64748B', fontSize: 14, marginBottom: 12 }}>{e.desc}</p>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {e.changes.map(c => <li key={c} style={{ fontSize: 13, color: '#475569', lineHeight: 1.8 }}>{c}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
