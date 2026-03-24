/**
 * usePlanAccess — Hook para verificar acceso a features según plan.
 *
 * Uso:
 *   const { plan, hasFeature, hasAccess, canCreateLead } = usePlanAccess()
 *
 *   if (!hasFeature('deal_room')) { ... show upgrade ... }
 *   if (!hasAccess('scale')) { ... }
 */
import { getUserPlan, planAtLeast, FEATURE_PLAN } from '@/components/PlanGate'

export function usePlanAccess() {
  const plan = getUserPlan()

  function hasFeature(feature) {
    const requiredPlan = FEATURE_PLAN[feature] || 'starter'
    return planAtLeast(plan, requiredPlan)
  }

  function hasAccess(requiredPlan) {
    return planAtLeast(plan, requiredPlan)
  }

  function getRequiredPlan(feature) {
    return FEATURE_PLAN[feature] || 'starter'
  }

  return {
    plan,
    hasFeature,
    hasAccess,
    getRequiredPlan,
    isStarter: plan === 'starter',
    isGrowth: planAtLeast(plan, 'growth'),
    isScale: planAtLeast(plan, 'scale'),
    isEnterprise: plan === 'enterprise',
  }
}
