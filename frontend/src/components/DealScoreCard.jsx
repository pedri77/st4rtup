/**
 * DealScoreCard — Muestra el deal score con breakdown visual.
 * Usado en PipelinePage y LeadDetailPage.
 */
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import api from '@/services/api'

const TIER_COLORS = {
  A: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300 dark:border-green-700' },
  B: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700' },
  C: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700' },
  D: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-700' },
}

const RISK_LABELS = {
  low: { label: 'Bajo', color: 'text-green-600 dark:text-green-400' },
  medium: { label: 'Medio', color: 'text-yellow-600 dark:text-yellow-400' },
  high: { label: 'Alto', color: 'text-orange-600 dark:text-orange-400' },
  critical: { label: 'Critico', color: 'text-red-600 dark:text-red-400' },
}

function ScoreBar({ label, points, max, detail }) {
  const pct = max > 0 ? (points / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-700 dark:text-gray-300 font-medium">{label}</span>
        <span className="text-gray-500 dark:text-gray-400 font-mono">{points}/{max}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {detail && <p className="text-[10px] text-gray-400 dark:text-gray-500">{detail}</p>}
    </div>
  )
}

export default function DealScoreCard({ opportunityId, compact = false }) {
  const [score, setScore] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchScore = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/opportunities/${opportunityId}/score`)
      setScore(data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error calculando score')
    } finally {
      setLoading(false)
    }
  }

  if (!score) {
    return (
      <button
        onClick={fetchScore}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
      >
        {loading ? (
          <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : '📊'} Deal Score
      </button>
    )
  }

  const tier = TIER_COLORS[score.tier] || TIER_COLORS.D
  const risk = RISK_LABELS[score.risk_level] || RISK_LABELS.critical
  const b = score.breakdown

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${tier.bg} ${tier.text} ${tier.border} border`}>
        <span>{score.deal_score}</span>
        <span className="opacity-70">Tier {score.tier}</span>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          📊 Deal Score
        </h3>
        <button onClick={fetchScore} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          Recalcular
        </button>
      </div>

      {/* Score + Tier */}
      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center ${tier.bg} ${tier.border} border`}>
          <span className={`text-2xl font-bold ${tier.text}`}>{score.deal_score}</span>
          <span className={`text-[10px] font-medium ${tier.text}`}>Tier {score.tier}</span>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Riesgo:</span>
            <span className={`text-xs font-medium ${risk.color}`}>{risk.label}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {score.duration_ms}ms
          </div>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2.5">
        <ScoreBar
          label="ICP Score"
          points={b.icp_score.points}
          max={b.icp_score.max}
          detail={`Score original: ${b.icp_score.raw}/100`}
        />
        <ScoreBar
          label="Interacciones"
          points={b.interactions.points}
          max={b.interactions.max}
          detail={`${b.interactions.visits} visitas · ${b.interactions.emails} emails · ${b.interactions.actions} acciones`}
        />
        <ScoreBar
          label="Deal Data"
          points={b.deal_data.points}
          max={b.deal_data.max}
          detail={`${b.deal_data.value?.toLocaleString()} EUR · ${b.deal_data.stage} · ${b.deal_data.probability}% prob`}
        />
        <ScoreBar
          label="Actividad reciente"
          points={b.recency.points}
          max={b.recency.max}
          detail={b.recency.days_since_touch != null ? `Último contacto hace ${b.recency.days_since_touch} días` : 'Sin contacto registrado'}
        />
      </div>

      {/* Recommendations */}
      {score.recommendations?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Recomendaciones:</p>
          {score.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span className="text-yellow-500 mt-0.5">→</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function DealScoreBadge({ opportunityId }) {
  return <DealScoreCard opportunityId={opportunityId} compact />
}
