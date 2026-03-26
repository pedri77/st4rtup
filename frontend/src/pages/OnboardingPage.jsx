import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Upload, Mail, BarChart3, Rocket, Check } from 'lucide-react'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"

const STEPS = [
  { icon: Rocket, title: 'Bienvenida' },
  { icon: Upload, title: 'Leads' },
  { icon: Mail, title: 'Email' },
  { icon: BarChart3, title: 'Pipeline' },
  { icon: Check, title: '¡Listo!' },
]

const PIPELINES = [
  { id: 'saas', name: 'B2B SaaS', stages: ['Nuevo', 'Demo', 'Propuesta', 'Negociación', 'Cerrado'] },
  { id: 'services', name: 'Servicios', stages: ['Contacto', 'Reunión', 'Presupuesto', 'Aprobación', 'Firmado'] },
  { id: 'ecommerce', name: 'Ecommerce', stages: ['Lead', 'Interesado', 'Carrito', 'Compra', 'Recurrente'] },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const nav = useNavigate()

  function next() { setStep(s => Math.min(s + 1, 4)) }
  function skip() { next() }
  function finish() {
    localStorage.setItem('st4rtup_onboarding_done', 'true')
    nav('/app')
  }

  const card = { maxWidth: 520, margin: '0 auto', backgroundColor: 'white', borderRadius: 20, padding: '40px 36px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: fontDisplay }
  const input = { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', marginBottom: 12 }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />

      {/* Logo */}
      <img src="/logo.png" alt="st4rtup" style={{ height: 70, marginBottom: 32 }} />

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: i <= step ? '#1E6FD9' : '#E2E8F0', color: i <= step ? 'white' : '#94A3B8', fontSize: 12, fontWeight: 700, transition: 'all 0.3s' }}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            {i < 4 && <div style={{ width: 24, height: 2, backgroundColor: i < step ? '#1E6FD9' : '#E2E8F0', transition: 'all 0.3s' }} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={card}>
        {step === 0 && (
          <>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>¡Bienvenido a St4rtup!</h2>
            <p style={{ color: '#64748B', marginBottom: 24, fontSize: 15 }}>Configuremos tu CRM en 5 minutos.</p>
            <input placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} style={input} />
            <input placeholder="Nombre de tu empresa" value={company} onChange={e => setCompany(e.target.value)} style={input} />
            <button onClick={next} style={{ ...btn, backgroundColor: '#1E6FD9', color: 'white', width: '100%', justifyContent: 'center', marginTop: 8 }}>Siguiente <ArrowRight size={16} /></button>
          </>
        )}

        {step === 1 && (
          <>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>Importa tus leads</h2>
            <p style={{ color: '#64748B', marginBottom: 24, fontSize: 15 }}>Sube un CSV o empieza con datos de ejemplo.</p>
            <div style={{ border: '2px dashed #E2E8F0', borderRadius: 14, padding: '40px 20px', textAlign: 'center', marginBottom: 16 }}>
              <Upload size={32} color="#94A3B8" />
              <p style={{ color: '#94A3B8', fontSize: 14, marginTop: 8 }}>Arrastra tu CSV aquí o haz clic</p>
              <p style={{ color: '#CBD5E1', fontSize: 12 }}>Soportamos HubSpot, Salesforce y formato genérico</p>
            </div>
            <button onClick={next} style={{ ...btn, backgroundColor: '#1E6FD9', color: 'white', width: '100%', justifyContent: 'center' }}>Usar datos de ejemplo</button>
            <button onClick={skip} style={{ ...btn, backgroundColor: 'transparent', color: '#64748B', width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 13 }}>Omitir este paso</button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>Conecta tu email</h2>
            <p style={{ color: '#64748B', marginBottom: 24, fontSize: 15 }}>Envía y recibe emails directamente desde el CRM.</p>
            <button onClick={next} style={{ ...btn, backgroundColor: 'white', color: '#1A1A2E', width: '100%', justifyContent: 'center', border: '1px solid #E2E8F0', marginBottom: 12 }}>
              <img src="https://www.google.com/favicon.ico" alt="" style={{ width: 18, height: 18 }} /> Conectar Gmail
            </button>
            <button onClick={skip} style={{ ...btn, backgroundColor: 'transparent', color: '#64748B', width: '100%', justifyContent: 'center', fontSize: 13 }}>Lo haré después</button>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>Elige tu pipeline</h2>
            <p style={{ color: '#64748B', marginBottom: 24, fontSize: 15 }}>Selecciona la plantilla que mejor se adapte a tu negocio.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PIPELINES.map(p => (
                <button key={p.id} onClick={() => setSelectedPipeline(p.id)}
                  style={{ padding: '16px 20px', borderRadius: 12, border: selectedPipeline === p.id ? '2px solid #1E6FD9' : '1px solid #E2E8F0', backgroundColor: selectedPipeline === p.id ? '#EBF4FF' : 'white', cursor: 'pointer', textAlign: 'left' }}>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', fontSize: 15, color: '#1A1A2E' }}>{p.name}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.stages.map(s => <span key={s} style={{ fontSize: 11, color: '#64748B', padding: '2px 8px', backgroundColor: '#F1F5F9', borderRadius: 4 }}>{s}</span>)}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={next} style={{ ...btn, backgroundColor: '#1E6FD9', color: 'white', width: '100%', justifyContent: 'center', marginTop: 16 }}>Siguiente <ArrowRight size={16} /></button>
          </>
        )}

        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#10B98120', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Check size={32} color="#10B981" />
            </div>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>¡Tu CRM está listo!</h2>
            <p style={{ color: '#64748B', marginBottom: 8, fontSize: 15 }}>Hola {name || 'there'}, {company ? `${company} está configurado` : 'todo está configurado'}.</p>
            <p style={{ color: '#94A3B8', marginBottom: 28, fontSize: 13 }}>Tienes 7 días gratis del plan Growth. Todas las funcionalidades desbloqueadas.</p>
            <button onClick={finish} style={{ ...btn, backgroundColor: '#1E6FD9', color: 'white', width: '100%', justifyContent: 'center' }}>Ir al dashboard <ArrowRight size={16} /></button>
          </div>
        )}
      </div>

      {/* Step counter */}
      <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 16 }}>Paso {step + 1} de 5</p>
    </div>
  )
}
