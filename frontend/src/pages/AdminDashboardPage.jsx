import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Shield, Users, DollarSign, TrendingUp, Building2, Activity, UserPlus, Zap, Heart, AlertTriangle, Server, Mail, BarChart3, Eye, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '@/services/api'

const T = { bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B', cyan: '#1E6FD9', success: '#10B981', warning: '#F59E0B', destructive: '#EF4444', purple: '#8B5CF6' }
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const PLAN_COLORS = { starter: '#94A3B8', growth: '#1E6FD9', scale: '#8B5CF6', enterprise: '#F59E0B' }

const ADMIN_TABS = [
  { id: 'overview', label: 'Dashboard', icon: BarChart3 },
  { id: 'orgs', label: 'Organizaciones', icon: Building2 },
  { id: 'health', label: 'Salud', icon: Server },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'engagement', label: 'Engagement', icon: Activity },
  { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
]

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const [impersonateId, setImpersonateId] = useState(null)

  const setTab = (tab) => setSearchParams({ tab })

  const { data: kpis } = useQuery({ queryKey: ['admin', 'kpis'], queryFn: () => api.get('/admin/kpis').then(r => r.data), staleTime: 60000 })
  const { data: orgs } = useQuery({ queryKey: ['admin', 'organizations'], queryFn: () => api.get('/admin/organizations').then(r => r.data), staleTime: 60000 })
  const { data: chart } = useQuery({ queryKey: ['admin', 'revenue-chart'], queryFn: () => api.get('/admin/revenue-chart').then(r => r.data), staleTime: 300000 })
  const { data: signups } = useQuery({ queryKey: ['admin', 'recent-signups'], queryFn: () => api.get('/admin/recent-signups').then(r => r.data), staleTime: 60000 })
  const { data: usage } = useQuery({ queryKey: ['admin', 'feature-usage'], queryFn: () => api.get('/admin/feature-usage').then(r => r.data), staleTime: 300000 })
  const { data: health } = useQuery({ queryKey: ['admin', 'health'], queryFn: () => api.get('/admin/health').then(r => r.data), staleTime: 30000, enabled: activeTab === 'health' })
  const { data: emails } = useQuery({ queryKey: ['admin', 'emails'], queryFn: () => api.get('/admin/emails').then(r => r.data), staleTime: 60000, enabled: activeTab === 'emails' })
  const { data: engagement } = useQuery({ queryKey: ['admin', 'engagement'], queryFn: () => api.get('/admin/engagement').then(r => r.data), staleTime: 60000, enabled: activeTab === 'engagement' })
  const { data: alerts } = useQuery({ queryKey: ['admin', 'alerts'], queryFn: () => api.get('/admin/alerts').then(r => r.data), staleTime: 30000, enabled: activeTab === 'alerts' })
  const { data: impersonated } = useQuery({ queryKey: ['admin', 'impersonate', impersonateId], queryFn: () => api.post(`/admin/impersonate/${impersonateId}`).then(r => r.data), enabled: !!impersonateId })

  const planData = kpis?.plans ? Object.entries(kpis.plans).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, fill: PLAN_COLORS[name] })).filter(d => d.value > 0) : []

  return (
    <div className="-m-4 md:-m-8 min-h-screen flex" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Admin Sidebar */}
      <div style={{ width: 220, backgroundColor: T.card, borderRight: `1px solid ${T.border}`, padding: '20px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 16px', marginBottom: 24 }}>
          <div className="flex items-center gap-2">
            <Shield size={18} color={T.cyan} />
            <span style={{ fontSize: 15, fontWeight: 700, color: T.fg, fontFamily: fontDisplay }}>Admin Panel</span>
          </div>
          <p style={{ fontSize: 10, color: T.fgMuted, marginTop: 4 }}>Gestión de la plataforma</p>
        </div>
        <nav className="space-y-1" style={{ padding: '0 8px' }}>
          {ADMIN_TABS.map(tab => (
            <button key={tab.id} onClick={() => setTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left',
              backgroundColor: activeTab === tab.id ? `${T.cyan}10` : 'transparent',
              color: activeTab === tab.id ? T.cyan : T.fgMuted, fontWeight: activeTab === tab.id ? 600 : 400,
            }}>
              <tab.icon size={15} />
              {tab.label}
              {tab.id === 'alerts' && alerts?.total > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 10, backgroundColor: T.destructive, color: 'white', borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>{alerts.total}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: '16px', marginTop: 24, borderTop: `1px solid ${T.border}` }}>
          <Link to="/app/dashboard" style={{ fontSize: 12, color: T.fgMuted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronRight size={12} /> Volver al CRM
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: '100vh' }}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (<>
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <BarChart3 size={20} color={T.cyan} /> Dashboard
          </h1>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'MRR', value: `€${kpis?.mrr || 0}`, icon: DollarSign, color: T.success },
              { label: 'ARR', value: `€${kpis?.arr || 0}`, icon: TrendingUp, color: T.cyan },
              { label: 'Usuarios', value: kpis?.total_users || 0, icon: Users, color: T.purple },
              { label: 'Orgs', value: kpis?.total_orgs || 0, icon: Building2, color: T.warning },
              { label: 'Signups/mes', value: kpis?.signups_month || 0, icon: UserPlus, color: T.success },
              { label: 'Trials', value: kpis?.trials_active || 0, icon: Zap, color: T.warning },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <k.icon size={12} color={k.color} />
                  <span style={{ fontSize: 9, color: T.fgMuted, textTransform: 'uppercase', letterSpacing: 1, fontFamily: fontMono }}>{k.label}</span>
                </div>
                <p style={{ fontSize: 20, fontWeight: 700, color: T.fg, fontFamily: fontMono }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Revenue + Signups</h3>
              {chart?.data?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chart.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: T.fgMuted }} />
                    <YAxis tick={{ fontSize: 10, fill: T.fgMuted }} />
                    <Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="revenue" fill={T.cyan} radius={[3, 3, 0, 0]} name="Revenue €" />
                    <Bar dataKey="signups" fill={T.success} radius={[3, 3, 0, 0]} name="Signups" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: T.fgMuted, fontSize: 12, textAlign: 'center', padding: 30 }}>Sin datos</p>}
            </div>
            <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Planes</h3>
              {planData.length > 0 ? (<>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart><Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                    {planData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {planData.map(d => <div key={d.name} className="flex items-center gap-1"><div style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: d.fill }} /><span style={{ fontSize: 10, color: T.fgMuted }}>{d.name}: {d.value}</span></div>)}
                </div>
              </>) : <p style={{ color: T.fgMuted, fontSize: 12, textAlign: 'center', padding: 30 }}>Sin orgs</p>}
            </div>
          </div>

          {/* Recent signups + Feature usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Últimos registros</h3>
              {(signups?.items || []).slice(0, 8).map(u => (
                <div key={u.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${T.muted}` }}>
                  <div><p style={{ fontSize: 12, color: T.fg }}>{u.full_name || u.email}</p></div>
                  <span style={{ fontSize: 10, color: T.fgMuted, fontFamily: fontMono }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : ''}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Uso de features</h3>
              {(usage?.features || []).slice(0, 8).map((f, i) => (
                <div key={f.feature} className="flex items-center gap-2 mb-1.5">
                  <span style={{ fontSize: 10, color: T.fgMuted, width: 80, fontFamily: fontMono }}>{f.feature}</span>
                  <div style={{ flex: 1, height: 5, backgroundColor: T.muted, borderRadius: 3 }}>
                    <div style={{ width: `${(f.count / (usage.features[0]?.count || 1)) * 100}%`, height: '100%', backgroundColor: i < 3 ? T.cyan : T.fgMuted, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10, fontFamily: fontMono, color: T.fg, width: 30, textAlign: 'right' }}>{f.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ORGANIZATIONS TAB */}
        {activeTab === 'orgs' && (<>
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <Building2 size={20} color={T.cyan} /> Organizaciones ({orgs?.total || 0})
          </h1>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: `2px solid ${T.border}` }}>
                {['Nombre', 'Plan', 'Sector', 'Users', 'Leads', 'Opps', 'Creada', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: T.fgMuted, fontWeight: 500, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(orgs?.items || []).map(o => (
                  <tr key={o.id} style={{ borderBottom: `1px solid ${T.muted}` }}>
                    <td style={{ padding: '10px 12px', color: T.fg, fontWeight: 500 }}>{o.name}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: `${PLAN_COLORS[o.plan] || T.fgMuted}15`, color: PLAN_COLORS[o.plan] || T.fgMuted, fontWeight: 600 }}>{o.plan}</span></td>
                    <td style={{ padding: '10px 12px', color: T.fgMuted }}>{o.sector || '-'}</td>
                    <td style={{ padding: '10px 12px', fontFamily: fontMono, color: T.fgMuted }}>{o.members}</td>
                    <td style={{ padding: '10px 12px', fontFamily: fontMono, color: T.fgMuted }}>{o.leads}</td>
                    <td style={{ padding: '10px 12px', fontFamily: fontMono, color: T.fgMuted }}>{o.opportunities}</td>
                    <td style={{ padding: '10px 12px', fontFamily: fontMono, color: T.fgMuted, fontSize: 10 }}>{o.created_at ? new Date(o.created_at).toLocaleDateString('es-ES') : ''}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => setImpersonateId(o.id)} style={{ padding: '4px 10px', borderRadius: 6, backgroundColor: T.muted, border: 'none', fontSize: 10, color: T.cyan, cursor: 'pointer', fontWeight: 600 }}>
                        <Eye size={11} /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Impersonate modal */}
          {impersonateId && impersonated && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setImpersonateId(null)}>
              <div style={{ backgroundColor: T.card, borderRadius: 16, padding: 24, maxWidth: 500, width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: T.fg, marginBottom: 16, fontFamily: fontDisplay }}>{impersonated.org?.name}</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div style={{ padding: 10, backgroundColor: T.muted, borderRadius: 8 }}>
                    <p style={{ fontSize: 10, color: T.fgMuted }}>Plan</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: PLAN_COLORS[impersonated.org?.plan] || T.fg }}>{impersonated.org?.plan}</p>
                  </div>
                  <div style={{ padding: 10, backgroundColor: T.muted, borderRadius: 8 }}>
                    <p style={{ fontSize: 10, color: T.fgMuted }}>Sector</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>{impersonated.org?.sector || '-'}</p>
                  </div>
                  <div style={{ padding: 10, backgroundColor: T.muted, borderRadius: 8 }}>
                    <p style={{ fontSize: 10, color: T.fgMuted }}>Leads</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>{impersonated.stats?.leads}</p>
                  </div>
                  <div style={{ padding: 10, backgroundColor: T.muted, borderRadius: 8 }}>
                    <p style={{ fontSize: 10, color: T.fgMuted }}>Oportunidades</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: T.fg }}>{impersonated.stats?.opportunities}</p>
                  </div>
                </div>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: T.fg, marginBottom: 8 }}>Miembros ({impersonated.members?.length})</h4>
                {(impersonated.members || []).map((m, i) => (
                  <div key={i} className="flex justify-between py-1" style={{ borderBottom: `1px solid ${T.muted}` }}>
                    <span style={{ fontSize: 12, color: T.fg }}>{m.name || m.email}</span>
                    <span style={{ fontSize: 10, color: T.fgMuted }}>{m.role}</span>
                  </div>
                ))}
                {impersonated.org?.settings?.addons?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 600, color: T.fg, marginBottom: 6 }}>Add-ons activos</h4>
                    <div className="flex flex-wrap gap-2">
                      {impersonated.org.settings.addons.map(a => <span key={a} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, backgroundColor: '#10B98115', color: T.success }}>{a}</span>)}
                    </div>
                  </div>
                )}
                <button onClick={() => setImpersonateId(null)} style={{ marginTop: 16, width: '100%', padding: '8px', borderRadius: 8, backgroundColor: T.muted, border: 'none', fontSize: 12, color: T.fgMuted, cursor: 'pointer' }}>Cerrar</button>
              </div>
            </div>
          )}
        </>)}

        {/* HEALTH TAB */}
        {activeTab === 'health' && (<>
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <Server size={20} color={T.cyan} /> Salud del sistema
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'CPU', value: `${health?.cpu_percent || 0}%`, color: (health?.cpu_percent || 0) > 80 ? T.destructive : T.success },
              { label: 'RAM', value: `${health?.memory?.percent || 0}%`, sub: `${health?.memory?.used_gb || 0} / ${health?.memory?.total_gb || 0} GB`, color: (health?.memory?.percent || 0) > 80 ? T.destructive : T.success },
              { label: 'Disco', value: `${health?.disk?.percent || 0}%`, sub: `${health?.disk?.used_gb || 0} / ${health?.disk?.total_gb || 0} GB`, color: (health?.disk?.percent || 0) > 80 ? T.destructive : T.success },
            ].map(h => (
              <div key={h.label} className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 11, color: T.fgMuted, marginBottom: 8 }}>{h.label}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: h.color, fontFamily: fontMono }}>{h.value}</p>
                {h.sub && <p style={{ fontSize: 11, color: T.fgMuted, marginTop: 4 }}>{h.sub}</p>}
              </div>
            ))}
          </div>
          <div className="rounded-xl p-5 mt-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Servicios</h3>
            {Object.entries(health?.services || {}).map(([name, status]) => (
              <div key={name} className="flex items-center gap-3 py-2" style={{ borderBottom: `1px solid ${T.muted}` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: status === 'healthy' || status === 'active' ? T.success : T.destructive }} />
                <span style={{ fontSize: 13, color: T.fg }}>{name}</span>
                <span style={{ fontSize: 11, color: T.fgMuted, marginLeft: 'auto', fontFamily: fontMono }}>{status}</span>
              </div>
            ))}
          </div>
        </>)}

        {/* EMAILS TAB */}
        {activeTab === 'emails' && (<>
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <Mail size={20} color={T.cyan} /> Emails ({emails?.total_sent || 0} enviados)
          </h1>
          <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            {(emails?.by_day || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={emails.by_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.fgMuted }} />
                  <YAxis tick={{ fontSize: 10, fill: T.fgMuted }} />
                  <Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill={T.cyan} radius={[3, 3, 0, 0]} name="Emails" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ color: T.fgMuted, fontSize: 12, textAlign: 'center', padding: 40 }}>Sin datos de emails</p>}
          </div>
        </>)}

        {/* ENGAGEMENT TAB */}
        {activeTab === 'engagement' && (<>
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <Activity size={20} color={T.cyan} /> Engagement (últimos 7 días)
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Leads creados', value: engagement?.leads_7d || 0 },
              { label: 'Oportunidades', value: engagement?.opportunities_7d || 0 },
              { label: 'Acciones completadas', value: engagement?.actions_completed_7d || 0 },
              { label: 'Visitas', value: engagement?.visits_7d || 0 },
            ].map(e => (
              <div key={e.label} className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono, marginBottom: 4 }}>{e.label}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: T.fg, fontFamily: fontMono }}>{e.value}</p>
              </div>
            ))}
          </div>
        </>)}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (<>
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <AlertTriangle size={20} color={T.warning} /> Alertas ({alerts?.total || 0})
          </h1>
          {(alerts?.alerts || []).length > 0 ? (
            <div className="space-y-3">
              {alerts.alerts.map((a, i) => (
                <div key={i} className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: T.card, border: `1px solid ${a.severity === 'high' ? T.destructive : a.severity === 'warning' ? T.warning : T.border}30` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, backgroundColor: a.severity === 'high' ? T.destructive : a.severity === 'warning' ? T.warning : T.cyan }} />
                  <div>
                    <p style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>{a.message}</p>
                    <p style={{ fontSize: 10, color: T.fgMuted, marginTop: 2 }}>{a.type}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <Heart size={32} color={T.success} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: T.success, fontWeight: 600 }}>Sin alertas activas</p>
              <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 4 }}>Todo funciona correctamente</p>
            </div>
          )}
        </>)}

      </div>
    </div>
  )
}
