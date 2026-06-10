import { useEffect, useState } from 'react'
import { track } from '@/utils/posthog'

const T = {
  primary: '#1E6FD9',
  fg: '#0F172A',
  fgMuted: '#64748B',
  border: '#E2E8F0',
}

function calcTimeLeft(target) {
  const diff = new Date(target).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function CountdownBar({ targetDate, label = 'Precio de lanzamiento termina en', enabled = true }) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(targetDate))
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(() => {
      const tl = calcTimeLeft(targetDate)
      setTimeLeft(tl)
      if (!tl && !expired) {
        setExpired(true)
        track('countdown_expired', { project: 'st4rtup' })
        clearInterval(timer)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate, enabled, expired])

  if (!enabled || !timeLeft) return null

  const units = [
    { value: timeLeft.days, label: 'Días' },
    { value: timeLeft.hours, label: 'Horas' },
    { value: timeLeft.minutes, label: 'Min' },
    { value: timeLeft.seconds, label: 'Seg' },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      backgroundColor: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
      padding: '10px 16px',
    }}>
      <span style={{
        fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
        color: T.primary, display: 'none',
      }}
        className="countdown-label"
      >
        {label}
      </span>
      <style>{`.countdown-label { display: none !important; } @media (min-width: 640px) { .countdown-label { display: inline !important; } }`}</style>

      <div style={{ display: 'flex', gap: 12 }}>
        {units.map(unit => (
          <div key={unit.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{
              fontSize: 22, fontWeight: 700, color: T.fg,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {String(unit.value).padStart(2, '0')}
            </span>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: T.fgMuted }}>
              {unit.label}
            </span>
          </div>
        ))}
      </div>

      <a
        href="/pricing"
        style={{
          padding: '6px 16px', borderRadius: 6,
          background: `linear-gradient(135deg, ${T.primary}, #3B8DE8)`,
          color: 'white', fontSize: 12, fontWeight: 600, textDecoration: 'none',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        Ver planes
      </a>
    </div>
  )
}
