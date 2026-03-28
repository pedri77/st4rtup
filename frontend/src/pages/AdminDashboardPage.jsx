import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Shield, Users, DollarSign, TrendingUp, Building2, Activity, UserPlus, Zap, Heart, AlertTriangle, Server, Mail, BarChart3, Eye, ChevronRight, FileText, RefreshCw, LogIn, ClipboardList } from 'lucide-react'
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
  { id: 'affiliates', label: 'Afiliados', icon: DollarSign },
  { id: 'costs', label: 'Costes', icon: TrendingUp },
  { id: 'logs', label: 'Logs', icon: Server },
  { id: 'audit', label: 'Audit Log', icon: ClipboardList },
  { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
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
  const { data: affDash } = useQuery({ queryKey: ['admin', 'affiliates-dash'], queryFn: () => api.get('/affiliates/admin/dashboard').then(r => r.data), staleTime: 60000, enabled: activeTab === 'affiliates' })
  const { data: affLinks, refetch: refetchAff } = useQuery({ queryKey: ['admin', 'affiliates-all'], queryFn: () => api.get('/affiliates/admin/all').then(r => r.data), staleTime: 60000, enabled: activeTab === 'affiliates' })
  const [affForm, setAffForm] = useState({ provider: '', display_name: '', affiliate_url: '', category: 'integration', commission_percent: 0, commission_type: 'one_time', notes: '' })
  const [showAffForm, setShowAffForm] = useState(false)
  const { data: costs, refetch: refetchCosts } = useQuery({ queryKey: ['admin', 'costs'], queryFn: () => api.get('/admin/costs').then(r => r.data), staleTime: 60000, enabled: activeTab === 'costs' })
  const [costForm, setCostForm] = useState({ name: '', provider: '', category: 'infrastructure', amount_eur: 0, billing_cycle: 'monthly', is_variable: false, notes: '' })
  const [showCostForm, setShowCostForm] = useState(false)
  // Logs: WebSocket real-time with HTTP fallback
  const { data: logsHttp } = useQuery({ queryKey: ['admin', 'logs'], queryFn: () => api.get('/admin/logs?lines=100').then(r => r.data), staleTime: 15000, enabled: activeTab === 'logs' })
  const [wsLines, setWsLines] = useState([])
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)
  useEffect(() => {
    if (activeTab !== 'logs') { if (wsRef.current) { wsRef.current.close(); wsRef.current = null; setWsConnected(false) } return }
    const token = document.cookie.match(/sb-.*-auth-token=([^;]+)/)?.[1] || localStorage.getItem('sb-ufwjtzvfclnmbskemdjp-auth-token')
    let accessToken = ''
    try { const parsed = JSON.parse(token || '{}'); accessToken = parsed?.access_token || parsed?.[0]?.access_token || '' } catch { accessToken = token || '' }
    if (!accessToken) return
    const wsUrl = (import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1').replace(/^http/, 'ws').replace('/api/v1', '') + `/ws/logs?token=${accessToken}`
    try {
      const ws = new WebSocket(wsUrl)
      ws.onopen = () => { setWsConnected(true); setWsLines([]) }
      ws.onmessage = (e) => { if (e.data) setWsLines(prev => [...prev.slice(-200), e.data]) }
      ws.onclose = () => setWsConnected(false)
      ws.onerror = () => setWsConnected(false)
      wsRef.current = ws
    } catch { setWsConnected(false) }
    return () => { if (wsRef.current) { wsRef.current.close(); wsRef.current = null } }
  }, [activeTab])
  const logs = wsConnected ? { lines: wsLines, errors: wsLines.filter(l => /error|exception/i.test(l) && !/\b[2-3]\d\d\b/.test(l)).length, error_lines: wsLines.filter(l => /error|exception|traceback/i.test(l) && !/\b[2-3]\d\d\b/.test(l)) } : logsHttp
  const { data: auditLog } = useQuery({ queryKey: ['admin', 'audit-log'], queryFn: () => api.get('/audit-global/').then(r => r.data).catch(() => []), staleTime: 30000, enabled: activeTab === 'audit' })
  const { data: onbStatus } = useQuery({ queryKey: ['admin', 'onboarding-status'], queryFn: () => api.get('/admin/onboarding-status').then(r => r.data), staleTime: 60000, enabled: activeTab === 'onboarding' })
  const { data: impersonated } = useQuery({ queryKey: ['admin', 'impersonate', impersonateId], queryFn: () => api.post(`/admin/impersonate/${impersonateId}`).then(r => r.data), enabled: !!impersonateId })
  const [orgMetricsId, setOrgMetricsId] = useState(null)
  const { data: orgMetrics } = useQuery({ queryKey: ['admin', 'org-metrics', orgMetricsId], queryFn: () => api.get(`/admin/org/${orgMetricsId}/metrics`).then(r => r.data), enabled: !!orgMetricsId, staleTime: 60000 })

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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
              <BarChart3 size={20} color={T.cyan} /> Dashboard
            </h1>
            <button onClick={() => {
              import('@/utils/exportPdf').then(({ exportToPDF }) => {
                const sections = []
                sections.push({ heading: 'Admin KPIs', type: 'metrics', data: [
                  { label: 'Usuarios', value: kpis?.total_users || 0, color: T.cyan },
                  { label: 'Organizaciones', value: kpis?.total_orgs || 0, color: T.purple },
                  { label: 'MRR', value: `€${kpis?.mrr || 0}`, color: T.success },
                  { label: 'ARR', value: `€${kpis?.arr || 0}`, color: T.warning },
                  { label: 'Signups 7d', value: kpis?.signups_7d || 0, color: T.cyan },
                  { label: 'Trials activos', value: kpis?.active_trials || 0, color: T.destructive },
                ] })
                // Orgs table
                if (orgs?.items?.length > 0) {
                  sections.push({ heading: 'Organizaciones', type: 'table', data: {
                    headers: [{ key: 'name', label: 'Nombre' }, { key: 'plan', label: 'Plan' }, { key: 'users', label: 'Usuarios' }, { key: 'leads', label: 'Leads' }],
                    rows: orgs.items.slice(0, 20).map(o => ({ name: o.name, plan: o.plan, users: o.users, leads: o.leads })),
                  }})
                }
                // Revenue chart
                if (chart?.months?.length > 0) {
                  sections.push({ heading: 'Revenue Mensual', type: 'table', data: {
                    headers: [{ key: 'month', label: 'Mes' }, { key: 'revenue', label: 'Revenue (€)' }, { key: 'signups', label: 'Signups' }],
                    rows: chart.months.map(m => ({ month: m.month, revenue: m.revenue, signups: m.signups })),
                  }})
                }
                // Alerts
                if (alerts?.alerts?.length > 0) {
                  sections.push({ heading: 'Alertas Activas', type: 'table', data: {
                    headers: [{ key: 'type', label: 'Tipo' }, { key: 'severity', label: 'Severidad' }, { key: 'message', label: 'Mensaje' }],
                    rows: alerts.alerts.map(a => ({ type: a.type, severity: a.severity, message: a.message })),
                  }})
                }
                exportToPDF('Informe Admin — St4rtup', sections)
              })
            }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted, fontFamily: fontDisplay, cursor: 'pointer' }}>
              <FileText size={14} /> Exportar PDF
            </button>
          </div>

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
                    <defs>
                      <linearGradient id="gradCyanRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={T.cyan} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={T.cyan} stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="gradSuccessRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={T.success} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={T.success} stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: T.fgMuted }} />
                    <YAxis tick={{ fontSize: 10, fill: T.fgMuted }} />
                    <Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="revenue" fill="url(#gradCyanRevenue)" radius={[6, 6, 0, 0]} name="Revenue €" />
                    <Bar dataKey="signups" fill="url(#gradSuccessRevenue)" radius={[6, 6, 0, 0]} name="Signups" />
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
                      <div className="flex gap-1">
                        <button onClick={() => setImpersonateId(o.id)} style={{ padding: '4px 8px', borderRadius: 6, backgroundColor: T.muted, border: 'none', fontSize: 10, color: T.cyan, cursor: 'pointer', fontWeight: 600 }} title="Ver detalles">
                          <Eye size={11} />
                        </button>
                        <button onClick={() => setOrgMetricsId(o.id)} style={{ padding: '4px 8px', borderRadius: 6, backgroundColor: `${T.purple}10`, border: 'none', fontSize: 10, color: T.purple, cursor: 'pointer', fontWeight: 600 }} title="Métricas 30d">
                          <BarChart3 size={11} />
                        </button>
                      </div>
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
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button onClick={async () => {
                    try {
                      const res = await api.post(`/admin/impersonate/${impersonateId}/login`)
                      const { token } = res.data
                      window.open(`${window.location.origin}/app?impersonate_token=${token}`, '_blank')
                    } catch (err) {
                      alert('Error: ' + (err.response?.data?.detail || err.message))
                    }
                  }} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'linear-gradient(135deg, #F5820B, #F59E0B)', border: 'none', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <LogIn size={14} /> Entrar como usuario
                  </button>
                  <button onClick={() => setImpersonateId(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, backgroundColor: T.muted, border: 'none', fontSize: 12, color: T.fgMuted, cursor: 'pointer' }}>Cerrar</button>
                </div>
              </div>
            </div>
          )}

          {/* Org Metrics Modal */}
          {orgMetricsId && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setOrgMetricsId(null)}>
              <div style={{ backgroundColor: T.card, borderRadius: 16, padding: 24, maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: T.fg, marginBottom: 16, fontFamily: fontDisplay }}>
                  <BarChart3 size={18} color={T.purple} style={{ display: 'inline', marginRight: 8 }} />
                  Métricas 30 días
                </h3>
                {orgMetrics ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {Object.entries(orgMetrics).filter(([k]) => typeof orgMetrics[k] === 'number').map(([key, val]) => (
                      <div key={key} className="rounded-lg p-3" style={{ backgroundColor: T.muted }}>
                        <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>{key.replace(/_/g, ' ')}</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color: T.fg, fontFamily: fontMono }}>{typeof val === 'number' && val > 100 ? val.toLocaleString('es-ES') : val}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', padding: 20, color: T.fgMuted }}>Cargando métricas...</p>
                )}
                <button onClick={() => setOrgMetricsId(null)} style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, backgroundColor: T.muted, border: 'none', fontSize: 12, color: T.fgMuted, cursor: 'pointer' }}>Cerrar</button>
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
                  <defs>
                    <linearGradient id="gradCyanEmails" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.cyan} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={T.cyan} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.fgMuted }} />
                  <YAxis tick={{ fontSize: 10, fill: T.fgMuted }} />
                  <Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" fill="url(#gradCyanEmails)" radius={[6, 6, 0, 0]} name="Emails" />
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

        {/* COSTS TAB */}
        {activeTab === 'costs' && (<>
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <TrendingUp size={20} color={T.destructive} /> Costes de la Plataforma
          </h1>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>Coste mensual</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: T.destructive, fontFamily: fontMono }}>€{costs?.estimated_monthly_eur || 0}</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>Coste anual estimado</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: T.warning, fontFamily: fontMono }}>€{((costs?.estimated_monthly_eur || 0) * 12).toFixed(0)}</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>MRR - Costes</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: (kpis?.mrr || 0) - (costs?.estimated_monthly_eur || 0) >= 0 ? T.success : T.destructive, fontFamily: fontMono }}>€{((kpis?.mrr || 0) - (costs?.estimated_monthly_eur || 0)).toFixed(2)}</p>
            </div>
          </div>

          {/* Costs table */}
          <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: 13, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>Gastos ({costs?.total || 0})</h3>
              <button onClick={() => setShowCostForm(!showCostForm)} style={{ padding: '6px 14px', borderRadius: 8, backgroundColor: T.cyan, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                + Nuevo gasto
              </button>
            </div>

            {showCostForm && (
              <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <input placeholder="Nombre (ej: Hetzner VPS)" value={costForm.name} onChange={e => setCostForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none' }} />
                  <input placeholder="Proveedor (ej: Hetzner)" value={costForm.provider} onChange={e => setCostForm(f => ({ ...f, provider: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none' }} />
                  <input type="number" step="0.01" placeholder="Importe €" value={costForm.amount_eur} onChange={e => setCostForm(f => ({ ...f, amount_eur: parseFloat(e.target.value) || 0 }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none' }} />
                  <select value={costForm.category} onChange={e => setCostForm(f => ({ ...f, category: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12 }}>
                    <option value="infrastructure">Infraestructura</option>
                    <option value="saas">SaaS / API</option>
                    <option value="domain">Dominio</option>
                    <option value="marketing">Marketing</option>
                    <option value="other">Otro</option>
                  </select>
                  <select value={costForm.billing_cycle} onChange={e => setCostForm(f => ({ ...f, billing_cycle: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12 }}>
                    <option value="monthly">Mensual</option>
                    <option value="annual">Anual</option>
                    <option value="one_time">Pago único</option>
                    <option value="variable">Variable</option>
                  </select>
                  <input placeholder="Notas" value={costForm.notes} onChange={e => setCostForm(f => ({ ...f, notes: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none' }} />
                </div>
                <button onClick={async () => {
                  if (!costForm.name || !costForm.provider) return
                  await api.post('/admin/costs/create', null, { params: costForm })
                  setShowCostForm(false)
                  setCostForm({ name: '', provider: '', category: 'infrastructure', amount_eur: 0, billing_cycle: 'monthly', is_variable: false, notes: '' })
                  refetchCosts()
                }} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: T.success, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Guardar
                </button>
                <button onClick={() => setShowCostForm(false)} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}`, fontSize: 12, cursor: 'pointer', marginLeft: 8 }}>
                  Cancelar
                </button>
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: `2px solid ${T.border}` }}>
                {['Nombre', 'Proveedor', 'Categoría', 'Importe', 'Ciclo', 'Notas', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.fgMuted, fontWeight: 500, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(costs?.items || []).map(c => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.muted}` }}>
                    <td style={{ padding: '8px 10px', fontWeight: 500, color: T.fg }}>{c.name}</td>
                    <td style={{ padding: '8px 10px', color: T.fgMuted }}>{c.provider}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: T.muted, color: T.fgMuted }}>{c.category}</span>
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: fontMono, fontWeight: 700, color: T.destructive }}>€{(c.amount_eur || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11, color: T.fgMuted }}>{c.billing_cycle}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11, color: T.fgMuted }}>{c.notes || '-'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={async () => { await api.delete(`/admin/costs/${c.id}`); refetchCosts() }} style={{ fontSize: 10, color: T.destructive, background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>)}

        {/* LOGS TAB — Real-time polling */}
        {activeTab === 'logs' && (<>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
              <Server size={20} color={T.warning} /> Logs del sistema ({logs?.errors || 0} errores)
            </h1>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: wsConnected ? T.success : T.warning }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: wsConnected ? T.success : T.warning }} />
                {wsConnected ? 'WebSocket en vivo' : 'Polling 15s'}
              </span>
            </div>
          </div>
          {logs?.error_lines?.length > 0 && (
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: T.destructive, marginBottom: 8 }}>Errores recientes ({logs.error_lines.length})</h3>
              {logs.error_lines.map((l, i) => (
                <p key={i} style={{ fontSize: 11, fontFamily: fontMono, color: T.destructive, marginBottom: 2, padding: '3px 6px', borderRadius: 4, backgroundColor: i % 2 === 0 ? '#FEE2E220' : 'transparent' }}>{l}</p>
              ))}
            </div>
          )}
          <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div style={{ maxHeight: 600, overflowY: 'auto', fontFamily: fontMono, fontSize: 11, color: T.fgMuted, lineHeight: 1.6 }}>
              {(logs?.lines || []).map((l, i) => {
                const isError = /(?:error|exception|traceback|critical)/i.test(l) && !/\b[2-3]\d\d\b/.test(l)
                const isWarning = /warn/i.test(l)
                return (
                  <div key={i} style={{
                    padding: '3px 6px', borderBottom: `1px solid ${T.muted}`,
                    backgroundColor: isError ? '#FEF2F210' : isWarning ? '#FFF7ED10' : 'transparent',
                    color: isError ? T.destructive : isWarning ? T.warning : T.fgMuted,
                    fontWeight: isError ? 600 : 400,
                  }}>{l}</div>
                )
              })}
              {(!logs?.lines || logs.lines.length === 0) && <p style={{ textAlign: 'center', padding: 20, color: T.fgMuted }}>Sin logs disponibles</p>}
            </div>
          </div>
        </>)}

        {/* AUDIT LOG TAB */}
        {activeTab === 'audit' && (<>
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <ClipboardList size={20} color={T.purple} /> Audit Log
          </h1>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: `2px solid ${T.border}` }}>
                {['Fecha', 'Usuario', 'Acción', 'Recurso', 'Detalles'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.fgMuted, fontWeight: 500, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(Array.isArray(auditLog) ? auditLog : auditLog?.items || []).slice(0, 100).map((entry, i) => {
                  const actionColor = /delete|remove/i.test(entry.action) ? T.destructive : /create|add/i.test(entry.action) ? T.success : /update|edit/i.test(entry.action) ? T.warning : T.fgMuted
                  return (
                    <tr key={entry.id || i} style={{ borderBottom: `1px solid ${T.muted}` }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = T.muted}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '8px 10px', fontFamily: fontMono, fontSize: 10, color: T.fgMuted, whiteSpace: 'nowrap' }}>
                        {entry.created_at ? new Date(entry.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 11, color: T.fg }}>{entry.user_email || entry.actor || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, backgroundColor: `${actionColor}12`, color: actionColor, fontWeight: 600 }}>{entry.action}</span>
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 11, color: T.fg }}>{entry.resource_type || entry.entity_type || '—'}</td>
                      <td style={{ padding: '8px 10px', fontSize: 10, color: T.fgMuted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {typeof entry.details === 'object' ? JSON.stringify(entry.details) : entry.details || entry.description || '—'}
                      </td>
                    </tr>
                  )
                })}
                {(!auditLog || (Array.isArray(auditLog) ? auditLog : auditLog?.items || []).length === 0) && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: T.fgMuted, fontFamily: fontMono }}>Sin registros de auditoría</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>)}

        {/* ONBOARDING TAB */}
        {activeTab === 'onboarding' && (<>
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <UserPlus size={20} color={T.success} /> Progreso Onboarding ({onbStatus?.total || 0} orgs)
          </h1>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: `2px solid ${T.border}` }}>
                {['Organización', 'Plan', 'Progreso', 'Leads', 'Opps', 'Email', 'Sector', 'Pago', 'Creada'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.fgMuted, fontWeight: 500, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(onbStatus?.items || []).map(o => (
                  <tr key={o.org_id} style={{ borderBottom: `1px solid ${T.muted}` }}>
                    <td style={{ padding: '8px 10px', fontWeight: 500, color: T.fg }}>{o.name}</td>
                    <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: `${PLAN_COLORS[o.plan] || T.fgMuted}15`, color: PLAN_COLORS[o.plan] || T.fgMuted, fontWeight: 600 }}>{o.plan}</span></td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 60, height: 5, backgroundColor: T.muted, borderRadius: 3 }}>
                          <div style={{ width: `${(o.steps_done / o.total_steps) * 100}%`, height: '100%', backgroundColor: o.steps_done === o.total_steps ? T.success : T.cyan, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, fontFamily: fontMono, color: T.fgMuted }}>{o.steps_done}/{o.total_steps}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{o.has_leads ? '✅' : '❌'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{o.has_opps ? '✅' : '❌'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{o.has_emails ? '✅' : '❌'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{o.has_sector ? '✅' : '❌'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{o.has_payment ? '✅' : '❌'}</td>
                    <td style={{ padding: '8px 10px', fontFamily: fontMono, color: T.fgMuted, fontSize: 10 }}>{o.created_at ? new Date(o.created_at).toLocaleDateString('es-ES') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>)}

        {/* AFFILIATES TAB */}
        {activeTab === 'affiliates' && (<>
          <h1 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <DollarSign size={20} color={T.success} /> Programa de Afiliados
          </h1>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Clicks totales', value: affDash?.total_clicks || 0, color: T.cyan },
              { label: 'Conversiones', value: affDash?.total_conversions || 0, color: T.success },
              { label: 'Revenue', value: `€${(affDash?.total_revenue || 0).toFixed(2)}`, color: T.warning },
              { label: 'Tasa conversión', value: `${affDash?.conversion_rate || 0}%`, color: T.purple },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>{k.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: fontMono }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Clicks chart */}
          {(affDash?.clicks_by_day || []).length > 0 && (
            <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: T.fg, marginBottom: 12, fontFamily: fontDisplay }}>Clicks por día</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={affDash.clicks_by_day}>
                  <defs>
                    <linearGradient id="gradCyanClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.cyan} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={T.cyan} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.fgMuted }} />
                  <YAxis tick={{ fontSize: 10, fill: T.fgMuted }} />
                  <Tooltip contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="clicks" fill="url(#gradCyanClicks)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Provider stats table */}
          <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: 13, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>Enlaces por proveedor ({affLinks?.total || 0})</h3>
              <button onClick={() => setShowAffForm(!showAffForm)} style={{ padding: '6px 14px', borderRadius: 8, backgroundColor: T.cyan, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                + Nuevo enlace
              </button>
            </div>

            {/* Create form */}
            {showAffForm && (
              <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <input placeholder="Proveedor (ej: stripe)" value={affForm.provider} onChange={e => setAffForm(f => ({ ...f, provider: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none' }} />
                  <input placeholder="Nombre visible" value={affForm.display_name} onChange={e => setAffForm(f => ({ ...f, display_name: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none' }} />
                  <input placeholder="URL afiliado" value={affForm.affiliate_url} onChange={e => setAffForm(f => ({ ...f, affiliate_url: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none' }} />
                  <input type="number" placeholder="Comisión %" value={affForm.commission_percent} onChange={e => setAffForm(f => ({ ...f, commission_percent: parseFloat(e.target.value) || 0 }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none' }} />
                  <select value={affForm.commission_type} onChange={e => setAffForm(f => ({ ...f, commission_type: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12 }}>
                    <option value="one_time">One-time</option>
                    <option value="recurring">Recurrente</option>
                  </select>
                  <select value={affForm.category} onChange={e => setAffForm(f => ({ ...f, category: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12 }}>
                    <option value="integration">Integración</option>
                    <option value="tool">Herramienta</option>
                    <option value="service">Servicio</option>
                  </select>
                </div>
                <input placeholder="Notas" value={affForm.notes} onChange={e => setAffForm(f => ({ ...f, notes: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, outline: 'none', marginBottom: 8 }} />
                <button onClick={async () => {
                  if (!affForm.provider || !affForm.affiliate_url) return
                  await api.post('/affiliates/admin/create', null, { params: affForm })
                  setShowAffForm(false)
                  setAffForm({ provider: '', display_name: '', affiliate_url: '', category: 'integration', commission_percent: 0, commission_type: 'one_time', notes: '' })
                  refetchAff()
                }} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: T.success, color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Guardar
                </button>
                <button onClick={() => { setShowAffForm(false); setAffForm({ provider: '', display_name: '', affiliate_url: '', category: 'integration', commission_percent: 0, commission_type: 'one_time', notes: '' }) }} style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}`, fontSize: 12, cursor: 'pointer', marginLeft: 8 }}>
                  Cancelar
                </button>
              </div>
            )}

            {/* Links table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: `2px solid ${T.border}` }}>
                {['Proveedor', 'Comisión', 'Clicks', 'Conv.', 'Revenue', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: T.fgMuted, fontWeight: 500, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(affLinks?.items || []).map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${T.muted}` }}>
                    <td style={{ padding: '8px 10px' }}>
                      <p style={{ fontWeight: 600, color: T.fg }}>{l.display_name}</p>
                      <p style={{ fontSize: 10, color: T.fgMuted }}>{l.provider}</p>
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: fontMono, color: T.fg }}>{l.commission_percent}% <span style={{ fontSize: 9, color: T.fgMuted }}>{l.commission_type}</span></td>
                    <td style={{ padding: '8px 10px', fontFamily: fontMono, color: T.cyan, fontWeight: 600 }}>{l.clicks}</td>
                    <td style={{ padding: '8px 10px', fontFamily: fontMono, color: T.success }}>{l.conversions}</td>
                    <td style={{ padding: '8px 10px', fontFamily: fontMono, color: T.warning, fontWeight: 600 }}>€{(l.revenue_eur || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: l.is_active ? '#10B98115' : '#EF444415', color: l.is_active ? T.success : T.destructive }}>{l.is_active ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={async () => {
                        await api.delete(`/affiliates/admin/${l.id}`)
                        refetchAff()
                      }} style={{ fontSize: 10, color: T.destructive, background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>)}

      </div>
    </div>
  )
}
