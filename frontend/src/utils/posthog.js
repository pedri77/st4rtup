/**
 * PostHog SDK — product analytics (lazy-loaded).
 * posthog-js (~183KB) is loaded dynamically on first init,
 * keeping it out of the main bundle for faster FCP.
 */

let posthog = null
let initialized = false
let initPromise = null

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.posthog.com'
  if (!key || initialized) return

  initPromise = import('posthog-js').then((mod) => {
    posthog = mod.default
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      persistence: 'localStorage',
    })
    initialized = true
    window.posthog = posthog
  }).catch(() => {})
}

function whenReady(fn) {
  if (initialized && posthog) { fn(posthog); return }
  if (initPromise) initPromise.then(() => { if (posthog) fn(posthog) })
}

export function identify(userId, properties = {}) {
  whenReady(ph => ph.identify(userId, properties))
}

export function track(event, properties = {}) {
  whenReady(ph => ph.capture(event, properties))
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
  if (initialized && posthog) posthog.reset()
}
