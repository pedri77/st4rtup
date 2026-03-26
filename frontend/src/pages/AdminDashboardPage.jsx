import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, Users, DollarSign, TrendingUp, Building2, Activity, UserPlus, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '@/services/api'

const T = { bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B', cyan: '#1E6FD9', success: '#10B981', warning: '#F59E0B', destructive: '#EF4444', purple: '#8B5CF6' }
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const PLAN_COLORS = { starter: '#94A3B8', growth: '#1E6FD9', scale: '#8B5CF6', enterprise: '#F59E0B' }

export default function AdminDashboardPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['admin', 'kpis'],
    queryFn: () => api.get('/admin/kpis').then(r => r.data),
    staleTime: 60000,
  })

  const { data: orgs } = useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: () => api.get('/admin/organizations').then(r => r.data),
    staleTime: 60000,
  })

  const { data: chart } = useQuery({
    queryKey: ['admin', 'revenue-chart'],
    queryFn: () => api.get('/admin/revenue-chart').then(r => r.data),
    staleTime: 300000,
  })

  const { data: signups } = useQuery({
    queryKey: ['admin', 'recent-signups'],
    queryFn: () => api.get('/admin/recent-signups').then(r => r.data),
    staleTime: 60000,
  })

  const { data: usage } = useQuery({
    queryKey: ['admin', 'feature-usage'],
    queryFn: () => api.get('/admin/feature-usage').then(r => r.data),
    staleTime: 300000,
  })

  const planData = kpis?.plans ? Object.entries(kpis.plans).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, fill: PLAN_COLORS[name] })).filter(d => d.value > 0) : []

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6" style={{ color: T.fg, fontFamily: fontDisplay }}>
        <Shield className="w-6 h-6" style={{ color: T.cyan }} /> Admin Dashboard
      </h1>

      {/* KPIs Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'MRR', value: `€${kpis?.mrr || 0}`, icon: DollarSign, color: T.success },
          { label: 'ARR', value: `€${kpis?.arr || 0}`, icon: TrendingUp, color: T.cyan },
          { label: 'Usuarios', value: kpis?.total_users || 0, icon: Users, color: T.purple },
          { label: 'Organizaciones', value: kpis?.total_orgs || 0, icon: Building2, color: T.warning },
          { label: 'Signups/mes', value: kpis?.signups_month || 0, icon: UserPlus, color: T.success },
          { label: 'Trials activos', value: kpis?.trials_active || 0, icon: Zap, color: T.warning },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-2">
              <k.icon size={14} color={k.color} />
              <span style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', letterSpacing: 1, fontFamily: fontMono }}>{k.label}</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: T.fg, fontFamily: fontMono }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Second row: Revenue chart + Plan distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16, fontFamily: fontDisplay }}>Revenue + Signups (6 meses)</h3>
          {chart?.data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.fgMuted }} />
                <YAxis tick={{ fontSize: 11, fill: T.fgMuted }} />
                <Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="revenue" fill={T.cyan} radius={[4, 4, 0, 0]} name="Revenue €" />
                <Bar dataKey="signups" fill={T.success} radius={[4, 4, 0, 0]} name="Signups" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: T.fgMuted, fontSize: 13, textAlign: 'center', padding: 40 }}>Sin datos de revenue todavía</p>
          )}
        </div>

        {/* Plan distribution */}
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16, fontFamily: fontDisplay }}>Distribución por plan</h3>
          {planData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                    {planData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {planData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: d.fill }} />
                    <span style={{ fontSize: 11, color: T.fgMuted }}>{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: T.fgMuted, fontSize: 13, textAlign: 'center', padding: 40 }}>Sin organizaciones</p>
          )}
        </div>
      </div>

      {/* Third row: Orgs table + Recent signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Organizations table */}
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Organizaciones ({orgs?.total || 0})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['Nombre', 'Plan', 'Users', 'Leads', 'Opps', 'Creada'].map(h => (
                    <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: T.fgMuted, fontWeight: 500, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(orgs?.items || []).map(o => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${T.muted}` }}>
                    <td style={{ padding: '8px 6px', color: T.fg, fontWeight: 500 }}>{o.name}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: `${PLAN_COLORS[o.plan] || T.fgMuted}15`, color: PLAN_COLORS[o.plan] || T.fgMuted, fontWeight: 600 }}>{o.plan}</span>
                    </td>
                    <td style={{ padding: '8px 6px', fontFamily: fontMono, color: T.fgMuted }}>{o.members}</td>
                    <td style={{ padding: '8px 6px', fontFamily: fontMono, color: T.fgMuted }}>{o.leads}</td>
                    <td style={{ padding: '8px 6px', fontFamily: fontMono, color: T.fgMuted }}>{o.opportunities}</td>
                    <td style={{ padding: '8px 6px', fontFamily: fontMono, color: T.fgMuted, fontSize: 10 }}>{o.created_at ? new Date(o.created_at).toLocaleDateString('es-ES') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent signups */}
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Últimos registros</h3>
          <div className="space-y-2">
            {(signups?.items || []).slice(0, 10).map(u => (
              <div key={u.id} className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: `1px solid ${T.muted}` }}>
                <div>
                  <p style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>{u.full_name || u.email}</p>
                  <p style={{ fontSize: 11, color: T.fgMuted }}>{u.email}</p>
                </div>
                <span style={{ fontSize: 10, color: T.fgMuted, fontFamily: fontMono }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : ''}</span>
              </div>
            ))}
            {(!signups?.items || signups.items.length === 0) && (
              <p style={{ color: T.fgMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>Sin registros todavía</p>
            )}
          </div>
        </div>
      </div>

      {/* Fourth row: Feature usage + Platform stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Feature usage */}
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Uso de features (30d)</h3>
          {(usage?.features || []).length > 0 ? (
            <div className="space-y-2">
              {usage.features.slice(0, 10).map((f, i) => {
                const max = usage.features[0]?.count || 1
                return (
                  <div key={f.feature} className="flex items-center gap-3">
                    <span style={{ fontSize: 11, color: T.fgMuted, width: 100, fontFamily: fontMono }}>{f.feature}</span>
                    <div style={{ flex: 1, height: 6, backgroundColor: T.muted, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(f.count / max) * 100}%`, height: '100%', backgroundColor: i < 3 ? T.cyan : T.fgMuted, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: fontMono, color: T.fg, width: 40, textAlign: 'right' }}>{f.count}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ color: T.fgMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>Sin datos de uso todavía</p>
          )}
        </div>

        {/* Platform stats */}
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Estadísticas globales</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Leads totales', value: kpis?.total_leads || 0 },
              { label: 'Oportunidades', value: kpis?.total_opportunities || 0 },
              { label: 'Emails enviados', value: kpis?.total_emails || 0 },
              { label: 'Orgs activas (7d)', value: kpis?.active_orgs_7d || 0 },
            ].map(s => (
              <div key={s.label} style={{ padding: 12, backgroundColor: T.muted, borderRadius: 10 }}>
                <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono, marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: T.fg, fontFamily: fontMono }}>{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
