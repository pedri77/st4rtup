import { useQuery } from '@tanstack/react-query'
import { Heart, Loader2, TrendingUp, AlertTriangle, ArrowUpRight, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import Breadcrumbs from '@/components/Breadcrumbs'
import { leadsApi } from '@/services/api'
import { useThemeColors } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

export default function CustomerHealthPage() {
  const T = useThemeColors()
  const { data, isLoading } = useQuery({
    queryKey: ['customer-health'],
    queryFn: () => leadsApi.list({ status: 'won', page_size: 50 }).then(r => r.data),
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>

  const clients = data?.items || []

  // Simulated health based on score and activity
  const healthData = clients.map(c => {
    const score = c.score || 50
    const health = score >= 70 ? 'healthy' : score >= 40 ? 'at_risk' : 'churning'
    return { ...c, health, health_score: score }
  })

  const healthy = healthData.filter(c => c.health === 'healthy').length
  const atRisk = healthData.filter(c => c.health === 'at_risk').length
  const churning = healthData.filter(c => c.health === 'churning').length

  const HEALTH_CONFIG = {
    healthy: { label: 'Saludable', color: T.success, bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
    at_risk: { label: 'En Riesgo', color: T.warning, bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)' },
    churning: { label: 'Churn Risk', color: T.destructive, bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <Breadcrumbs items={[{ label: 'GTM', href: '/app/gtm' }, { label: 'Customer Health' }]} />
      <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
        <Heart className="w-7 h-7" style={{ color: T.cyan }} /> Customer Health
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }}>
          <p className="text-3xl font-bold" style={{ color: T.success, fontFamily: fontMono }}>{healthy}</p>
          <p className="text-xs" style={{ color: T.fgMuted }}>Saludables</p>
        </div>
        <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}>
          <p className="text-3xl font-bold" style={{ color: T.warning, fontFamily: fontMono }}>{atRisk}</p>
          <p className="text-xs" style={{ color: T.fgMuted }}>En riesgo</p>
        </div>
        <div className="rounded-xl border p-4 text-center" style={{ backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <p className="text-3xl font-bold" style={{ color: T.destructive, fontFamily: fontMono }}>{churning}</p>
          <p className="text-xs" style={{ color: T.fgMuted }}>Churn risk</p>
        </div>
      </div>

      {/* Client list */}
      <div className="space-y-3">
        {healthData.map(client => {
          const h = HEALTH_CONFIG[client.health]
          return (
            <div key={client.id} className="rounded-xl border p-4 flex items-center gap-4" style={{ backgroundColor: h.bg, borderColor: h.border }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.muted }}>
                <span className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontMono }}>{client.health_score}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>{client.company_name}</h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: h.bg, color: h.color }}>{h.label}</span>
                </div>
                <p className="text-xs" style={{ color: T.fgMuted }}>{client.contact_name} &middot; {client.company_sector || 'Sin sector'} &middot; {client.company_country || 'ES'}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/app/leads/${client.id}/abm`} className="btn-secondary text-xs">ABM View</Link>
                <Link to={`/app/leads/${client.id}`} className="btn-secondary text-xs">Ficha</Link>
              </div>
            </div>
          )
        })}
        {healthData.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4" style={{ color: T.fgMuted }} />
            <p style={{ color: T.fgMuted }}>Sin clientes activos. Los leads con status "won" apareceran aqui.</p>
          </div>
        )}
      </div>
    </div>
  )
}
