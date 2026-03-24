import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, DollarSign, TrendingUp, AlertTriangle, BarChart3, PieChart } from 'lucide-react'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

// Mock data — connect to real API when backend is deployed
const MOCK = {
  mrr: 2850,
  totalUsers: 47,
  activeTrials: 12,
  churnRate: 3.2,
  signups: [3,5,2,4,6,3,7,4,5,8,3,6,4,7,5,3,4,6,8,5,3,4,7,5,6,4,3,5,7,4],
  plans: { starter: 22, growth: 15, scale: 8, enterprise: 2 },
  recentUsers: [
    { name: 'Laura Méndez', email: 'laura@techco.io', plan: 'growth', date: '24/03/2026', active: true },
    { name: 'Pablo Ruiz', email: 'pablo@scaleup.es', plan: 'starter', date: '23/03/2026', active: true },
    { name: 'Marta Gil', email: 'marta@founderos.com', plan: 'scale', date: '22/03/2026', active: true },
    { name: 'Diego Torres', email: 'diego@launchpad.io', plan: 'growth', date: '21/03/2026', active: false },
    { name: 'Carmen López', email: 'carmen@venturehq.es', plan: 'starter', date: '20/03/2026', active: true },
  ],
  featureUsage: [
    { name: 'Leads', usage: 94 }, { name: 'Pipeline', usage: 87 }, { name: 'Emails', usage: 76 },
    { name: 'Dashboard', usage: 71 }, { name: 'Acciones', usage: 63 }, { name: 'Marketing', usage: 45 },
    { name: 'SEO Center', usage: 38 }, { name: 'Agentes IA', usage: 32 }, { name: 'Llamadas IA', usage: 21 },
    { name: 'Deal Room', usage: 12 },
  ],
}

const PLAN_COLORS = { starter: '#64748B', growth: '#1E6FD9', scale: '#F5820B', enterprise: '#10B981' }

export default function AdminDashboardPage() {
  const d = MOCK

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />

      <h1 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 800, marginBottom: 24, color: '#1A1A2E' }}>Admin Dashboard</h1>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'MRR', value: `€${d.mrr.toLocaleString()}`, icon: DollarSign, color: '#10B981', delta: '+12%' },
          { label: 'Usuarios totales', value: d.totalUsers, icon: Users, color: '#1E6FD9', delta: '+8' },
          { label: 'Trials activos', value: d.activeTrials, icon: TrendingUp, color: '#F5820B', delta: '+3' },
          { label: 'Churn Rate', value: `${d.churnRate}%`, icon: AlertTriangle, color: '#EF4444', delta: '-0.5%' },
        ].map(k => (
          <div key={k.label} style={{ padding: 20, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#64748B', fontFamily: fontMono, textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</span>
              <k.icon size={18} color={k.color} />
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, fontFamily: fontDisplay, color: '#1A1A2E', margin: 0 }}>{k.value}</p>
            <span style={{ fontSize: 12, fontFamily: fontMono, color: k.color }}>{k.delta} este mes</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Signups chart */}
        <div style={{ padding: 20, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Registros últimos 30 días</h3>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 120 }}>
            {d.signups.map((v, i) => (
              <div key={i} style={{ flex: 1, height: `${(v / 8) * 100}%`, borderRadius: 3, backgroundColor: '#1E6FD9', opacity: 0.5 + (v / 16) }}>
                <title>Día {i + 1}: {v} registros</title>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8, fontFamily: fontMono }}>{d.signups.reduce((a, b) => a + b, 0)} registros en 30 días</p>
        </div>

        {/* Plan distribution */}
        <div style={{ padding: 20, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Distribución por plan</h3>
          {Object.entries(d.plans).map(([plan, count]) => {
            const pct = Math.round(count / d.totalUsers * 100)
            return (
              <div key={plan} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize', color: PLAN_COLORS[plan] }}>{plan}</span>
                  <span style={{ fontFamily: fontMono, color: '#64748B' }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, backgroundColor: '#F1F5F9' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, backgroundColor: PLAN_COLORS[plan], transition: 'width 0.5s' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent signups */}
        <div style={{ padding: 20, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Últimos registros</h3>
          {d.recentUsers.map(u => (
            <div key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#1A1A2E' }}>{u.name}</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{u.email}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, backgroundColor: `${PLAN_COLORS[u.plan]}15`, color: PLAN_COLORS[u.plan], fontWeight: 600, textTransform: 'capitalize' }}>{u.plan}</span>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0', fontFamily: fontMono }}>{u.date}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature usage */}
        <div style={{ padding: 20, borderRadius: 14, backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Uso de funcionalidades</h3>
          {d.featureUsage.map(f => (
            <div key={f.name} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span style={{ color: '#475569' }}>{f.name}</span>
                <span style={{ fontFamily: fontMono, color: '#64748B' }}>{f.usage}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: '#F1F5F9' }}>
                <div style={{ height: '100%', width: `${f.usage}%`, borderRadius: 3, background: `linear-gradient(90deg, #1E6FD9, #F5820B)`, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
