import { useState, useEffect, useCallback, useRef } from 'react'
import { Settings, X, GripVertical, Eye, EyeOff, RotateCcw, Maximize2, Minimize2, Square } from 'lucide-react'
import clsx from 'clsx'
import { dashboardApi } from '@/services/api'

const DEFAULT_WIDGETS = [
  { id: 'kpis', label: 'KPIs Principales', visible: true, position: 0, size: 'md' },
  { id: 'pipeline', label: 'Pipeline Resumen', visible: true, position: 1, size: 'md' },
  { id: 'activity', label: 'Actividad Reciente', visible: true, position: 2, size: 'md' },
  { id: 'charts', label: 'Gráficos', visible: true, position: 3, size: 'md' },
  { id: 'marketing', label: 'Marketing Summary', visible: true, position: 4, size: 'md' },
  { id: 'automations', label: 'Automatizaciones', visible: true, position: 5, size: 'md' },
  { id: 'agents', label: 'Agentes IA', visible: true, position: 6, size: 'md' },
  { id: 'onboarding', label: 'Onboarding', visible: true, position: 7, size: 'md' },
]

const STORAGE_KEY = 'riskitera_dashboard_widgets'
const SIZE_LABELS = { sm: 'Compacto', md: 'Normal', lg: 'Grande' }
const SIZE_ICONS = { sm: Minimize2, md: Square, lg: Maximize2 }

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_WIDGETS
    } catch { return DEFAULT_WIDGETS }
  })
  const [synced, setSynced] = useState(false)
  const saveTimer = useRef(null)

  // Load from backend on mount
  useEffect(() => {
    dashboardApi.getConfig()
      .then(res => {
        const remote = res.data?.widgets
        if (remote?.length) {
          setWidgets(remote)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
        }
        setSynced(true)
      })
      .catch(() => setSynced(true))
  }, [])

  // Debounced save to backend
  const persistToBackend = useCallback((updated) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      dashboardApi.updateConfig({ widgets: updated }).catch(() => {})
    }, 800)
  }, [])

  const isVisible = (id) => {
    const w = widgets.find(w => w.id === id)
    return w ? w.visible : true
  }

  const getSize = (id) => {
    const w = widgets.find(w => w.id === id)
    return w?.size || 'md'
  }

  const toggle = (id) => {
    setWidgets(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
      persistToBackend(updated)
      return updated
    })
  }

  const setSize = (id, size) => {
    setWidgets(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, size } : w)
      persistToBackend(updated)
      return updated
    })
  }

  const reset = () => {
    setWidgets(DEFAULT_WIDGETS)
    persistToBackend(DEFAULT_WIDGETS)
  }

  const moveUp = (id) => {
    setWidgets(prev => {
      const idx = prev.findIndex(w => w.id === id)
      if (idx <= 0) return prev
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      const updated = next.map((w, i) => ({ ...w, position: i }))
      persistToBackend(updated)
      return updated
    })
  }

  const moveDown = (id) => {
    setWidgets(prev => {
      const idx = prev.findIndex(w => w.id === id)
      if (idx >= prev.length - 1) return prev
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      const updated = next.map((w, i) => ({ ...w, position: i }))
      persistToBackend(updated)
      return updated
    })
  }

  return { widgets, isVisible, getSize, toggle, setSize, reset, moveUp, moveDown, synced }
}

export default function DashboardCustomizer({ widgets, onToggle, onReset, onMoveUp, onMoveDown, onSetSize }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-2 rounded-lg transition-colors bg-gray-800 border border-gray-700 hover:border-gray-600"
        title="Personalizar dashboard">
        <Settings className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={() => setOpen(false)}>
          <div className="w-80 bg-gray-900 border-l border-gray-700 h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Personalizar Dashboard</h3>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-gray-500" /></button>
            </div>

            <div className="p-4 space-y-2">
              {widgets.map((w, i) => (
                <div key={w.id} className={clsx('rounded-lg p-2.5 transition-colors',
                  w.visible ? 'bg-gray-800/50' : 'bg-gray-900 opacity-50')}>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => onMoveUp(w.id)} disabled={i === 0} className="text-gray-600 hover:text-gray-400 disabled:opacity-20">
                        <GripVertical className="w-3 h-3 rotate-180" />
                      </button>
                      <button onClick={() => onMoveDown(w.id)} disabled={i === widgets.length - 1} className="text-gray-600 hover:text-gray-400 disabled:opacity-20">
                        <GripVertical className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm text-gray-300 flex-1">{w.label}</span>
                    <button onClick={() => onToggle(w.id)} className="p-1">
                      {w.visible ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4 text-gray-600" />}
                    </button>
                  </div>
                  {w.visible && onSetSize && (
                    <div className="flex items-center gap-1 mt-1.5 ml-6">
                      {['sm', 'md', 'lg'].map(s => {
                        const Icon = SIZE_ICONS[s]
                        return (
                          <button
                            key={s}
                            onClick={() => onSetSize(w.id, s)}
                            className={clsx('px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors',
                              (w.size || 'md') === s
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'text-gray-500 hover:text-gray-400 border border-transparent'
                            )}
                            title={SIZE_LABELS[s]}
                          >
                            <Icon className="w-3 h-3" />
                            {SIZE_LABELS[s]}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700">
              <button onClick={onReset} className="btn-secondary text-xs w-full flex items-center justify-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Restablecer por defecto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
