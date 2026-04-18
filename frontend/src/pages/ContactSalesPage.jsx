import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, CheckCircle, ArrowLeft, Building2, Users, Mail, Phone } from 'lucide-react'
import ThemeTogglePublic from '@/components/ThemeTogglePublic'
import SEO from '@/components/SEO'
import { useThemeColors } from '@/utils/theme'

// inputStyle, inputFocus, inputBlur are now defined inside the component to use theme tokens

export default function ContactSalesPage() {
  const T = useThemeColors()
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1px solid ${T.border}`, backgroundColor: T.muted,
    color: T.fg, fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }
  const inputFocus = (e) => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.primary}1A` }
  const inputBlur = (e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none' }
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', teamSize: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
      const res = await fetch(`${apiUrl}/public-forms/contact-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Error al enviar')
      setSent(true)
    } catch (err) {
      const subject = encodeURIComponent(`Contacto Enterprise — ${form.company}`)
      const body = encodeURIComponent(`Nombre: ${form.name}\nEmpresa: ${form.company}\nEquipo: ${form.teamSize} personas\nTeléfono: ${form.phone}\n\n${form.message}`)
      window.location.href = `mailto:hello@st4rtup.com?subject=${subject}&body=${body}`
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  const update = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="public-page" style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${T.card} 0%, ${T.bg} 100%)`, fontFamily: "'Inter', sans-serif", color: T.fg }}>
      <SEO title="Contactar ventas" description="Habla con nuestro equipo para un plan Enterprise personalizado." path="/contact-sales" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}`, backgroundColor: `${T.card}E6`, backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/"><img src="/logo.png" alt="St4rtup" style={{ height: 50 }} /></Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/" style={{ fontSize: 14, color: T.fgMuted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={16} /> Volver
            </Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48, alignItems: 'start' }}>

          {/* Left — Info */}
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>
              Hablemos de tu <span style={{ color: T.primary }}>plan Enterprise</span>
            </h1>
            <p style={{ fontSize: 16, color: T.fgMuted, lineHeight: 1.7, marginBottom: 36 }}>
              Para equipos grandes que necesitan SSO, SLA 99.9%, gestor dedicado y facturación a medida. Cuéntanos sobre tu equipo y te preparamos una propuesta.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[
                { icon: Users, title: 'Usuarios ilimitados', desc: 'Sin límites en tu equipo' },
                { icon: Building2, title: 'SSO / SAML', desc: 'Integración con tu identity provider' },
                { icon: Mail, title: 'Soporte prioritario', desc: 'Gestor de cuenta dedicado + SLA' },
                { icon: Phone, title: 'Onboarding personalizado', desc: 'Formación y migración de datos' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${T.primary}15, ${T.accent}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={T.primary} />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: T.fg }}>{title}</p>
                    <p style={{ fontSize: 13, color: T.fgMuted, margin: '3px 0 0' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Form */}
          <div style={{ backgroundColor: T.card, borderRadius: 20, padding: '36px 32px', border: `1px solid ${T.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <CheckCircle size={56} color="#10B981" style={{ margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: 22, fontWeight: 700, color: T.fg, marginBottom: 8 }}>Mensaje enviado</h2>
                <p style={{ fontSize: 14, color: T.fgMuted, marginBottom: 24 }}>Te responderemos en menos de 24 horas laborables.</p>
                <Link to="/" style={{ fontSize: 14, color: T.primary, fontWeight: 600, textDecoration: 'none' }}>Volver al inicio</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Plus Jakarta Sans'", marginBottom: 4, color: T.fg }}>Solicitar información</h2>
                <p style={{ fontSize: 14, color: T.fgMuted, marginBottom: 24 }}>Rellena el formulario y te contactamos.</p>

                {error && <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 13, padding: '10px 14px', borderRadius: 10, marginBottom: 16, border: '1px solid #FECACA' }}>{error}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.fgMuted, marginBottom: 6 }}>Nombre *</label>
                    <input type="text" required value={form.name} onChange={update('name')} placeholder="Tu nombre"
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.fgMuted, marginBottom: 6 }}>Email *</label>
                    <input type="email" required value={form.email} onChange={update('email')} placeholder="tu@empresa.com"
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.fgMuted, marginBottom: 6 }}>Empresa *</label>
                    <input type="text" required value={form.company} onChange={update('company')} placeholder="Empresa S.L."
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.fgMuted, marginBottom: 6 }}>Teléfono</label>
                    <input type="tel" value={form.phone} onChange={update('phone')} placeholder="+34 600..."
                      style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.fgMuted, marginBottom: 6 }}>Tamaño del equipo</label>
                  <select value={form.teamSize} onChange={update('teamSize')}
                    style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer' }} onFocus={inputFocus} onBlur={inputBlur}>
                    <option value="">Seleccionar...</option>
                    <option value="10-25">10–25 personas</option>
                    <option value="25-50">25–50 personas</option>
                    <option value="50-100">50–100 personas</option>
                    <option value="100+">100+ personas</option>
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.fgMuted, marginBottom: 6 }}>¿Qué necesitas?</label>
                  <textarea value={form.message} onChange={update('message')} rows={3}
                    placeholder="Cuéntanos sobre tus necesidades, integraciones, plazos..."
                    style={{ ...inputStyle, resize: 'vertical' }} onFocus={inputFocus} onBlur={inputBlur} />
                </div>

                <button type="submit" disabled={loading}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 24px', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: loading ? 'wait' : 'pointer', background: 'linear-gradient(135deg, #0F172A, #334155)', boxShadow: '0 4px 14px rgba(15,23,42,0.3)', transition: 'opacity 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  {loading ? (
                    <><div style={{ width: 18, height: 18, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Enviando...</>
                  ) : (
                    <><Send size={16} /> Enviar solicitud</>
                  )}
                </button>

                <p style={{ fontSize: 12, color: T.fgMuted, textAlign: 'center', marginTop: 12 }}>
                  También puedes escribirnos a <a href="mailto:hello@st4rtup.com" style={{ color: T.primary, textDecoration: 'none' }}>hello@st4rtup.com</a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
