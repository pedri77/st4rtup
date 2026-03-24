/**
 * PlanGate — Componente para restringir features según plan del usuario.
 *
 * Uso:
 *   <PlanGate plan="growth">
 *     <CallQueuePage />
 *   </PlanGate>
 *
 *   <PlanGate feature="deal_room">
 *     <DealRoomPage />
 *   </PlanGate>
 *
 * Si el usuario no tiene el plan/feature, muestra un overlay con upgrade CTA.
 */
import { Link } from 'react-router-dom'
import { Lock, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

// Plan hierarchy
const PLAN_ORDER = ['starter', 'growth', 'scale', 'enterprise']

// Feature → minimum plan mapping
const FEATURE_PLAN = {
  // Starter features (always available)
  leads: 'starter', pipeline: 'starter', visits: 'starter',
  emails: 'starter', actions: 'starter',

  // Growth features
  contacts: 'growth', surveys: 'growth', reviews: 'growth', calendar: 'growth',
  marketing: 'growth', campaigns: 'growth', seo_center: 'growth',
  funnels: 'growth', assets: 'growth', utm: 'growth', analytics: 'growth',
  ai_agents: 'growth', ai_summary: 'growth', auto_tagging: 'growth', smart_forms: 'growth',
  calls_console: 'growth', calls_prompts: 'growth', calls_rgpd: 'growth',
  automations: 'growth', reports: 'growth', dashboard_graphs: 'growth',
  youtube: 'growth', gmail: 'growth', gdrive: 'growth',
  slack: 'growth', teams: 'growth', telegram: 'growth', webhooks: 'growth',

  // Scale features
  deal_room: 'scale', nda_digital: 'scale', pdf_watermark: 'scale', page_analytics: 'scale',
  whatsapp: 'scale', whatsapp_bot: 'scale',
  calls_queue: 'scale', calls_ab_testing: 'scale',
  public_api: 'scale', embeddable_widgets: 'scale',
  payments: 'scale', stripe_integration: 'scale', paypal_integration: 'scale',
  priority_support: 'scale',

  // Enterprise features
  sso_saml: 'enterprise', sla_999: 'enterprise',
  dedicated_manager: 'enterprise', custom_onboarding: 'enterprise',
}

const PLAN_NAMES = {
  starter: 'Starter', growth: 'Growth', scale: 'Scale', enterprise: 'Enterprise',
}

const PLAN_COLORS = {
  starter: '#64748B', growth: '#1E6FD9', scale: '#F5820B', enterprise: '#10B981',
}

function planAtLeast(current, required) {
  return PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(required)
}

function getUserPlan() {
  // In production: read from auth store / API response / JWT claims
  // For now: check localStorage or default to 'starter'
  try {
    const prefs = JSON.parse(localStorage.getItem('riskitera_user_prefs') || '{}')
    return prefs?.state?.plan || 'starter'
  } catch {
    return 'starter'
  }
}

export default function PlanGate({ plan, feature, children, showLock = true }) {
  const userPlan = getUserPlan()

  // Determine required plan
  const requiredPlan = plan || FEATURE_PLAN[feature] || 'starter'
  const hasAccess = planAtLeast(userPlan, requiredPlan)

  if (hasAccess) return children

  if (!showLock) return null

  const planName = PLAN_NAMES[requiredPlan] || requiredPlan
  const planColor = PLAN_COLORS[requiredPlan] || '#1E6FD9'

  return (
    <div style={{ position: 'relative', minHeight: 200 }}>
      {/* Blurred content preview */}
      <div style={{ filter: 'blur(4px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(248,250,252,0.85)',
        borderRadius: 16, zIndex: 10,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          backgroundColor: `${planColor}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <Lock size={24} color={planColor} />
        </div>
        <h3 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 18, fontWeight: 700, marginBottom: 8,
          color: '#1A1A2E',
        }}>
          Disponible en {planName}
        </h3>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20, textAlign: 'center', maxWidth: 300 }}>
          {feature
            ? `La funcionalidad "${feature.replace(/_/g, ' ')}" requiere el plan ${planName} o superior.`
            : `Esta sección requiere el plan ${planName} o superior.`
          }
        </p>
        <Link
          to="/pricing"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 10,
            backgroundColor: planColor, color: 'white',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}
        >
          Ver planes <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}

// Export utilities for use in other components
export { planAtLeast, getUserPlan, FEATURE_PLAN, PLAN_NAMES, PLAN_ORDER }
