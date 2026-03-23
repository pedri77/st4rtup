import { useQuery } from '@tanstack/react-query'
import { Clock, Loader2, AlertTriangle, CheckCircle, Timer } from 'lucide-react'
import clsx from 'clsx'
import Breadcrumbs from '@/components/Breadcrumbs'
import { gtmApi } from '@/services/api'

const STATUS_CONFIG = {
  on_track: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'On Track', icon: CheckCircle },
  at_risk: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'En Riesgo', icon: AlertTriangle },
  completed: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Completado', icon: CheckCircle },
}

export default function PocTrackerPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['poc-tracker'],
    queryFn: () => gtmApi.pocTracker().then(r => r.data),
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>

  const pocs = data?.pocs || []

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'GTM', href: '/gtm' }, { label: 'PoC Tracker' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Timer className="w-7 h-7 text-cyan-400" /> PoC Tracker
        </h1>
        <div className="flex items-center gap-2">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-cyan-400">{data?.active || 0}</p>
            <p className="text-[10px] text-gray-500 uppercase">Activos</p>
          </div>
          <div className="bg-gray-800/50 border border-red-500/20 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-red-400">{data?.at_risk || 0}</p>
            <p className="text-[10px] text-gray-500 uppercase">En riesgo</p>
          </div>
        </div>
      </div>

      {pocs.length === 0 ? (
        <div className="text-center py-12">
          <Timer className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg text-gray-300 mb-2">Sin PoCs activos</h3>
          <p className="text-sm text-gray-500">Crea una oportunidad con tier "Pilot PoC" en el pipeline.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pocs.map(poc => {
            const s = STATUS_CONFIG[poc.status] || STATUS_CONFIG.on_track
            const StatusIcon = s.icon
            return (
              <div key={poc.id} className={clsx('rounded-xl border p-5', s.bg, s.border)}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      {poc.name}
                      <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1', s.bg, s.color)}>
                        <StatusIcon className="w-3 h-3" /> {s.label}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Stage: {poc.stage} · €{poc.value?.toLocaleString('es-ES')}</p>
                  </div>
                  <div className="text-right">
                    <p className={clsx('text-3xl font-bold', poc.days_remaining < 15 ? 'text-red-400' : poc.days_remaining < 30 ? 'text-yellow-400' : 'text-green-400')}>
                      {poc.days_remaining}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase">Días restantes</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Día {poc.days_elapsed} de 90</span>
                    <span>{poc.pct_complete}%</span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-3">
                    <div className={clsx('h-3 rounded-full transition-all',
                      poc.pct_complete >= 80 ? 'bg-red-500' : poc.pct_complete >= 50 ? 'bg-yellow-500' : 'bg-green-500')}
                      style={{ width: `${poc.pct_complete}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  {poc.start_date && <span>Inicio: {new Date(poc.start_date).toLocaleDateString('es-ES')}</span>}
                  {poc.expected_close && <span>Cierre esperado: {poc.expected_close}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
