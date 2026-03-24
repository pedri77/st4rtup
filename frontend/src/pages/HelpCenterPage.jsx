import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronDown, ChevronUp, Rocket, BarChart3, Megaphone, Sparkles, Plug, CreditCard, Mail } from 'lucide-react'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"

const CATEGORIES = [
  { id: 'start', name: 'Primeros pasos', icon: Rocket, color: '#1E6FD9', faqs: [
    { q: '¿Cómo creo mi cuenta?', a: 'Ve a st4rtup.com y haz clic en "Empezar gratis". Solo necesitas un email. No se requiere tarjeta de crédito.' },
    { q: '¿Cómo funciona el onboarding?', a: 'Tras registrarte, un wizard de 5 pasos te guía: nombre, importar leads, conectar email, elegir pipeline y empezar. Tarda menos de 5 minutos.' },
    { q: '¿Puedo importar mis leads desde otro CRM?', a: 'Sí. Soportamos CSV con formato HubSpot, Salesforce y genérico. Ve a Leads → Importar CSV y arrastra tu archivo.' },
    { q: '¿Hay un período de prueba?', a: 'Sí, 14 días gratis del plan Growth con todas las funcionalidades. Después puedes quedarte en Starter (gratis) o elegir un plan de pago.' },
  ]},
  { id: 'sales', name: 'Pipeline y ventas', icon: BarChart3, color: '#10B981', faqs: [
    { q: '¿Cómo creo mi primer lead?', a: 'Ve a Leads → "Nuevo Lead". Rellena empresa, contacto y email. El scoring automático se aplica al instante.' },
    { q: '¿Cómo funciona el pipeline Kanban?', a: 'Ve a Pipeline. Arrastra las oportunidades entre etapas (Nuevo → Contactado → Cualificado → Propuesta → Negociación → Cerrado). El forecast se actualiza en tiempo real.' },
    { q: '¿Puedo personalizar las etapas del pipeline?', a: 'Sí. En el onboarding puedes elegir entre 3 plantillas (B2B SaaS, Servicios, Ecommerce) o personalizar las etapas desde Configuración.' },
    { q: '¿Cómo funciona el scoring de leads?', a: 'El agente IA de scoring evalúa cada lead automáticamente según ICP (perfil de cliente ideal). Puntuación de 0 a 100 basada en sector, tamaño, cargo y engagement.' },
    { q: '¿Qué son las acciones?', a: 'Las acciones son tareas asociadas a un lead: llamadas, emails, reuniones, follow-ups. Puedes verlas en vista lista o Kanban. Se auto-escalan si están vencidas.' },
  ]},
  { id: 'marketing', name: 'Marketing', icon: Megaphone, color: '#F5820B', faqs: [
    { q: '¿Qué incluye el Hub de Marketing?', a: 'Campañas multicanal, embudos visuales, assets, calendario editorial, generador UTM, analytics unificado, alertas y audit log.' },
    { q: '¿Cómo funciona el Centro de SEO?', a: '9 pestañas: Content Hub (artículos), Keywords (investigación), Backlinks (tracker), Dashboard (KPIs), Repurposer (reutilizar contenido), Health (auditoría), Brand (marca), Tracker (publicaciones externas) y Content Pipeline (4 agentes IA).' },
    { q: '¿Puedo generar contenido con IA?', a: 'Sí. El Content Pipeline usa 4 agentes encadenados: Keywords → Draft → SEO → Meta. Genera artículos profesionales con selector de proveedor IA (OpenAI, DeepSeek, Mistral).' },
    { q: '¿Cómo conecto YouTube?', a: 'Ve a Integraciones → YouTube. Necesitas un canal de YouTube y una API Key de Google Cloud Console. El dashboard muestra suscriptores, vistas y analytics.' },
  ]},
  { id: 'ai', name: 'Inteligencia artificial', icon: Sparkles, color: '#8B5CF6', faqs: [
    { q: '¿Qué agentes IA hay disponibles?', a: '4 agentes: Scoring ICP (puntúa leads), BANT Qualifier (cualifica llamadas), Proposal Generator (genera propuestas PDF), Customer Success (NPS, churn, upsell).' },
    { q: '¿Cómo funcionan las llamadas IA?', a: 'Usa Retell AI para llamadas automáticas. Configura prompts, lanza llamadas (individuales o en cola), el sistema transcribe, analiza sentimiento y cualifica BANT automáticamente.' },
    { q: '¿Puedo elegir el proveedor de IA?', a: 'Sí. Soportamos OpenAI (GPT-4), DeepSeek, Mistral, Anthropic y Groq. Puedes seleccionar el proveedor al generar contenido o al configurar agentes.' },
    { q: '¿Los datos se envían a la IA?', a: 'Solo los datos necesarios para la tarea (ej: nombre de empresa para scoring). Nunca se envían contraseñas, tokens o datos sensibles. Cumplimos RGPD.' },
  ]},
  { id: 'integrations', name: 'Integraciones', icon: Plug, color: '#0EA5E9', faqs: [
    { q: '¿Cómo conecto Gmail?', a: 'Ve a Configuración → Email → "Conectar Gmail". Se abre OAuth de Google. Autoriza y listo. Envía y recibe emails desde el CRM sin coste (API gratuita de Google).' },
    { q: '¿Qué integraciones hay disponibles?', a: 'Gmail, Google Drive, Google Calendar, Stripe, PayPal, WhatsApp Business, YouTube, Airtable, Slack, Teams, Telegram, HubSpot, Notion, n8n, Apollo.io, Hunter.io, Calendly y más.' },
    { q: '¿Puedo usar webhooks?', a: 'Sí. Ve a Integraciones → Webhooks. Crea suscripciones a eventos (lead.created, opportunity.won, etc.). Los webhooks se firman con HMAC-SHA256.' },
    { q: '¿Hay API pública?', a: 'Sí, disponible en el plan Scale. Documentación en /public/docs. Rate limiting de 100 req/min con API key.' },
  ]},
  { id: 'billing', name: 'Facturación', icon: CreditCard, color: '#EF4444', faqs: [
    { q: '¿Cómo cambio de plan?', a: 'Ve a Configuración → Plan. Puedes subir o bajar en cualquier momento. Al subir, se aplica la diferencia prorrateada. Al bajar, el cambio se aplica al siguiente ciclo.' },
    { q: '¿Qué métodos de pago aceptáis?', a: 'Tarjeta de crédito/débito (Visa, Mastercard, Amex) vía Stripe. Para planes Scale con facturación anual, también transferencia bancaria.' },
    { q: '¿Puedo exportar mis datos si cancelo?', a: 'Sí. Exporta en CSV o JSON en cualquier momento. Tras cancelar, tus datos se mantienen 30 días para descarga. También soportamos export a Google Sheets y Airtable.' },
    { q: '¿Cómo funciona el IVA?', a: 'Precios sin IVA. Para empresas españolas se aplica el 21%. Para empresas intracomunitarias con NIF-IVA válido, factura sin IVA (inversión del sujeto pasivo).' },
  ]},
]

export default function HelpCenterPage() {
  const [search, setSearch] = useState('')
  const [openCat, setOpenCat] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  const filtered = search.trim()
    ? CATEGORIES.map(c => ({ ...c, faqs: c.faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())) })).filter(c => c.faqs.length > 0)
    : CATEGORIES

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1A1A2E', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />

      <nav style={{ backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
        <Link to="/login" style={{ padding: '10px 22px', backgroundColor: '#1E6FD9', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis</Link>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Centro de ayuda</h1>
          <p style={{ color: '#64748B', fontSize: 16, marginBottom: 24 }}>¿En qué podemos ayudarte?</p>
          <div style={{ maxWidth: 500, margin: '0 auto', position: 'relative' }}>
            <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 13 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en el centro de ayuda..."
              style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 15, outline: 'none' }} />
          </div>
        </div>

        {/* Categories */}
        {!search && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: 40 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => { setOpenCat(openCat === c.id ? null : c.id); setOpenFaq(null) }}
                style={{ padding: 20, borderRadius: 14, border: openCat === c.id ? `2px solid ${c.color}` : '1px solid #E2E8F0', backgroundColor: 'white', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                <c.icon size={22} color={c.color} />
                <p style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, margin: '8px 0 0', color: '#1A1A2E' }}>{c.name}</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: '4px 0 0' }}>{c.faqs.length} artículos</p>
              </button>
            ))}
          </div>
        )}

        {/* FAQs */}
        {filtered.map(cat => {
          if (!search && openCat && openCat !== cat.id) return null
          return (
            <div key={cat.id} style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: cat.color, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <cat.icon size={18} /> {cat.name}
              </h3>
              {cat.faqs.map((faq, i) => {
                const key = `${cat.id}-${i}`
                return (
                  <div key={key} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <button onClick={() => setOpenFaq(openFaq === key ? null : key)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '14px 0', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{faq.q}</span>
                      {openFaq === key ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
                    </button>
                    {openFaq === key && <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, paddingBottom: 14 }}>{faq.a}</p>}
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Contact */}
        <div style={{ marginTop: 40, padding: '28px 24px', borderRadius: 16, backgroundColor: 'white', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <Mail size={24} color="#1E6FD9" />
          <h3 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, margin: '12px 0 8px' }}>¿No encuentras lo que buscas?</h3>
          <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16 }}>Escríbenos y te respondemos en menos de 24h.</p>
          <a href="mailto:hello@st4rtup.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 10, backgroundColor: '#1E6FD9', color: 'white', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
            hello@st4rtup.com
          </a>
        </div>
      </div>
    </div>
  )
}
