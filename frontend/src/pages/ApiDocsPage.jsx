import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Code, Key, Zap, Globe, ArrowRight, Copy, Check } from 'lucide-react'
import { useThemeColors, fontDisplay, fontMono } from '@/utils/theme'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Login', href: '/login' },
]

const ENDPOINTS = [
  {
    method: 'GET', path: '/api/v1/public/leads', desc: 'List all leads with pagination and filters.',
    rateLimit: '120/min', auth: true,
    examples: {
      curl: `curl -H "X-API-Key: your_api_key" \\
  https://api.st4rtup.com/api/v1/public/leads`,
      js: `const res = await fetch('https://api.st4rtup.com/api/v1/public/leads', {
  headers: { 'X-API-Key': 'your_api_key' }
})
const data = await res.json()`,
      python: `import requests

r = requests.get('https://api.st4rtup.com/api/v1/public/leads',
    headers={'X-API-Key': 'your_api_key'})
data = r.json()`,
    },
  },
  {
    method: 'GET', path: '/api/v1/public/leads/:id', desc: 'Get a single lead by ID with full details.',
    rateLimit: '600/min', auth: true,
    examples: {
      curl: `curl -H "X-API-Key: your_api_key" \\
  https://api.st4rtup.com/api/v1/public/leads/abc-123`,
      js: `const res = await fetch('https://api.st4rtup.com/api/v1/public/leads/abc-123', {
  headers: { 'X-API-Key': 'your_api_key' }
})
const lead = await res.json()`,
      python: `import requests

r = requests.get('https://api.st4rtup.com/api/v1/public/leads/abc-123',
    headers={'X-API-Key': 'your_api_key'})
lead = r.json()`,
    },
  },
  {
    method: 'POST', path: '/api/v1/public/leads', desc: 'Create a new lead. Returns the created lead object.',
    rateLimit: '20/min', auth: true,
    examples: {
      curl: `curl -X POST \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"company":"Acme","email":"cto@acme.com","status":"new"}' \\
  https://api.st4rtup.com/api/v1/public/leads`,
      js: `const res = await fetch('https://api.st4rtup.com/api/v1/public/leads', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    company: 'Acme',
    email: 'cto@acme.com',
    status: 'new',
  }),
})
const lead = await res.json()`,
      python: `import requests

r = requests.post('https://api.st4rtup.com/api/v1/public/leads',
    headers={'X-API-Key': 'your_api_key'},
    json={'company': 'Acme', 'email': 'cto@acme.com', 'status': 'new'})
lead = r.json()`,
    },
  },
  {
    method: 'GET', path: '/api/v1/public/pipeline/summary', desc: 'Get pipeline summary with stage counts and total values.',
    rateLimit: '60/min', auth: true,
    examples: {
      curl: `curl -H "X-API-Key: your_api_key" \\
  https://api.st4rtup.com/api/v1/public/pipeline/summary`,
      js: `const res = await fetch('https://api.st4rtup.com/api/v1/public/pipeline/summary', {
  headers: { 'X-API-Key': 'your_api_key' }
})
const summary = await res.json()`,
      python: `import requests

r = requests.get('https://api.st4rtup.com/api/v1/public/pipeline/summary',
    headers={'X-API-Key': 'your_api_key'})
summary = r.json()`,
    },
  },
  {
    method: 'GET', path: '/api/v1/public/docs', desc: 'Returns this documentation as JSON. No authentication required.',
    rateLimit: 'No limit', auth: false,
    examples: {
      curl: `curl https://api.st4rtup.com/api/v1/public/docs`,
      js: `const res = await fetch('https://api.st4rtup.com/api/v1/public/docs')
const docs = await res.json()`,
      python: `import requests

r = requests.get('https://api.st4rtup.com/api/v1/public/docs')
docs = r.json()`,
    },
  },
]

const WEBHOOK_EVENTS = [
  { event: 'lead.created', desc: 'Fired when a new lead is created.', payload: '{ "event": "lead.created", "data": { "id": "uuid", "company": "Acme", "email": "cto@acme.com", "status": "new" }, "timestamp": "2026-04-14T10:00:00Z" }' },
  { event: 'lead.updated', desc: 'Fired when a lead is updated.', payload: '{ "event": "lead.updated", "data": { "id": "uuid", "changes": { "status": ["new", "contacted"] } }, "timestamp": "..." }' },
  { event: 'opportunity.stage_changed', desc: 'Fired when an opportunity moves to a different stage.', payload: '{ "event": "opportunity.stage_changed", "data": { "id": "uuid", "from": "discovery", "to": "proposal" }, "timestamp": "..." }' },
  { event: 'opportunity.won', desc: 'Fired when a deal is marked as won.', payload: '{ "event": "opportunity.won", "data": { "id": "uuid", "value": 15000, "currency": "EUR" }, "timestamp": "..." }' },
  { event: 'opportunity.lost', desc: 'Fired when a deal is marked as lost.', payload: '{ "event": "opportunity.lost", "data": { "id": "uuid", "reason": "budget" }, "timestamp": "..." }' },
  { event: 'email.opened', desc: 'Fired when a tracked email is opened.', payload: '{ "event": "email.opened", "data": { "email_id": "uuid", "lead_id": "uuid", "opened_at": "..." }, "timestamp": "..." }' },
  { event: 'email.clicked', desc: 'Fired when a link in a tracked email is clicked.', payload: '{ "event": "email.clicked", "data": { "email_id": "uuid", "url": "https://..." }, "timestamp": "..." }' },
  { event: 'form.submitted', desc: 'Fired when a public form submission is received.', payload: '{ "event": "form.submitted", "data": { "form_id": "uuid", "fields": { "name": "...", "email": "..." } }, "timestamp": "..." }' },
  { event: 'call.completed', desc: 'Fired when an AI call is completed.', payload: '{ "event": "call.completed", "data": { "call_id": "uuid", "duration": 120, "outcome": "interested" }, "timestamp": "..." }' },
]

const METHOD_COLORS = {
  GET: { bg: '#10B981', label: '#ECFDF5' },
  POST: { bg: '#3B82F6', label: '#EFF6FF' },
  PUT: { bg: '#F59E0B', label: '#FFFBEB' },
  DELETE: { bg: '#EF4444', label: '#FEF2F2' },
}

const TAB_LABELS = { curl: 'cURL', js: 'JavaScript', python: 'Python' }

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const T = useThemeColors()
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} title="Copy to clipboard"
      style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.fgMuted, transition: 'all 0.2s' }}>
      {copied ? <><Check size={14} color={T.success} /> Copied</> : <><Copy size={14} /> Copy</>}
    </button>
  )
}

function CodeTabs({ examples }) {
  const [tab, setTab] = useState('curl')
  const T = useThemeColors()
  return (
    <div style={{ marginTop: 12, borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, backgroundColor: T.muted }}>
        {Object.keys(TAB_LABELS).map(k => (
          <button key={k} onClick={() => setTab(k)}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: tab === k ? 600 : 400, border: 'none', borderBottom: tab === k ? `2px solid ${T.primary}` : '2px solid transparent', background: 'none', color: tab === k ? T.fg : T.fgMuted, cursor: 'pointer', transition: 'all 0.15s' }}>
            {TAB_LABELS[k]}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative', padding: 16, backgroundColor: T.card }}>
        <CopyButton text={examples[tab]} />
        <pre style={{ fontFamily: fontMono, fontSize: 13, lineHeight: 1.6, color: T.fg, margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingRight: 80 }}>
          {examples[tab]}
        </pre>
      </div>
    </div>
  )
}

function Nav() {
  const T = useThemeColors()
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
        <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {NAV_LINKS.map(l => (
            <Link key={l.label} to={l.href} style={{ fontSize: 14, color: T.fgMuted, textDecoration: 'none', fontWeight: 500 }}>{l.label}</Link>
          ))}
          <Link to="/register" style={{ padding: '8px 20px', backgroundColor: T.primary, color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Get Started</Link>
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
            { title: 'Producto', links: [{ t: 'Features', h: '/#features' }, { t: 'Pricing', h: '/pricing' }, { t: 'API Docs', h: '/api-docs' }] },
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

function MethodBadge({ method }) {
  const colors = METHOD_COLORS[method] || METHOD_COLORS.GET
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: fontMono, backgroundColor: colors.bg, color: colors.label, letterSpacing: 0.5, minWidth: 52, textAlign: 'center' }}>
      {method}
    </span>
  )
}

function SectionHeading({ icon: Icon, title, id }) {
  const T = useThemeColors()
  return (
    <div id={id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${T.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={T.primary} />
      </div>
      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 700, color: T.fg, margin: 0 }}>{title}</h2>
    </div>
  )
}

export default function ApiDocsPage() {
  const T = useThemeColors()

  return (
    <div className="public-page" style={{ fontFamily: "'Inter', sans-serif", color: T.fg }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
      <Nav />

      {/* Hero */}
      <section style={{ padding: '80px 24px 60px', textAlign: 'center', background: 'linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, backgroundColor: `${T.primary}10`, marginBottom: 20 }}>
          <Code size={16} color={T.primary} />
          <span style={{ fontSize: 13, fontWeight: 600, color: T.primary }}>REST API v1</span>
        </div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, marginBottom: 16, lineHeight: 1.1, color: T.fg }}>
          St4rtup API Documentation
        </h1>
        <p style={{ fontSize: 17, color: T.fgMuted, maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Integrate your CRM data with any platform. Manage leads, track pipeline, and receive real-time webhook events.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#authentication" style={{ padding: '12px 24px', backgroundColor: T.primary, color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            Get your API Key <ArrowRight size={16} />
          </a>
          <a href="#endpoints" style={{ padding: '12px 24px', backgroundColor: T.card, color: T.fg, borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: `1px solid ${T.border}` }}>
            View Endpoints
          </a>
        </div>
      </section>

      {/* Quick nav */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 12, padding: '20px 0', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
          {[
            { label: 'Authentication', href: '#authentication', icon: Key },
            { label: 'Endpoints', href: '#endpoints', icon: Globe },
            { label: 'Webhooks', href: '#webhooks', icon: Zap },
            { label: 'Rate Limits', href: '#rate-limits', icon: Code },
          ].map(n => (
            <a key={n.label} href={n.href} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: T.fgMuted, textDecoration: 'none', backgroundColor: T.muted, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = T.primary }}
              onMouseLeave={e => { e.currentTarget.style.color = T.fgMuted }}>
              <n.icon size={14} /> {n.label}
            </a>
          ))}
        </div>
      </div>

      {/* Authentication */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
        <SectionHeading icon={Key} title="Authentication" id="authentication" />
        <p style={{ fontSize: 15, color: T.fgMuted, lineHeight: 1.7, marginBottom: 20 }}>
          All authenticated endpoints require an <code style={{ fontFamily: fontMono, fontSize: 13, padding: '2px 6px', borderRadius: 4, backgroundColor: T.muted }}>X-API-Key</code> header.
          You can generate API keys from the <strong>Settings &gt; API Keys</strong> section in your dashboard.
          Keys are scoped to your organization and can be revoked at any time.
        </p>
        <div style={{ borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', backgroundColor: T.muted, borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>Example Request Header</span>
          </div>
          <div style={{ padding: 16, backgroundColor: T.card, position: 'relative' }}>
            <CopyButton text='X-API-Key: sk_live_your_api_key_here' />
            <pre style={{ fontFamily: fontMono, fontSize: 13, color: T.fg, margin: 0, lineHeight: 1.6 }}>
{`GET /api/v1/public/leads HTTP/1.1
Host: api.st4rtup.com
X-API-Key: sk_live_your_api_key_here
Accept: application/json`}
            </pre>
          </div>
        </div>
        <div style={{ marginTop: 20, padding: 16, borderRadius: 10, backgroundColor: `${T.warning}10`, border: `1px solid ${T.warning}30`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18 }}>!</span>
          <p style={{ fontSize: 13, color: T.fg, margin: 0, lineHeight: 1.6 }}>
            <strong>Keep your API keys secret.</strong> Do not expose them in client-side code, public repositories, or browser requests. Use server-side code or environment variables.
          </p>
        </div>
      </section>

      {/* Endpoints */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 60px' }}>
        <SectionHeading icon={Globe} title="Endpoints" id="endpoints" />
        <p style={{ fontSize: 15, color: T.fgMuted, lineHeight: 1.7, marginBottom: 32 }}>
          Base URL: <code style={{ fontFamily: fontMono, fontSize: 13, padding: '2px 6px', borderRadius: 4, backgroundColor: T.muted }}>https://api.st4rtup.com</code>. All responses are JSON.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {ENDPOINTS.map((ep, i) => (
            <div key={i} style={{ borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', backgroundColor: T.muted, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <MethodBadge method={ep.method} />
                <code style={{ fontFamily: fontMono, fontSize: 14, fontWeight: 600, color: T.fg }}>{ep.path}</code>
                {ep.auth && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, backgroundColor: `${T.warning}20`, color: T.warning }}>
                    <Key size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />AUTH
                  </span>
                )}
              </div>
              <div style={{ padding: '16px 20px' }}>
                <p style={{ fontSize: 14, color: T.fgMuted, margin: '0 0 8px', lineHeight: 1.5 }}>{ep.desc}</p>
                <p style={{ fontSize: 12, color: T.fgMuted, margin: 0 }}>
                  Rate limit: <strong style={{ color: T.fg }}>{ep.rateLimit}</strong>
                </p>
                <CodeTabs examples={ep.examples} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Webhooks */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 60px' }}>
        <SectionHeading icon={Zap} title="Webhooks" id="webhooks" />
        <p style={{ fontSize: 15, color: T.fgMuted, lineHeight: 1.7, marginBottom: 12 }}>
          Configure webhook URLs in <strong>Settings &gt; Webhooks</strong>. All payloads are signed with HMAC-SHA256
          using your webhook secret. Verify the <code style={{ fontFamily: fontMono, fontSize: 13, padding: '2px 6px', borderRadius: 4, backgroundColor: T.muted }}>X-Webhook-Signature</code> header to ensure authenticity.
        </p>
        <p style={{ fontSize: 14, color: T.fgMuted, lineHeight: 1.7, marginBottom: 28 }}>
          We retry failed deliveries up to 5 times with exponential backoff (1s, 5s, 30s, 2min, 10min).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {WEBHOOK_EVENTS.map(w => (
            <WebhookCard key={w.event} {...w} />
          ))}
        </div>
      </section>

      {/* Rate Limits */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 80px' }}>
        <SectionHeading icon={Code} title="Rate Limits" id="rate-limits" />
        <p style={{ fontSize: 15, color: T.fgMuted, lineHeight: 1.7, marginBottom: 24 }}>
          Rate limits are applied per API key. When exceeded, the API returns <code style={{ fontFamily: fontMono, fontSize: 13, padding: '2px 6px', borderRadius: 4, backgroundColor: T.muted }}>429 Too Many Requests</code> with
          a <code style={{ fontFamily: fontMono, fontSize: 13, padding: '2px 6px', borderRadius: 4, backgroundColor: T.muted }}>Retry-After</code> header.
        </p>

        <div style={{ borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: T.muted }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: T.fg, borderBottom: `1px solid ${T.border}` }}>Endpoint</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: T.fg, borderBottom: `1px solid ${T.border}` }}>Method</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: T.fg, borderBottom: `1px solid ${T.border}` }}>Limit</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((ep, i) => (
                <tr key={i} style={{ borderBottom: i < ENDPOINTS.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <td style={{ padding: '10px 16px', fontFamily: fontMono, fontSize: 13, color: T.fgMuted }}>{ep.path}</td>
                  <td style={{ padding: '10px 16px' }}><MethodBadge method={ep.method} /></td>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: T.fg }}>{ep.rateLimit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 24, padding: 16, borderRadius: 10, backgroundColor: `${T.primary}08`, border: `1px solid ${T.primary}20` }}>
          <p style={{ fontSize: 13, color: T.fg, margin: 0, lineHeight: 1.6 }}>
            <strong>Need higher limits?</strong> Contact us at <a href="mailto:hello@st4rtup.com" style={{ color: T.primary, textDecoration: 'none', fontWeight: 600 }}>hello@st4rtup.com</a> to discuss enterprise rate limits for your use case.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function WebhookCard({ event, desc, payload }) {
  const [open, setOpen] = useState(false)
  const T = useThemeColors()
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '14px 20px', backgroundColor: T.card, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
        <Zap size={14} color={T.accent} />
        <code style={{ fontFamily: fontMono, fontSize: 13, fontWeight: 600, color: T.fg }}>{event}</code>
        <span style={{ fontSize: 13, color: T.fgMuted, flex: 1 }}>{desc}</span>
        <ArrowRight size={14} color={T.fgMuted} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding: 16, borderTop: `1px solid ${T.border}`, backgroundColor: T.muted, position: 'relative' }}>
          <CopyButton text={payload} />
          <p style={{ fontSize: 12, fontWeight: 600, color: T.fgMuted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Example Payload</p>
          <pre style={{ fontFamily: fontMono, fontSize: 12, color: T.fg, margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6, paddingRight: 80 }}>
            {payload}
          </pre>
        </div>
      )}
    </div>
  )
}
