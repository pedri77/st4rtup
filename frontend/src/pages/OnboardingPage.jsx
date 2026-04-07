import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Upload, Mail, BarChart3, Rocket, Check, Building2, Target } from 'lucide-react'
import { useOrganization } from '@/hooks/useOrganization'

const fontDisplay = "'Plus Jakarta Sans', sans-serif"

const SECTORS = [
  { id: 'saas', name: 'SaaS / Software', icon: '💻' },
  { id: 'ecommerce', name: 'Ecommerce', icon: '🛒' },
  { id: 'services', name: 'Servicios / Consultoría', icon: '🤝' },
  { id: 'fintech', name: 'Fintech', icon: '💰' },
  { id: 'healthtech', name: 'Healthtech', icon: '🏥' },
  { id: 'education', name: 'Educación', icon: '📚' },
  { id: 'marketing', name: 'Agencia / Marketing', icon: '📣' },
  { id: 'other', name: 'Otro', icon: '🔧' },
]

const PIPELINES = [
  { id: 'saas', name: 'B2B SaaS', stages: ['Nuevo', 'Demo', 'Propuesta', 'Negociación', 'Cerrado'] },
  { id: 'services', name: 'Servicios', stages: ['Contacto', 'Reunión', 'Presupuesto', 'Aprobación', 'Firmado'] },
  { id: 'ecommerce', name: 'Ecommerce', stages: ['Lead', 'Interesado', 'Carrito', 'Compra', 'Recurrente'] },
  { id: 'custom', name: 'Personalizado', stages: ['Fase 1', 'Fase 2', 'Fase 3', 'Fase 4', 'Cerrado'] },
]

const STEPS = [
  { icon: Rocket, title: 'Bienvenida' },
  { icon: Building2, title: 'Empresa' },
  { icon: Upload, title: 'Leads' },
  { icon: Mail, title: 'Email' },
  { icon: BarChart3, title: 'Pipeline' },
  { icon: Target, title: 'Objetivos' },
  { icon: Check, title: '¡Listo!' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [sector, setSector] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [monthlyTarget, setMonthlyTarget] = useState('')
  const nav = useNavigate()
  const { plan } = useOrganization()

  function next() { setStep(s => Math.min(s + 1, STEPS.length - 1)) }
  function skip() { next() }

  async function seedSampleData() {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { next(); return }
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
      const samples = [
        { company_name: 'TechStartup SL', contact_name: 'Ana García', email: 'ana@techstartup.es', company_sector: sector || 'SaaS', score: 75 },
        { company_name: 'GrowthLab', contact_name: 'Carlos López', email: 'carlos@growthlab.io', company_sector: sector || 'SaaS', score: 62 },
        { company_name: 'DataFlow', contact_name: 'María Ruiz', email: 'maria@dataflow.com', company_sector: sector || 'SaaS', score: 88 },
        { company_name: 'ScaleUp Ventures', contact_name: 'Pedro Martín', email: 'pedro@scaleup.vc', company_sector: 'Fintech', score: 55 },
        { company_name: 'LaunchPad Digital', contact_name: 'Laura Sánchez', email: 'laura@launchpad.es', company_sector: 'Marketing', score: 70 },
      ]
      for (const lead of samples) {
        await fetch(`${apiUrl}/leads`, { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(lead) }).catch(() => {})
      }
    } catch {}
    next()
  }
  async function finish() {
    const onboardingData = { name, company, sector, teamSize, pipeline: selectedPipeline, target: monthlyTarget }
    // Persist to backend so it syncs cross-device
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
        await fetch(`${apiUrl}/users/me/onboarding`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true, data: onboardingData }),
        })
      }
    } catch (e) {
      console.error('Failed to persist onboarding state', e)
    }
    // Cache locally too for instant loads
    localStorage.setItem('st4rtup_onboarding_done', 'true')
    localStorage.setItem('st4rtup_onboarding_data', JSON.stringify(onboardingData))
    nav('/app')
  }

  const card = { maxWidth: 560, margin: '0 auto', backgroundColor: 'white', borderRadius: 20, padding: '40px 36px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }
  const btn = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: fontDisplay }
  const input = { width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }
  const primaryBtn = { ...btn, backgroundColor: '#1E6FD9', color: 'white', width: '100%', justifyContent: 'center', marginTop: 8 }
  const skipBtn = { ...btn, backgroundColor: 'transparent', color: '#64748B', width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 13 }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />

      <img src="/logo.png" alt="st4rtup" style={{ height: 70, marginBottom: 24 }} />

      {plan && plan !== 'starter' && (
        <p style={{ fontSize: 12, color: '#1E6FD9', marginBottom: 16, fontWeight: 600, backgroundColor: '#EBF4FF', padding: '4px 12px', borderRadius: 20 }}>
          Plan {plan.charAt(0).toUpperCase() + plan.slice(1)} activo
        </p>
      )}

      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: i <= step ? '#1E6FD9' : '#E2E8F0', color: i <= step ? 'white' : '#94A3B8', fontSize: 11, fontWeight: 700, transition: 'all 0.3s' }}>
              {i < step ? <Check size={13} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div style={{ width: 16, height: 2, backgroundColor: i < step ? '#1E6FD9' : '#E2E8F0', transition: 'all 0.3s' }} />}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>Paso {step + 1} de {STEPS.length}: {STEPS[step].title}</p>

      <div style={card}>
        {/* Step 0: Welcome */}
        {step === 0 && (
          <>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>¡Bienvenido a St4rtup!</h2>
            <p style={{ color: '#64748B', marginBottom: 24, fontSize: 15 }}>Configuremos tu CRM en menos de 5 minutos. Todo lo que configures ahora se puede cambiar después.</p>
            <input placeholder="Tu nombre completo" value={name} onChange={e => setName(e.target.value)} style={input} id="onb-name" name="name" />
            <input placeholder="Nombre de tu empresa" value={company} onChange={e => setCompany(e.target.value)} style={input} id="onb-company" name="company" />
            <button onClick={next} style={primaryBtn}>Siguiente <ArrowRight size={16} /></button>
          </>
        )}

        {/* Step 1: Company/Sector */}
        {step === 1 && (
          <>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>¿Qué tipo de empresa es {company || 'tu startup'}?</h2>
            <p style={{ color: '#64748B', marginBottom: 20, fontSize: 15 }}>Esto nos ayuda a personalizar tu experiencia.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
              {SECTORS.map(s => (
                <button key={s.id} onClick={() => setSector(s.id)} style={{
                  padding: '14px 16px', borderRadius: 12, border: sector === s.id ? '2px solid #1E6FD9' : '1px solid #E2E8F0',
                  backgroundColor: sector === s.id ? '#EBF4FF' : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{s.name}</span>
                </button>
              ))}
            </div>
            <select value={teamSize} onChange={e => setTeamSize(e.target.value)} style={{ ...input, color: teamSize ? '#1A1A2E' : '#94A3B8' }} id="onb-team" name="team">
              <option value="">Tamaño de equipo de ventas</option>
              <option value="1">Solo yo</option>
              <option value="2-5">2-5 personas</option>
              <option value="6-10">6-10 personas</option>
              <option value="10+">Más de 10</option>
            </select>
            <button onClick={next} style={primaryBtn}>Siguiente <ArrowRight size={16} /></button>
          </>
        )}

        {/* Step 2: Import leads */}
        {step === 2 && (
          <>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>Importa tus leads</h2>
            <p style={{ color: '#64748B', marginBottom: 24, fontSize: 15 }}>Sube un CSV o empieza con datos de ejemplo para explorar la herramienta.</p>
            <div style={{ border: '2px dashed #E2E8F0', borderRadius: 14, padding: '40px 20px', textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}>
              <Upload size={32} color="#94A3B8" />
              <p style={{ color: '#94A3B8', fontSize: 14, marginTop: 8 }}>Arrastra tu CSV aquí o haz clic</p>
              <p style={{ color: '#CBD5E1', fontSize: 12 }}>Soportamos HubSpot, Salesforce y formato genérico</p>
            </div>
            <button onClick={seedSampleData} style={primaryBtn}>Usar datos de ejemplo</button>
            <button onClick={skip} style={skipBtn}>Omitir este paso</button>
          </>
        )}

        {/* Step 3: Connect email */}
        {step === 3 && (
          <>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>Conecta tu email</h2>
            <p style={{ color: '#64748B', marginBottom: 24, fontSize: 15 }}>Envía y recibe emails directamente desde el CRM con tracking de apertura y clics.</p>
            <button onClick={next} style={{ ...btn, backgroundColor: 'white', color: '#1A1A2E', width: '100%', justifyContent: 'center', border: '1px solid #E2E8F0', marginBottom: 12 }}>
              <img src="https://www.google.com/favicon.ico" alt="" style={{ width: 18, height: 18 }} /> Conectar Gmail
            </button>
            <button onClick={skip} style={skipBtn}>Lo haré después</button>
          </>
        )}

        {/* Step 4: Pipeline */}
        {step === 4 && (
          <>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>Elige tu pipeline</h2>
            <p style={{ color: '#64748B', marginBottom: 20, fontSize: 15 }}>Selecciona la plantilla que mejor se adapte a {company || 'tu negocio'}.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PIPELINES.map(p => (
                <button key={p.id} onClick={() => setSelectedPipeline(p.id)}
                  style={{ padding: '14px 18px', borderRadius: 12, border: selectedPipeline === p.id ? '2px solid #1E6FD9' : '1px solid #E2E8F0', backgroundColor: selectedPipeline === p.id ? '#EBF4FF' : 'white', cursor: 'pointer', textAlign: 'left' }}>
                  <p style={{ fontWeight: 700, margin: '0 0 6px', fontSize: 14, color: '#1A1A2E' }}>{p.name}</p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.stages.map((s, i) => (
                      <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748B', padding: '2px 8px', backgroundColor: '#F1F5F9', borderRadius: 4 }}>
                        {s} {i < p.stages.length - 1 && <ArrowRight size={10} color="#CBD5E1" />}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <button onClick={next} style={{ ...primaryBtn, marginTop: 16 }}>Siguiente <ArrowRight size={16} /></button>
          </>
        )}

        {/* Step 5: Goals */}
        {step === 5 && (
          <>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>¿Cuál es tu objetivo?</h2>
            <p style={{ color: '#64748B', marginBottom: 24, fontSize: 15 }}>Esto nos ayuda a mostrarte las métricas más relevantes.</p>
            <input type="number" placeholder="Leads nuevos/mes que quieres conseguir" value={monthlyTarget} onChange={e => setMonthlyTarget(e.target.value)} style={input} id="onb-target" name="target" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {['Cerrar más deals', 'Automatizar el seguimiento', 'Mejorar el marketing', 'Generar contenido SEO', 'Gestionar equipo de ventas'].map(g => (
                <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: 14, color: '#475569' }}>
                  <input type="checkbox" style={{ accentColor: '#1E6FD9' }} /> {g}
                </label>
              ))}
            </div>
            <button onClick={next} style={primaryBtn}>Siguiente <ArrowRight size={16} /></button>
            <button onClick={skip} style={skipBtn}>Omitir</button>
          </>
        )}

        {/* Step 6: Done */}
        {step === 6 && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#10B98120', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={32} color="#10B981" />
              </div>
              <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#1A1A2E' }}>¡Todo listo, {name || 'crack'}!</h2>
              <p style={{ color: '#64748B', marginBottom: 8, fontSize: 15 }}>{company || 'Tu empresa'} está configurada y lista para vender.</p>
              {plan && plan !== 'starter' && (
                <p style={{ fontSize: 13, color: '#1E6FD9', marginBottom: 24 }}>Plan {plan.charAt(0).toUpperCase() + plan.slice(1)} — 7 días de prueba gratis</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, textAlign: 'left' }}>
                {[
                  { label: 'Dashboard con KPIs', done: true },
                  { label: `Pipeline ${selectedPipeline || 'SaaS'} configurado`, done: !!selectedPipeline },
                  { label: 'Leads de ejemplo cargados', done: true },
                  { label: 'Email conectado', done: false },
                  { label: '28 automatizaciones activas', done: true },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 14 }}>
                    {item.done ? <Check size={16} color="#10B981" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #E2E8F0' }} />}
                    <span style={{ color: item.done ? '#1A1A2E' : '#94A3B8' }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <button onClick={finish} style={{ ...primaryBtn, marginTop: 0 }}>
                Ir al dashboard <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
