import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Bell, BellOff, Check, CheckCheck, Trash2, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { mockNotifications, mockNotificationStats, mockDelay, USE_MOCK_DATA } from '@/mocks/mockData'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'


const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}

const NOTIFICATION_TYPE_COLORS = {
  system: T.fgMuted, lead: 'hsl(210,70%,55%)', action: T.success,
  opportunity: T.purple, visit: T.warning, email: T.cyan,
  review: 'hsl(330,60%,55%)', automation: 'hsl(170,60%,45%)',
}

const PRIORITY_BORDER_COLORS = {
  low: T.fgMuted, medium: 'hsl(210,70%,55%)', high: T.warning, urgent: T.destructive,
}

export default function NotificationsPanel({ isOpen, onClose }) {
  const T = useThemeColors()
  const navigate = useNavigate()
  const [filterRead, setFilterRead] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { is_read: filterRead === 'all' ? undefined : filterRead === 'read', type: filterType === 'all' ? undefined : filterType }],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await mockDelay(600)
        let filteredItems = [...mockNotifications.items]
        if (filterRead === 'read') filteredItems = filteredItems.filter(n => n.is_read)
        else if (filterRead === 'unread') filteredItems = filteredItems.filter(n => !n.is_read)
        if (filterType !== 'all') filteredItems = filteredItems.filter(n => n.type === filterType)
        return { items: filteredItems, total: filteredItems.length, page: 1, page_size: 20 }
      }
      try {
        const params = {}
        if (filterRead === 'read') params.is_read = true
        if (filterRead === 'unread') params.is_read = false
        if (filterType !== 'all') params.type = filterType
        const response = await api.get('/notifications', { params })
        return response.data
      } catch {
        await mockDelay(400)
        return mockNotifications
      }
    },
    enabled: isOpen,
    refetchInterval: 30000,
  })

  const { data: stats } = useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: async () => {
      if (USE_MOCK_DATA) { await mockDelay(400); return mockNotificationStats }
      try { const response = await api.get('/notifications/stats'); return response.data }
      catch { await mockDelay(300); return mockNotificationStats }
    },
    enabled: isOpen,
    refetchInterval: 30000,
  })

  const markAsRead = useMutation({
    mutationFn: async (notificationId) => { await api.patch(`/notifications/${notificationId}`, { is_read: true }) },
    onSuccess: () => { queryClient.invalidateQueries(['notifications']); toast.success('Marcada como leida') },
  })

  const markAllAsRead = useMutation({
    mutationFn: async () => { await api.post('/notifications/mark-all-read') },
    onSuccess: () => { queryClient.invalidateQueries(['notifications']); toast.success('Todas marcadas como leidas') },
  })

  const deleteNotification = useMutation({
    mutationFn: async (notificationId) => { await api.delete(`/notifications/${notificationId}`) },
    onSuccess: () => { queryClient.invalidateQueries(['notifications']); toast.success('Notificacion eliminada') },
  })

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) markAsRead.mutate(notification.id)
    if (!notification.action_url) return

    let url = notification.action_url
    // Backend stores action_url as plain routes like /leads/{id} or /pipeline.
    // The actual app routes live under /app/*. Prepend the prefix if missing
    // (legacy notifications may not have it).
    if (url.startsWith('/') && !url.startsWith('/app/') && !url.startsWith('//') && !/^https?:/.test(url)) {
      url = '/app' + url
    }
    // Use SPA navigation so we don't reload the page (preserves state, faster)
    if (url.startsWith('/app/') || url.startsWith('/')) {
      navigate(url)
    } else {
      window.location.href = url
    }
    onClose()
  }

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) { window.addEventListener('keydown', handleEscape); return () => window.removeEventListener('keydown', handleEscape) }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const notifications = data?.items || []

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'hsla(220,60%,2%,0.4)' }} onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col shadow-2xl"
        style={{ backgroundColor: T.card, borderLeft: `1px solid ${T.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <h2 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-lg font-bold flex items-center gap-2">
              <Bell className="w-5 h-5" /> Notificaciones
            </h2>
            {stats && (
              <p style={{ color: T.fgMuted }} className="text-xs mt-1">
                {stats.unread} sin leer · {stats.total} total
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: showFilters ? `${T.cyan}20` : 'transparent', color: showFilters ? T.cyan : T.fgMuted }}
              title="Filtros">
              <Filter className="w-4 h-4" />
            </button>
            {stats?.unread > 0 && (
              <button onClick={() => markAllAsRead.mutate()}
                className="p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }}
                title="Marcar todas como leidas">
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button aria-label="Cerrar" onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 space-y-3" style={{ borderBottom: `1px solid ${T.border}`, backgroundColor: T.muted }}>
            <div>
              <label style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Estado</label>
              <div className="flex gap-2">
                {['all', 'unread', 'read'].map((filter) => (
                  <button key={filter} onClick={() => setFilterRead(filter)}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: filterRead === filter ? `${T.cyan}20` : T.bg,
                      color: filterRead === filter ? T.cyan : T.fgMuted,
                      border: `1px solid ${filterRead === filter ? T.cyan : T.border}`,
                    }}>
                    {filter === 'all' ? 'Todas' : filter === 'unread' ? 'Sin leer' : 'Leidas'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ color: T.fgMuted }} className="block text-xs font-medium mb-1">Tipo</label>
              <select id="notif-filter-type" value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filtrar por tipo" style={inputStyle}>
                <option value="all">Todos los tipos</option>
                <option value="system">Sistema</option>
                <option value="lead">Leads</option>
                <option value="action">Acciones</option>
                <option value="opportunity">Oportunidades</option>
                <option value="visit">Visitas</option>
                <option value="email">Emails</option>
                <option value="review">Seguimiento</option>
                <option value="automation">Automatizaciones</option>
              </select>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 mx-auto mb-2" style={{ borderBottom: `2px solid ${T.cyan}` }} />
                <p className="text-sm" style={{ color: T.fgMuted }}>Cargando...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <BellOff className="w-12 h-12 mb-3" style={{ color: T.fgMuted }} />
              <p style={{ color: T.fgMuted }} className="font-medium">No hay notificaciones</p>
              <p style={{ color: T.fgMuted }} className="text-sm mt-1 opacity-70">
                {filterRead === 'unread' ? 'No tienes notificaciones sin leer' : 'Cuando recibas notificaciones, apareceran aqui'}
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => {
                const typeColor = NOTIFICATION_TYPE_COLORS[notification.type] || T.fgMuted
                const priorityColor = PRIORITY_BORDER_COLORS[notification.priority] || T.fgMuted

                return (
                  <div
                    key={notification.id}
                    className="p-4 transition-colors relative"
                    style={{
                      backgroundColor: notification.is_read ? 'transparent' : `${T.cyan}05`,
                      borderBottom: `1px solid ${T.border}`,
                      borderLeft: `4px solid ${priorityColor}`,
                      cursor: notification.action_url ? 'pointer' : 'default',
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
                        {notification.type?.[0]?.toUpperCase() || 'N'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold"
                            style={{ color: notification.is_read ? T.fgMuted : T.fg }}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1" style={{ backgroundColor: T.cyan }} />
                          )}
                        </div>
                        <p className="text-sm mt-1 line-clamp-2" style={{ color: T.fgMuted }}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs" style={{ color: T.fgMuted }}>
                            {format(new Date(notification.created_at), 'dd MMM, HH:mm', { locale: es })}
                          </span>
                          {notification.priority === 'high' && (
                            <span className="text-xs font-medium" style={{ color: T.warning }}>Alta prioridad</span>
                          )}
                          {notification.priority === 'urgent' && (
                            <span className="text-xs font-bold" style={{ color: T.destructive }}>Urgente</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead.mutate(notification.id) }}
                            className="p-1.5 rounded transition-colors" style={{ color: T.fgMuted }}
                            title="Marcar como leida">
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Eliminar esta notificacion?')) deleteNotification.mutate(notification.id)
                          }}
                          className="p-1.5 rounded transition-colors" style={{ color: T.fgMuted }}
                          title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer stats */}
        {stats && stats.by_type && (
          <div className="p-4" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.muted }}>
            <div className="grid grid-cols-4 gap-2 text-center">
              {Object.entries(stats.by_type).slice(0, 4).map(([type, count]) => {
                const color = NOTIFICATION_TYPE_COLORS[type] || T.fgMuted
                return (
                  <div key={type} className="text-center">
                    <div className="text-xs font-bold" style={{ color }}>{count}</div>
                    <div className="text-[10px] capitalize" style={{ color: T.fgMuted }}>{type}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
