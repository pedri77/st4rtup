import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Shield, Search, Loader2, FileText, Trash2, Edit3,
  Plus, Eye, Download, Upload, Settings, User, Clock, Filter
} from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { auditLogApi } from '@/services/api'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'



const ACTION_CONFIG = {
  create: { label: 'Crear', bg: 'hsla(142,71%,45%,0.1)', color: T.success, icon: Plus },
  update: { label: 'Actualizar', bg: 'hsla(210,70%,55%,0.1)', color: 'hsl(210,70%,55%)', icon: Edit3 },
  delete: { label: 'Eliminar', bg: 'hsla(0,72%,51%,0.1)', color: T.destructive, icon: Trash2 },
  publish: { label: 'Publicar', bg: 'hsla(265,60%,58%,0.1)', color: T.purple, icon: Upload },
  archive: { label: 'Archivar', bg: `hsla(220,10%,55%,0.1)`, color: T.fgMuted, icon: Download },
  export: { label: 'Exportar', bg: 'hsla(185,72%,48%,0.1)', color: T.cyan, icon: Download },
  view: { label: 'Ver', bg: `hsla(220,10%,55%,0.1)`, color: T.fgMuted, icon: Eye },
  login: { label: 'Login', bg: 'hsla(38,92%,50%,0.1)', color: T.warning, icon: User },
  settings: { label: 'Config', bg: 'hsla(25,80%,50%,0.1)', color: 'hsl(25,80%,50%)', icon: Settings },
}

const ENTITY_LABELS = {
  campaign: 'Campaña',
  funnel: 'Funnel',
  asset: 'Asset',
  document: 'Documento',
  alert: 'Alerta',
  utm_code: 'UTM',
  calendar_event: 'Evento',
  setting: 'Configuración',
  integration: 'Integración',
  user: 'Usuario',
}

const inputStyle = {
  width: '100%', padding: '8px 12px', backgroundColor: T.card, border: `1px solid ${T.border}`,
  borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none',
}
const selectStyle = {
  padding: '6px 12px', backgroundColor: T.card, border: `1px solid ${T.border}`,
  borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none', width: 160,
}

export default function AuditLogPage() {
  const T = useThemeColors()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ action: '', entity_type: '', search: '' })
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page, filters],
    queryFn: () => auditLogApi.list({
      page,
      page_size: 30,
      ...(filters.action && { action: filters.action }),
      ...(filters.entity_type && { entity_type: filters.entity_type }),
      ...(filters.search && { search: filters.search }),
    }).then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['audit-log-stats'],
    queryFn: () => auditLogApi.stats().then(r => r.data),
  })

  const items = data?.items || []
  const total = data?.total || 0
  const pages = data?.pages || 1

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/app/marketing" className="transition-colors" style={{ color: T.fgMuted }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="flex items-center gap-2" style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: T.fg }}>
              <Shield className="w-7 h-7" style={{ color: T.cyan }} />
              Audit Log
            </h1>
          </div>
          <p style={{ fontSize: 14, color: T.fgMuted, marginLeft: 32 }}>
            Registro de acciones sensibles del módulo de marketing.
          </p>
        </div>
        <div className="text-right">
          <p style={{ fontFamily: fontMono, fontSize: 28, fontWeight: 700, color: T.fg }}>{total}</p>
          <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase' }}>Registros</p>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(stats.by_action || {}).slice(0, 4).map(([action, count]) => {
            const config = ACTION_CONFIG[action] || { label: action, bg: T.muted, color: T.fgMuted }
            return (
              <div key={action} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase' }}>{config.label}</p>
                <p style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 700, color: T.fg }}>{count}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.fgMuted }} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
            placeholder="Buscar en audit log..."
            style={{ ...inputStyle, paddingLeft: 40, maxWidth: 448 }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 transition-colors"
          style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 14,
            border: `1px solid ${showFilters ? T.cyan : T.border}`,
            backgroundColor: showFilters ? 'hsla(185,72%,48%,0.1)' : T.card,
            color: showFilters ? T.cyan : T.fgMuted,
          }}
        >
          <Filter className="w-4 h-4" /> Filtros
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-3">
          <select id="auditlog-select-1" aria-label="Selector" value={filters.action}
            onChange={(e) => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1) }}
            style={selectStyle}
          >
            <option value="">Todas las acciones</option>
            {Object.entries(ACTION_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select id="auditlog-select-2" aria-label="Selector" value={filters.entity_type}
            onChange={(e) => { setFilters(f => ({ ...f, entity_type: e.target.value })); setPage(1) }}
            style={selectStyle}
          >
            <option value="">Todas las entidades</option>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            onClick={() => { setFilters({ action: '', entity_type: '', search: '' }); setPage(1) }}
            className="transition-colors"
            style={{ fontSize: 12, color: T.fgMuted }}
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Log entries */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 48 }}>
          <Shield className="w-8 h-8 mx-auto mb-2" style={{ color: T.fgMuted }} />
          <p style={{ color: T.fgMuted }}>No hay registros en el audit log</p>
          <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 4 }}>Las acciones se registrarán automáticamente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((entry) => {
            const actionCfg = ACTION_CONFIG[entry.action] || { label: entry.action, bg: T.muted, color: T.fgMuted, icon: FileText }
            const ActionIcon = actionCfg.icon || FileText
            return (
              <div key={entry.id} className="flex items-center gap-4 transition-colors"
                style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '12px 16px' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.fgMuted}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                {/* Action icon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: actionCfg.bg, color: actionCfg.color }}>
                  <ActionIcon className="w-4 h-4" />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4, backgroundColor: actionCfg.bg, color: actionCfg.color }}>
                      {actionCfg.label}
                    </span>
                    <span style={{ fontSize: 12, color: T.fgMuted }}>
                      {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                    </span>
                    {entry.entity_name && (
                      <span className="truncate max-w-[200px]" style={{ fontSize: 12, color: T.fg, fontWeight: 500 }}>
                        {entry.entity_name}
                      </span>
                    )}
                  </div>
                  {entry.description && (
                    <p className="truncate" style={{ fontSize: 10, color: T.fgMuted, marginTop: 2 }}>{entry.description}</p>
                  )}
                </div>

                {/* User */}
                <div className="text-right flex-shrink-0">
                  <p style={{ fontSize: 12, color: T.fgMuted }}>{entry.user_email?.split('@')[0]}</p>
                  <p className="flex items-center justify-end" style={{ fontSize: 10, color: T.fgMuted }}>
                    <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                    {format(new Date(entry.created_at), "dd MMM HH:mm", { locale: es })}
                  </p>
                </div>

                {/* Changes indicator */}
                {entry.changes && Object.keys(entry.changes).length > 0 && (
                  <div className="flex-shrink-0" title={JSON.stringify(entry.changes, null, 2)}>
                    <span style={{ fontSize: 10, backgroundColor: T.muted, color: T.fgMuted, padding: '2px 6px', borderRadius: 4, fontFamily: fontMono }}>
                      {Object.keys(entry.changes).length} cambios
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="disabled:opacity-50 transition-colors"
            style={{ padding: '6px 12px', backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.fgMuted }}
          >
            Anterior
          </button>
          <span style={{ fontSize: 14, color: T.fgMuted }}>
            Página {page} de {pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="disabled:opacity-50 transition-colors"
            style={{ padding: '6px 12px', backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 14, color: T.fgMuted }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Top users */}
      {stats?.top_users?.length > 0 && (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.fg, marginBottom: 12 }}>Usuarios más activos</h3>
          <div className="flex flex-wrap gap-2">
            {stats.top_users.map((u, i) => (
              <span key={i} className="inline-flex items-center gap-1.5"
                style={{ fontSize: 12, backgroundColor: T.muted, color: T.fgMuted, padding: '4px 10px', borderRadius: 9999 }}>
                <User className="w-3 h-3" />
                {u.email?.split('@')[0]}
                <span style={{ fontFamily: fontMono, fontWeight: 700, color: T.fg }}>{u.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
