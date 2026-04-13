import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  CalendarDays, AlertTriangle, Clock, Users, TrendingUp,
  Mail, CheckSquare, GitBranch, ChevronRight, Star, MapPin
} from 'lucide-react'
import { actionsApi, visitsApi, leadsApi, opportunitiesApi, dashboardApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'


/* ── Design tokens ─────────────────────────────────────────────────── */


const priorityColors = {
  high: T.destructive,
  critical: T.destructive,
  medium: T.warning,
  low: T.fgMuted,
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos dias'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function SectionHeader({ icon: Icon, title, count, accentColor = T.cyan }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-5 h-5" style={{ color: accentColor }} />
      <h2 className="text-lg font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>
        {title}
      </h2>
      {count != null && (
        <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
          {count}
        </span>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color = T.cyan }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: T.fgMuted }}>{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color }}>{value}</p>
    </div>
  )
}

function ActionCard({ action, isOverdue }) {
  const accent = isOverdue ? T.destructive : (priorityColors[action.priority] || T.fgMuted)
  return (
    <div className="rounded-lg p-3 flex items-start gap-3 transition-colors hover:brightness-110"
      style={{ backgroundColor: T.muted, borderLeft: `3px solid ${accent}` }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: T.fg }}>{action.title}</p>
        <div className="flex items-center gap-2 mt-1">
          {action.lead_company && (
            <span className="text-xs" style={{ color: T.fgMuted }}>{action.lead_company}</span>
          )}
          {action.due_date && (
            <span className="text-xs" style={{ color: isOverdue ? T.destructive : T.fgMuted }}>
              {new Date(action.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
      {action.priority && (
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${accent}20`, color: accent }}>
          {action.priority}
        </span>
      )}
    </div>
  )
}

export default function MyDayPage() {
  const T = useThemeColors()
  const { user } = useAuth()
  const userName = user?.email?.split('@')[0] || 'usuario'
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1)

  // Fetch actions due today
  const { data: todayActions } = useQuery({
    queryKey: ['my-day', 'actions-today'],
    queryFn: async () => {
      try {
        const res = await actionsApi.list({ due_today: true })
        return res.data?.items || []
      } catch { return [] }
    },
  })

  // Fetch overdue actions
  const { data: overdueActions } = useQuery({
    queryKey: ['my-day', 'actions-overdue'],
    queryFn: async () => {
      try {
        const res = await actionsApi.list({ overdue: true })
        return res.data?.items || []
      } catch { return [] }
    },
  })

  // Fetch upcoming visits (next 3 days)
  const { data: upcomingVisits } = useQuery({
    queryKey: ['my-day', 'visits-upcoming'],
    queryFn: async () => {
      try {
        const res = await visitsApi.list({ upcoming: true })
        return res.data?.items || []
      } catch { return [] }
    },
  })

  // Fetch hot leads (score >= 70)
  const { data: hotLeads } = useQuery({
    queryKey: ['my-day', 'hot-leads'],
    queryFn: async () => {
      try {
        const res = await leadsApi.list({ min_score: 70, page_size: 5 })
        return res.data?.items || []
      } catch { return [] }
    },
  })

  // Fetch deals closing this week
  const { data: closingDeals } = useQuery({
    queryKey: ['my-day', 'closing-deals'],
    queryFn: async () => {
      try {
        const res = await opportunitiesApi.list({ closing_soon: true })
        return res.data?.items || []
      } catch { return [] }
    },
  })

  // Quick stats from dashboard
  const { data: stats } = useQuery({
    queryKey: ['my-day', 'stats'],
    queryFn: async () => {
      try {
        const res = await dashboardApi.getStats()
        return res.data
      } catch { return null }
    },
  })

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* ── Greeting ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>
          {getGreeting()}, {displayName}
        </h1>
        <p className="text-sm mt-1 capitalize" style={{ color: T.fgMuted, fontFamily: fontMono }}>
          {formatDate(new Date())}
        </p>
      </div>

      {/* ── Quick Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats?.total_leads ?? '--'} icon={Users} color={T.cyan} />
        <StatCard
          label="Pipeline"
          value={stats?.pipeline_value != null ? `${(stats.pipeline_value / 1000).toFixed(0)}k` : '--'}
          icon={TrendingUp}
          color={T.purple}
        />
        <StatCard
          label="Emails mes"
          value={stats?.emails_sent_this_month ?? '--'}
          icon={Mail}
          color={T.success}
        />
        <StatCard
          label="Acciones hoy"
          value={stats?.actions_due_today ?? '--'}
          icon={CheckSquare}
          color={T.warning}
        />
      </div>

      {/* ── Main grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Acciones de hoy */}
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <SectionHeader icon={CheckSquare} title="Acciones de hoy" count={todayActions?.length} />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {todayActions?.length > 0 ? (
              todayActions.map(a => <ActionCard key={a.id} action={a} isOverdue={false} />)
            ) : (
              <p className="text-sm py-4 text-center" style={{ color: T.fgMuted }}>
                Sin acciones para hoy
              </p>
            )}
          </div>
          <Link to="/app/actions" className="flex items-center gap-1 text-xs mt-3 hover:underline"
            style={{ color: T.cyan }}>
            Ver todas <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Acciones vencidas */}
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <SectionHeader icon={AlertTriangle} title="Acciones vencidas" count={overdueActions?.length} accentColor={T.destructive} />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {overdueActions?.length > 0 ? (
              overdueActions.map(a => <ActionCard key={a.id} action={a} isOverdue={true} />)
            ) : (
              <p className="text-sm py-4 text-center" style={{ color: T.fgMuted }}>
                Sin acciones vencidas
              </p>
            )}
          </div>
          <Link to="/app/actions" className="flex items-center gap-1 text-xs mt-3 hover:underline"
            style={{ color: T.destructive }}>
            Ver todas <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Visitas proximas */}
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <SectionHeader icon={MapPin} title="Visitas proximas" count={upcomingVisits?.length} accentColor={T.purple} />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {upcomingVisits?.length > 0 ? (
              upcomingVisits.map(v => (
                <div key={v.id} className="rounded-lg p-3 flex items-center gap-3"
                  style={{ backgroundColor: T.muted, borderLeft: `3px solid ${T.purple}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: T.fg }}>
                      {v.lead_company || v.company || 'Sin empresa'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: T.fgMuted }}>
                      {v.visit_date && new Date(v.visit_date).toLocaleDateString('es-ES', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                      {v.summary && ` - ${v.summary}`}
                    </p>
                  </div>
                  <CalendarDays className="w-4 h-4 shrink-0" style={{ color: T.purple }} />
                </div>
              ))
            ) : (
              <p className="text-sm py-4 text-center" style={{ color: T.fgMuted }}>
                Sin visitas proximas
              </p>
            )}
          </div>
          <Link to="/app/visits" className="flex items-center gap-1 text-xs mt-3 hover:underline"
            style={{ color: T.purple }}>
            Ver todas <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Leads calientes */}
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <SectionHeader icon={Star} title="Leads calientes" count={hotLeads?.length} accentColor={T.warning} />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {hotLeads?.length > 0 ? (
              hotLeads.map(l => (
                <Link key={l.id} to={`/app/leads/${l.id}`}
                  className="rounded-lg p-3 flex items-center gap-3 transition-colors hover:brightness-110 block"
                  style={{ backgroundColor: T.muted, borderLeft: `3px solid ${T.warning}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: T.fg }}>
                      {l.company_name || 'Sin empresa'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: T.fgMuted }}>
                      {l.status && <span className="uppercase">{l.status}</span>}
                    </p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ fontFamily: fontMono, color: T.warning }}>
                    {l.score ?? 0}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm py-4 text-center" style={{ color: T.fgMuted }}>
                Sin leads calientes
              </p>
            )}
          </div>
          <Link to="/app/leads" className="flex items-center gap-1 text-xs mt-3 hover:underline"
            style={{ color: T.warning }}>
            Ver todos <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Deals cerrando esta semana */}
        <div className="rounded-xl p-5 lg:col-span-2" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <SectionHeader icon={GitBranch} title="Deals cerrando esta semana" count={closingDeals?.length} accentColor={T.success} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {closingDeals?.length > 0 ? (
              closingDeals.map(d => (
                <div key={d.id} className="rounded-lg p-3 flex items-center gap-3"
                  style={{ backgroundColor: T.muted, borderLeft: `3px solid ${T.success}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: T.fg }}>
                      {d.name || 'Sin nombre'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs uppercase px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${T.cyan}15`, color: T.cyan }}>
                        {d.stage}
                      </span>
                      {d.expected_close_date && (
                        <span className="text-xs" style={{ color: T.fgMuted }}>
                          {new Date(d.expected_close_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ fontFamily: fontMono, color: T.success }}>
                    {d.value != null ? `${(d.value / 1000).toFixed(0)}k` : '--'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm py-4 text-center md:col-span-2" style={{ color: T.fgMuted }}>
                Sin deals cerrando esta semana
              </p>
            )}
          </div>
          <Link to="/app/pipeline" className="flex items-center gap-1 text-xs mt-3 hover:underline"
            style={{ color: T.success }}>
            Ver pipeline <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
