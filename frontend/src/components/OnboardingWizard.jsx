import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, CheckCircle, ArrowRight, Rocket, Database, Bot, Target, Users } from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  {
    id: 'seeds', icon: Database, title: 'Cargar datos GTM',
    description: 'Carga competidores, pricing, tácticas y campañas de ejemplo.',
    action: { label: 'Ir a GTM', href: '/gtm' },
  },
  {
    id: 'lead', icon: Users, title: 'Crear tu primer lead',
    description: 'Añade un lead manualmente o importa desde Apollo.',
    action: { label: 'Ir a Leads', href: '/leads' },
  },
  {
    id: 'scoring', icon: Bot, title: 'Ejecutar scoring ICP',
    description: 'Usa AGENT-LEAD-001 para evaluar un lead automáticamente.',
    action: { label: 'Ir a Agentes', href: '/agents' },
  },
  {
    id: 'pipeline', icon: Target, title: 'Crear una oportunidad',
    description: 'Mueve un lead al pipeline con tier de pricing y competidor.',
    action: { label: 'Ir a Pipeline', href: '/pipeline' },
  },
  {
    id: 'okr', icon: Rocket, title: 'Configurar OKRs',
    description: 'Define objetivos Q2 y vincúlalos a KPIs.',
    action: { label: 'Ir a OKRs', href: '/gtm/okr' },
  },
]

export default function OnboardingWizard() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('riskitera_onboarding_dismissed') === 'true')
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('riskitera_onboarding_steps') || '[]') }
    catch { return [] }
  })

  if (dismissed) return null

  const toggleStep = (stepId) => {
    const updated = completed.includes(stepId) ? completed.filter(s => s !== stepId) : [...completed, stepId]
    setCompleted(updated)
    localStorage.setItem('riskitera_onboarding_steps', JSON.stringify(updated))
  }

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem('riskitera_onboarding_dismissed', 'true')
  }

  const progress = Math.round(completed.length / STEPS.length * 100)

  return (
    <div className="bg-white border border-cyan-500/20 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-gray-800">Primeros pasos — St4rtup CRM</h3>
          <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full">{progress}%</span>
        </div>
        <button onClick={dismiss} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
        <div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = completed.includes(step.id)
          const Icon = step.icon
          return (
            <div key={step.id} className={clsx('flex items-center gap-3 rounded-lg p-3 transition-colors', done ? 'bg-green-500/5' : 'bg-gray-50/30')}>
              <button onClick={() => toggleStep(step.id)} className="flex-shrink-0">
                <CheckCircle className={clsx('w-5 h-5', done ? 'text-green-400' : 'text-gray-700')} />
              </button>
              <Icon className={clsx('w-4 h-4 flex-shrink-0', done ? 'text-gray-600' : 'text-cyan-400')} />
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm', done ? 'text-gray-600 line-through' : 'text-gray-700')}>{step.title}</p>
                <p className="text-[10px] text-gray-600">{step.description}</p>
              </div>
              {!done && (
                <Link to={step.action.href} className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5 flex-shrink-0">
                  {step.action.label} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {progress === 100 && (
        <div className="mt-3 text-center">
          <p className="text-sm text-green-400 mb-2">🎉 ¡Configuración completada!</p>
          <button onClick={dismiss} className="btn-secondary text-xs">Ocultar guía</button>
        </div>
      )}
    </div>
  )
}
