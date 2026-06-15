import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Copy, Check, ArrowRight } from 'lucide-react'
import { useThemeColors } from '@/utils/theme'
import { supabase } from '@/lib/supabase'

export default function ExitIntentPopup() {
  const T = useThemeColors()
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('st4rtup_exit_shown')) return

    function handleMouse(e) {
      if (e.clientY < 5) {
        setShow(true)
        sessionStorage.setItem('st4rtup_exit_shown', 'true')
        document.removeEventListener('mousemove', handleMouse)
      }
    }
    // Delay activation by 5 seconds to avoid triggering immediately
    const timer = setTimeout(() => document.addEventListener('mousemove', handleMouse), 5000)
    return () => { clearTimeout(timer); document.removeEventListener('mousemove', handleMouse) }
  }, [])

  function copyCode() {
    navigator.clipboard.writeText('STARTUP20')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSubmitEmail(e) {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    supabase.from('quiz_leads').insert({
      answers: { contact_email: email, source_type: 'exit-popup', coupon: 'STARTUP20' },
      segments: ['exit-intent'],
      total_score: 0,
      recommended_plan: null,
      source: 'exit-intent-popup',
    }).then(() => {}).catch(() => {})
    setSubmitted(true)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        backgroundColor: T.card, borderRadius: 20, padding: '40px 36px',
        maxWidth: 420, width: '100%', position: 'relative', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <button aria-label="Cerrar" onClick={() => setShow(false)} style={{
          position: 'absolute', top: 16, right: 16, background: 'none',
          border: 'none', cursor: 'pointer',
        }}><X size={20} color="#94A3B8" /></button>

        <p style={{ fontSize: 40, marginBottom: 12 }}>🎁</p>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8, color: T.fg }}>
          {submitted ? 'Tu codigo de descuento' : '¡Espera! Tenemos algo para ti'}
        </h2>
        <p style={{ color: T.fgMuted, fontSize: 15, marginBottom: 24 }}>
          {submitted
            ? <>Usa este codigo y obten un <strong>20% de descuento</strong> en tu primer mes</>
            : 'Dejanos tu email y te enviamos un 20% de descuento para tu primer mes.'
          }
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmitEmail}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@empresa.com" required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: `1.5px solid ${T.border || '#E2E8F0'}`, fontSize: 15,
                outline: 'none', marginBottom: 14, boxSizing: 'border-box',
              }}
            />
            <button type="submit" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '12px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1E6FD9, #8B5CF6)',
              color: 'white', fontWeight: 600, fontSize: 15, cursor: 'pointer',
              marginBottom: 12,
            }}>
              Obtener descuento <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <>
            {/* Coupon */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px 24px', borderRadius: 12,
              backgroundColor: '#FFF7ED', border: '2px dashed #F5820B',
              marginBottom: 24,
            }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: '#F5820B', letterSpacing: 3 }}>STARTUP20</span>
              <button onClick={copyCode} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                {copied ? <Check size={18} color="#10B981" /> : <Copy size={18} color="#F5820B" />}
              </button>
            </div>

            <Link to="/login" onClick={() => setShow(false)} style={{
              display: 'block', padding: '12px 24px', borderRadius: 10,
              backgroundColor: T.primary, color: 'white', fontWeight: 600,
              fontSize: 15, textDecoration: 'none', marginBottom: 12,
            }}>
              Empezar con descuento
            </Link>
          </>
        )}
        <button onClick={() => setShow(false)} style={{
          background: 'none', border: 'none', color: '#94A3B8',
          fontSize: 13, cursor: 'pointer',
        }}>No gracias</button>
      </div>
    </div>
  )
}
