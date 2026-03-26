import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Check, ArrowRight } from 'lucide-react'

const TASKS = [
  { id: 'lead', label: 'Crea tu primer lead', href: '/app/leads', check: () => false },
  { id: 'pipeline', label: 'Crea una oportunidad', href: '/app/pipeline', check: () => false },
  { id: 'email', label: 'Conecta tu email', href: '/app/integrations', check: () => false },
  { id: 'action', label: 'Crea una acción', href: '/app/actions', check: () => false },
  { id: 'automation', label: 'Revisa automatizaciones', href: '/app/automations', check: () => false },
]

export default function OnboardingWizard() {
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('st4rtup_checklist') || '[]') } catch { return [] }
  })
  const [hidden, setHidden] = useState(() => localStorage.getItem('st4rtup_checklist_hidden') === 'true')

  useEffect(() => {
    localStorage.setItem('st4rtup_checklist', JSON.stringify(completed))
    if (completed.length >= TASKS.length) {
      setTimeout(() => {
        setHidden(true)
        localStorage.setItem('st4rtup_checklist_hidden', 'true')
      }, 2000)
    }
  }, [completed])

  if (hidden) return null

  const toggle = (id) => {
    setCompleted(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const done = completed.length
  const total = TASKS.length
  const pct = Math.round(done / total * 100)

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🚀</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Primeros pasos</span>
          <span style={{ fontSize: 11, color: '#1E6FD9', backgroundColor: '#EBF4FF', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{done}/{total}</span>
        </div>
        <button onClick={() => { setHidden(true); localStorage.setItem('st4rtup_checklist_hidden', 'true') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <X size={14} color="#94A3B8" />
        </button>
      </div>

      <div style={{ height: 3, backgroundColor: '#F1F5F9', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct === 100 ? '#10B981' : '#1E6FD9', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TASKS.map(t => {
          const isDone = completed.includes(t.id)
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, backgroundColor: isDone ? '#10B98110' : '#F8FAFC', border: `1px solid ${isDone ? '#10B98130' : '#E2E8F0'}`, cursor: 'pointer' }}
              onClick={() => toggle(t.id)}>
              <div style={{ width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isDone ? '#10B981' : 'white', border: isDone ? 'none' : '1.5px solid #CBD5E1' }}>
                {isDone && <Check size={10} color="white" />}
              </div>
              <span style={{ fontSize: 12, color: isDone ? '#10B981' : '#475569', textDecoration: isDone ? 'line-through' : 'none' }}>{t.label}</span>
              {!isDone && <Link to={t.href} onClick={e => e.stopPropagation()} style={{ color: '#1E6FD9', display: 'flex' }}><ArrowRight size={12} /></Link>}
            </div>
          )
        })}
      </div>

      {pct === 100 && (
        <p style={{ fontSize: 12, color: '#10B981', textAlign: 'center', marginTop: 8, fontWeight: 600 }}>
          ✅ ¡Todo listo! Este panel desaparecerá en breve.
        </p>
      )}
    </div>
  )
}
