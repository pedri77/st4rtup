import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Copy, Check } from 'lucide-react'

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)

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

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: 20, padding: '40px 36px',
        maxWidth: 420, width: '100%', position: 'relative', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <button onClick={() => setShow(false)} style={{
          position: 'absolute', top: 16, right: 16, background: 'none',
          border: 'none', cursor: 'pointer',
        }}><X size={20} color="#94A3B8" /></button>

        <p style={{ fontSize: 40, marginBottom: 12 }}>🎁</p>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>
          ¡Espera! Tenemos algo para ti
        </h2>
        <p style={{ color: '#64748B', fontSize: 15, marginBottom: 24 }}>
          Usa este código y obtén un <strong>20% de descuento</strong> en tu primer mes
        </p>

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
          backgroundColor: '#1E6FD9', color: 'white', fontWeight: 600,
          fontSize: 15, textDecoration: 'none', marginBottom: 12,
        }}>
          Empezar con descuento
        </Link>
        <button onClick={() => setShow(false)} style={{
          background: 'none', border: 'none', color: '#94A3B8',
          fontSize: 13, cursor: 'pointer',
        }}>No gracias</button>
      </div>
    </div>
  )
}
