import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart3, ArrowLeft, Megaphone, DollarSign, Target, Users,
  Link2, Calendar, AlertTriangle, TrendingUp, Eye, MousePointerClick,
  GitBranch, Shield, Globe, FileText
} from 'lucide-react'
import clsx from 'clsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Treemap,
} from 'recharts'
import { marketingAnalyticsApi, dashboardApi } from '@/services/api'

const CHANNEL_LABELS = {
  linkedin_ads: 'LinkedIn Ads',
  google_ads: 'Google Ads',
  seo: 'SEO',
  email: 'Email',
  youtube: 'YouTube',
  webinar: 'Webinar',
  event: 'Evento',
}

const CHANNEL_COLORS = {
  linkedin_ads: '#3B82F6',
  google_ads: '#22C55E',
  seo: '#F97316',
  email: '#3B82F6',
  youtube: '#EF4444',
  webinar: '#A855F7',
  event: '#EC4899',
}

const PIE_COLORS = ['#3B82F6', '#3B82F6', '#A855F7', '#F97316', '#22C55E', '#EF4444', '#EC4899', '#FBBF24']

const STATUS_LABELS = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  finished: 'Finalizada',
}

const OBJECTIVE_LABELS = {
  lead_gen: 'Lead Gen',
  brand: 'Marca',
  nurturing: 'Nurturing',
  reactivation: 'Reactivación',
}

const ASSET_TYPE_LABELS = {
  landing_page: 'Landing Page',
  cta: 'CTA',
  form: 'Formulario',
  banner: 'Banner',
  video: 'Vídeo',
  ebook: 'eBook',
  whitepaper: 'Whitepaper',
  infographic: 'Infografía',
  other: 'Otro',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketing', 'analytics', 'overview'],
    queryFn: () => marketingAnalyticsApi.overview().then(r => r.data),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/marketing" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-rose-400" />
            Analytics
          </h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <div className="h-4 bg-gray-700/50 rounded animate-pulse w-20 mb-3" />
              <div className="h-8 bg-gray-700/50 rounded animate-pulse w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const { campaigns, budget, goals, assets, counts, targeting, top_campaigns, alerts_by_type } = data || {}

  // Prepare chart data
  const channelData = Object.entries(campaigns?.by_channel || {}).map(([k, v]) => ({
    name: CHANNEL_LABELS[k] || k,
    campañas: v,
    budget: budget?.by_channel?.[k] || 0,
    fill: CHANNEL_COLORS[k] || '#6B7280',
  })).sort((a, b) => b.campañas - a.campañas)

  const statusData = Object.entries(campaigns?.by_status || {}).map(([k, v], i) => ({
    name: STATUS_LABELS[k] || k,
    value: v,
  }))

  const objectiveData = Object.entries(campaigns?.by_objective || {}).map(([k, v]) => ({
    name: OBJECTIVE_LABELS[k] || k,
    value: v,
  }))

  const assetTypeData = Object.entries(assets?.by_type || {}).map(([k, v]) => ({
    name: ASSET_TYPE_LABELS[k] || k,
    value: v,
  }))

  const personaData = Object.entries(targeting?.by_persona || {}).map(([k, v]) => ({
    name: k,
    campañas: v,
  }))

  const regulatoryData = Object.entries(targeting?.by_regulatory || {}).map(([k, v]) => ({
    name: k,
    campañas: v,
  }))

  const alertTypeData = Object.entries(alerts_by_type || {}).map(([k, v]) => ({
    name: k.replace(/_/g, ' '),
    value: v,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/marketing" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-rose-400" />
            Marketing Analytics
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Dashboard unificado de métricas de marketing
          </p>
        </div>
      </div>

      {/* Top KPIs row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Megaphone} label="Campañas" value={campaigns?.total || 0} sub={`${campaigns?.active || 0} activas`} color="text-cyan-400" />
        <KpiCard icon={DollarSign} label="Presupuesto Total" value={`€${(budget?.total || 0).toLocaleString()}`} sub={`€${(budget?.active || 0).toLocaleString()} activo`} color="text-green-400" />
        <KpiCard icon={DollarSign} label="CPL Medio" value={`€${budget?.cpl_avg || 0}`} sub="presup. activo / meta leads" color="text-yellow-400" />
        <KpiCard icon={AlertTriangle} label="Alertas" value={counts?.alerts_unread || 0} sub={`${counts?.alerts_total || 0} totales`} color="text-red-400" />
      </div>

      {/* Top KPIs row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Meta Leads" value={goals?.leads_goal || 0} color="text-blue-400" />
        <KpiCard icon={Target} label="Meta MQLs" value={goals?.mqls_goal || 0} color="text-purple-400" />
        <KpiCard icon={TrendingUp} label="Conversión Assets" value={`${assets?.conversion_rate || 0}%`} sub={`${assets?.conversions || 0} de ${assets?.visits || 0} visitas`} color="text-green-400" />
        <KpiCard icon={MousePointerClick} label="CTR Assets" value={`${assets?.ctr || 0}%`} sub={`${assets?.clicks || 0} de ${assets?.impressions || 0} impr.`} color="text-cyan-400" />
      </div>

      {/* Channel Attribution Treemap */}
      <ChannelAttributionTreemap />

      {/* Charts row 1: Channel bar + Status pie + Objective pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget by Channel — Bar Chart */}
        <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            Presupuesto por Canal
          </h3>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={channelData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="budget" name="Budget (€)" radius={[4, 4, 0, 0]}>
                  {channelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 h-[260px] flex items-center justify-center">Sin datos de presupuesto</p>
          )}
        </div>

        {/* Status — Pie Chart */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-cyan-400" />
            Por Estado
          </h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 h-[220px] flex items-center justify-center">Sin datos</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {statusData.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2: Campaigns by channel count + Objective + Asset types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Campaigns by channel — bar */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-purple-400" />
            Campañas por Canal
          </h3>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={channelData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="campañas" name="Campañas" radius={[0, 4, 4, 0]}>
                  {channelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500">Sin datos</p>
          )}
        </div>

        {/* Objective pie */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" />
            Por Objetivo
          </h3>
          {objectiveData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={objectiveData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                    {objectiveData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2">
                {objectiveData.map((o, i) => (
                  <span key={o.name} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[(i + 2) % PIE_COLORS.length] }} />
                    {o.name} ({o.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Sin datos</p>
          )}
        </div>

        {/* Asset types pie */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-400" />
            Assets por Tipo
          </h3>
          {assetTypeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={assetTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                    {assetTypeData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[(i + 4) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2">
                {assetTypeData.map((a, i) => (
                  <span key={a.name} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[(i + 4) % PIE_COLORS.length] }} />
                    {a.name} ({a.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Sin datos</p>
          )}
        </div>
      </div>

      {/* Targeting row: Persona radar + Regulatory bar */}
      {(personaData.length > 0 || regulatoryData.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {personaData.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Campañas por Persona Target
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={personaData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <Radar name="Campañas" dataKey="campañas" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {regulatoryData.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-400" />
                Campañas por Normativa
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={regulatoryData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="campañas" name="Campañas" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Top campaigns table */}
      {top_campaigns?.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Top Campañas por Presupuesto
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 font-medium py-2 px-3">Campaña</th>
                  <th className="text-left text-gray-400 font-medium py-2 px-3">Canal</th>
                  <th className="text-left text-gray-400 font-medium py-2 px-3">Estado</th>
                  <th className="text-right text-gray-400 font-medium py-2 px-3">Budget</th>
                  <th className="text-right text-gray-400 font-medium py-2 px-3">Leads Goal</th>
                  <th className="text-right text-gray-400 font-medium py-2 px-3">CPL</th>
                </tr>
              </thead>
              <tbody>
                {top_campaigns.map((c, i) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="py-2 px-3 text-white font-medium truncate max-w-[200px]">{c.name}</td>
                    <td className="py-2 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${CHANNEL_COLORS[c.channel] || '#6B7280'}20`, color: CHANNEL_COLORS[c.channel] || '#9CA3AF' }}>
                        {CHANNEL_LABELS[c.channel] || c.channel}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-400">{STATUS_LABELS[c.status] || c.status}</td>
                    <td className="py-2 px-3 text-right text-white">€{c.budget.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-gray-300">{c.leads_goal}</td>
                    <td className="py-2 px-3 text-right text-yellow-400">€{c.cpl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top assets table */}
      {assets?.top?.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-teal-400" />
            Top Assets por Visitas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 font-medium py-2 px-3">Asset</th>
                  <th className="text-left text-gray-400 font-medium py-2 px-3">Tipo</th>
                  <th className="text-right text-gray-400 font-medium py-2 px-3">Visitas</th>
                  <th className="text-right text-gray-400 font-medium py-2 px-3">Conv.</th>
                  <th className="text-right text-gray-400 font-medium py-2 px-3">% Conv</th>
                  <th className="text-right text-gray-400 font-medium py-2 px-3">Impr.</th>
                  <th className="text-right text-gray-400 font-medium py-2 px-3">CTR</th>
                </tr>
              </thead>
              <tbody>
                {assets.top.map((a, i) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="py-2 px-3 text-white font-medium truncate max-w-[200px]">{a.name}</td>
                    <td className="py-2 px-3 text-gray-400 text-xs">{ASSET_TYPE_LABELS[a.type] || a.type}</td>
                    <td className="py-2 px-3 text-right text-white">{a.visits.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-green-400">{a.conversions.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-green-400">{a.conv_rate}%</td>
                    <td className="py-2 px-3 text-right text-gray-300">{a.impressions.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-cyan-400">{a.ctr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alerts by type + Module counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {alertTypeData.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Alertas por Tipo
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={alertTypeData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Alertas" fill="#FBBF24" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Módulos del Hub
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <CountCard icon={Megaphone} label="Campañas" value={campaigns?.total || 0} />
            <CountCard icon={Eye} label="Assets" value={assets?.total || 0} />
            <CountCard icon={GitBranch} label="Funnels" value={counts?.funnels || 0} />
            <CountCard icon={Link2} label="UTM Codes" value={counts?.utm_codes || 0} />
            <CountCard icon={Calendar} label="Eventos" value={counts?.calendar_events || 0} />
            <CountCard icon={AlertTriangle} label="Alertas" value={counts?.alerts_total || 0} />
          </div>
        </div>
      </div>

      {/* Language distribution */}
      {Object.keys(assets?.by_language || {}).length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-400" />
            Assets por Idioma
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(assets.by_language).map(([lang, count]) => (
              <div key={lang} className="flex items-center gap-2 bg-gray-700/30 rounded-lg px-3 py-2">
                <span className="text-xs font-mono text-cyan-400 uppercase">{lang}</span>
                <span className="text-sm font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const TREEMAP_COLORS = ['#3B82F6', '#A855F7', '#22C55E', '#F97316', '#3B82F6', '#EF4444', '#EC4899', '#FBBF24']

function TreemapCustomContent({ x, y, width, height, name, value: val, index }) {
  if (width < 30 || height < 30) return null
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4}
        fill={TREEMAP_COLORS[index % TREEMAP_COLORS.length]}
        fillOpacity={0.85}
        stroke="#F8FAFC" strokeWidth={2}
      />
      {width > 50 && height > 40 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
            {name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="hsla(0,0%,100%,0.7)" fontSize={10}>
            {val}%
          </text>
        </>
      )}
    </g>
  )
}

function ChannelAttributionTreemap() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'attribution'],
    queryFn: () => dashboardApi.attribution().then(r => r.data).catch(() => null),
    staleTime: 120000,
  })

  if (isLoading) return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
      <div className="h-4 w-48 bg-gray-700/50 rounded animate-pulse mb-4" />
      <div className="h-[260px] bg-gray-700/30 rounded animate-pulse" />
    </div>
  )

  const channels = data?.channels || data || []
  if (!channels?.length) return null

  const treemapData = channels.map((ch, i) => ({
    name: CHANNEL_LABELS[ch.name] || ch.name,
    value: ch.value || ch.pct || 0,
    size: ch.value || ch.pct || 0,
  }))

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-purple-400" />
        Atribución por Canal
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <Treemap
          data={treemapData}
          dataKey="size"
          nameKey="name"
          content={<TreemapCustomContent />}
        >
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0]?.payload
              return (
                <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs shadow-xl">
                  <p className="text-white font-medium">{d?.name}</p>
                  <p className="text-gray-300">{d?.value}%</p>
                </div>
              )
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx('w-4 h-4', color)} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function CountCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-3">
      <Icon className="w-4 h-4 text-gray-400" />
      <div>
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}
