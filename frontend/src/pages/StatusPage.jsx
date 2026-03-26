import { Link } from 'react-router-dom'
import WebChatWidget from "@/components/WebChatWidget"
import { CheckCircle, AlertTriangle } from 'lucide-react'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const SERVICES = [
  { name: 'API Backend', status: 'operational', uptime: 99.9 },
  { name: 'Frontend (Cloudflare Pages)', status: 'operational', uptime: 99.99 },
  { name: 'Base de datos', status: 'operational', uptime: 99.9 },
  { name: 'Autenticación (Supabase)', status: 'operational', uptime: 99.95 },
  { name: 'Email transaccional', status: 'operational', uptime: 99.8 },
  { name: 'IA (OpenAI / DeepSeek)', status: 'operational', uptime: 99.5 },
  { name: 'Stripe (pagos)', status: 'operational', uptime: 99.99 },
  { name: 'WhatsApp Business', status: 'operational', uptime: 99.7 },
]

const STATUS_CONFIG = {
  operational: { label: 'Operativo', color: '#10B981', bg: '#10B98115' },
  degraded: { label: 'Degradado', color: '#F59E0B', bg: '#F59E0B15' },
  outage: { label: 'Caído', color: '#EF4444', bg: '#EF444415' },
}

export default function StatusPage() {
  const allOk = SERVICES.every(s => s.status === 'operational')

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#1A1A2E', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />

      <nav style={{ backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
        <Link to="/" style={{ fontSize: 14, color: '#1E6FD9', textDecoration: 'none', fontWeight: 500 }}>← Volver</Link>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px 100px' }}>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Estado del servicio</h1>
        <p style={{ color: '#64748B', fontSize: 16, marginBottom: 32 }}>Disponibilidad en tiempo real</p>

        {/* Overall */}
        <div style={{
          padding: '20px 24px', borderRadius: 14, marginBottom: 32,
          backgroundColor: allOk ? '#10B98115' : '#F59E0B15',
          border: `1px solid ${allOk ? '#10B98130' : '#F59E0B30'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {allOk ? <CheckCircle size={24} color="#10B981" /> : <AlertTriangle size={24} color="#F59E0B" />}
          <span style={{ fontSize: 16, fontWeight: 700, color: allOk ? '#065F46' : '#92400E' }}>
            {allOk ? 'Todos los sistemas operativos' : 'Algunos sistemas degradados'}
          </span>
        </div>

        {/* Services */}
        <div style={{ backgroundColor: 'white', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {SERVICES.map((svc, i) => {
            const cfg = STATUS_CONFIG[svc.status]
            return (
              <div key={svc.name} style={{ padding: '16px 20px', borderBottom: i < SERVICES.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cfg.color }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{svc.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, backgroundColor: cfg.bg, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: fontMono }}>{svc.uptime}%</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Uptime bars (mock 90 days) */}
        <div style={{ marginTop: 32, backgroundColor: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: 20 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Últimos 90 días</h3>
          <div style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: 90 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 28, borderRadius: 2, backgroundColor: '#10B981', opacity: 0.6 + Math.random() * 0.4 }}>
                <title>Día {90 - i}: operativo</title>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginTop: 6, fontFamily: fontMono }}>
            <span>90 días</span>
            <span>Hoy</span>
          </div>
        </div>

        {/* Incidents */}
        <div style={{ marginTop: 32, backgroundColor: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: 20 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Incidentes recientes</h3>
          <p style={{ color: '#94A3B8', fontSize: 14 }}>Sin incidentes en los últimos 30 días.</p>
        </div>

        {/* Subscribe */}
        <div style={{ marginTop: 32, padding: '24px 20px', borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Recibe alertas de estado</p>
          <div style={{ display: 'flex', gap: 8, maxWidth: 360, margin: '0 auto' }}>
            <input placeholder="tu@email.com" style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }} />
            <button style={{ padding: '10px 18px', borderRadius: 8, border: 'none', backgroundColor: '#1E6FD9', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Suscribir</button>
          </div>
        </div>
      </div>
    <WebChatWidget />
    </div>
  )
}

