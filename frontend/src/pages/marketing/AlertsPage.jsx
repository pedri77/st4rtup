import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Bell, CheckCircle2, Info,
  Trash2, X, Filter, ChevronLeft, ChevronRight, Eye, Zap, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { marketingAlertsApi } from '@/services/api'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'



const SEVERITY_CONFIG = {
  info: { label: 'Info', icon: Info, bg: 'hsla(210,70%,55%,0.15)', color: 'hsl(210,70%,55%)', dot: 'hsl(210,70%,55%)' },
  warning: { label: 'Warning', icon: AlertTriangle, bg: 'hsla(38,92%,50%,0.15)', color: T.warning, dot: T.warning },
  critical: { label: 'Crítica', icon: AlertTriangle, bg: 'hsla(0,72%,51%,0.15)', color: T.destructive, dot: T.destructive },
}

export default function AlertsPage() {
  const T = useThemeColors()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ severity: '', is_read: '' })

  const queryParams = {
    page,
    page_size: 20,
    ...(filters.severity && { severity: filters.severity }),
    ...(filters.is_read !== '' && { is_read: filters.is_read === 'true' }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['marketing', 'alerts', queryParams],
    queryFn: () => marketingAlertsApi.list(queryParams).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['marketing', 'alerts', 'stats'],
    queryFn: () => marketingAlertsApi.stats().then(r => r.data),
  })

  const markReadMutation = useMutation({
    mutationFn: (id) => marketingAlertsApi.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'alerts'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => marketingAlertsApi.markAllRead(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'alerts'] })
      toast.success(res.data.message || 'Alertas marcadas como leídas')
    },
    onError: () => toast.error('Error al marcar alertas'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => marketingAlertsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'alerts'] })
      toast.success('Alerta eliminada')
    },
    onError: () => toast.error('Error al eliminar alerta'),
  })

  const runEngineMutation = useMutation({
    mutationFn: () => marketingAlertsApi.runEngine(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'alerts'] })
      const count = res.data?.alerts_created || 0
      toast.success(count > 0 ? `${count} alertas generadas` : 'Sin alertas nuevas')
    },
    onError: () => toast.error('Error ejecutando el motor de alertas'),
  })

  const alerts = data?.items || []
  const totalPages = data?.pages || 1
  const hasActiveFilters = filters.severity || filters.is_read !== ''

  const selectStyle = {
    padding: '6px 12px', backgroundColor: T.bg, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none',
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/app/marketing" className="transition-colors" style={{ color: T.fgMuted }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2" style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: T.fg }}>
              <AlertTriangle className="w-6 h-6" style={{ color: T.warning }} />
              Alertas de Marketing
            </h1>
            <p style={{ fontSize: 14, color: T.fgMuted, marginTop: 2 }}>
              {stats?.unread || 0} sin leer de {stats?.total || 0} totales
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runEngineMutation.mutate()}
            disabled={runEngineMutation.isPending}
            className="flex items-center gap-2 transition-colors disabled:opacity-50"
            style={{ padding: '8px 16px', background: `linear-gradient(135deg, ${T.cyan}, hsl(220,72%,50%))`, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500 }}
          >
            {runEngineMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Analizar
          </button>
          {stats?.unread > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-2 transition-colors"
              style={{ padding: '8px 16px', backgroundColor: T.muted, color: T.fg, borderRadius: 8, fontSize: 14, fontWeight: 500 }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} color={T.fg} />
          <StatCard label="Sin leer" value={stats.unread} color={T.warning} />
          <StatCard label="Warning" value={stats.by_severity?.warning || 0} color={T.warning} />
          <StatCard label="Críticas" value={stats.by_severity?.critical || 0} color={T.destructive} />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 transition-colors"
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 14,
            border: `1px solid ${hasActiveFilters ? T.cyan : T.border}`,
            color: hasActiveFilters ? T.cyan : T.fgMuted,
            backgroundColor: hasActiveFilters ? 'hsla(185,72%,48%,0.1)' : 'transparent',
          }}
        >
          <Filter className="w-4 h-4" /> Filtros
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: T.fgMuted, marginBottom: 4 }} htmlFor="alerts-field-1">Severidad</label>
            <select id="alerts-field-1" value={filters.severity}
              onChange={(e) => { setFilters(f => ({ ...f, severity: e.target.value })); setPage(1) }}
              style={selectStyle}
            >
              <option value="">Todas</option>
              {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: T.fgMuted, marginBottom: 4 }} htmlFor="alerts-field-2">Estado</label>
            <select id="alerts-field-2" value={filters.is_read}
              onChange={(e) => { setFilters(f => ({ ...f, is_read: e.target.value })); setPage(1) }}
              style={selectStyle}
            >
              <option value="">Todas</option>
              <option value="false">Sin leer</option>
              <option value="true">Leídas</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setFilters({ severity: '', is_read: '' }); setPage(1) }}
              className="self-end flex items-center gap-1"
              style={{ fontSize: 12, color: T.fgMuted }}
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
      )}

      {/* Alerts list */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div className="h-5 rounded animate-pulse w-3/4" style={{ backgroundColor: T.muted }} />
            </div>
          ))
        ) : alerts.length === 0 ? (
          <div className="text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 48 }}>
            <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: T.fgMuted }} />
            <p style={{ color: T.fgMuted }}>No hay alertas{hasActiveFilters ? ' con estos filtros' : ''}</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info
            const SevIcon = sev.icon
            return (
              <div
                key={alert.id}
                className="transition-all"
                style={{
                  backgroundColor: T.card,
                  border: `1px solid ${alert.is_read ? T.border : T.border}`,
                  borderRadius: 12, padding: 16,
                  opacity: alert.is_read ? 0.7 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: sev.dot }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center gap-1" style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500, backgroundColor: sev.bg, color: sev.color }}>
                        <SevIcon className="w-3 h-3" />
                        {sev.label}
                      </span>
                      <span style={{ fontSize: 12, color: T.fgMuted, fontFamily: fontMono }}>{alert.alert_type}</span>
                      {alert.entity_name && (
                        <span style={{ fontSize: 12, color: T.fg, backgroundColor: T.muted, padding: '2px 6px', borderRadius: 4 }}>
                          {alert.entity_name}
                        </span>
                      )}
                      {!alert.is_read && (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: T.cyan }} title="Sin leer" />
                      )}
                    </div>
                    <p style={{ fontSize: 14, color: T.fg }}>{alert.message}</p>
                    {(alert.threshold_value != null || alert.actual_value != null) && (
                      <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 4, fontFamily: fontMono }}>
                        {alert.threshold_value != null && `Umbral: ${alert.threshold_value}`}
                        {alert.threshold_value != null && alert.actual_value != null && ' · '}
                        {alert.actual_value != null && `Actual: ${alert.actual_value}`}
                      </p>
                    )}
                    {alert.geo_context && (
                      <span className="inline-block mt-1" style={{ fontSize: 12, color: T.fgMuted }}>Geo: {alert.geo_context}</span>
                    )}
                    <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 4 }}>
                      {new Date(alert.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!alert.is_read && (
                      <button
                        onClick={() => markReadMutation.mutate(alert.id)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: T.fgMuted }}
                        title="Marcar como leída"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (await confirm({ title: '¿Eliminar?', description: '¿Eliminar esta alerta?', confirmText: 'Eliminar' })) deleteMutation.mutate(alert.id)
                      }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: T.fgMuted }}
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 14, color: T.fgMuted }}>
            Página {page} de {totalPages} ({data?.total} resultados)
          </span>
          <div className="flex items-center gap-1">
            <button aria-label="Anterior"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: T.fgMuted }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button aria-label="Siguiente"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
              style={{ color: T.fgMuted }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
      <p style={{ fontSize: 12, color: T.fgMuted }}>{label}</p>
      <p style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 700, marginTop: 4, color }}>{value}</p>
    </div>
  )
}
