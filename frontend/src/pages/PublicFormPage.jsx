import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Send, Loader2, CheckCircle, AlertTriangle, Lock } from 'lucide-react'
import api from '@/services/api'

const T = {
  bg: '#0a0e1a', card: '#111827', muted: '#1f2937',
  border: '#374151', fg: '#f3f4f6', fgMuted: '#9ca3af',
  cyan: '#0cd5e8', purple: '#7c3aed',
  success: '#22c55e', destructive: '#ef4444',
}

const publicFormApi = {
  getConfig: (formId, token) => api.get(`/public-forms/config/${formId}`, { params: token ? { token } : {} }),
  submit: (data) => api.post('/public-forms/submit', data),
}

export default function PublicFormPage() {
  const { formId } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [config, setConfig] = useState(null)
  const [formData, setFormData] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    publicFormApi.getConfig(formId, token)
      .then(res => { setConfig(res.data); setLoading(false) })
      .catch((err) => {
        const detail = err.response?.data?.detail || 'Formulario no encontrado'
        setError(detail)
        setLoading(false)
      })
  }, [formId, token])

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleMultiSelect = (key, option) => {
    const current = formData[key] || []
    if (current.includes(option)) {
      handleChange(key, current.filter(o => o !== option))
    } else {
      handleChange(key, [...current, option])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await publicFormApi.submit({
        form_id: formId, data: formData, token: token || undefined,
        lead_id: config?.lead_id || undefined,
      })
      setResult(res.data)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al enviar el formulario')
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color={T.cyan} className="animate-spin" />
    </div>
  )

  if (error && !config) return (
    <div style={{ minHeight: '100vh', backgroundColor: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <AlertTriangle size={48} color={T.destructive} />
      <p style={{ color: T.fg, fontSize: 18 }}>{error}</p>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight: '100vh', backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 4, height: 28, backgroundColor: T.cyan, borderRadius: 2 }} />
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16, color: T.cyan }}>RISKITERA</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, padding: '64px 32px', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: T.success + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={48} color={T.success} />
        </div>

        <h1 style={{ color: T.fg, fontSize: 28, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, margin: 0, textAlign: 'center' }}>
          Formulario recibido correctamente
        </h1>

        <p style={{ color: T.fgMuted, textAlign: 'center', maxWidth: 450, fontSize: 15, lineHeight: 1.6, margin: 0 }}>
          Gracias por dedicar tu tiempo a completar este formulario. Hemos recibido toda la informacion y nuestro equipo la revisara en breve.
        </p>

        {result?.roi_pct !== undefined && (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.cyan}44`, borderRadius: 12, padding: 28, textAlign: 'center', width: '100%' }}>
            <p style={{ color: T.fgMuted, fontSize: 13, margin: '0 0 8px 0' }}>ROI estimado con St4rtup</p>
            <p style={{ color: T.cyan, fontSize: 52, fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", margin: '0 0 4px 0' }}>{result.roi_pct}%</p>
            <p style={{ color: T.success, fontSize: 16, margin: 0 }}>Ahorro anual: {result.total_savings?.toLocaleString('es-ES')} EUR</p>
          </div>
        )}

        {result?.score_total !== undefined && (
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.purple}44`, borderRadius: 12, padding: 28, textAlign: 'center', width: '100%' }}>
            <p style={{ color: T.fgMuted, fontSize: 13, margin: '0 0 8px 0' }}>Puntuacion BANT</p>
            <p style={{ color: T.purple, fontSize: 52, fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", margin: 0 }}>{result.score_total}/100</p>
          </div>
        )}

        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, width: '100%', marginTop: 8 }}>
          <h3 style={{ color: T.fg, fontSize: 15, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, margin: '0 0 12px 0' }}>Proximos pasos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: T.cyan, marginTop: 6, flexShrink: 0 }} />
              <p style={{ color: T.fgMuted, fontSize: 13, margin: 0 }}>Nuestro equipo revisara la informacion proporcionada</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: T.cyan, marginTop: 6, flexShrink: 0 }} />
              <p style={{ color: T.fgMuted, fontSize: 13, margin: 0 }}>Recibiras una respuesta en un plazo maximo de 48 horas</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: T.cyan, marginTop: 6, flexShrink: 0 }} />
              <p style={{ color: T.fgMuted, fontSize: 13, margin: 0 }}>Si tienes preguntas, contacta con nosotros en hello@st4rtup.app</p>
            </div>
          </div>
        </div>

        <p style={{ color: T.fgMuted, fontSize: 11, textAlign: 'center', marginTop: 24 }}>
          St4rtup | Plataforma growth de Ciberseguridad<br />
          Scale | Growth | B2B | SaaS Best Practices
        </p>
      </div>
    </div>
  )

  const inputStyle = {
    backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
    borderRadius: 8, padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 4, height: 28, backgroundColor: T.cyan, borderRadius: 2 }} />
        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16, color: T.cyan }}>RISKITERA</span>
        <span style={{ color: T.fgMuted, fontSize: 12 }}>Sales CRM</span>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: T.fg, margin: '0 0 4px 0' }}>
          {config.title}
        </h1>
        <p style={{ color: T.fgMuted, fontSize: 14, margin: '0 0 32px 0' }}>{config.subtitle}</p>

        {error && (
          <div style={{ backgroundColor: `${T.destructive}15`, border: `1px solid ${T.destructive}44`, borderRadius: 8, padding: 12, marginBottom: 24, color: T.destructive, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {config.sections?.map((section, si) => (
            <div key={si} style={{ marginBottom: 32 }}>
              {section.title && (
                <h2 style={{
                  fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: T.cyan,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  margin: '0 0 16px 0', paddingBottom: 8, borderBottom: `1px solid ${T.border}`,
                }}>
                  {section.title}
                </h2>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: section.fields.some(f => f.type === 'textarea') ? '1fr' : '1fr 1fr', gap: 16 }}>
                {section.fields.map(field => (
                  <div key={field.key} style={field.type === 'textarea' || field.type === 'multiselect' ? { gridColumn: 'span 2' } : {}}>
                    <label htmlFor={`form-${field.key}`} style={{ display: 'block', fontSize: 12, color: T.fgMuted, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {field.label}{field.required ? ' *' : ''}
                    </label>

                    {field.type === 'select' ? (
                      <select id={`form-${field.key}`} value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)}
                        required={field.required} style={inputStyle} aria-label={field.label}>
                        <option value="">Seleccionar...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : field.type === 'multiselect' ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {field.options?.map(opt => {
                          const selected = (formData[field.key] || []).includes(opt)
                          return (
                            <button key={opt} type="button" onClick={() => handleMultiSelect(field.key, opt)}
                              style={{
                                padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                                backgroundColor: selected ? `${T.cyan}22` : T.muted,
                                border: `1px solid ${selected ? T.cyan : T.border}`,
                                color: selected ? T.cyan : T.fgMuted,
                              }}>
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    ) : field.type === 'textarea' ? (
                      <textarea id={`form-${field.key}`} value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)}
                        rows={4} placeholder={field.placeholder || ''} required={field.required} style={inputStyle} aria-label={field.label} />
                    ) : (
                      <input id={`form-${field.key}`} type={field.type || 'text'} value={formData[field.key] || field.default || ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ''} required={field.required}
                        min={field.min} max={field.max} style={inputStyle} aria-label={field.label} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button type="submit" disabled={submitting}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '14px 24px', borderRadius: 8,
              background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`,
              color: T.bg, border: 'none', cursor: 'pointer',
              fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16,
              opacity: submitting ? 0.7 : 1,
            }}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {submitting ? 'Enviando...' : 'Enviar formulario'}
          </button>

          {/* Honeypot — hidden from users, catches bots */}
          <input type="text" name="_hp_website" value={formData._hp_website || ''} onChange={e => handleChange('_hp_website', e.target.value)}
            style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

          {/* Security badge */}
          {token && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
              <Lock size={12} color={T.success} />
              <span style={{ color: T.success, fontSize: 11 }}>Enlace seguro verificado</span>
            </div>
          )}
        </form>

        <p style={{ color: T.fgMuted, fontSize: 11, textAlign: 'center', marginTop: 32 }}>
          St4rtup | Plataforma growth de Ciberseguridad | Documento confidencial
        </p>
      </div>
    </div>
  )
}
