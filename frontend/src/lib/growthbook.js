/**
 * GrowthBook SDK setup for feature flags and A/B testing.
 *
 * Tracking flow:
 *   1. SDK assigns user to experiment variant
 *   2. trackingCallback fires → sends to our Postgres + PostHog + Umami
 *   3. GrowthBook reads experiment_exposures table as data source
 *   4. Conversion events tracked via trackEvent() → experiment_events table
 */
import { GrowthBook } from '@growthbook/growthbook-react'

const GROWTHBOOK_API_HOST = import.meta.env.VITE_GROWTHBOOK_API_HOST || 'https://cdn.growthbook.io'
const GROWTHBOOK_CLIENT_KEY = import.meta.env.VITE_GROWTHBOOK_CLIENT_KEY || ''
const API_URL = import.meta.env.VITE_API_URL || ''

export const gb = new GrowthBook({
  apiHost: GROWTHBOOK_API_HOST,
  clientKey: GROWTHBOOK_CLIENT_KEY,
  enableDevMode: import.meta.env.DEV,
  trackingCallback: (experiment, result) => {
    // 1. Send to our Postgres (experiment_exposures table)
    _trackExposure(experiment.key, result.key)

    // 2. Send to PostHog
    window.posthog?.capture('$experiment_started', {
      'Experiment name': experiment.key,
      'Variant name': result.key,
      '$feature/flag': experiment.key,
    })

    // 3. Send to Umami
    window.umami?.track('experiment_view', {
      experiment: experiment.key,
      variant: result.key,
    })
  },
})

async function _trackExposure(experimentKey, variationId) {
  try {
    const token = _getToken()
    if (!token || !API_URL) return
    fetch(`${API_URL}/settings/experiments/exposure`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment_key: experimentKey, variation_id: variationId }),
    }).catch(() => {})
  } catch {}
}

/**
 * Track a conversion event for experiment metrics.
 * Call this when a user performs a key action (register, upgrade, etc.)
 */
export function trackEvent(eventName, value = 1, properties = {}) {
  try {
    const token = _getToken()
    if (!token || !API_URL) return
    fetch(`${API_URL}/settings/experiments/event`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_name: eventName, value, properties }),
    }).catch(() => {})
  } catch {}

  // Also send to analytics
  window.posthog?.capture(eventName, properties)
  window.umami?.track(eventName, properties)
}

function _getToken() {
  try {
    const raw = localStorage.getItem('sb-dszhaxyzrnsgjlabtvqx-auth-token')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed?.access_token || null
    }
  } catch {}
  return null
}

export async function initGrowthBook(attributes = {}) {
  if (!GROWTHBOOK_CLIENT_KEY) return

  gb.setAttributes({
    id: attributes.userId || 'anonymous',
    email: attributes.email || '',
    plan: attributes.plan || 'starter',
    org_id: attributes.orgId || '',
    country: 'ES',
    browser: navigator.userAgent,
    ...attributes,
  })

  try {
    await gb.init({ timeout: 3000 })
  } catch (e) {
    console.warn('GrowthBook init failed, using defaults')
  }
}

export { GrowthBookProvider, useFeatureIsOn, useFeatureValue } from '@growthbook/growthbook-react'
