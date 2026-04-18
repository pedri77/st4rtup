import { useOrganization } from '@/hooks/useOrganization'
import { Link } from 'react-router-dom'
import { useThemeColors } from '@/utils/theme'

const PLAN_RANK = { starter: 0, growth: 1, scale: 2, enterprise: 3 }

// Feature → minimum plan mapping
export const FEATURE_PLAN = {
  pipeline: 'starter',
  leads: 'starter',
  emails: 'starter',
  marketing_hub: 'growth',
  ai_agents: 'growth',
  seo_center: 'growth',
  automations: 'growth',
  analytics: 'growth',
  deal_room: 'scale',
  whatsapp: 'scale',
  public_api: 'scale',
  sso: 'enterprise',
  custom_integrations: 'enterprise',
}

export function getUserPlan() {
  try {
    const org = JSON.parse(localStorage.getItem('st4rtup_org') || '{}')
    return org.plan || 'starter'
  } catch { return 'starter' }
}

export function planAtLeast(current, required) {
  return (PLAN_RANK[current] || 0) >= (PLAN_RANK[required] || 0)
}

export default function PlanGate({ requiredPlan = 'growth', children }) {
  const T = useThemeColors()
  const { plan } = useOrganization()
  const userRank = PLAN_RANK[plan] || 0
  const requiredRank = PLAN_RANK[requiredPlan] || 1

  if (userRank >= requiredRank) return children

  return (
    <div style={{
      padding: 32, textAlign: 'center', borderRadius: 12,
      border: `2px dashed ${T.border}`, backgroundColor: T.bg,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: T.fg, marginBottom: 8 }}>
        Disponible en plan {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
      </h3>
      <p style={{ fontSize: 13, color: T.fgMuted, marginBottom: 16 }}>
        Mejora tu plan para acceder a esta funcionalidad
      </p>
      <Link to="/app/payments" style={{
        display: 'inline-block', padding: '8px 20px', borderRadius: 8,
        backgroundColor: T.primary, color: 'white', fontSize: 13,
        fontWeight: 600, textDecoration: 'none',
      }}>
        Mejorar plan
      </Link>
    </div>
  )
}
