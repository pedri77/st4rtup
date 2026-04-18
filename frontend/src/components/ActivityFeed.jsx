/**
 * ActivityFeed — Unified timeline of all lead interactions.
 * Fetches from /reports/lead/{id}/activity-feed.
 */
import { useState, useEffect } from 'react'
import { reportsApi } from '@/services/api'
import { Mail, Calendar, CheckSquare, TrendingUp, FileText, Clock } from 'lucide-react'

const ICONS = {
  email: Mail,
  visit: Calendar,
  action: CheckSquare,
  opportunity: TrendingUp,
  offer: FileText,
}

const TYPE_COLORS = {
  email: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  visit: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  action: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
  opportunity: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
  offer: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
}

function formatRelativeTime(isoString) {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Hace ${days}d`
  return new Date(isoString).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export default function ActivityFeed({ leadId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await reportsApi.activityFeed(leadId, 30)
      setEvents(data.events || [])
      setLoaded(true)
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <button
          onClick={load}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          Cargar Activity Feed
        </button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Sin actividad registrada para este lead.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-600" />
        Activity Feed ({events.length})
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[18px] top-2 bottom-2 w-px" style={{ background: 'linear-gradient(180deg, #E2E8F0, transparent)' }} />

        <div className="space-y-1">
          {events.map((event, i) => {
            const Icon = ICONS[event.type] || FileText
            const colors = TYPE_COLORS[event.type] || TYPE_COLORS.action
            return (
              <div key={`${event.type}-${event.id}-${i}`}
                className="relative flex items-start gap-3 pl-1 py-2 px-2 rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                {/* Icon dot with ring */}
                <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg} border border-white dark:border-gray-800 shadow-sm`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {event.type}
                      </span>
                      <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                        {event.title}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 font-medium">
                      {formatRelativeTime(event.timestamp)}
                    </span>
                  </div>
                  {event.detail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 pl-0">
                      {event.detail}
                    </p>
                  )}
                  {event.notes && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic truncate">
                      {event.notes}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
