import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'
import { useThemeColors } from '@/utils/theme'

const PROMPTS = [
  { id: 'try_ai', page: '/app/dashboard', message: '¿Has probado los agentes IA? Pueden cualificar tus leads automáticamente.', cta: 'Probar IA', link: '/app/agents', delay: 5000 },
  { id: 'try_seo', page: '/app/marketing', message: 'El Centro de SEO genera contenido profesional con 4 agentes IA.', cta: 'Ir a SEO', link: '/app/marketing/seo-center', delay: 3000 },
  { id: 'try_calls', page: '/app/pipeline', message: 'Las llamadas IA cualifican leads mientras tú cierras deals.', cta: 'Probar llamadas', link: '/app/calls', delay: 7000 },
  { id: 'import_leads', page: '/app/leads', message: '¿Sabías que puedes importar leads desde CSV? HubSpot, Salesforce y más.', cta: 'Importar', link: '/app/leads', delay: 4000 },
]

export default function InAppPrompts() {
  const T = useThemeColors()
  const [active, setActive] = useState(null)
  const location = useLocation()

  useEffect(() => {
    const path = location.pathname
    const prompt = PROMPTS.find(p => path.startsWith(p.page) && !localStorage.getItem(`st4rtup_prompt_${p.id}`))
    if (!prompt) { setActive(null); return }

    const show = setTimeout(() => setActive(prompt), prompt.delay)
    const hide = setTimeout(() => setActive(null), prompt.delay + 10000)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [location.pathname])

  function dismiss() {
    if (active) localStorage.setItem(`st4rtup_prompt_${active.id}`, 'true')
    setActive(null)
  }

  if (!active) return null

  return (
    <div style={{
      position: 'fixed', top: 80, right: 24, zIndex: 45,
      maxWidth: 340, padding: '16px 20px', borderRadius: 14,
      backgroundColor: T.card, border: `1px solid ${T.border}`,
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
        <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.5, margin: 0 }}>{active.message}</p>
        <button aria-label="Cerrar" onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}><X size={16} color="#94A3B8" /></button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <Link to={active.link} onClick={dismiss} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '6px 14px', borderRadius: 8, backgroundColor: T.primary,
          color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>{active.cta} <ArrowRight size={12} /></Link>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', fontSize: 12, color: '#94A3B8', cursor: 'pointer' }}>No mostrar más</button>
      </div>
    </div>
  )
}
