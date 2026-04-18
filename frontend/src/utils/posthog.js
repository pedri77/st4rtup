/**
 * PostHog SDK — product analytics.
 * Uses official posthog-js SDK for reliable tracking.
 */
import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.posthog.com'
  if (!key || initialized) return

  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage',
  })
  initialized = true

  // Expose globally for GrowthBook tracking callback
  window.posthog = posthog
}

export function identify(userId, properties = {}) {
  if (!initialized) return
  posthog.identify(userId, properties)
}

export function track(event, properties = {}) {
  if (!initialized) return
  posthog.capture(event, properties)
}

export function trackPageView(pageName) {
  track('$pageview', { page: pageName })
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

export function trackFeatureUsed(feature, details = {}) {
  track('feature_used', { feature, ...details })
}

export function reset() {
  if (initialized) posthog.reset()
}
