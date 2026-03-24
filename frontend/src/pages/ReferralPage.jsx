import { useState } from 'react'
import { Copy, Check, Mail, MessageSquare, Linkedin, Gift } from 'lucide-react'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const MOCK_REFERRALS = [
  { email: 'pablo@example.com', status: 'registered', date: '15/03/2026' },
  { email: 'maria@example.com', status: 'pending', date: '20/03/2026' },
  { email: 'carlos@example.com', status: 'pending', date: '22/03/2026' },
]

export default function ReferralPage() {
  const [copied, setCopied] = useState(false)
  const refLink = 'https://st4rtup.com/?ref=usr_demo123'

  function copyLink() {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const card = { padding: 24, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Gift size={28} color="#F5820B" />
        </div>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 800, color: '#1A1A2E', marginBottom: 8 }}>Programa de referidos</h1>
        <p style={{ color: '#64748B', fontSize: 16 }}>Invita a un amigo y ambos recibís <strong style={{ color: '#F5820B' }}>1 mes gratis</strong> de Growth</p>
      </div>

      {/* Referral link */}
      <div style={{ ...card, marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8 }}>Tu enlace de referido</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={refLink} readOnly style={{
            flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
            fontFamily: fontMono, fontSize: 13, color: '#1A1A2E', backgroundColor: '#F8FAFC',
          }} />
          <button onClick={copyLink} style={{
            padding: '10px 18px', borderRadius: 8, border: 'none',
            backgroundColor: copied ? '#10B981' : '#1E6FD9', color: 'white',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
          </button>
        </div>
        {/* Share buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {[
            { label: 'Email', icon: Mail, color: '#1E6FD9', href: `mailto:?subject=Prueba St4rtup&body=Regístrate con mi enlace: ${refLink}` },
            { label: 'WhatsApp', icon: MessageSquare, color: '#25D366', href: `https://wa.me/?text=Prueba St4rtup, el CRM para startups: ${refLink}` },
            { label: 'LinkedIn', icon: Linkedin, color: '#0077B5', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(refLink)}` },
          ].map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{
              padding: '8px 16px', borderRadius: 8, border: `1px solid ${s.color}30`,
              backgroundColor: `${s.color}08`, color: s.color, fontSize: 12, fontWeight: 600,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <s.icon size={14} /> {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Cómo funciona</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { step: '1', title: 'Comparte', desc: 'Envía tu enlace a un amigo o colega' },
            { step: '2', title: 'Se registra', desc: 'Tu amigo crea su cuenta en St4rtup' },
            { step: '3', title: 'Mes gratis', desc: 'Ambos recibís 1 mes gratis de Growth' },
          ].map(s => (
            <div key={s.step} style={{ textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontWeight: 800, fontFamily: fontDisplay, color: '#1E6FD9', fontSize: 16 }}>{s.step}</div>
              <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{s.title}</p>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Invitaciones enviadas', value: '3' },
          { label: 'Registros completados', value: '1' },
          { label: 'Meses gratis ganados', value: '1' },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, fontFamily: fontDisplay, color: '#1E6FD9', margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Referral list */}
      <div style={card}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Tus referidos</h3>
        {MOCK_REFERRALS.map(r => (
          <div key={r.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 14, color: '#1A1A2E' }}>{r.email}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 600,
                backgroundColor: r.status === 'registered' ? '#10B98115' : '#F5820B15',
                color: r.status === 'registered' ? '#10B981' : '#F5820B',
              }}>{r.status === 'registered' ? 'Registrado' : 'Pendiente'}</span>
              <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: fontMono }}>{r.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
