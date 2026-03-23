/**
 * PostHog SDK wrapper — product analytics para AGENT-CS-001.
 * Completamente opcional: si VITE_POSTHOG_KEY no está configurado, no hace nada.
 * No requiere instalar posthog-js — usa fetch directo a la API.
 */

let config = null

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST
  if (key && host) {
    config = { key, host }
  }
}

export function identify(userId, properties = {}) {
  if (!config) return
  _send('$identify', { $set: properties, distinct_id: userId })
}

export function track(event, properties = {}) {
  if (!config) return
  _send(event, { ...properties, source: 'frontend' })
}

export function trackPageView(pageName) {
  track('$pageview', { page: pageName, $current_url: window.location.href })
}

export function trackLeadCreated(leadId, companyName, source) {
  track('lead_created', { lead_id: leadId, company: companyName, source })
}

export function trackDealCreated(dealId, dealName, value) {
  track('deal_created', { deal_id: dealId, name: dealName, value })
}

export function trackDealStageChanged(dealId, fromStage, toStage) {
  track('deal_stage_changed', { deal_id: dealId, from: fromStage, to: toStage })
}

export function trackProposalGenerated(leadId, companyName) {
  track('proposal_generated', { lead_id: leadId, company: companyName })
}

export function trackProposalDownloaded(leadId) {
  track('proposal_downloaded', { lead_id: leadId })
}

export function trackCallCompleted(callId, duration, result) {
  track('call_completed', { call_id: callId, duration, result })
}

export function trackFeatureUsed(feature, details = {}) {
  track('feature_used', { feature, ...details })
}

export function reset() { config = null }

function _send(event, properties) {
  if (!config) return
  const body = {
    api_key: config.key,
    event,
    properties: { ...properties, $lib: 'riskitera-web' },
    timestamp: new Date().toISOString(),
    distinct_id: properties.distinct_id || localStorage.getItem('posthog_id') || 'anonymous',
  }
  fetch(`${config.host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}
