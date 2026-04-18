import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { actionsApi } from '@/services/api'
import { useLeadsSelect } from '@/hooks/useLeadsSelect'
import { Plus, Calendar, User, AlertCircle, CheckCircle2, Clock, X, GripVertical, Play, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { mockActions, mockDelay, USE_MOCK_DATA } from '@/mocks/mockData'
import ExportButton from '@/components/ExportButton'
import { formatDateForExport } from '@/utils/export'
import { ListItemSkeleton } from '@/components/LoadingStates'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'


/* ── St4rtup Design Tokens ── */


const priorityConfig = {
  low: { label: 'LOW', color: T.fgMuted, dot: T.fgMuted },
  medium: { label: 'MED', color: T.cyan, dot: T.cyan },
  high: { label: 'HIGH', color: T.warning, dot: T.warning },
  critical: { label: 'CRIT', color: T.destructive, dot: T.destructive },
}

const columnConfig = {
  overdue: { label: 'OVERDUE', accent: T.destructive },
  today: { label: 'TODAY', accent: T.warning },
  pending: { label: 'PENDING', accent: T.fgMuted },
  in_progress: { label: 'IN PROGRESS', accent: T.cyan },
  completed: { label: 'COMPLETED', accent: T.success },
}

export default function ActionsPage() {
  const T = useThemeColors()
  const [showModal, setShowModal] = useState(false)
  const [editingAction, setEditingAction] = useState(null)
  const [draggedAction, setDraggedAction] = useState(null)
  const queryClient = useQueryClient()

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['actions'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        // MOCK mode
        await mockDelay(600)
        return mockActions.items
      }
      try {
        return await actionsApi.list().then(r => r.data.items || r.data || [])
      } catch (err) {
        // Backend unavailable, using MOCK data
        await mockDelay(400)
        return mockActions.items
      }
    },
  })

  const createAction = useMutation({
    mutationFn: (data) => actionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['actions'])
      toast.success('Accion creada')
      setShowModal(false)
    },
    onError: (error) => {
      toast.error(`Error: ${error.response?.data?.detail || 'No se pudo crear la accion'}`)
    },
  })

  const updateAction = useMutation({
    mutationFn: ({ id, data }) => actionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['actions'])
      toast.success('Accion actualizada')
    },
    onError: (error) => {
      toast.error(`Error: ${error.response?.data?.detail || 'No se pudo actualizar'}`)
    },
  })

  const deleteAction = useMutation({
    mutationFn: (id) => actionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['actions'])
      toast.success('Accion eliminada')
    },
  })

  const today = new Date().toISOString().split('T')[0]

  const overdueActions = actions.filter(a =>
    a.due_date && a.due_date < today && a.status !== 'completed' && a.status !== 'cancelled'
  )
  const todayActions = actions.filter(a =>
    a.due_date === today && a.status !== 'completed' && a.status !== 'cancelled'
  )
  const pendingActions = actions.filter(a =>
    a.status === 'pending' && (!a.due_date || a.due_date > today)
  )
  const inProgressActions = actions.filter(a =>
    a.status === 'in_progress' && (!a.due_date || a.due_date > today)
  )
  const completedActions = actions.filter(a => a.status === 'completed')

  const handleStatusChange = (action, newStatus) => {
    updateAction.mutate({
      id: action.id,
      data: {
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null,
      },
    })
  }

  const handleDragStart = (action) => setDraggedAction(action)
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const handleDrop = (e, targetStatus) => {
    e.preventDefault()
    if (!draggedAction || draggedAction.status === targetStatus) { setDraggedAction(null); return }
    handleStatusChange(draggedAction, targetStatus)
    setDraggedAction(null)
  }
  const handleDragEnd = () => setDraggedAction(null)

  const totalStats = [
    { label: 'TOTAL', value: actions.length },
    { label: 'OVERDUE', value: overdueActions.length, color: T.destructive },
    { label: 'TODAY', value: todayActions.length, color: T.warning },
    { label: 'ACTIVE', value: inProgressActions.length, color: T.cyan },
  ]

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>
            Acciones
          </h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted, fontFamily: fontMono }}>
            Task management & tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={actions || []}
            filename="acciones"
            transform={(a) => ({
              'Titulo': a.title,
              'Tipo': a.action_type || '',
              'Estado': a.status,
              'Prioridad': a.priority || '',
              'Fecha Limite': formatDateForExport(a.due_date),
              'Asignado a': a.assigned_to || '',
              'Resultado': a.result || '',
              'Creado': formatDateForExport(a.created_at),
            })}
            size="sm"
          />
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              fontFamily: fontDisplay,
              backgroundColor: T.cyan,
              color: T.bg,
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 20px ${T.cyan}40`}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <Plus className="w-4 h-4" /> Nueva Accion
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {totalStats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg p-3 transition-all"
            style={{
              backgroundColor: T.card,
              border: `1px solid ${T.border}`,
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: T.fgMuted, fontFamily: fontDisplay }}>
              {s.label}
            </p>
            <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: s.color || T.fg }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {overdueActions.length > 0 && (
        <div
          className="mb-4 rounded-lg p-4 flex items-start gap-3"
          style={{ backgroundColor: `${T.destructive}10`, border: `1px solid ${T.destructive}30` }}
        >
          <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: T.destructive }} />
          <div>
            <h3 className="font-semibold text-sm" style={{ fontFamily: fontDisplay, color: T.destructive }}>
              {overdueActions.length} {overdueActions.length === 1 ? 'accion vencida' : 'acciones vencidas'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: `${T.destructive}cc` }}>
              Requieren atencion inmediata
            </p>
          </div>
        </div>
      )}

      {todayActions.length > 0 && (
        <div
          className="mb-4 rounded-lg p-4 flex items-start gap-3"
          style={{ backgroundColor: `${T.warning}10`, border: `1px solid ${T.warning}30` }}
        >
          <Clock className="w-5 h-5 mt-0.5" style={{ color: T.warning }} />
          <div>
            <h3 className="font-semibold text-sm" style={{ fontFamily: fontDisplay, color: T.warning }}>
              {todayActions.length} {todayActions.length === 1 ? 'accion para hoy' : 'acciones para hoy'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: `${T.warning}cc` }}>
              Vencen hoy
            </p>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <ListItemSkeleton key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {overdueActions.length > 0 && (
            <KanbanColumn
              config={columnConfig.overdue}
              count={overdueActions.length}
              actions={overdueActions}
              targetStatus="in_progress"
              draggedAction={draggedAction}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onStatusChange={handleStatusChange}
              onDelete={(id) => deleteAction.mutate(id)}
            />
          )}

          <KanbanColumn
            config={columnConfig.pending}
            count={pendingActions.length}
            actions={pendingActions}
            targetStatus="pending"
            draggedAction={draggedAction}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onStatusChange={handleStatusChange}
            onDelete={(id) => deleteAction.mutate(id)}
          />

          <KanbanColumn
            config={columnConfig.in_progress}
            count={inProgressActions.length}
            actions={inProgressActions}
            targetStatus="in_progress"
            draggedAction={draggedAction}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onStatusChange={handleStatusChange}
            onDelete={(id) => deleteAction.mutate(id)}
          />

          <KanbanColumn
            config={columnConfig.completed}
            count={completedActions.length}
            actions={completedActions.slice(0, 10)}
            targetStatus="completed"
            draggedAction={draggedAction}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onStatusChange={handleStatusChange}
            onDelete={(id) => deleteAction.mutate(id)}
            isCompleted
          />
        </div>
      )}

      {showModal && (
        <CreateActionModal
          onClose={() => setShowModal(false)}
          onSubmit={(data) => createAction.mutate(data)}
          isLoading={createAction.isPending}
        />
      )}
    </div>
  )
}

function KanbanColumn({ config, count, actions, targetStatus, draggedAction, onDragStart, onDragOver, onDrop, onDragEnd, onStatusChange, onDelete, isCompleted = false }) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    if (draggedAction) { setIsDragOver(true); onDragOver(e) }
  }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false) }
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); onDrop(e, targetStatus) }

  return (
    <div className="flex flex-col">
      {/* Column Header */}
      <div
        className="rounded-t-lg px-4 py-3 flex items-center justify-between"
        style={{
          backgroundColor: T.card,
          borderTop: `2px solid ${config.accent}`,
          borderLeft: `1px solid ${T.border}`,
          borderRight: `1px solid ${T.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.accent }}
          />
          <span
            className="text-xs font-bold uppercase tracking-[0.15em]"
            style={{ fontFamily: fontDisplay, color: T.fg }}
          >
            {config.label}
          </span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ fontFamily: fontMono, color: config.accent, backgroundColor: `${config.accent}15` }}
        >
          {count}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        className="space-y-2 flex-1 rounded-b-lg p-3 transition-all min-h-[200px]"
        style={{
          backgroundColor: isDragOver ? `${T.cyan}08` : `${T.card}80`,
          border: isDragOver ? `1px dashed ${T.cyan}60` : `1px solid ${T.border}40`,
          borderTop: 'none',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {actions.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: T.fgMuted }}>
            {isDragOver ? 'Drop here' : 'No actions'}
          </p>
        ) : (
          actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              isDragging={draggedAction?.id === action.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              isCompleted={isCompleted}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ActionCard({ action, isDragging, onDragStart, onDragEnd, onStatusChange, onDelete, isCompleted }) {
  const [showActions, setShowActions] = useState(false)
  const pConfig = priorityConfig[action.priority] || priorityConfig.medium

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const day = String(date.getDate()).padStart(2, '0')
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
    return `${day}-${months[date.getMonth()]}`
  }

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(action) }}
      onDragEnd={onDragEnd}
      className="rounded-lg p-3 transition-all cursor-move relative group"
      style={{
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        setShowActions(true)
        if (!isDragging) {
          e.currentTarget.style.borderColor = `${T.cyan}40`
          e.currentTarget.style.boxShadow = `0 0 15px ${T.cyan}10`
        }
      }}
      onMouseLeave={(e) => {
        setShowActions(false)
        e.currentTarget.style.borderColor = T.border
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Top row: Priority + Delete */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3" style={{ color: T.fgMuted }} />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
            style={{
              fontFamily: fontDisplay,
              color: pConfig.color,
              backgroundColor: `${pConfig.color}15`,
              border: `1px solid ${pConfig.color}30`,
            }}
          >
            {pConfig.label}
          </span>
        </div>
        {showActions && (
          <button aria-label="Cerrar"
            onClick={() => onDelete(action.id)}
            className="transition-colors"
            style={{ color: T.fgMuted }}
            onMouseEnter={(e) => e.currentTarget.style.color = T.destructive}
            onMouseLeave={(e) => e.currentTarget.style.color = T.fgMuted}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Title */}
      <h4
        className="font-semibold text-sm mb-2 line-clamp-2 leading-snug"
        style={{ fontFamily: fontDisplay, color: T.fg }}
      >
        {action.title}
      </h4>

      {/* Description */}
      {action.description && (
        <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: T.fgMuted }}>
          {action.description}
        </p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs mb-3" style={{ color: T.fgMuted }}>
        <div className="flex items-center gap-1" style={{ fontFamily: fontMono }}>
          <Calendar className="w-3 h-3" />
          {formatDate(action.due_date)}
        </div>
        {action.assigned_to && (
          <div className="flex items-center gap-1 truncate">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{action.assigned_to}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isCompleted && (
        <div className="flex gap-2">
          {action.status === 'pending' && (
            <button
              onClick={() => onStatusChange(action, 'in_progress')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-all"
              style={{
                fontFamily: fontDisplay,
                color: T.cyan,
                backgroundColor: `${T.cyan}10`,
                border: `1px solid ${T.cyan}30`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${T.cyan}20`
                e.currentTarget.style.boxShadow = `0 0 10px ${T.cyan}15`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${T.cyan}10`
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <Play className="w-3 h-3" /> INICIAR
            </button>
          )}
          {action.status === 'in_progress' && (
            <button
              onClick={() => onStatusChange(action, 'completed')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-semibold transition-all"
              style={{
                fontFamily: fontDisplay,
                color: T.success,
                backgroundColor: `${T.success}10`,
                border: `1px solid ${T.success}30`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${T.success}20`
                e.currentTarget.style.boxShadow = `0 0 10px ${T.success}15`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${T.success}10`
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <CheckCircle2 className="w-3 h-3" /> COMPLETAR
            </button>
          )}
        </div>
      )}

      {isCompleted && action.completed_date && (
        <p className="text-xs flex items-center gap-1" style={{ color: T.success, fontFamily: fontMono }}>
          <CheckCircle2 className="w-3 h-3" /> {formatDate(action.completed_date)}
        </p>
      )}
    </div>
  )
}

function CreateActionModal({ onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    action_type: '',
    priority: 'medium',
    due_date: '',
    assigned_to: '',
    lead_id: '',
  })

  const { leads } = useLeadsSelect()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.title || !formData.due_date || !formData.lead_id) {
      toast.error('Completa los campos requeridos')
      return
    }
    onSubmit(formData)
  }

  const inputStyle = {
    backgroundColor: T.muted,
    border: `1px solid ${T.border}`,
    color: T.fg,
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  }

  const labelStyle = {
    fontFamily: fontDisplay,
    color: T.fgMuted,
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '0.25rem',
    display: 'block',
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div
        className="rounded-lg max-w-lg w-full p-6"
        style={{
          backgroundColor: T.card,
          border: `1px solid ${T.border}`,
          boxShadow: `0 0 40px ${T.cyan}08`,
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>
              Nueva Accion
            </h2>
            <div className="w-12 h-0.5 mt-1" style={{ backgroundColor: T.cyan }} />
          </div>
          <button aria-label="Cerrar"
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: T.fgMuted }}
            onMouseEnter={(e) => e.currentTarget.style.color = T.fg}
            onMouseLeave={(e) => e.currentTarget.style.color = T.fgMuted}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lead */}
          <div>
            <label htmlFor="action-lead" style={labelStyle}>
              Lead <span style={{ color: T.destructive }}>*</span>
            </label>
            <select
              id="action-lead"
              value={formData.lead_id}
              onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
              style={inputStyle}
              required
            >
              <option value="">Selecciona un lead...</option>
              {leads.map(lead => (
                <option key={lead.id} value={lead.id}>{lead.company_name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="action-title" style={labelStyle}>
              Titulo <span style={{ color: T.destructive }}>*</span>
            </label>
            <input
              id="action-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={inputStyle}
              placeholder="Ej: Enviar propuesta comercial"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="action-description" style={labelStyle}>
              Descripcion
            </label>
            <textarea
              id="action-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ ...inputStyle, resize: 'vertical' }}
              rows={3}
              placeholder="Detalles de la accion..."
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="action-priority" style={labelStyle}>
                Prioridad
              </label>
              <select
                id="action-priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                style={inputStyle}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Critica</option>
              </select>
            </div>

            <div>
              <label htmlFor="action-due-date" style={labelStyle}>
                Fecha limite <span style={{ color: T.destructive }}>*</span>
              </label>
              <input
                id="action-due-date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                style={inputStyle}
                required
              />
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label htmlFor="action-assigned-to" style={labelStyle}>
              Asignado a
            </label>
            <input
              id="action-assigned-to"
              type="text"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              style={inputStyle}
              placeholder="Nombre del responsable"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                fontFamily: fontDisplay,
                color: T.fgMuted,
                backgroundColor: T.muted,
                border: `1px solid ${T.border}`,
              }}
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                fontFamily: fontDisplay,
                color: T.bg,
                backgroundColor: T.cyan,
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 20px ${T.cyan}40`}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              disabled={isLoading}
            >
              {isLoading ? 'Creando...' : 'Crear Accion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
