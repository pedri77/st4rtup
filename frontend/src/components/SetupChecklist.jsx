import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, ChevronDown, ChevronUp, Mail, BarChart3, Users, Zap, Bot } from 'lucide-react'

const CHECKLIST_ITEMS = [
  {
    id: 'leads',
    label: 'Importar o crear leads',
    link: '/app/leads',
    icon: Users,
    check: () => parseInt(localStorage.getItem('st4rtup_lead_count') || '0') > 0,
  },
  {
    id: 'email',
    label: 'Conectar proveedor de email',
    link: '/app/integrations',
    icon: Mail,
    check: () => localStorage.getItem('st4rtup_email_connected') === 'true',
  },
  {
    id: 'pipeline',
    label: 'Crear primera oportunidad',
    link: '/app/pipeline',
    icon: BarChart3,
    check: () => localStorage.getItem('st4rtup_first_opportunity') === 'true',
  },
  {
    id: 'automations',
    label: 'Activar automatizaciones',
    link: '/app/automations',
    icon: Zap,
    check: () => localStorage.getItem('st4rtup_automations_active') === 'true',
  },
  {
    id: 'agents',
    label: 'Probar los agentes IA',
    link: '/app/agents',
    icon: Bot,
    check: () => localStorage.getItem('st4rtup_agents_tried') === 'true',
  },
]

export default function SetupChecklist() {
  const [open, setOpen] = useState(true)
  const [items, setItems] = useState([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('st4rtup_checklist_dismissed') === 'true') {
      setDismissed(true)
      return
    }
    // Only show after onboarding is done
    if (localStorage.getItem('st4rtup_onboarding_done') !== 'true') {
      setDismissed(true)
      return
    }
    setItems(CHECKLIST_ITEMS.map(item => ({ ...item, done: item.check() })))
  }, [])

  // Re-check on focus (user may have completed an action in another tab)
  useEffect(() => {
    const recheck = () => {
      setItems(prev => prev.map(item => {
        const found = CHECKLIST_ITEMS.find(c => c.id === item.id)
        return { ...item, done: found ? found.check() : item.done }
      }))
    }
    window.addEventListener('focus', recheck)
    return () => window.removeEventListener('focus', recheck)
  }, [])

  if (dismissed || items.length === 0) return null

  const completed = items.filter(i => i.done).length
  const total = items.length
  const allDone = completed === total
  const progress = Math.round((completed / total) * 100)

  function dismiss() {
    localStorage.setItem('st4rtup_checklist_dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 40,
      width: 320, borderRadius: 16,
      backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', cursor: 'pointer',
          borderBottom: open ? '1px solid #E2E8F0' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: allDone
              ? 'linear-gradient(135deg, #10B981, #059669)'
              : 'linear-gradient(135deg, #1E6FD9, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {allDone
              ? <Check size={16} color="#fff" />
              : <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{completed}/{total}</span>
            }
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
              {allDone ? 'Todo listo!' : 'Configura tu CRM'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{progress}% completado</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={e => { e.stopPropagation(); dismiss() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={14} color="#94A3B8" />
          </button>
          {open ? <ChevronDown size={16} color="#94A3B8" /> : <ChevronUp size={16} color="#94A3B8" />}
        </div>
      </div>

      {/* Progress bar */}
      {open && (
        <div style={{ height: 3, backgroundColor: '#F1F5F9' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: allDone ? '#10B981' : 'linear-gradient(to right, #1E6FD9, #6366F1)',
            borderRadius: 2, transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      {/* Items */}
      {open && (
        <div style={{ padding: '8px 0' }}>
          {items.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                to={item.link}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', textDecoration: 'none',
                  opacity: item.done ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: item.done ? '#F0FDF4' : '#EFF6FF',
                }}>
                  {item.done
                    ? <Check size={14} color="#10B981" />
                    : <Icon size={14} color="#1E6FD9" />
                  }
                </div>
                <span style={{
                  fontSize: 13, color: item.done ? '#94A3B8' : '#334155',
                  textDecoration: item.done ? 'line-through' : 'none',
                }}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* All done message */}
      {open && allDone && (
        <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid #E2E8F0' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#10B981', fontWeight: 600 }}>Tu CRM esta listo para vender</p>
          <button onClick={dismiss} style={{
            marginTop: 8, padding: '6px 16px', borderRadius: 8,
            backgroundColor: '#F1F5F9', border: 'none', cursor: 'pointer',
            fontSize: 12, color: '#64748B',
          }}>Cerrar checklist</button>
        </div>
      )}
    </div>
  )
}
