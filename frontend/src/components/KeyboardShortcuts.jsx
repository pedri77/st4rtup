import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Keyboard } from 'lucide-react'
import { useUIStore } from '@/store/useUIStore'

/* ── Design tokens ─────────────────────────────────────────────────── */
const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Abrir busqueda global', category: 'General' },
  { keys: ['?'], description: 'Mostrar atajos de teclado', category: 'General' },
  { keys: ['Escape'], description: 'Cerrar modal / panel', category: 'General' },
  { keys: ['Ctrl', 'N'], description: 'Ir a Leads (nuevo lead)', category: 'Navegacion' },
  { keys: ['Ctrl', 'Shift', 'P'], description: 'Ir a Pipeline', category: 'Navegacion' },
  { keys: ['Ctrl', 'Shift', 'D'], description: 'Ir a Dashboard', category: 'Navegacion' },
  { keys: ['Ctrl', 'Shift', 'M'], description: 'Ir a Marketing', category: 'Navegacion' },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Ir a SEO Center', category: 'Navegacion' },
]

export default function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false)
  const navigate = useNavigate()
  const { setSearchOpen, setNotificationsOpen } = useUIStore()

  const handleKeyDown = useCallback((e) => {
    // Ignore shortcuts when typing in inputs
    const tag = e.target.tagName
    const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable
    const ctrl = e.ctrlKey || e.metaKey

    // Escape — always works (close modals)
    if (e.key === 'Escape') {
      setHelpOpen(false)
      setSearchOpen(false)
      setNotificationsOpen(false)
      return
    }

    // Skip other shortcuts when in editable fields
    if (isEditable) return

    // ? → toggle help
    if (e.key === '?' && !ctrl && !e.shiftKey) {
      e.preventDefault()
      setHelpOpen(prev => !prev)
      return
    }

    // Ctrl+K / Cmd+K → search (also handled in Layout, kept for completeness)
    if (ctrl && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(true)
      return
    }

    // Ctrl+N → leads
    if (ctrl && !e.shiftKey && e.key === 'n') {
      e.preventDefault()
      navigate('/app/leads')
      return
    }

    // Ctrl+Shift shortcuts
    if (ctrl && e.shiftKey) {
      switch (e.key.toUpperCase()) {
        case 'P':
          e.preventDefault()
          navigate('/app/pipeline')
          break
        case 'D':
          e.preventDefault()
          navigate('/app/dashboard')
          break
        case 'M':
          e.preventDefault()
          navigate('/app/marketing')
          break
        case 'S':
          e.preventDefault()
          navigate('/app/marketing/seo-center')
          break
        default:
          break
      }
    }
  }, [navigate, setSearchOpen, setNotificationsOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!helpOpen) return null

  const categories = [...new Set(SHORTCUTS.map(s => s.category))]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'hsla(220,60%,2%,0.7)' }}
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5" style={{ color: T.cyan }} />
            <h2 className="text-lg font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>
              Atajos de teclado
            </h2>
          </div>
          <button aria-label="Cerrar" onClick={() => setHelpOpen(false)}
            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: T.fgMuted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: T.fgMuted, opacity: 0.7 }}>
                {cat}
              </p>
              <div className="space-y-2">
                {SHORTCUTS.filter(s => s.category === cat).map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm" style={{ color: T.fg }}>{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd key={j} className="px-2 py-1 text-xs rounded font-mono"
                          style={{
                            backgroundColor: T.muted,
                            color: T.fgMuted,
                            border: `1px solid ${T.border}`,
                          }}>
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 text-center"
          style={{ borderTop: `1px solid ${T.border}` }}>
          <span className="text-xs" style={{ color: T.fgMuted }}>
            Pulsa <kbd className="px-1.5 py-0.5 rounded text-xs font-mono mx-1"
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>?</kbd> para cerrar
          </span>
        </div>
      </div>
    </div>
  )
}
