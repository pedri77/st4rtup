import { useQuery } from '@tanstack/react-query'
import { automationsApi } from '@/services/api'
import { Link } from 'react-router-dom'
import { Zap, Play, AlertTriangle, Activity, ArrowRight, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'

export default function AutomationsSummary() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['automation-stats'],
    queryFn: () => automationsApi.stats().then(r => r.data).catch(() => null),
    retry: 0,
    staleTime: 60000,
  })

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="h-20 bg-gray-100 rounded" />
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="card border border-gray-200/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-indigo-900/30 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Automatizaciones</h2>
        </div>
        <p className="text-sm text-gray-400">No se pudieron cargar las estadísticas de automatizaciones.</p>
        <Link to="/app/automations" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2">
          Ir a Automatizaciones <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    )
  }

  const implProgress = Math.round((stats.estimated_hours_completed / Math.max(stats.estimated_hours_total, 1)) * 100)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-900/30 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Automatizaciones</h2>
        </div>
        <Link to="/app/automations" className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
          Ver todo <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-[10px] text-gray-500 uppercase">Total</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-700">{stats.active_count}</p>
          <p className="text-[10px] text-green-600 uppercase">Activas</p>
        </div>
        <div className={clsx('rounded-lg p-3 text-center', stats.error_count > 0 ? 'bg-red-900/30' : 'bg-gray-50')}>
          <p className={clsx('text-xl font-bold', stats.error_count > 0 ? 'text-red-700' : 'text-gray-400')}>{stats.error_count}</p>
          <p className={clsx('text-[10px] uppercase', stats.error_count > 0 ? 'text-red-600' : 'text-gray-400')}>Errores</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-cyan-700">{stats.total_executions_24h}</p>
          <p className="text-[10px] text-cyan-600 uppercase">Exec 24h</p>
        </div>
      </div>

      {/* Implementation progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600">Progreso de implementación</span>
          <span className="text-xs font-bold text-indigo-600">{implProgress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${implProgress}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          {stats.estimated_hours_completed}h de {stats.estimated_hours_total}h estimadas
        </p>
      </div>

      {/* Category breakdown mini */}
      {stats.by_category && Object.keys(stats.by_category).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(stats.by_category).map(([cat, count]) => {
            const labels = {
              email_automation: '📧 Email',
              leads_captacion: '👥 Leads',
              visitas: '📅 Visitas',
              acciones_alertas: '⚡ Alertas',
              pipeline: '🔄 Pipeline',
              seguimiento_mensual: '📊 Mensual',
              encuestas: '📝 Encuestas',
              integraciones: '🔗 Integr.',
            }
            return (
              <span key={cat} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                {labels[cat] || cat} <span className="font-bold">{count}</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
