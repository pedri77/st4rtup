import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/api'
import { useThemeColors } from '@/utils/theme'


const fontMono = "'IBM Plex Mono', monospace"
const fontDisplay = "'Rajdhani', sans-serif"

const CELL_SIZE = 12
const CELL_GAP = 3
const LEVELS = ['transparent', '#0e4429', '#006d32', '#26a641', '#39d353']

function getLevel(count, max) {
  if (!count) return 0
  const ratio = count / (max || 1)
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ActivityHeatmap({ months = 12 }) {
  const T = useThemeColors()
  const { data } = useQuery({
    queryKey: ['dashboard-heatmap', months],
    queryFn: () => dashboardApi.heatmap(months).then(r => r.data).catch(() => ({ days: [] })),
    retry: 0, staleTime: 5 * 60 * 1000,
  })

  if (!data) return null

  const heatmap = data.heatmap || {}
  const maxVal = data.max_activity || 1

  // Build weeks grid (52 weeks x 7 days)
  const today = new Date()
  const totalWeeks = Math.ceil(months * 4.33)
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (totalWeeks * 7 - 1))
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const weeks = []
  const monthLabels = []
  let lastMonth = -1

  for (let w = 0; w < totalWeeks; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + w * 7 + d)
      const key = date.toISOString().slice(0, 10)
      const count = heatmap[key] || 0
      const isFuture = date > today

      if (d === 0 && date.getMonth() !== lastMonth) {
        lastMonth = date.getMonth()
        monthLabels.push({ week: w, label: MONTHS[date.getMonth()] })
      }

      week.push({ date: key, count, level: isFuture ? -1 : getLevel(count, maxVal) })
    }
    weeks.push(week)
  }

  const totalActivity = Object.values(heatmap).reduce((a, b) => a + b, 0)

  return (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.75rem', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: '1rem', fontWeight: 700, color: T.fg, margin: 0 }}>
          Actividad ({totalActivity} acciones)
        </h3>
        <span style={{ fontFamily: fontMono, fontSize: '0.7rem', color: T.fgMuted }}>
          {data.total_days} dias con actividad
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {/* Month labels */}
        <div style={{ display: 'flex', marginLeft: 30, marginBottom: 4 }}>
          {monthLabels.map((m, i) => (
            <span key={i} style={{
              position: 'absolute',
              left: 30 + m.week * (CELL_SIZE + CELL_GAP),
              fontSize: '0.65rem', color: T.fgMuted, fontFamily: fontMono,
            }}>
              {m.label}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: CELL_GAP, marginTop: 20, position: 'relative' }}>
          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: CELL_GAP, marginRight: 4 }}>
            {DAYS.map((d, i) => (
              <div key={i} style={{ height: CELL_SIZE, fontSize: '0.6rem', color: T.fgMuted, fontFamily: fontMono, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: 24 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: CELL_GAP }}>
              {week.map((cell, di) => (
                <div
                  key={di}
                  title={cell.level >= 0 ? `${cell.date}: ${cell.count} acciones` : ''}
                  style={{
                    width: CELL_SIZE, height: CELL_SIZE,
                    borderRadius: 2,
                    backgroundColor: cell.level < 0 ? 'transparent' : LEVELS[cell.level],
                    border: cell.level === 0 ? `1px solid ${T.border}` : 'none',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: '0.75rem', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '0.65rem', color: T.fgMuted, marginRight: 4 }}>Menos</span>
        {LEVELS.map((c, i) => (
          <div key={i} style={{
            width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2,
            backgroundColor: i === 0 ? 'transparent' : c,
            border: i === 0 ? `1px solid ${T.border}` : 'none',
          }} />
        ))}
        <span style={{ fontSize: '0.65rem', color: T.fgMuted, marginLeft: 4 }}>Mas</span>
      </div>
    </div>
  )
}
