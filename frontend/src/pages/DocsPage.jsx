import { useState } from 'react'
import { BookOpen, Search, Printer, ChevronRight } from 'lucide-react'

const T = { bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B', cyan: '#1E6FD9' }
const fontDisplay = "'Rajdhani', sans-serif"

const DOCS = [
  { id: 'getting-started', title: 'Primeros pasos', icon: '🚀', content: `## Bienvenido a St4rtup\n\nEsta guía te ayudará a configurar tu CRM en 5 minutos.\n\n### 1. Crea tu primer lead\n\nVe a **Leads → Nuevo Lead**. Rellena empresa, contacto y email. El scoring automático clasificará el lead por ti.\n\n### 2. Configura tu pipeline\n\nVe a **Pipeline**. Las etapas por defecto son:\n- Nuevo → Contactado → Cualificado → Propuesta → Negociación → Ganado\n\nPuedes arrastrar oportunidades entre etapas con drag & drop.\n\n### 3. Conecta tu email\n\nVe a **Integraciones → Gmail**. Click "Conectar Gmail" y autoriza el acceso. Podrás enviar y recibir emails directamente desde el CRM.\n\n### 4. Crea tu primera acción\n\nVe a **Acciones → Nueva Acción**. Asígnala a un lead y pon fecha de vencimiento. Las acciones vencidas se escalan automáticamente.\n\n### 5. Explora el dashboard\n\nEl dashboard muestra tus KPIs en tiempo real: leads, pipeline, conversión, revenue, actividad y más.` },
  { id: 'leads', title: 'Gestión de Leads', icon: '👥', content: `## Gestión de Leads\n\nLos leads son el punto de entrada de tu funnel comercial.\n\n### Crear un lead\n\nClick en **Nuevo Lead** e introduce: empresa, contacto principal, email, teléfono, sector y tamaño. El campo **score** se calcula automáticamente.\n\n### Importar desde CSV\n\nVe a **Leads → Importar CSV**. Arrastra tu archivo CSV. Soportamos formato HubSpot, Salesforce y genérico. El sistema detecta columnas automáticamente.\n\n### Scoring automático\n\nCada lead recibe una puntuación 0-100 basada en:\n- **Sector** — relevancia para tu negocio\n- **Tamaño** — potencial de compra\n- **Actividad** — emails, visitas, llamadas\n- **Engagement** — respuestas, clics\n\n### Filtros y búsqueda\n\nUsa la barra de búsqueda para filtrar por empresa, contacto o email. Los filtros avanzados permiten combinar estado, score, sector y fecha.\n\n### Favoritos\n\nMarca leads como favoritos con el icono ⭐ para acceso rápido.\n\n### Auto-tagging con IA\n\nClick en **Auto-tag** para que la IA clasifique el lead por sector y normativa automáticamente.` },
  { id: 'pipeline', title: 'Pipeline', icon: '📊', content: `## Pipeline y Oportunidades\n\n### Vista Kanban\n\nArrastra oportunidades entre columnas para cambiar de etapa. Cada columna muestra el valor total del pipeline.\n\n### Vista tabla\n\nVista alternativa con todas las oportunidades en formato tabla, ordenable por valor, fecha o etapa.\n\n### Crear oportunidad\n\nClick **Nueva Oportunidad**: selecciona lead, nombre del deal, valor estimado, fecha de cierre esperada y etapa.\n\n### Forecast\n\nEl forecast calcula el revenue proyectado basado en el valor ponderado (valor × probabilidad por etapa).` },
  { id: 'marketing', title: 'Marketing Hub', icon: '📣', content: `## Marketing Hub\n\nEl hub centraliza todas tus acciones de marketing.\n\n### Campañas\n\nCrea campañas multicanal: LinkedIn Ads, Google Ads, Email, YouTube, Webinars. Cada campaña trackea presupuesto, leads generados y ROI.\n\n### SEO Command Center\n\n9 tabs: Content Hub, Keywords, Backlinks, Dashboard, Repurposer, Health, Brand, Content Tracker, Pipeline IA.\n\n### Funnels\n\nConstructor visual de funnels con drag & drop.\n\n### Assets\n\nGestiona landing pages, CTAs y recursos de marketing.\n\n### Calendario editorial\n\nPlanifica publicaciones, campañas y contenido en un calendario visual.\n\n### Analytics\n\nDashboard unificado: CPL, MQL rate, CAC, pipeline y ROI.` },
  { id: 'seo', title: 'SEO Command Center', icon: '🔍', content: `## SEO Command Center\n\n### Content Hub\n\nGenera artículos con IA (4 agentes encadenados): Keywords → Draft → SEO → Meta. Editor WYSIWYG con toolbar markdown.\n\n### Keyword Studio\n\nInvestiga keywords por tema. Genera clusters semánticos, PAA questions y sugerencias.\n\n### Backlinks\n\nTrackea backlinks: dominio, DA, tipo (dofollow/nofollow), estado. Verificación automática HTTP.\n\n### Brand Monitor\n\nMonitorea keywords de marca y share of voice.\n\n### Content Tracker\n\nRegistra URLs de contenido publicado externamente y trackea métricas.` },
  { id: 'ai-agents', title: 'Agentes IA', icon: '🤖', content: `## Agentes IA\n\n4 agentes trabajan para ti automáticamente.\n\n### Scoring ICP\n\nClasifica leads por Ideal Customer Profile usando IA. Analiza sector, tamaño, engagement y probabilidad de compra.\n\n### Cualificación BANT\n\nCualifica leads basándose en Budget, Authority, Need y Timeline a partir de transcripciones de llamadas.\n\n### Generación de propuestas\n\nGenera propuestas comerciales en formato Markdown + PDF corporativo con los datos del lead.\n\n### Customer Success\n\nAnaliza NPS, riesgo de churn y oportunidades de upsell para clientes existentes.` },
  { id: 'calls', title: 'Llamadas IA', icon: '📞', content: `## Llamadas IA\n\n### Consola\n\nInicia llamadas con Retell AI. Selecciona lead, prompt y número. El resultado se registra automáticamente.\n\n### Prompts\n\nGestiona scripts de llamada. 5 templates predefinidos: prospecting, follow-up, closing, reactivation, qualification.\n\n### Colas y batch\n\nCrea colas de llamadas masivas. Programación, start/pause/cancel, retry automático.\n\n### A/B Testing\n\nCompara la eficacia entre dos prompts: conversión, sentiment, duración media.\n\n### RGPD\n\nCheckbox de consentimiento obligatorio. Derecho de supresión de grabaciones.` },
  { id: 'integrations', title: 'Integraciones', icon: '🔌', content: `## Integraciones\n\n### Gmail\n\nSync bidireccional de emails via OAuth. Tracking de apertura y clics.\n\n### Google Calendar\n\nSync de visitas comerciales bidireccional.\n\n### Google Drive\n\nAlmacenamiento de documentos integrado.\n\n### Stripe\n\nCobra a tus clientes desde el CRM. Checkout, suscripciones, facturas.\n\n### WhatsApp Business\n\nEnvía mensajes y templates. Chatbot IA para respuestas automáticas.\n\n### YouTube\n\nAnalytics del canal, vídeos recientes, suscriptores.\n\n### Slack\n\nAlertas y digest diario al canal de ventas.\n\n### Webhooks\n\nEventos outgoing con firma HMAC y retry automático.` },
  { id: 'automations', title: 'Automatizaciones', icon: '⚡', content: `## Automatizaciones\n\n28 automatizaciones preconfiguradas:\n\n### Email\n\n- **EM-01**: Secuencia welcome (día 3 y 7)\n- **EM-02**: Email tracking\n- **EM-03**: Re-engagement leads inactivos\n- **EM-04**: Follow-up post-visita\n\n### Acciones\n\n- **AC-01**: Resumen diario (08:30)\n- **AC-02**: Escalado automático (+3 días)\n- **AC-03**: Auto-cierre completadas\n\n### Pipeline\n\n- **PI-01**: Triggers por cambio de etapa\n- **PI-02**: Report semanal pipeline\n- **PI-03**: Alerta deals estancados\n\n### Leads\n\n- **LD-01**: Check formularios web\n- **LD-02**: Sync fuentes externas\n- **LD-03**: Enriquecimiento automático\n- **LD-04**: Scoring periódico\n\nTodas se ejecutan automáticamente via APScheduler.` },
  { id: 'deal-room', title: 'Deal Room', icon: '🤝', content: `## Deal Room\n\nEspacio colaborativo entre tu equipo y el comprador.\n\n### Documentos con watermark\n\nSube PDFs que se watermarkean automáticamente con nombre empresa, email y timestamp.\n\n### Page analytics\n\nVe qué páginas del documento leyó el comprador, cuánto tiempo y cuántas sesiones.\n\n### NDA digital\n\nFirma digital con Signaturit, Yousign o DocuSign. Fallback automático entre proveedores.\n\n### Q&A\n\nMensajes directos entre seller y buyer dentro del deal room.` },
  { id: 'payments', title: 'Pagos', icon: '💳', content: `## Pagos y Facturación\n\n### Stripe\n\nCheckout integrado para cobrar a tus clientes. Suscripciones mensuales/anuales.\n\n### PayPal\n\nAlternativa a Stripe. Órdenes de pago con redirect.\n\n### Facturas\n\nGenera facturas con CIF/NIF, IVA 21%, y envía por email.\n\n### Planes\n\nCrea planes de pricing para tus productos/servicios.` },
  { id: 'settings', title: 'Configuración', icon: '⚙️', content: `## Configuración\n\n### Perfil\n\nNombre, email, avatar, teléfono.\n\n### Integraciones\n\nConecta Gmail, Google Calendar, Stripe, WhatsApp y más.\n\n### Usuarios y roles\n\n3 roles: Admin (todo), Comercial (CRUD leads/pipeline), Viewer (solo lectura).\n\n### Preferencias\n\nIdioma (ES/EN/PT), tema, formato fecha, moneda.\n\n### Seguridad\n\nCambiar contraseña, 2FA (próximamente).` },
]

function renderMarkdown(md) {
  return md
    .replace(/### (.*)/g, '<h3 style="font-size:15px;font-weight:700;margin:20px 0 8px;color:#0F172A">$1</h3>')
    .replace(/## (.*)/g, '<h2 style="font-size:18px;font-weight:700;margin:24px 0 12px;color:#0F172A;font-family:Rajdhani,sans-serif">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0F172A">$1</strong>')
    .replace(/^- (.*)/gm, '<li style="margin:4px 0;padding-left:8px;color:#475569">$1</li>')
    .replace(/(<li.*<\/li>)/g, '<ul style="list-style:disc;padding-left:20px;margin:8px 0">$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
}

export default function DocsPage() {
  const [activeDoc, setActiveDoc] = useState('getting-started')
  const [search, setSearch] = useState('')

  const filtered = DOCS.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.content.toLowerCase().includes(search.toLowerCase())
  )

  const current = DOCS.find(d => d.id === activeDoc) || DOCS[0]

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
          <BookOpen className="w-6 h-6" style={{ color: T.cyan }} /> Documentación
        </h1>
        <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2" style={{ border: `1px solid ${T.border}`, color: T.fgMuted }}>
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.fgMuted }} />
            <input type="text" placeholder="Buscar en docs..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, backgroundColor: T.card, color: T.fg, outline: 'none' }} />
          </div>
          <nav className="space-y-1">
            {filtered.map(d => (
              <button key={d.id} onClick={() => setActiveDoc(d.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
                  borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left',
                  backgroundColor: activeDoc === d.id ? `${T.cyan}10` : 'transparent',
                  color: activeDoc === d.id ? T.cyan : T.fgMuted, fontWeight: activeDoc === d.id ? 600 : 400,
                }}>
                <span>{d.icon}</span>
                <span>{d.title}</span>
                {activeDoc === d.id && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 rounded-xl p-8" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, maxWidth: 800 }}>
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(current.content) }}
            style={{ fontSize: 14, lineHeight: 1.8, color: '#475569' }} />
        </div>
      </div>
    </div>
  )
}
