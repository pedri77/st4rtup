import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, ChevronDown, ChevronUp, Mail, BarChart3, Users, Zap, Bot } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { useThemeColors } from '@/utils/theme'

const CHECKLIST_ITEMS = [
  { id: 'leads', label: 'Importar o crear leads', link: '/app/leads', icon: Users },
  { id: 'email', label: 'Conectar proveedor de email', link: '/app/integrations', icon: Mail },
  { id: 'pipeline', label: 'Crear primera oportunidad', link: '/app/pipeline', icon: BarChart3 },
  { id: 'automations', label: 'Activar automatizaciones', link: '/app/automations', icon: Zap },
  { id: 'agents', label: 'Probar los agentes IA', link: '/app/agents', icon: Bot },
]

export default function SetupChecklist() {
  const T = useThemeColors()
  const [open, setOpen] = useState(true)
  const queryClient = useQueryClient()

  // Server state
  const { data: checklist, isLoading } = useQuery({
    queryKey: ['setup-checklist'],
    queryFn: () => api.get('/users/me/setup-checklist').then(r => r.data),
    staleTime: 30_000,
  })

  // Auto-detected progress from useSetupProgress hook (synced via query cache)
  const { data: leadsData } = useQuery({ queryKey: ['leads', { page: 1, page_size: 1 }], enabled: false })
  const { data: oppsData } = useQuery({ queryKey: ['opportunities', { page: 1, page_size: 1 }], enabled: false })
  const { data: settingsData } = useQuery({ queryKey: ['settings'], enabled: false })
  const { data: autoData } = useQuery({ queryKey: ['automations', { page: 1, page_size: 1, status: 'active' }], enabled: false })

  const autoCompleted = []
  if ((leadsData?.data?.total ?? 0) > 0) autoCompleted.push('leads')
  if ((oppsData?.data?.total ?? 0) > 0) autoCompleted.push('pipeline')
  if (settingsData?.data?.email_provider && settingsData.data.email_provider !== 'none') autoCompleted.push('email')
  if ((autoData?.data?.total ?? 0) > 0) autoCompleted.push('automations')

  const serverCompleted = checklist?.completed || []
  const allCompleted = [...new Set([...serverCompleted, ...autoCompleted])]

  // Sync auto-detected completions to server
  const updateMutation = useMutation({
    mutationFn: (payload) => api.put('/users/me/setup-checklist', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setup-checklist'] }),
  })

  useEffect(() => {
    const newItems = autoCompleted.filter(id => !serverCompleted.includes(id))
    if (newItems.length > 0) {
      updateMutation.mutate({ completed: newItems })
    }
  }, [autoCompleted.join(','), serverCompleted.join(',')])

  // Check onboarding state
  const { data: onboarding } = useQuery({
    queryKey: ['onboarding'],
    queryFn: () => api.get('/users/me/onboarding').then(r => r.data),
    staleTime: 120_000,
  })

  const dismissed = checklist?.dismissed === true
  const onboardingDone = onboarding?.completed === true

  if (isLoading || dismissed || !onboardingDone) return null

  const items = CHECKLIST_ITEMS.map(item => ({
    ...item,
    done: allCompleted.includes(item.id),
  }))

  const completed = items.filter(i => i.done).length
  const total = items.length
  const allDone = completed === total
  const progress = Math.round((completed / total) * 100)

  function dismiss() {
    updateMutation.mutate({ dismissed: true })
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 40,
      width: 320, borderRadius: 16,
      backgroundColor: T.card, border: `1px solid ${T.border}`,
      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', cursor: 'pointer',
          borderBottom: open ? `1px solid ${T.border}` : 'none',
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
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.fg }}>
              {allDone ? 'Todo listo!' : 'Configura tu CRM'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: T.fgMuted }}>{progress}% completado</p>
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
        <div style={{ height: 3, backgroundColor: T.muted }}>
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
                onMouseEnter={e => e.currentTarget.style.backgroundColor = T.bg}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: item.done ? '#F0FDF4' : '#EFF6FF',
                }}>
                  {item.done
                    ? <Check size={14} color={T.success} />
                    : <Icon size={14} color={T.primary} />
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
        <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: `1px solid ${T.border}` }}>
          <p style={{ margin: 0, fontSize: 13, color: T.success, fontWeight: 600 }}>Tu CRM esta listo para vender</p>
          <button onClick={dismiss} style={{
            marginTop: 8, padding: '6px 16px', borderRadius: 8,
            backgroundColor: T.muted, border: 'none', cursor: 'pointer',
            fontSize: 12, color: T.fgMuted,
          }}>Cerrar checklist</button>
        </div>
      )}
    </div>
  )
}
