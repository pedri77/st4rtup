import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, CheckCircle, ArrowLeft, Building2, Users, Mail, Phone } from 'lucide-react'
import SEO from '@/components/SEO'

export default function ContactSalesPage() {
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
      // Fallback: mailto
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <SEO title="Contactar ventas" description="Habla con nuestro equipo para un plan Enterprise personalizado." path="/contact-sales" />

      {/* Nav */}
      <nav style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/"><img src="/logo.png" alt="St4rtup" style={{ height: 50 }} /></Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 48, alignItems: 'start' }}>

          {/* Left — Info */}
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 36, fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>
              Hablemos de tu <span style={{ color: '#1E6FD9' }}>plan Enterprise</span>
            </h1>
            <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.7, marginBottom: 32 }}>
              Para equipos grandes que necesitan SSO, SLA 99.9%, gestor dedicado y facturación a medida. Cuéntanos sobre tu equipo y te preparamos una propuesta.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { icon: Users, title: 'Usuarios ilimitados', desc: 'Sin límites en tu equipo' },
                { icon: Building2, title: 'SSO / SAML', desc: 'Integración con tu identity provider' },
                { icon: Mail, title: 'Soporte prioritario', desc: 'Gestor de cuenta dedicado + SLA' },
                { icon: Phone, title: 'Onboarding personalizado', desc: 'Formación y migración de datos' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #EBF4FF, #FFF7ED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color="#1E6FD9" />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</p>
                    <p style={{ fontSize: 13, color: '#64748B', margin: '2px 0 0' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Form */}
          <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 32, border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            {sent ? (
              <div className="text-center py-8">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Mensaje enviado</h2>
                <p className="text-gray-500 text-sm mb-6">Te responderemos en menos de 24 horas laborables.</p>
                <Link to="/" className="text-blue-600 font-semibold text-sm hover:underline">Volver al inicio</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Plus Jakarta Sans'", marginBottom: 4 }}>Solicitar información</h2>
                <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>Rellena el formulario y te contactamos.</p>

                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                    <input type="text" required value={form.name} onChange={update('name')} className="input w-full" placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input type="email" required value={form.email} onChange={update('email')} className="input w-full" placeholder="tu@empresa.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Empresa *</label>
                    <input type="text" required value={form.company} onChange={update('company')} className="input w-full" placeholder="Empresa S.L." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                    <input type="tel" value={form.phone} onChange={update('phone')} className="input w-full" placeholder="+34 600..." />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tamaño del equipo</label>
                  <select value={form.teamSize} onChange={update('teamSize')} className="input w-full" style={{ appearance: 'auto' }}>
                    <option value="">Seleccionar...</option>
                    <option value="10-25">10–25 personas</option>
                    <option value="25-50">25–50 personas</option>
                    <option value="50-100">50–100 personas</option>
                    <option value="100+">100+ personas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">¿Qué necesitas?</label>
                  <textarea value={form.message} onChange={update('message')} className="input w-full" rows={3}
                    placeholder="Cuéntanos sobre tus necesidades, integraciones, plazos..." style={{ resize: 'vertical' }} />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg, #0F172A, #334155)', boxShadow: '0 4px 14px rgba(15,23,42,0.3)' }}>
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Enviar solicitud</>
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center mt-2">
                  También puedes escribirnos a <a href="mailto:hello@st4rtup.com" className="text-blue-500 hover:underline">hello@st4rtup.com</a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
