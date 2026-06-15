import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import SEO from '@/components/SEO'
import { supabase } from '@/lib/supabase'
import { track, identify } from '@/utils/posthog'
import {
  ArrowRight, ArrowLeft, Users, Wrench, AlertTriangle,
  TrendingUp, CheckCircle2, BarChart3
} from 'lucide-react'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0',
  fg: '#0F172A', fgMuted: '#64748B', primary: '#1E6FD9', accent: '#F5820B',
  success: '#10B981',
}

const STEPS = [
  {
    id: 'team_size',
    stepNumber: 1,
    title: '¿Cuántas personas venden en tu equipo?',
    subtitle: 'Incluye founders que venden, SDRs, AEs, closers.',
    icon: <Users size={20} />,
    type: 'single',
    required: true,
    options: [
      { id: 'solo', label: 'Solo yo', score: 1, segment: 'solo-founder', plan: 'starter' },
      { id: '2-3', label: '2-3 personas', score: 2, segment: 'small-team', plan: 'growth' },
      { id: '4-10', label: '4-10 personas', score: 3, segment: 'mid-team', plan: 'scale' },
      { id: '10+', label: 'Más de 10', score: 4, segment: 'large-team', plan: 'enterprise' },
    ],
  },
  {
    id: 'current_tools',
    stepNumber: 2,
    title: '¿Qué usas ahora para gestionar ventas?',
    subtitle: 'Selecciona todas las que apliquen.',
    icon: <Wrench size={20} />,
    type: 'multiple',
    required: true,
    options: [
      { id: 'spreadsheet', label: 'Excel / Google Sheets', score: 3, segment: 'pain-manual' },
      { id: 'hubspot', label: 'HubSpot', score: 1, segment: 'has-crm' },
      { id: 'salesforce', label: 'Salesforce', score: 1, segment: 'has-crm' },
      { id: 'pipedrive', label: 'Pipedrive', score: 1, segment: 'has-crm' },
      { id: 'notion', label: 'Notion / Airtable', score: 2, segment: 'pain-hacky' },
      { id: 'nothing', label: 'Nada (memoria + WhatsApp)', score: 4, segment: 'pain-zero' },
      { id: 'other', label: 'Otro CRM', score: 1, segment: 'has-crm' },
    ],
  },
  {
    id: 'pain_points',
    stepNumber: 3,
    title: '¿Cuáles de estos problemas te suenan?',
    subtitle: 'Marca los que reconozcas en tu día a día.',
    icon: <AlertTriangle size={20} />,
    type: 'multiple',
    required: true,
    options: [
      { id: 'no-followup', label: 'Se me escapan follow-ups y leads se enfrían', score: 3, segment: 'pain-followup' },
      { id: 'no-pipeline', label: 'No sé cuántos deals tengo ni en qué etapa están', score: 3, segment: 'pain-visibility' },
      { id: 'manual-emails', label: 'Envío emails uno a uno, sin secuencias', score: 2, segment: 'pain-email' },
      { id: 'no-metrics', label: 'No tengo métricas de conversión ni forecast', score: 3, segment: 'pain-metrics' },
      { id: 'too-many-tools', label: 'Uso 5+ herramientas que no hablan entre sí', score: 2, segment: 'pain-fragmented' },
      { id: 'no-automation', label: 'Todo es manual: nada está automatizado', score: 3, segment: 'pain-manual' },
    ],
  },
  {
    id: 'volume',
    stepNumber: 4,
    title: '¿Cuántos leads nuevos gestionas al mes?',
    icon: <TrendingUp size={20} />,
    type: 'single',
    required: true,
    options: [
      { id: 'low', label: 'Menos de 20', score: 1, segment: 'vol-low', plan: 'starter' },
      { id: 'mid', label: '20-100', score: 2, segment: 'vol-mid', plan: 'growth' },
      { id: 'high', label: '100-500', score: 3, segment: 'vol-high', plan: 'scale' },
      { id: 'very-high', label: 'Más de 500', score: 4, segment: 'vol-enterprise', plan: 'enterprise' },
    ],
  },
]

function calcResult(answers) {
  let totalScore = 0
  const segments = new Set()
  const planVotes = { starter: 0, growth: 0, scale: 0, enterprise: 0 }

  for (const step of STEPS) {
    const answer = answers[step.id]
    if (!answer) continue
    const selected = Array.isArray(answer) ? answer : [answer]
    for (const optId of selected) {
      const opt = step.options.find(o => o.id === optId)
      if (!opt) continue
      totalScore += opt.score
      if (opt.segment) segments.add(opt.segment)
      if (opt.plan) planVotes[opt.plan]++
    }
  }

  // Plan recomendado por score
  let recommendedPlan = 'starter'
  if (totalScore >= 12) recommendedPlan = 'enterprise'
  else if (totalScore >= 8) recommendedPlan = 'scale'
  else if (totalScore >= 4) recommendedPlan = 'growth'

  // Override por votos directos si hay consenso
  const maxVotes = Math.max(...Object.values(planVotes))
  if (maxVotes >= 2) {
    const winner = Object.entries(planVotes).find(([, v]) => v === maxVotes)
    if (winner) recommendedPlan = winner[0]
  }

  return { totalScore, segments: [...segments], recommendedPlan }
}

const PLAN_INFO = {
  starter: { name: 'Starter', color: T.primary, price: 'Gratis', desc: 'Perfecto para arrancar. 1 usuario, 100 leads, pipeline básico.' },
  growth: { name: 'Growth', color: T.primary, price: '19 €/mes', desc: '3 usuarios, leads ilimitados, 22 automatizaciones, IA integrada.' },
  scale: { name: 'Scale', color: T.accent, price: '49 €/mes', desc: '10 usuarios, Deal Room, WhatsApp Business, API pública.' },
  enterprise: { name: 'Enterprise', color: '#8B5CF6', price: 'A medida', desc: 'Usuarios ilimitados, SSO, SLA 99.9%, account manager dedicado.' },
}

export default function SalesQuizPage() {
  const [currentStep, setCurrentStep] = useState(-1)
  const [answers, setAnswers] = useState({})
  const [completed, setCompleted] = useState(false)
  const [result, setResult] = useState(null)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactStep, setContactStep] = useState(false)

  const step = currentStep >= 0 && !contactStep ? STEPS[currentStep] : null
  const totalSteps = STEPS.length
  const progress = currentStep >= 0 ? ((currentStep + 1) / totalSteps) * 100 : 0

  const handleStart = () => {
    setCurrentStep(0)
    track('quiz_started', { project: 'st4rtup' })
  }

  const handleAnswer = (stepId, value) => {
    setAnswers(prev => ({ ...prev, [stepId]: value }))
  }

  const handleToggle = (stepId, optionId) => {
    const current = answers[stepId] || []
    const updated = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId]
    handleAnswer(stepId, updated)
  }

  const canProceed = useCallback(() => {
    if (!step) return true
    if (!step.required) return true
    const answer = answers[step.id]
    if (!answer) return false
    if (Array.isArray(answer) && answer.length === 0) return false
    return true
  }, [step, answers])

  const submitQuiz = () => {
    const res = calcResult(answers)
    setResult(res)
    setCompleted(true)
    track('quiz_completed', {
      project: 'st4rtup',
      total_score: res.totalScore,
      recommended_plan: res.recommendedPlan,
      segments: res.segments,
      answers,
      contact_email: contactEmail,
    })
    if (contactEmail) {
      identify(contactEmail, { name: contactName, quiz_plan: res.recommendedPlan })
    }
    const params = new URLSearchParams(window.location.search)
    supabase.from('quiz_leads').insert({
      answers: { ...answers, contact_name: contactName, contact_email: contactEmail },
      segments: res.segments,
      total_score: res.totalScore,
      recommended_plan: res.recommendedPlan,
      source: document.referrer || null,
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
    }).then(() => {}).catch(() => {})
  }

  const handleNext = () => {
    if (!canProceed()) return

    track('quiz_step_completed', {
      project: 'st4rtup',
      step_id: step.id,
      step_number: currentStep + 1,
    })

    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1)
    } else {
      setContactStep(true)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }

  // Resultado
  if (completed && result) {
    const plan = PLAN_INFO[result.recommendedPlan]
    return (
      <>
        <SEO title="Tu diagnóstico de ventas | st4rtup" description="Resultado de tu diagnóstico de proceso de ventas" />
        <div style={{ minHeight: '100vh', backgroundColor: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: `${T.success}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle2 size={32} color={T.success} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: T.fg, marginBottom: 8 }}>
              Tu diagnóstico está listo
            </h1>
            <p style={{ fontSize: 16, color: T.fgMuted, marginBottom: 32 }}>
              Basado en tus respuestas, tu proceso de ventas tiene margen de mejora.
            </p>

            {/* Plan recomendado */}
            <div style={{
              backgroundColor: T.card, borderRadius: 16, padding: 32,
              border: `2px solid ${plan.color}30`, marginBottom: 24,
              boxShadow: `0 4px 24px ${plan.color}10`,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: plan.color, marginBottom: 8 }}>
                Plan recomendado
              </p>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: T.fg, marginBottom: 4 }}>
                {plan.name}
              </h2>
              <p style={{ fontSize: 20, fontWeight: 600, color: plan.color, marginBottom: 12 }}>
                {plan.price}
              </p>
              <p style={{ fontSize: 15, color: T.fgMuted, lineHeight: 1.6 }}>
                {plan.desc}
              </p>
            </div>

            {/* Score visual */}
            <div style={{
              backgroundColor: T.card, borderRadius: 12, padding: 20,
              border: `1px solid ${T.border}`, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <BarChart3 size={24} color={T.primary} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ fontSize: 13, color: T.fgMuted }}>Puntuación de complejidad</p>
                <div style={{ height: 6, borderRadius: 3, backgroundColor: T.muted, marginTop: 6 }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${Math.min((result.totalScore / 20) * 100, 100)}%`,
                    backgroundColor: result.totalScore >= 12 ? T.accent : result.totalScore >= 8 ? '#F59E0B' : T.primary,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: T.fg }}>{result.totalScore}</span>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link
                to="/register"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 24px', borderRadius: 10,
                  background: `linear-gradient(135deg, ${T.primary}, #3B8DE8)`,
                  color: 'white', fontWeight: 600, fontSize: 16, textDecoration: 'none',
                  boxShadow: `0 4px 14px ${T.primary}40`,
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                onClick={() => track('quiz_cta_clicked', { project: 'st4rtup', plan: result.recommendedPlan, cta: 'register' })}
              >
                {result.recommendedPlan === 'starter' ? 'Empezar gratis' : 'Probar 7 días gratis'}
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/pricing"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 24px', borderRadius: 10,
                  backgroundColor: 'transparent', border: `1px solid ${T.border}`,
                  color: T.fgMuted, fontWeight: 500, fontSize: 14, textDecoration: 'none',
                }}
                onClick={() => track('quiz_cta_clicked', { project: 'st4rtup', plan: result.recommendedPlan, cta: 'pricing' })}
              >
                Comparar todos los planes
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Contact capture step
  if (contactStep && !completed) {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
    return (
      <>
        <SEO title="Ultimo paso | Diagnostico st4rtup" />
        <div style={{ minHeight: '100vh', backgroundColor: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <Link to="/" style={{ marginBottom: 24 }}>
            <img src="/logo.png" alt="st4rtup" style={{ height: 60 }} />
          </Link>
          <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <div style={{ height: 4, borderRadius: 2, backgroundColor: T.muted, marginBottom: 32, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, backgroundColor: T.primary, width: '100%' }} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: T.fg, marginBottom: 8 }}>
              Tu resultado esta listo
            </h2>
            <p style={{ fontSize: 15, color: T.fgMuted, marginBottom: 32 }}>
              Dejanos tu email para ver tu diagnostico personalizado.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, textAlign: 'left' }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: T.fg, display: 'block', marginBottom: 6 }}>Nombre</label>
                <input
                  type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                  placeholder="Tu nombre"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: T.fg, display: 'block', marginBottom: 6 }}>Email *</label>
                <input
                  type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                  placeholder="tu@empresa.com" required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${contactEmail && !emailValid ? '#EF4444' : T.border}`, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => { setContactStep(false); setCurrentStep(totalSteps - 1) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 8, border: 'none', backgroundColor: 'transparent', color: T.fgMuted, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
              >
                <ArrowLeft size={16} /> Anterior
              </button>
              <button
                onClick={submitQuiz}
                disabled={!emailValid}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px', borderRadius: 8, border: 'none',
                  background: emailValid ? `linear-gradient(135deg, ${T.primary}, #3B8DE8)` : T.muted,
                  color: emailValid ? 'white' : T.fgMuted, cursor: emailValid ? 'pointer' : 'default', fontSize: 14, fontWeight: 600,
                }}
              >
                Ver resultado <ArrowRight size={16} />
              </button>
            </div>
            <p style={{ marginTop: 16, fontSize: 12, color: T.fgMuted }}>
              No spam. Solo tu diagnostico y contenido relevante.
            </p>
          </div>
        </div>
      </>
    )
  }

  // Intro
  if (currentStep === -1) {
    return (
      <>
        <SEO title="Diagnóstico de ventas | st4rtup" description="Descubre en 2 minutos qué necesita tu proceso de ventas para escalar" />
        <div style={{ minHeight: '100vh', backgroundColor: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <Link to="/" style={{ marginBottom: 32 }}>
            <img src="/logo.png" alt="st4rtup" style={{ height: 80 }} />
          </Link>
          <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: T.fg, lineHeight: 1.2, marginBottom: 12 }}>
              ¿Tu proceso de ventas tiene fallos de sistema?
            </h1>
            <p style={{ fontSize: 17, color: T.fgMuted, lineHeight: 1.6, marginBottom: 32 }}>
              4 preguntas. 2 minutos. Descubre qué frena tus ventas y qué plan se adapta a tu equipo.
            </p>
            <button
              onClick={handleStart}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 32px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${T.primary}, #3B8DE8)`,
                color: 'white', fontWeight: 600, fontSize: 16,
                boxShadow: `0 4px 14px ${T.primary}40`,
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Empezar diagnóstico
              <ArrowRight size={18} />
            </button>
            <p style={{ marginTop: 16, fontSize: 13, color: T.fgMuted }}>
              Sin registro. Resultado en 2 minutos.
            </p>
          </div>
        </div>
      </>
    )
  }

  // Steps
  return (
    <>
      <SEO title={`Paso ${currentStep + 1} | Diagnóstico st4rtup`} />
      <div style={{ minHeight: '100vh', backgroundColor: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px' }}>
        {/* Logo */}
        <Link to="/" style={{ marginBottom: 24 }}>
          <img src="/logo.png" alt="st4rtup" style={{ height: 60 }} />
        </Link>

        <div style={{ maxWidth: 520, width: '100%' }}>
          {/* Progress bar */}
          <div style={{ height: 4, borderRadius: 2, backgroundColor: T.muted, marginBottom: 32, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2, backgroundColor: T.primary,
              width: `${progress}%`, transition: 'width 0.3s ease',
            }} />
          </div>

          {step && (
            <>
              {/* Step header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: `${T.primary}10`, color: T.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {step.icon}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: T.primary }}>
                  Paso {step.stepNumber} de {totalSteps}
                </span>
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 700, color: T.fg, marginBottom: 6, lineHeight: 1.3 }}>
                {step.title}
              </h2>
              {step.subtitle && (
                <p style={{ fontSize: 15, color: T.fgMuted, marginBottom: 24 }}>
                  {step.subtitle}
                </p>
              )}

              {/* Options: single */}
              {step.type === 'single' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {step.options.map(opt => {
                    const selected = answers[step.id] === opt.id
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswer(step.id, opt.id)}
                        style={{
                          padding: '16px 20px', borderRadius: 10, border: `1.5px solid ${selected ? T.primary : T.border}`,
                          backgroundColor: selected ? `${T.primary}08` : T.card,
                          cursor: 'pointer', textAlign: 'left', fontSize: 15, color: T.fg, fontWeight: selected ? 600 : 400,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Options: multiple */}
              {step.type === 'multiple' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
                  {step.options.map(opt => {
                    const selected = (answers[step.id] || []).includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleToggle(step.id, opt.id)}
                        style={{
                          padding: '12px 18px', borderRadius: 10, border: `1.5px solid ${selected ? T.primary : T.border}`,
                          backgroundColor: selected ? `${T.primary}08` : T.card,
                          cursor: 'pointer', fontSize: 14, color: T.fg, fontWeight: selected ? 600 : 400,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {selected && <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} color={T.primary} />}
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '12px 20px', borderRadius: 8, border: 'none',
                    backgroundColor: 'transparent', color: currentStep === 0 ? `${T.fgMuted}50` : T.fgMuted,
                    cursor: currentStep === 0 ? 'default' : 'pointer', fontSize: 14, fontWeight: 500,
                  }}
                >
                  <ArrowLeft size={16} /> Anterior
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '12px 24px', borderRadius: 8, border: 'none',
                    background: canProceed() ? `linear-gradient(135deg, ${T.primary}, #3B8DE8)` : T.muted,
                    color: canProceed() ? 'white' : T.fgMuted,
                    cursor: canProceed() ? 'pointer' : 'default',
                    fontSize: 14, fontWeight: 600,
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={e => { if (canProceed()) e.currentTarget.style.transform = 'scale(1.03)' }}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {currentStep === totalSteps - 1 ? 'Ver resultado' : 'Siguiente'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
