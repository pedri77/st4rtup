/**
 * TrialBanner — Shows trial/plan status at top of app.
 * - Trial active: blue banner with days remaining
 * - Trial expired: orange banner with upgrade CTA
 * - Paid plan: no banner
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, ArrowRight, X } from 'lucide-react'

export default function TrialBanner() {
  const [trial, setTrial] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // In production: fetch from /billing/subscription
    // For now: check localStorage mock
    try {
      const data = JSON.parse(localStorage.getItem('st4rtup_trial') || 'null')
      if (data) setTrial(data)
    } catch {}
  }, [])

  if (dismissed || !trial) return null

  const now = new Date()
  const expires = new Date(trial.trial_ends_at)
  const daysLeft = Math.max(0, Math.ceil((expires - now) / (1000 * 60 * 60 * 24)))
  const expired = daysLeft <= 0

  return (
    <div style={{
      padding: '8px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      backgroundColor: expired ? '#FFF7ED' : '#EBF4FF',
      borderBottom: `1px solid ${expired ? '#FDBA74' : '#93C5FD'}`,
      fontSize: 13, fontWeight: 500,
    }}>
      <Clock size={14} color={expired ? '#F5820B' : '#1E6FD9'} />
      <span style={{ color: expired ? '#9A3412' : '#1E40AF' }}>
        {expired
          ? 'Tu prueba de Growth ha terminado. Tu plan es ahora Starter.'
          : `Prueba gratuita de Growth — ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} restantes.`
        }
      </span>
      <Link to="/pricing" style={{
        padding: '4px 14px', borderRadius: 6,
        backgroundColor: expired ? '#F5820B' : '#1E6FD9', color: 'white',
        fontSize: 12, fontWeight: 600, textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        {expired ? 'Mejorar plan' : 'Elegir plan'} <ArrowRight size={12} />
      </Link>
      <button aria-label="Cerrar" onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
        <X size={14} color="#94A3B8" />
      </button>
    </div>
  )
}
