/**
 * Sparkline — mini line chart using SVG (no dependencies).
 * @param {number[]} data - array of values
 * @param {string} color - stroke color (default cyan)
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 */
export default function Sparkline({ data = [], color = '#06b6d4', width = 80, height = 24 }) {
  if (!data.length || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
