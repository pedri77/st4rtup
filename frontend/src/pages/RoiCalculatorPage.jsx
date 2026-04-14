import { useState } from 'react'
import WebChatWidget from "@/components/WebChatWidget"
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, Clock, DollarSign } from 'lucide-react'
import { useThemeColors } from '@/utils/theme'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

export default function RoiCalculatorPage() {
  const T = useThemeColors()
  const [leads, setLeads] = useState(100)
  const [reps, setReps] = useState(2)
  const [dealValue, setDealValue] = useState(5000)
  const [conversion, setConversion] = useState(5)
  const [manualHours, setManualHours] = useState(15)

  const revenueNow = Math.round(leads * (conversion / 100) * dealValue)
  const revenueWithUs = Math.round(leads * ((conversion * 1.3) / 100) * dealValue)
  const revenueExtra = revenueWithUs - revenueNow
  const revenueExtraYear = revenueExtra * 12
  const hoursSaved = Math.round(manualHours * 4 * 0.6)
  const planCostYear = 19 * 12
  const roi = planCostYear > 0 ? Math.round((revenueExtraYear / planCostYear) * 100) : 0

  const inputRow = (label, value, setValue, min, max, unit = '') => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: T.fg }}>{label}</label>
        <span style={{ fontFamily: fontMono, fontSize: 14, fontWeight: 600, color: T.primary }}>{unit}{value.toLocaleString()}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => setValue(+e.target.value)}
        style={{ width: '100%', accentColor: T.primary }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.fgMuted, fontFamily: fontMono }}>
        <span>{unit}{min}</span><span>{unit}{max.toLocaleString()}</span>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: T.fg, minHeight: '100vh', backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet" />

      <nav style={{ backgroundColor: T.card, borderBottom: `1px solid ${T.border}`, padding: '0 24px', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Link to="/"><img src="/logo.png" alt="st4rtup" style={{ height: 100 }} /></Link>
        <Link to="/login" style={{ padding: '10px 22px', backgroundColor: T.primary, color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Empezar gratis</Link>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontFamily: fontDisplay, fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Calculadora de ROI</h1>
          <p style={{ color: T.fgMuted, fontSize: 16 }}>Descubre cuánto más puedes vender con St4rtup</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {/* Inputs */}
          <div style={{ padding: 28, borderRadius: 16, backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Tu situación actual</h3>
            {inputRow('Leads por mes', leads, setLeads, 10, 5000)}
            {inputRow('Comerciales en el equipo', reps, setReps, 1, 20)}
            {inputRow('Valor medio de un deal', dealValue, setDealValue, 500, 100000, '€')}
            {inputRow('Tasa de conversión actual', conversion, setConversion, 1, 30, '', )}
            {inputRow('Horas/semana en tareas manuales', manualHours, setManualHours, 5, 40)}
          </div>

          {/* Results */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 20, borderRadius: 14, backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <DollarSign size={18} color={T.fgMuted} />
                <p style={{ fontSize: 11, color: T.fgMuted, margin: '8px 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Revenue actual/mes</p>
                <p style={{ fontSize: 24, fontWeight: 800, fontFamily: fontDisplay, color: T.fgMuted, margin: 0 }}>€{revenueNow.toLocaleString()}</p>
              </div>
              <div style={{ padding: 20, borderRadius: 14, backgroundColor: `${T.primary}18`, border: `2px solid ${T.primary}` }}>
                <TrendingUp size={18} color={T.primary} />
                <p style={{ fontSize: 11, color: T.primary, margin: '8px 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Con St4rtup/mes</p>
                <p style={{ fontSize: 24, fontWeight: 800, fontFamily: fontDisplay, color: T.primary, margin: 0 }}>€{revenueWithUs.toLocaleString()}</p>
              </div>
            </div>

            <div style={{ padding: 24, borderRadius: 14, background: 'linear-gradient(135deg, #1E6FD9, #F5820B)', marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Revenue adicional al año</p>
              <p style={{ fontSize: 36, fontWeight: 800, fontFamily: fontDisplay, color: 'white', margin: '4px 0' }}>+€{revenueExtraYear.toLocaleString()}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 16, borderRadius: 12, backgroundColor: '#10B98115', border: '1px solid #10B98130' }}>
                <Clock size={16} color="#10B981" />
                <p style={{ fontSize: 11, color: '#065F46', margin: '6px 0 2px' }}>Horas ahorradas/mes</p>
                <p style={{ fontSize: 22, fontWeight: 800, fontFamily: fontDisplay, color: '#10B981', margin: 0 }}>{hoursSaved}h</p>
              </div>
              <div style={{ padding: 16, borderRadius: 12, backgroundColor: '#F5820B15', border: '1px solid #F5820B30' }}>
                <TrendingUp size={16} color="#F5820B" />
                <p style={{ fontSize: 11, color: '#9A3412', margin: '6px 0 2px' }}>ROI del plan Growth</p>
                <p style={{ fontSize: 22, fontWeight: 800, fontFamily: fontDisplay, color: '#F5820B', margin: 0 }}>{roi.toLocaleString()}%</p>
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 12, backgroundColor: T.card, border: `1px solid ${T.border}`, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: T.fgMuted, margin: 0 }}>
                Con St4rtup generas <strong style={{ color: T.primary }}>€{revenueExtraYear.toLocaleString()}</strong> más al año.
                El plan Growth cuesta <strong>€{planCostYear}/año</strong>.
                ROI: <strong style={{ color: T.accent }}>{roi.toLocaleString()}%</strong>
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', backgroundColor: T.primary, color: 'white', borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: 'none', boxShadow: `0 4px 14px ${T.primary}4D` }}>
            Empezar gratis <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    <WebChatWidget />
    </div>
  )
}

