import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * KPI Card with trend indicator
 * @param {Object} props
 * @param {string} props.label - KPI label
 * @param {string|number} props.value - KPI value to display
 * @param {React.Component} props.icon - Lucide icon component
 * @param {string} props.color - Tailwind background color class (e.g., 'bg-blue-100 text-blue-600')
 * @param {number} props.trend - Percentage trend (positive/negative)
 * @param {string} props.subtext - Optional subtext below value
 */
export default function KpiCard({ label, value, icon: Icon, color, trend, subtext }) {
  const getTrendIcon = () => {
    if (!trend || trend === 0) return <Minus className="w-3 h-3" />
    return trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
  }

  const getTrendColor = () => {
    if (!trend || trend === 0) return 'text-gray-500'
    return trend > 0 ? 'text-green-400' : 'text-red-400'
  }

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-400">{label}</p>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          </div>
        )}
      </div>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  )
}
