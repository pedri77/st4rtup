import { useOrganization } from '@/hooks/useOrganization'
import { Link } from 'react-router-dom'

const PLAN_RANK = { starter: 0, growth: 1, scale: 2, enterprise: 3 }

export default function PlanGate({ requiredPlan = 'growth', children }) {
  const { plan } = useOrganization()
  const userRank = PLAN_RANK[plan] || 0
  const requiredRank = PLAN_RANK[requiredPlan] || 1

  if (userRank >= requiredRank) return children

  return (
    <div style={{
      padding: 32, textAlign: 'center', borderRadius: 12,
      border: '2px dashed #E2E8F0', backgroundColor: '#F8FAFC',
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
        Disponible en plan {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
      </h3>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
        Mejora tu plan para acceder a esta funcionalidad
      </p>
      <Link to="/app/payments" style={{
        display: 'inline-block', padding: '8px 20px', borderRadius: 8,
        backgroundColor: '#1E6FD9', color: 'white', fontSize: 13,
        fontWeight: 600, textDecoration: 'none',
      }}>
        Mejorar plan
      </Link>
    </div>
  )
}
