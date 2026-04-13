import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  Building2, Users, DollarSign, Mail, CalendarCheck, CheckSquare,
  TrendingUp, Loader2, ExternalLink, ArrowLeft, Target
} from 'lucide-react'
import clsx from 'clsx'
import Breadcrumbs from '@/components/Breadcrumbs'
import { leadsApi } from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

function stageColor(stage) {
  const map = {
    discovery: 'hsl(217,91%,60%)', qualification: T.purple,
    proposal: T.warning, negotiation: T.warning,
    closed_won: T.success, closed_lost: T.destructive,
  }
  return map[stage] || T.fgMuted
}

export default function ABMAccountPage() {
  const T = useThemeColors()
  const { leadId } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['abm-view', leadId],
    queryFn: () => leadsApi.abmView(leadId).then(r => r.data),
    enabled: !!leadId,
  })

  const { data: timelineData } = useQuery({
    queryKey: ['lead-timeline', leadId],
    queryFn: () => leadsApi.timeline(leadId).then(r => r.data),
    enabled: !!leadId,
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>
  if (!data) return <p className="text-center py-12" style={{ color: T.fgMuted }}>Cuenta no encontrada</p>

  const { lead, scoring, contacts, opportunities, activity, pipeline } = data
  const events = timelineData?.events || []
  const typeIcons = { email: '\uD83D\uDCE7', visit: '\uD83D\uDCC5', action: '\u2705', opportunity: '\uD83D\uDCB0' }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <Breadcrumbs items={[{ label: 'Leads', href: '/app/leads' }, { label: lead.company_name || 'Cuenta' }]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <Building2 className="w-7 h-7" style={{ color: T.cyan }} /> {lead.company_name}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: T.fgMuted }}>
            <span>{lead.contact_name} &middot; {lead.contact_title}</span>
            <span style={{ color: T.border }}>&middot;</span>
            <span>{lead.company_sector} &middot; {lead.company_country}</span>
            {lead.company_website && (
              <a href={`https://${lead.company_website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" style={{ color: T.cyan }}>
                {lead.company_website} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        <Link to={`/app/leads/${leadId}`} className="btn-secondary text-xs">Ver ficha completa</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border p-3 text-center" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-2xl font-bold" style={{ color: T.cyan, fontFamily: fontMono }}>{lead.score || 0}</p>
          <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Score ICP</p>
        </div>
        <div className="rounded-xl border p-3 text-center" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-2xl font-bold" style={{ color: T.fg, fontFamily: fontMono }}>\€{pipeline.total_value?.toLocaleString('es-ES')}</p>
          <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Pipeline</p>
        </div>
        <div className="rounded-xl border p-3 text-center" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-2xl font-bold" style={{ color: T.success, fontFamily: fontMono }}>\€{pipeline.won_value?.toLocaleString('es-ES')}</p>
          <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Won</p>
        </div>
        <div className="rounded-xl border p-3 text-center" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-2xl font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{contacts.length}</p>
          <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Contactos</p>
        </div>
        <div className="rounded-xl border p-3 text-center" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-2xl font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{activity.total}</p>
          <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Interacciones</p>
        </div>
      </div>

      {/* Scoring ICP */}
      {scoring?.icp_score && (
        <div className="rounded-xl border p-4" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <TrendingUp className="w-4 h-4" style={{ color: T.cyan }} /> Scoring ICP
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold" style={{ color: T.cyan, fontFamily: fontMono }}>{scoring.icp_score}/100</span>
            <span className="text-lg font-bold" style={{ color: scoring.plan === 'A' ? T.success : scoring.plan === 'B' ? T.cyan : T.warning }}>{`Tier ${scoring.plan}`}</span>
            <span className="text-sm" style={{ color: T.fgMuted }}>{scoring.action === 'qualify' ? '\u2705 Cualificar' : scoring.action === 'nurture' ? '\uD83D\uDD04 Nurturing' : '\u274C Descartar'}</span>
            {scoring.frameworks?.length > 0 && (
              <div className="flex gap-1">{scoring.frameworks.map(f => <span key={f} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,188,212,0.1)', color: T.cyan }}>{f}</span>)}</div>
            )}
          </div>
          {scoring.reasoning && <p className="text-xs mt-2" style={{ color: T.fgMuted }}>{scoring.reasoning}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contacts */}
        <div className="rounded-xl border p-4" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <Users className="w-4 h-4" style={{ color: T.cyan }} /> Contactos ({contacts.length})
          </h3>
          <div className="space-y-2">
            {contacts.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-lg p-2.5" style={{ backgroundColor: T.bg }}>
                <div>
                  <p className="text-sm" style={{ color: T.fg }}>{c.name}</p>
                  <p className="text-xs" style={{ color: T.fgMuted }}>{c.title} &middot; {c.email}</p>
                </div>
                {c.is_primary && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,188,212,0.1)', color: T.cyan }}>Principal</span>}
              </div>
            ))}
            {contacts.length === 0 && <p className="text-xs" style={{ color: T.fgMuted }}>Sin contactos registrados</p>}
          </div>
        </div>

        {/* Opportunities */}
        <div className="rounded-xl border p-4" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <DollarSign className="w-4 h-4" style={{ color: T.cyan }} /> Oportunidades ({opportunities.length})
          </h3>
          <div className="space-y-2">
            {opportunities.map(o => (
              <div key={o.id} className="rounded-lg p-2.5" style={{ backgroundColor: T.bg }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: T.fg }}>{o.name}</p>
                  <span className="text-xs font-medium" style={{ color: stageColor(o.stage) }}>{o.stage}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: T.fgMuted }}>
                  <span style={{ fontFamily: fontMono }}>\€{(o.value || 0).toLocaleString('es-ES')}</span>
                  {o.pricing_plan && <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: T.muted }}>{o.pricing_plan}</span>}
                  {o.competitor && <span>vs {o.competitor}</span>}
                  <span style={{ fontFamily: fontMono }}>{o.probability}%</span>
                </div>
              </div>
            ))}
            {opportunities.length === 0 && <p className="text-xs" style={{ color: T.fgMuted }}>Sin oportunidades</p>}
          </div>
        </div>
      </div>

      {/* Activity counts */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3 flex items-center gap-3" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <Mail className="w-5 h-5" style={{ color: 'hsl(217,91%,60%)' }} />
          <div><p className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{activity.emails}</p><p className="text-[10px]" style={{ color: T.fgMuted }}>Emails</p></div>
        </div>
        <div className="rounded-xl border p-3 flex items-center gap-3" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <CalendarCheck className="w-5 h-5" style={{ color: T.success }} />
          <div><p className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{activity.visits}</p><p className="text-[10px]" style={{ color: T.fgMuted }}>Visitas</p></div>
        </div>
        <div className="rounded-xl border p-3 flex items-center gap-3" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <CheckSquare className="w-5 h-5" style={{ color: T.warning }} />
          <div><p className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{activity.actions}</p><p className="text-[10px]" style={{ color: T.fgMuted }}>Acciones</p></div>
        </div>
      </div>

      {/* Timeline */}
      {events.length > 0 && (
        <div className="rounded-xl border p-4" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: fontDisplay, color: T.fg }}>Actividad Reciente</h3>
          <div className="space-y-2">
            {events.slice(0, 20).map((e, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span>{typeIcons[e.type] || '\uD83D\uDCCC'}</span>
                <div className="flex-1">
                  <p style={{ color: T.fg }}>{e.title}</p>
                  {e.detail && <p className="text-xs" style={{ color: T.fgMuted }}>{e.detail}</p>}
                </div>
                <span className="text-[10px]" style={{ color: T.fgMuted }}>{new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
