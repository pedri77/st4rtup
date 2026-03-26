import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Calendar, ArrowLeft, Plus, ChevronLeft, ChevronRight,
  Edit3, Trash2, X, Upload, Download, Loader2, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { marketingCalendarApi, campaignsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const EVENT_TYPE_CONFIG = {
  seo_article: { label: 'Artículo SEO', color: T.warning },
  campaign_launch: { label: 'Lanzamiento', color: T.cyan },
  email_newsletter: { label: 'Newsletter', color: 'hsl(210,80%,55%)' },
  youtube_video: { label: 'Vídeo YouTube', color: T.destructive },
  webinar_event: { label: 'Webinar', color: T.purple },
  social_post: { label: 'Social Post', color: 'hsl(330,70%,55%)' },
}

const INITIAL_FORM = {
  title: '',
  event_type: 'seo_article',
  channel: '',
  description: '',
  start_date: '',
  end_date: '',
  all_day: true,
  color: '',
  campaign_id: '',
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function MarketingCalendarPage() {
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [selectedDay, setSelectedDay] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Fetch events for current month
  const startFrom = new Date(year, month, 1).toISOString()
  const startUntil = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  const { data } = useQuery({
    queryKey: ['marketing', 'calendar', year, month],
    queryFn: () => marketingCalendarApi.list({
      start_from: startFrom,
      start_until: startUntil,
      page_size: 200,
    }).then(r => r.data),
  })

  const { data: campaignsData } = useQuery({
    queryKey: ['marketing', 'campaigns', 'all'],
    queryFn: () => campaignsApi.list({ page_size: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => marketingCalendarApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'calendar'] })
      toast.success('Evento creado')
      closeModal()
    },
    onError: () => toast.error('Error al crear evento'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => marketingCalendarApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'calendar'] })
      toast.success('Evento actualizado')
      closeModal()
    },
    onError: () => toast.error('Error al actualizar evento'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => marketingCalendarApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'calendar'] })
      toast.success('Evento eliminado')
    },
    onError: () => toast.error('Error al eliminar evento'),
  })

  // Notion sync
  const { data: notionStatus } = useQuery({
    queryKey: ['notion-status'],
    queryFn: () => marketingCalendarApi.notionStatus().then(r => r.data),
    staleTime: 60000,
  })

  const notionPushMutation = useMutation({
    mutationFn: () => marketingCalendarApi.notionPush({
      start_from: startFrom,
      start_until: startUntil,
    }),
    onSuccess: (res) => {
      const d = res.data
      toast.success(`Notion: ${d.pushed} eventos enviados${d.errors ? `, ${d.errors} errores` : ''}`)
    },
    onError: () => toast.error('Error al enviar a Notion'),
  })

  const notionPullMutation = useMutation({
    mutationFn: () => marketingCalendarApi.notionPull({
      start_after: new Date(year, month, 1).toISOString().slice(0, 10),
      start_before: new Date(year, month + 1, 0).toISOString().slice(0, 10),
    }),
    onSuccess: (res) => {
      const d = res.data
      queryClient.invalidateQueries({ queryKey: ['marketing', 'calendar'] })
      toast.success(`Notion: ${d.imported} importados, ${d.skipped} omitidos`)
    },
    onError: () => toast.error('Error al importar desde Notion'),
  })

  function closeModal() {
    setShowModal(false)
    setEditingEvent(null)
    setForm(INITIAL_FORM)
  }

  function openCreate(dayDate) {
    const dateStr = dayDate ? formatDateForInput(dayDate) : ''
    setForm({ ...INITIAL_FORM, start_date: dateStr ? `${dateStr}T09:00` : '' })
    setEditingEvent(null)
    setShowModal(true)
  }

  function openEdit(event) {
    setEditingEvent(event)
    setForm({
      title: event.title,
      event_type: event.event_type,
      channel: event.channel || '',
      description: event.description || '',
      start_date: event.start_date ? event.start_date.slice(0, 16) : '',
      end_date: event.end_date ? event.end_date.slice(0, 16) : '',
      all_day: event.all_day,
      color: event.color || '',
      campaign_id: event.campaign_id || '',
    })
    setShowModal(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      channel: form.channel || null,
      description: form.description || null,
      color: form.color || null,
      campaign_id: form.campaign_id || null,
    }

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function formatDateForInput(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    let startDay = firstDay.getDay() - 1
    if (startDay < 0) startDay = 6 // Monday is 0

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    // Padding before
    for (let i = 0; i < startDay; i++) {
      days.push({ date: null, events: [] })
    }

    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayEvents = (data?.items || []).filter(ev => {
        const evDate = ev.start_date?.slice(0, 10)
        return evDate === dateStr
      })
      days.push({ date: new Date(year, month, d), day: d, events: dayEvents })
    }

    return days
  }, [year, month, data])

  const events = data?.items || []
  const campaigns = campaignsData?.items || []
  const today = new Date()
  const todayStr = formatDateForInput(today)

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })

  // Events for selected day
  const selectedDayEvents = selectedDay
    ? events.filter(ev => ev.start_date?.slice(0, 10) === formatDateForInput(selectedDay))
    : []

  const inputStyle = {
    width: '100%', padding: '8px 12px', backgroundColor: T.muted, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none',
  }
  const selectStyle = { ...inputStyle }
  const labelStyle = { display: 'block', fontSize: 14, color: T.fgMuted, marginBottom: 4 }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/app/marketing" style={{ color: T.fgMuted, transition: 'color .2s' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, fontFamily: fontDisplay, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar className="w-6 h-6" style={{ color: T.warning }} />
              Calendario Marketing
            </h1>
            <p style={{ fontSize: 13, color: T.fgMuted, marginTop: 2 }}>
              {events.length} eventos este mes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {notionStatus?.connected && (
            <>
              <button
                onClick={() => notionPullMutation.mutate()}
                disabled={notionPullMutation.isPending}
                title="Importar eventos desde Notion"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', backgroundColor: T.muted, color: T.fg, borderRadius: 8, fontSize: 12, fontWeight: 500, border: `1px solid ${T.border}`, cursor: 'pointer', opacity: notionPullMutation.isPending ? 0.5 : 1 }}
              >
                {notionPullMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Notion Pull
              </button>
              <button
                onClick={() => notionPushMutation.mutate()}
                disabled={notionPushMutation.isPending}
                title="Enviar eventos del mes a Notion"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', backgroundColor: T.muted, color: T.fg, borderRadius: 8, fontSize: 12, fontWeight: 500, border: `1px solid ${T.border}`, cursor: 'pointer', opacity: notionPushMutation.isPending ? 0.5 : 1 }}
              >
                {notionPushMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Notion Push
              </button>
            </>
          )}
          {notionStatus && !notionStatus.connected && (
            <span className="flex items-center gap-1" style={{ fontSize: 10, color: T.fgMuted }} title={notionStatus.error}>
              <AlertTriangle className="w-3 h-3" /> Notion no configurado
            </span>
          )}
          <button
            onClick={() => openCreate(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            <Plus className="w-4 h-4" /> Nuevo Evento
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} style={{ padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.fg, textTransform: 'capitalize', fontFamily: fontDisplay }}>{monthName}</h2>
        <button onClick={nextMonth} style={{ padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5" style={{ fontSize: 12, color: T.fgMuted }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: v.color, display: 'inline-block' }} />
            {v.label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${T.border}` }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, color: T.fgMuted, fontWeight: 500, padding: 8, fontFamily: fontMono }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, idx) => {
            const isToday = cell.date && formatDateForInput(cell.date) === todayStr
            const isSelected = cell.date && selectedDay && formatDateForInput(cell.date) === formatDateForInput(selectedDay)

            return (
              <div
                key={idx}
                onClick={() => cell.date && setSelectedDay(cell.date)}
                style={{
                  minHeight: 80,
                  borderBottom: `1px solid ${T.border}40`,
                  borderRight: `1px solid ${T.border}40`,
                  padding: 6,
                  cursor: cell.date ? 'pointer' : 'default',
                  backgroundColor: !cell.date ? `${T.bg}50` : isSelected ? 'rgba(0,188,212,0.1)' : 'transparent',
                  transition: 'background .15s',
                }}
                className="md:min-h-[100px]"
              >
                {cell.date && (
                  <>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, fontSize: 12, borderRadius: '50%', marginBottom: 4,
                      backgroundColor: isToday ? T.cyan : 'transparent',
                      color: isToday ? '#fff' : T.fg,
                      fontWeight: isToday ? 700 : 400,
                      fontFamily: fontMono,
                    }}>
                      {cell.day}
                    </span>
                    <div className="space-y-0.5">
                      {cell.events.slice(0, 3).map(ev => {
                        const config = EVENT_TYPE_CONFIG[ev.event_type] || { color: T.fgMuted }
                        return (
                          <div
                            key={ev.id}
                            style={{ fontSize: 10, color: '#fff', padding: '2px 4px', borderRadius: 4, backgroundColor: config.color + 'cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        )
                      })}
                      {cell.events.length > 3 && (
                        <span style={{ fontSize: 10, color: T.fgMuted }}>+{cell.events.length - 3} más</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ color: T.fg, fontWeight: 600, fontFamily: fontDisplay }}>
              {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button
              onClick={() => openCreate(selectedDay)}
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: T.cyan, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
            >
              <Plus className="w-3 h-3" /> Añadir evento
            </button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <p style={{ fontSize: 14, color: T.fgMuted }}>Sin eventos</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map(ev => {
                const config = EVENT_TYPE_CONFIG[ev.event_type] || { label: ev.event_type, color: T.fgMuted }
                return (
                  <div key={ev.id} className="flex items-center gap-3 p-2" style={{ backgroundColor: T.bg, borderRadius: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: config.color, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, color: T.fg, fontWeight: 500 }}>{ev.title}</p>
                      <p style={{ fontSize: 12, color: T.fgMuted }}>
                        {config.label}
                        {ev.channel && ` · ${ev.channel}`}
                        {!ev.all_day && ev.start_date && ` · ${new Date(ev.start_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                      {ev.description && <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 2 }}>{ev.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(ev)}
                        style={{ padding: 4, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar "${ev.title}"?`)) deleteMutation.mutate(ev.id)
                        }}
                        style={{ padding: 4, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, width: '100%', maxWidth: 512, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${T.border}` }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>
                {editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
              </h2>
              <button onClick={closeModal} style={{ padding: 4, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: T.fgMuted }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label style={labelStyle} htmlFor="marketingcalendar-field-1">Título *</label>
                <input id="marketingcalendar-field-1" type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  style={inputStyle}
                  placeholder="Ej: Artículo Growth para blog"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="marketingcalendar-field-2">Tipo *</label>
                  <select id="marketingcalendar-field-2" value={form.event_type}
                    onChange={(e) => setForm(f => ({ ...f, event_type: e.target.value }))}
                    style={selectStyle}
                  >
                    {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="marketingcalendar-field-3">Canal</label>
                  <input id="marketingcalendar-field-3" type="text"
                    value={form.channel}
                    onChange={(e) => setForm(f => ({ ...f, channel: e.target.value }))}
                    style={inputStyle}
                    placeholder="Blog, LinkedIn..."
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="marketingcalendar-field-4">Descripción</label>
                <textarea id="marketingcalendar-field-4" rows={2}
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="marketingcalendar-field-5">Inicio *</label>
                  <input id="marketingcalendar-field-5" type="datetime-local"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="marketingcalendar-field-6">Fin</label>
                  <input id="marketingcalendar-field-6" type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2" style={{ fontSize: 14, color: T.fgMuted }}>
                <input
                  type="checkbox"
                  checked={form.all_day}
                  onChange={(e) => setForm(f => ({ ...f, all_day: e.target.checked }))}
                  style={{ accentColor: T.cyan }}
                />
                Todo el día
              </label>

              <div>
                <label style={labelStyle} htmlFor="marketingcalendar-field-7">Campaña asociada</label>
                <select id="marketingcalendar-field-7" value={form.campaign_id}
                  onChange={(e) => setForm(f => ({ ...f, campaign_id: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">Sin campaña</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ padding: '8px 16px', color: T.fgMuted, fontSize: 14, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  style={{ padding: '8px 16px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', opacity: (createMutation.isPending || updateMutation.isPending) ? 0.5 : 1 }}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Guardando...'
                    : editingEvent ? 'Guardar' : 'Crear Evento'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
