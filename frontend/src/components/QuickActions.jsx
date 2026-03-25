import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, CheckSquare, Mail, CalendarCheck, GitBranch, X } from 'lucide-react'

/* ── Design tokens ─────────────────────────────────────────────────── */
const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"

const quickActions = [
  { label: 'Nuevo Lead', icon: Users, href: '/app/leads?new=1', color: T.cyan },
  { label: 'Nueva Accion', icon: CheckSquare, href: '/app/actions?new=1', color: T.warning },
  { label: 'Nuevo Email', icon: Mail, href: '/app/emails?new=1', color: T.success },
  { label: 'Nueva Visita', icon: CalendarCheck, href: '/app/visits?new=1', color: T.purple },
  { label: 'Nueva Oportunidad', icon: GitBranch, href: '/app/pipeline?new=1', color: T.destructive },
]

export default function QuickActions() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const containerRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleAction = (href) => {
    setOpen(false)
    navigate(href)
  }

  return (
    <div ref={containerRef} style={{ position: 'fixed', bottom: '5rem', right: '1.5rem', zIndex: 40 }}>
      {/* Menu items */}
      <div
        style={{
          position: 'absolute',
          bottom: '4rem',
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          alignItems: 'flex-end',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 200ms ease, transform 200ms ease',
        }}
      >
        {quickActions.map((action, i) => (
          <button
            key={action.label}
            onClick={() => handleAction(action.href)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg whitespace-nowrap transition-transform hover:scale-105"
            style={{
              fontFamily: fontDisplay,
              letterSpacing: '0.02em',
              backgroundColor: T.card,
              color: T.fg,
              border: `1px solid ${T.border}`,
              transitionDelay: open ? `${i * 40}ms` : '0ms',
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(20px)',
              transition: 'opacity 200ms ease, transform 200ms ease',
            }}
          >
            <action.icon className="w-4 h-4" style={{ color: action.color }} />
            {action.label}
          </button>
        ))}
      </div>

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-110"
        style={{
          background: open
            ? T.destructive
            : `linear-gradient(135deg, ${T.cyan}, ${T.purple})`,
          color: '#fff',
        }}
        title="Acciones rapidas"
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  )
}
