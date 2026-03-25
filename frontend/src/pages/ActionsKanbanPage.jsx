import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, List, Loader2, Clock, CheckCircle, Play, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { actionsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const COLUMNS = [
  { id: 'pending', label: 'Pendiente', color: T.warning, icon: Clock },
  { id: 'in_progress', label: 'En curso', color: T.cyan, icon: Play },
  { id: 'completed', label: 'Completada', color: T.success, icon: CheckCircle },
  { id: 'overdue', label: 'Vencida', color: T.destructive, icon: AlertTriangle },
]

const PRIORITY_STYLES = {
  urgent: { bg: `${T.destructive}18`, text: T.destructive },
  high: { bg: `${T.warning}18`, text: T.warning },
  medium: { bg: `${T.warning}18`, text: T.warning },
  low: { bg: `${T.fgMuted}18`, text: T.fgMuted },
}

export default function ActionsKanbanPage() {
  const queryClient = useQueryClient()
  const [draggedAction, setDraggedAction] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['actions-kanban'],
    queryFn: () => actionsApi.list({ page_size: 100 }).then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => actionsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions-kanban'] })
      toast.success('Acción actualizada')
    },
    onError: (error) => {
      toast.error(`Error: ${error.response?.data?.detail || 'No se pudo mover la acción'}`)
    },
  })

  const actions = data?.items || data || []

  const getColumnActions = (columnId) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return actions.filter(a => {
      const status = (typeof a.status === 'string' ? a.status : a.status?.value || String(a.status || '')).toLowerCase()
      if (columnId === 'overdue') {
        return (status === 'pending' || status === 'in_progress') && a.due_date && new Date(a.due_date + 'T23:59:59') < today
      }
      if (columnId === 'pending') {
        return status === 'pending' && (!a.due_date || new Date(a.due_date) >= today)
      }
      return status === columnId
    })
  }

  const handleDragStart = (e, action) => {
    setDraggedAction(action)
    e.dataTransfer.effectAllowed = 'move'
    // Required for Firefox
    e.dataTransfer.setData('text/plain', action.id)
  }

  const handleDrop = (e, columnId) => {
    e.preventDefault()
    if (!draggedAction) return
    const newStatus = columnId === 'overdue' ? 'pending' : columnId
    const currentStatus = (draggedAction.status || '').toLowerCase()
    if (currentStatus !== newStatus) {
      updateMutation.mutate({ id: draggedAction.id, status: newStatus })
    }
    setDraggedAction(null)
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-4" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Acciones — Kanban</h1>
        <Link to="/app/actions" className="btn-secondary text-xs flex items-center gap-1">
          <List className="w-3.5 h-3.5" /> Vista lista
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ minHeight: '60vh' }}>
        {COLUMNS.map(col => {
          const colActions = getColumnActions(col.id)
          const ColIcon = col.icon
          return (
            <div
              key={col.id}
              className="rounded-xl border-2 border-dashed p-3 transition-colors"
              style={{
                borderColor: draggedAction ? col.color : `${col.color}4D`,
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <ColIcon className="w-4 h-4" style={{ color: col.color }} />
                <h3 className="text-sm font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>{col.label}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ backgroundColor: T.muted, color: T.fgMuted, fontFamily: fontMono }}>{colActions.length}</span>
              </div>

              <div className="space-y-2">
                {colActions.map(action => {
                  const pStyle = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium
                  return (
                    <div
                      key={action.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, action)}
                      onDragEnd={() => setDraggedAction(null)}
                      className={clsx(
                        'rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all border',
                        draggedAction?.id === action.id && 'opacity-40 scale-95'
                      )}
                      style={{ backgroundColor: T.card, borderColor: T.border }}
                    >
                      <p className="text-sm mb-1" style={{ color: T.fg }}>{action.title}</p>
                      <div className="flex items-center gap-2">
                        {action.priority && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: pStyle.bg, color: pStyle.text }}>
                            {action.priority}
                          </span>
                        )}
                        {action.due_date && (
                          <span className="text-[10px]" style={{ fontFamily: fontMono, color: new Date(action.due_date) < new Date() ? T.destructive : T.fgMuted }}>
                            {new Date(action.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {colActions.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: T.fgMuted }}>Arrastra aquí</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
