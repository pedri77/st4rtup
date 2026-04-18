import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserPlus, Eye, EyeOff, Building2, CheckCircle, Rocket, Users, Zap, BarChart3, Shield } from 'lucide-react'
import confetti from 'canvas-confetti'

function SuccessScreen() {
  return (
    <div className="text-center py-8 animate-fade-in">
      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cuenta creada!</h2>
      <p className="text-gray-500 mb-6">Te estamos preparando tu espacio de trabajo...</p>
      <div className="flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const fireConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#1E6FD9', '#F5820B', '#10B981', '#8B5CF6'] })
    setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.5 } }), 250)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setLoading(true)
    try {
      await signUp(email, password, { full_name: fullName, company_name: companyName })
      setSuccess(true)
      fireConfetti()
      const abVariant = sessionStorage.getItem('ab_hero_variant')
      if (abVariant !== null) window.umami?.track('register_conversion', { ab_variant: abVariant, method: 'email' })
      setTimeout(() => navigate('/app/onboarding'), 2000)
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('Este email ya está registrado. ¿Quieres iniciar sesión?')
      } else {
        setError(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white placeholder:text-gray-400"

  return (
    <div className="public-page min-h-screen flex">
      {/* Left: Hero visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F5820B, #F59E0B, #E67E22)' }}>
        <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center justify-center p-16 text-white w-full">
          <h2 className="text-4xl font-bold mb-4 text-center leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Tu CRM listo<br />en 5 minutos.
          </h2>
          <p className="text-orange-100 text-center mb-12 max-w-md text-lg">
            Sin tarjeta de crédito. Sin compromisos. Cancela cuando quieras.
          </p>

          <div className="flex flex-col gap-4 w-full max-w-sm">
            {[
              { icon: Users, text: 'Importa leads desde CSV o Apollo.io', color: '#FEF3C7' },
              { icon: Zap, text: '22 automatizaciones activas desde el día 1', color: '#ECFDF5' },
              { icon: BarChart3, text: 'Dashboard con KPIs y gráficos en tiempo real', color: '#EEF2FF' },
              { icon: Shield, text: 'Datos cifrados y cumplimiento RGPD', color: '#F3E8FF' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${f.color}30` }}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-white/90">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['M', 'C', 'A', 'P'].map((l, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-xs font-bold bg-white/20">{l}</div>
              ))}
            </div>
            <p className="text-sm text-white/70">+200 startups ya usan St4rtup</p>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-3 mb-8 group">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>St4rtup</span>
          </Link>

          {success ? <SuccessScreen /> : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Crea tu cuenta</h1>
              <p className="text-gray-500 mb-6">Empieza gratis. Sin tarjeta de crédito.</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
                  <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    required disabled={loading} className={inputClass} placeholder="María García" autoComplete="name" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email de trabajo</label>
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required disabled={loading} className={inputClass} placeholder="maria@miempresa.com" autoComplete="email" />
                </div>
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Building2 className="w-4 h-4 inline mr-1 -mt-0.5" /> Nombre de la empresa
                  </label>
                  <input id="company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    required disabled={loading} className={inputClass} placeholder="Mi Startup S.L." autoComplete="organization" />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} required disabled={loading}
                      className={inputClass} style={{ paddingRight: 40 }}
                      placeholder="Mínimo 6 caracteres" autoComplete="new-password" minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-60 !mt-6">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                Al registrarte, aceptas nuestros{' '}
                <Link to="/terms" className="text-blue-500 hover:underline">Términos</Link> y{' '}
                <Link to="/privacy" className="text-blue-500 hover:underline">Política de privacidad</Link>.
              </p>

              <p className="text-sm text-gray-500 text-center mt-6 pt-6 border-t border-gray-100">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-blue-600 font-semibold hover:underline">Iniciar sesión</Link>
              </p>
            </>
          )}

          <p className="text-xs text-gray-400 text-center mt-8">© {new Date().getFullYear()} St4rtup. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}
