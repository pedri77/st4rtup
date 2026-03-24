import { Lock, Trophy } from 'lucide-react'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"

const BADGES = [
  { id: 'first_lead', name: 'Primer Lead', icon: '🎯', desc: 'Creaste tu primer lead', earned: true },
  { id: 'ten_leads', name: '10 Leads', icon: '📊', desc: 'Alcanzaste 10 leads', earned: true },
  { id: 'hundred_leads', name: '100 Leads', icon: '🚀', desc: 'Alcanzaste 100 leads', earned: false },
  { id: 'first_deal', name: 'Primer Deal', icon: '🤝', desc: 'Cerraste tu primer acuerdo', earned: true },
  { id: 'first_email', name: 'Primer Email', icon: '✉️', desc: 'Enviaste tu primer email', earned: false },
  { id: 'pipeline_pro', name: 'Pipeline Pro', icon: '📈', desc: 'Moviste 10 deals entre etapas', earned: false },
  { id: 'ai_explorer', name: 'Explorador IA', icon: '🤖', desc: 'Usaste los 4 agentes IA', earned: false },
  { id: 'seo_master', name: 'SEO Master', icon: '🔍', desc: 'Generaste 5 artículos con IA', earned: false },
  { id: 'automation_king', name: 'Rey Automatizaciones', icon: '⚡', desc: 'Activaste 10 automatizaciones', earned: false },
  { id: 'social_seller', name: 'Social Seller', icon: '💬', desc: 'Enviaste un mensaje por WhatsApp', earned: false },
  { id: 'week_streak', name: 'Racha Semanal', icon: '🔥', desc: 'Usaste St4rtup 7 días seguidos', earned: false },
  { id: 'referral_hero', name: 'Referral Hero', icon: '🎁', desc: 'Un amigo se registró con tu enlace', earned: false },
]

export default function BadgesPage() {
  const earned = BADGES.filter(b => b.earned).length

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Trophy size={24} color="#F5820B" />
        <h1 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 800, color: '#1A1A2E' }}>Logros</h1>
      </div>
      <p style={{ color: '#64748B', marginBottom: 32 }}>{earned} de {BADGES.length} logros desbloqueados</p>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', marginBottom: 32 }}>
        <div style={{ height: '100%', width: `${(earned / BADGES.length) * 100}%`, borderRadius: 4, background: 'linear-gradient(90deg, #1E6FD9, #F5820B)', transition: 'width 0.5s' }} />
      </div>

      {/* Badges grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {BADGES.map(b => (
          <div key={b.id} style={{
            padding: 20, borderRadius: 14, textAlign: 'center', position: 'relative',
            backgroundColor: b.earned ? 'white' : '#F8FAFC',
            border: b.earned ? '2px solid #F5820B' : '1px solid #E2E8F0',
            opacity: b.earned ? 1 : 0.6,
            transition: 'transform 0.2s',
          }}
            onMouseEnter={e => { if (b.earned) e.currentTarget.style.transform = 'scale(1.03)' }}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {!b.earned && (
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <Lock size={14} color="#CBD5E1" />
              </div>
            )}
            <span style={{ fontSize: 36, display: 'block', marginBottom: 8, filter: b.earned ? 'none' : 'grayscale(100%)' }}>{b.icon}</span>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 700, marginBottom: 4, color: b.earned ? '#1A1A2E' : '#94A3B8' }}>{b.name}</h3>
            <p style={{ fontSize: 12, color: b.earned ? '#64748B' : '#CBD5E1', margin: 0 }}>{b.desc}</p>
            {b.earned && <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, padding: '3px 10px', borderRadius: 6, backgroundColor: '#10B98115', color: '#10B981', fontWeight: 600 }}>Desbloqueado</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
