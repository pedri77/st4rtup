import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  MapPin, CheckSquare, DollarSign, Clock, Megaphone
} from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, isToday, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import { dashboardApi } from '@/services/api'
import { ListItemSkeleton } from '@/components/LoadingStates'

const T = {
  bg: 'hsl(220,60%,4%)', card: 'hsl(218,45%,8%)', muted: 'hsl(218,40%,12%)',
  border: 'hsl(217,40%,18%)', fg: 'hsl(210,40%,92%)', fgMuted: 'hsl(215,20%,55%)',
  cyan: 'hsl(190,100%,50%)', purple: 'hsl(270,62%,46%)', destructive: 'hsl(345,85%,61%)',
  success: 'hsl(160,100%,39%)', warning: 'hsl(20,100%,60%)',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const EVENT_COLORS = {
  visit: { color: T.cyan, bg: `${T.cyan}15`, border: `${T.cyan}40` },
  action: { color: T.warning, bg: `${T.warning}15`, border: `${T.warning}40` },
  opportunity: { color: T.success, bg: `${T.success}15`, border: `${T.success}40` },
  marketing: { color: T.purple, bg: `${T.purple}15`, border: `${T.purple}40` },
}

const EVENT_ICONS = { visit: MapPin, action: CheckSquare, opportunity: DollarSign, marketing: Megaphone }
const EVENT_LABELS = { visit: 'Visita', action: 'Accion', opportunity: 'Oportunidad', marketing: 'Marketing' }

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterType, setFilterType] = useState('all')

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const queryStart = format(calStart, 'yyyy-MM-dd')
  const queryEnd = format(calEnd, 'yyyy-MM-dd')

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', queryStart, queryEnd],
    queryFn: async () => { const res = await dashboardApi.calendar(queryStart, queryEnd); return res.data },
  })

  const days = useMemo(() => eachDayOfInterval({ start: calStart, end: calEnd }), [calStart.getTime(), calEnd.getTime()])

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events
    return events.filter(e => e.type === filterType)
  }, [events, filterType])

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const event of filteredEvents) {
      if (!event.date) continue
      const dateKey = event.date.slice(0, 10)
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(event)
    }
    return map
  }, [filteredEvents])

  const selectedDateEvents = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd')
    return eventsByDate[key] || []
  }, [eventsByDate, selectedDate])

  const goToPrev = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNext = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => { setCurrentMonth(new Date()); setSelectedDate(new Date()) }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: fontDisplay, color: T.fg }}>
            Calendario de Actividad
          </h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Visitas, acciones, oportunidades y eventos de marketing</p>
        </div>

        <div className="flex items-center gap-2">
          {[
            { key: 'all', label: 'Todo' },
            { key: 'visit', label: 'Visitas' },
            { key: 'action', label: 'Acciones' },
            { key: 'opportunity', label: 'Deals' },
            { key: 'marketing', label: 'Marketing' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                fontFamily: fontDisplay,
                ...(filterType === f.key
                  ? { backgroundColor: `${T.cyan}15`, color: T.cyan, border: `1px solid ${T.cyan}40` }
                  : { color: T.fgMuted, border: '1px solid transparent' }
                )
              }}>
              {f.key !== 'all' && (
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: EVENT_COLORS[f.key]?.color }} />
              )}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar grid */}
        <div className="xl:col-span-3 rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold capitalize" style={{ fontFamily: fontDisplay, color: T.fg }}>
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={goToToday} className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                style={{ color: T.fgMuted }}>Hoy</button>
              <button onClick={goToPrev} className="p-1.5 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={goToNext} className="p-1.5 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => (
              <div key={d} className="text-center text-xs py-2" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>{d}</div>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3 py-8">{[...Array(4)].map((_, i) => <ListItemSkeleton key={i} />)}</div>
          ) : (
            <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: T.border }}>
              {days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const dayEvents = eventsByDate[dateKey] || []
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isSelected = isSameDay(day, selectedDate)
                const today = isToday(day)

                return (
                  <button key={dateKey} onClick={() => setSelectedDate(day)}
                    className="min-h-[80px] p-1.5 text-left transition-colors"
                    style={{
                      backgroundColor: isSelected ? `${T.cyan}10` : T.card,
                      ...(isSelected ? { boxShadow: `inset 0 0 0 1px ${T.cyan}40` } : {}),
                      opacity: isCurrentMonth ? 1 : 0.4,
                    }}>
                    <div className="text-xs font-medium mb-1"
                      style={today
                        ? { width: 24, height: 24, backgroundColor: T.cyan, color: T.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }
                        : { color: isSelected ? T.cyan : T.fgMuted }
                      }>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((evt, i) => {
                        const colors = EVENT_COLORS[evt.type]
                        return (
                          <div key={i} className="text-[10px] leading-tight truncate px-1 py-0.5 rounded"
                            style={{ backgroundColor: colors.bg, color: colors.color }}>
                            {evt.title}
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] px-1" style={{ color: T.fgMuted }}>+{dayEvents.length - 3} mas</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected day detail */}
        <div className="xl:col-span-1 rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-base font-semibold mb-1" style={{ fontFamily: fontDisplay, color: T.fg }}>
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </h3>
          <p className="text-xs mb-4" style={{ fontFamily: fontMono, color: T.fgMuted }}>
            {selectedDateEvents.length} evento{selectedDateEvents.length !== 1 ? 's' : ''}
          </p>

          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="w-10 h-10 mx-auto mb-2" style={{ color: T.fgMuted }} />
              <p className="text-sm" style={{ color: T.fgMuted }}>Sin eventos este dia</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {selectedDateEvents.map((evt, i) => {
                const colors = EVENT_COLORS[evt.type]
                const Icon = EVENT_ICONS[evt.type]
                return (
                  <div key={i} className="p-3 rounded-lg"
                    style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 mt-0.5" style={{ color: colors.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: colors.color }}>{evt.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: T.fgMuted }}>
                          {EVENT_LABELS[evt.type]}{evt.lead && ` - ${evt.lead}`}
                        </p>
                        {evt.type === 'visit' && evt.date && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: T.fgMuted }}>
                            <Clock className="w-3 h-3" />{format(parseISO(evt.date), 'HH:mm')}
                          </div>
                        )}
                        {evt.type === 'action' && evt.status && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: evt.status === 'completed' ? `${T.success}15` : evt.status === 'overdue' ? `${T.destructive}15` : `${T.fgMuted}15`,
                              color: evt.status === 'completed' ? T.success : evt.status === 'overdue' ? T.destructive : T.fgMuted,
                            }}>
                            {evt.status}
                          </span>
                        )}
                        {evt.type === 'marketing' && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {evt.event_type && (
                              <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${T.purple}20`, color: T.purple }}>
                                {evt.event_type.replace(/_/g, ' ')}
                              </span>
                            )}
                            {evt.channel && (
                              <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${T.fgMuted}15`, color: T.fgMuted }}>
                                {evt.channel}
                              </span>
                            )}
                            {evt.status && (
                              <span className="px-1.5 py-0.5 rounded text-[10px]" style={{
                                backgroundColor: evt.status === 'completed' ? `${T.success}15` : `${T.fgMuted}15`,
                                color: evt.status === 'completed' ? T.success : T.fgMuted,
                              }}>
                                {evt.status}
                              </span>
                            )}
                          </div>
                        )}
                        {evt.type === 'opportunity' && evt.value > 0 && (
                          <p className="text-xs mt-1.5 font-medium" style={{ fontFamily: fontMono, color: T.success }}>
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(evt.value)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filteredEvents.length > 0 && (
            <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
              <h4 className="text-xs font-semibold uppercase mb-3" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Resumen del mes</h4>
              <div className="space-y-2">
                {['visit', 'action', 'opportunity', 'marketing'].map(type => {
                  const count = filteredEvents.filter(e => e.type === type).length
                  if (count === 0 && filterType !== 'all' && filterType !== type) return null
                  const colors = EVENT_COLORS[type]
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.color }} />
                        <span className="text-xs" style={{ color: T.fgMuted }}>{EVENT_LABELS[type]}s</span>
                      </div>
                      <span className="text-xs font-medium" style={{ fontFamily: fontMono, color: colors.color }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
