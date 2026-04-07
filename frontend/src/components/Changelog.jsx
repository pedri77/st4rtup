import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'

const CHANGELOG = [
  {
    version: '2.5.0',
    date: '2026-03-21',
    items: [
      '🚀 Social Media: crear, generar con IA y programar posts (LinkedIn, Twitter, YouTube)',
      '📊 Cost Control v2: alertas predictivas + ROI por herramienta',
      '📋 Bulk actions en leads: scoring batch, eliminar, cambiar status',
      '🔍 Win/loss analysis: motivos de cierre por competidor',
      '📧 Weekly digest automático con KPIs + Telegram',
    ],
  },
  {
    version: '2.4.0',
    date: '2026-03-21',
    items: [
      '🎯 20 KPIs con semáforos RAG + targets editables inline',
      '📈 Revenue Forecast 12 meses + PoC Tracker 90 días',
      '🏢 ABM Account View: página completa por cuenta',
      '📄 Propuesta interactiva compartible por link',
      '📝 Contrato PDF auto-generado desde pipeline',
      '✅ Checklist + notas en cada táctica del Playbook',
    ],
  },
  {
    version: '2.3.0',
    date: '2026-03-20',
    items: [
      '🤖 4 agentes LLM: scoring ICP, BANT, propuestas, customer success',
      '🏆 18 competidores con battle cards y filtros región/amenaza',
      '💰 Pricing Engine con calculadora y tiers custom',
      '📊 Media Trifecta: Owned/Earned/Paid tracking',
      '🎯 OKR system vinculado a KPIs',
    ],
  },
]

export default function Changelog() {
  const [dismissed, setDismissed] = useState(() => {
    const saved = localStorage.getItem('st4rtup_changelog_seen')
    return saved === CHANGELOG[0].version
  })

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem('st4rtup_changelog_seen', CHANGELOG[0].version)
    setDismissed(true)
  }

  const latest = CHANGELOG[0]

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 bg-gray-50 border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden">
      <div className="bg-cyan-500/10 px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-cyan-400 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> Novedades v{latest.version}
        </span>
        <button aria-label="Cerrar" onClick={dismiss} className="text-gray-500 hover:text-gray-800"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 max-h-48 overflow-y-auto">
        <p className="text-[10px] text-gray-600 mb-2">{latest.date}</p>
        <ul className="space-y-1">
          {latest.items.map((item, i) => (
            <li key={i} className="text-xs text-gray-700">{item}</li>
          ))}
        </ul>
      </div>
      <div className="px-4 pb-3">
        <button onClick={dismiss} className="w-full text-xs text-center text-gray-500 hover:text-gray-700">Entendido</button>
      </div>
    </div>
  )
}
