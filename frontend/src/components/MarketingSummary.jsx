import { useQuery } from '@tanstack/react-query'
import { marketingAnalyticsApi } from '@/services/api'
import { Link } from 'react-router-dom'
import {
  Megaphone, ArrowRight, Target, Globe, AlertTriangle, FileText,
  TrendingUp, DollarSign, Users, BarChart3
} from 'lucide-react'
import clsx from 'clsx'

export default function MarketingSummary() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['marketing-overview'],
    queryFn: () => marketingAnalyticsApi.overview().then(r => r.data).catch(() => null),
    retry: 0,
    staleTime: 60000,
  })

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-20 bg-gray-700/50 rounded" />
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="card border border-gray-700/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-cyan-900/30 rounded-lg flex items-center justify-center">
            <Megaphone className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Marketing</h2>
        </div>
        <p className="text-sm text-gray-400">No se pudieron cargar las estadísticas de marketing.</p>
        <Link to="/marketing" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium mt-2">
          Ir a Marketing <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    )
  }

  const campaigns = stats.campaigns || {}
  const budget = stats.budget || {}
  const assets = stats.assets || {}
  const counts = stats.counts || {}

  const convRate = assets.conversion_rate || 0
  const ctr = assets.ctr || 0

  // Top channels
  const channels = Object.entries(campaigns.by_channel || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  const channelLabels = {
    linkedin_ads: 'LinkedIn Ads',
    google_ads: 'Google Ads',
    seo: 'SEO',
    email: 'Email',
    youtube: 'YouTube',
    webinar: 'Webinar',
    evento: 'Evento',
    social_organic: 'Social Organic',
    referral: 'Referral',
    content: 'Content',
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-900/30 rounded-lg flex items-center justify-center">
            <Megaphone className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Marketing</h2>
        </div>
        <Link to="/marketing" className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium">
          Ver todo <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-700/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-white">{campaigns.total || 0}</p>
          <p className="text-[10px] text-gray-500 uppercase">Campañas</p>
        </div>
        <div className="bg-cyan-900/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-cyan-400">{campaigns.active || 0}</p>
          <p className="text-[10px] text-cyan-600 uppercase">Activas</p>
        </div>
        <div className="bg-green-900/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-400">{convRate.toFixed(1)}%</p>
          <p className="text-[10px] text-green-600 uppercase">Conv. Rate</p>
        </div>
        <div className={clsx('rounded-lg p-3 text-center', counts.alerts_unread > 0 ? 'bg-yellow-900/30' : 'bg-gray-700/30')}>
          <p className={clsx('text-xl font-bold', counts.alerts_unread > 0 ? 'text-yellow-400' : 'text-gray-400')}>{counts.alerts_unread || 0}</p>
          <p className={clsx('text-[10px] uppercase', counts.alerts_unread > 0 ? 'text-yellow-600' : 'text-gray-500')}>Alertas</p>
        </div>
      </div>

      {/* Budget & Assets row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-700/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] text-gray-500 uppercase font-medium">Budget Activo</span>
          </div>
          <p className="text-sm font-bold text-white">
            {(budget.active || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </p>
          {budget.cpl_avg > 0 && (
            <p className="text-[10px] text-gray-500 mt-0.5">
              CPL medio: {budget.cpl_avg.toFixed(2)}
            </p>
          )}
        </div>
        <div className="bg-gray-700/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-[10px] text-gray-500 uppercase font-medium">Assets</span>
          </div>
          <p className="text-sm font-bold text-white">{assets.total || 0} activos</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {(assets.visits || 0).toLocaleString()} visitas · CTR {ctr.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Channels breakdown */}
      {channels.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-gray-500 uppercase font-medium mb-2">Canales principales</p>
          <div className="flex flex-wrap gap-1.5">
            {channels.map(([channel, count]) => (
              <span key={channel} className="inline-flex items-center gap-1 text-[10px] bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded-full">
                {channelLabels[channel] || channel} <span className="font-bold text-white">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Module counts */}
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 text-[10px] bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded-full">
          <Target className="w-2.5 h-2.5" /> Funnels <span className="font-bold text-white">{counts.funnels || 0}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded-full">
          <FileText className="w-2.5 h-2.5" /> UTMs <span className="font-bold text-white">{counts.utm_codes || 0}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded-full">
          <BarChart3 className="w-2.5 h-2.5" /> Eventos <span className="font-bold text-white">{counts.calendar_events || 0}</span>
        </span>
      </div>
    </div>
  )
}
