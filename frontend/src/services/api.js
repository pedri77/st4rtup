import axios from 'axios'
import { supabase } from '@/lib/supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth interceptor — prefer impersonation token if active, else Supabase session
api.interceptors.request.use(
  (config) => {
    const impersonateToken = localStorage.getItem('st4rtup_impersonate_token')
    if (impersonateToken) {
      config.headers.Authorization = `Bearer ${impersonateToken}`
      return config
    }
    return supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`
      }
      return config
    })
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired or invalid — sign out + clear any impersonation token
      localStorage.removeItem('st4rtup_impersonate_token')
      supabase.auth.signOut().then(() => {
        window.location.href = '/login'
      })
    }
    return Promise.reject(error)
  }
)

// ─── API Methods ─────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  calendar: (start, end) => api.get('/dashboard/calendar', { params: { start, end } }),
  heatmap: (months = 12) => api.get('/dashboard/heatmap', { params: { months } }),
  getConfig: () => api.get('/dashboard/config'),
  updateConfig: (data) => api.put('/dashboard/config', data),
  aiSummary: () => api.get('/dashboard/ai-summary'),
  suggestions: () => api.get('/dashboard/suggestions'),
  comparison: (period) => api.get('/dashboard/comparison', { params: { period } }),
  embed: (type, key) => api.get(`/dashboard/embed/${type}`, { params: { api_key: key } }),
  sankey: () => api.get('/dashboard/sankey'),
  waterfall: () => api.get('/dashboard/waterfall'),
  funnel: () => api.get('/dashboard/funnel'),
  activityRadar: (params) => api.get('/dashboard/activity-radar', { params }),
  attribution: () => api.get('/dashboard/attribution'),
  campaignRoi: () => api.get('/dashboard/campaign-roi'),
}

export const leadsApi = {
  list: (params) => api.get('/leads/', { params }),
  get: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads/', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  enrich: (id) => api.post(`/leads/${id}/enrich`),
  timeline: (id) => api.get(`/leads/${id}/timeline`),
  journey: (id) => api.get(`/leads/${id}/journey`),
  abmView: (id) => api.get(`/leads/${id}/abm-view`),
  importCSV: (formData) => api.post('/leads/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deduplicate: () => api.post('/leads/deduplicate'),
  bulkAction: (params) => api.post('/leads/bulk-action', null, { params }),
  importLinkedIn: (url) => api.post('/leads/import-linkedin', null, { params: { linkedin_url: url } }),
  verifyEmail: (id) => api.post(`/leads/${id}/verify-email`),
  verifyEmailBulk: () => api.post('/leads/verify-email-bulk'),
  hunterDomainSearch: (domain) => api.post('/leads/hunter-domain-search', null, { params: { domain } }),
  autoTag: (id) => api.post(`/leads/${id}/auto-tag`),
  toggleFavorite: (id) => api.post(`/leads/${id}/favorite`),
  favorites: () => api.get('/leads/favorites'),
}

export const landingsApi = {
  list: (params) => api.get('/landings/', { params }),
  create: (data) => api.post('/landings/', data),
  update: (id, data) => api.put(`/landings/${id}`, data),
  audit: (params) => api.get('/landings/audit', { params }),
}

export const supportApi = {
  tawktoScript: () => api.get('/support/tawkto/script'),
}

export const socialApi = {
  list: (params) => api.get('/social/', { params }),
  create: (data) => api.post('/social/', data),
  update: (id, data) => api.put(`/social/${id}`, data),
  stats: () => api.get('/social/stats'),
  generate: (params) => api.post('/social/generate', null, { params }),
  seed: () => api.post('/social/seed'),
  // Recurrences
  recurrences: () => api.get('/social/recurrences'),
  createRecurrence: (data) => api.post('/social/recurrences', data),
  updateRecurrence: (id, data) => api.put(`/social/recurrences/${id}`, data),
  deleteRecurrence: (id) => api.delete(`/social/recurrences/${id}`),
  generateFromRecurrence: (id) => api.post(`/social/recurrences/${id}/generate-now`),
  // Social Listening
  listeningDashboard: () => api.get('/social/listening/dashboard'),
  listeningSearch: (keywords) => api.post('/social/listening/search', null, { params: { keywords } }),
  listeningCompetitors: () => api.get('/social/listening/competitors'),
}

export const linkedinApi = {
  generate: (data) => api.post('/linkedin/generate', data),
  generateAndSave: (data) => api.post('/linkedin/generate-and-save', data),
  templates: () => api.get('/linkedin/templates'),
  bestTimes: () => api.get('/linkedin/best-times'),
  analytics: (days = 30) => api.get('/linkedin/analytics', { params: { days } }),
  publish: (postId) => api.post('/linkedin/publish', { post_id: postId }),
  oauthStatus: () => api.get('/linkedin/oauth/status'),
  oauthUrl: () => api.get('/linkedin/oauth/url'),
  oauthCallback: (data) => api.post('/linkedin/oauth/callback', data),
  syncMetrics: () => api.post('/linkedin/sync-metrics'),
}

export const contentPipelineApi = {
  run: (params) => api.post('/content-pipeline/run', null, { params }),
  keywords: (params) => api.post('/content-pipeline/keywords', null, { params }),
  draft: (params) => api.post('/content-pipeline/draft', null, { params }),
  seo: (params) => api.post('/content-pipeline/seo', null, { params }),
  meta: (params) => api.post('/content-pipeline/meta', null, { params }),
}

export const visitsApi = {
  list: (params) => api.get('/visits/', { params }),
  get: (id) => api.get(`/visits/${id}`),
  create: (data) => api.post('/visits/', data),
  update: (id, data) => api.put(`/visits/${id}`, data),
  delete: (id) => api.delete(`/visits/${id}`),
}

export const emailsApi = {
  list: (params) => api.get('/emails/', { params }),
  get: (id) => api.get(`/emails/${id}`),
  create: (data) => api.post('/emails/', data),
  send: (id) => api.post(`/emails/${id}/send`),
}

export const emailTemplatesApi = {
  list: () => api.get('/email-templates'),
  get: (id) => api.get(`/email-templates/${id}`),
  create: (data) => api.post('/email-templates', data),
  update: (id, data) => api.put(`/email-templates/${id}`, data),
  delete: (id) => api.delete(`/email-templates/${id}`),
}

export const actionsApi = {
  list: (params) => api.get('/actions/', { params }),
  create: (data) => api.post('/actions/', data),
  update: (id, data) => api.put(`/actions/${id}`, data),
  delete: (id) => api.delete(`/actions/${id}`),
}

export const opportunitiesApi = {
  list: (params) => api.get('/opportunities/', { params }),
  get: (id) => api.get(`/opportunities/${id}`),
  create: (data) => api.post('/opportunities/', data),
  update: (id, data) => api.put(`/opportunities/${id}`, data),
  delete: (id) => api.delete(`/opportunities/${id}`),
  forecast: (id) => api.post(`/opportunities/${id}/forecast`),
}

export const accountPlansApi = {
  getByLead: (leadId) => api.get(`/account-plans/lead/${leadId}`),
  create: (data) => api.post('/account-plans/', data),
  update: (id, data) => api.put(`/account-plans/${id}`, data),
}

export const reportsApi = {
  salesPerformance: (period) => api.get('/reports/sales-performance', { params: { period } }),
  conversionFunnel: (period) => api.get('/reports/conversion-funnel', { params: { period } }),
  activity: (period) => api.get('/reports/activity', { params: { period } }),
  topAccounts: (limit) => api.get('/reports/top-accounts', { params: { limit } }),
  leadsBySource: () => api.get('/reports/leads-by-source'),
  roiByChannel: (period) => api.get('/reports/roi-by-channel', { params: { period } }),
  pipelineVelocity: () => api.get('/reports/pipeline-velocity'),
  leadCohorts: (months) => api.get('/reports/lead-cohorts', { params: { months } }),
  exportCSV: () => api.get('/reports/export-csv', { responseType: 'blob' }),
}

export const reportBuilderApi = {
  types: () => api.get('/report-builder/types'),
  generate: (config) => api.post('/report-builder/generate', config),
  exportCSV: (config) => api.post('/report-builder/export-csv', config, { responseType: 'blob' }),
  exportPDF: (config) => api.post('/report-builder/export-pdf', config, { responseType: 'blob' }),
  exportSheets: (id) => api.post(`/report-builder/${id}/export-sheets`),
}

export const reviewsApi = {
  list: (params) => api.get('/monthly-reviews/', { params }),
  get: (id) => api.get(`/monthly-reviews/${id}`),
  create: (data) => api.post('/monthly-reviews/', data),
}

export const surveysApi = {
  list: (params) => api.get('/surveys/', { params }),
  get: (id) => api.get(`/surveys/${id}`),
  create: (data) => api.post('/surveys/', data),
  update: (id, data) => api.put(`/surveys/${id}`, data),
  delete: (id) => api.delete(`/surveys/${id}`),
  send: (id, data) => api.post(`/surveys/${id}/send`, data || {}),
  respond: (id, data) => api.post(`/surveys/${id}/respond`, data),
  stats: () => api.get('/surveys/stats'),
  analytics: (months) => api.get('/surveys/analytics', { params: { months } }),
  getPublic: (token) => api.get(`/surveys/public/${token}`),
  respondPublic: (token, data) => api.post(`/surveys/public/${token}/respond`, data),
}

export const automationsApi = {
  list: (params) => api.get('/automations/', { params }),
  get: (id) => api.get(`/automations/${id}`),
  create: (data) => api.post('/automations/', data),
  update: (id, data) => api.put(`/automations/${id}`, data),
  delete: (id) => api.delete(`/automations/${id}`),
  toggle: (id) => api.post(`/automations/${id}/toggle`),
  stats: () => api.get('/automations/stats'),
  executions: (id, params) => api.get(`/automations/${id}/executions`, { params }),
  createExecution: (data) => api.post('/automations/executions', data),
  seed: () => api.post('/automations/seed'),
  flowNodes: (id) => api.get(`/automations/${id}/flow`),
}

export const automationTasksApi = {
  executeAC01: () => api.post('/automation-tasks/AC-01/execute'),
  previewAC01: () => api.get('/automation-tasks/AC-01/preview'),
  schedulerStatus: () => api.get('/automation-tasks/scheduler/status'),
  triggerEM01: (leadId) => api.post(`/automation-tasks/EM-01/trigger/${leadId}`),
  sendEM01Day: (leadId, day) => api.post(`/automation-tasks/EM-01/send-day/${leadId}/${day}`),
}

export const usersApi = {
  list: (params) => api.get('/users/', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
}

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  testEmail: (data) => api.post('/settings/test-email', data),
  sendTestEmail: (data) => api.post('/settings/send-test-email', data),
  testIntegration: (data) => api.post('/settings/test-integration', data),
  gmailOAuthAuthorize: () => api.get('/settings/oauth/google/authorize'),
  gmailOAuthDisconnect: () => api.post('/settings/oauth/google/disconnect'),
  gmailOAuthStatus: () => api.get('/settings/oauth/google/status'),
  // Generic OAuth for any provider (linkedin, gsc, ga4, youtube)
  oauthAuthorize: (provider) => api.get(`/settings/oauth/${provider}/authorize`),
  oauthCallback: (provider, params) => api.get(`/settings/oauth/${provider}/callback`, { params }),
  oauthDisconnect: (provider) => api.post(`/settings/oauth/${provider}/disconnect`),
  oauthStatus: (provider) => api.get(`/settings/oauth/${provider}/status`),
  envStatus: () => api.get('/settings/env-status'),
  featureFlags: () => api.get('/settings/feature-flags'),
  updateFeatureFlags: (flags) => api.put('/settings/feature-flags', flags),
}

export const chatApi = {
  providers: () => api.get('/chat/providers'),
  conversations: (params) => api.get('/chat/conversations', { params }),
  createConversation: (data) => api.post('/chat/conversations', data),
  getConversation: (id) => api.get(`/chat/conversations/${id}`),
  updateConversation: (id, data) => api.put(`/chat/conversations/${id}`, data),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
  sendMessage: (conversationId, data) => api.post(`/chat/conversations/${conversationId}/messages`, data),
}

export const serviceCatalogApi = {
  list: (params) => api.get('/service-catalog', { params }),
  create: (params) => api.post('/service-catalog', null, { params }),
  update: (id, params) => api.put(`/service-catalog/${id}`, null, { params }),
  delete: (id) => api.delete(`/service-catalog/${id}`),
  seed: () => api.post('/service-catalog/seed'),
}

export const offersApi = {
  list: (params) => api.get('/offers/', { params }),
  get: (id) => api.get(`/offers/${id}`),
  create: (data) => api.post('/offers/', data),
  update: (id, data) => api.put(`/offers/${id}`, data),
  delete: (id) => api.delete(`/offers/${id}`),
  sign: (id, data) => api.post(`/offers/${id}/sign`, data),
  invoice: (id, data) => api.post(`/offers/${id}/invoice`, data),
  sendInvoice: (id) => api.post(`/offers/${id}/invoice/send`),
}

export const contactsApi = {
  list: (params) => api.get('/contacts/', { params }),
  get: (id) => api.get(`/contacts/${id}`),
  getByLead: (leadId) => api.get(`/contacts/by-lead/${leadId}`),
  create: (data) => api.post('/contacts/', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  stats: (params) => api.get('/contacts/stats', { params }),
}

// ─── Marketing Hub ──────────────────────────────────────────────

export const campaignsApi = {
  list: (params) => api.get('/marketing/campaigns', { params }),
  get: (id) => api.get(`/marketing/campaigns/${id}`),
  create: (data) => api.post('/marketing/campaigns', data),
  update: (id, data) => api.put(`/marketing/campaigns/${id}`, data),
  delete: (id) => api.delete(`/marketing/campaigns/${id}`),
}

export const funnelsApi = {
  list: (params) => api.get('/marketing/funnels', { params }),
  get: (id) => api.get(`/marketing/funnels/${id}`),
  create: (data) => api.post('/marketing/funnels', data),
  update: (id, data) => api.put(`/marketing/funnels/${id}`, data),
  delete: (id) => api.delete(`/marketing/funnels/${id}`),
}

export const marketingAssetsApi = {
  list: (params) => api.get('/marketing/assets', { params }),
  get: (id) => api.get(`/marketing/assets/${id}`),
  create: (data) => api.post('/marketing/assets', data),
  update: (id, data) => api.put(`/marketing/assets/${id}`, data),
  delete: (id) => api.delete(`/marketing/assets/${id}`),
}

export const utmCodesApi = {
  list: (params) => api.get('/marketing/utm-codes', { params }),
  get: (id) => api.get(`/marketing/utm-codes/${id}`),
  create: (data) => api.post('/marketing/utm-codes', data),
  delete: (id) => api.delete(`/marketing/utm-codes/${id}`),
}

export const marketingCalendarApi = {
  list: (params) => api.get('/marketing/calendar', { params }),
  get: (id) => api.get(`/marketing/calendar/${id}`),
  create: (data) => api.post('/marketing/calendar', data),
  update: (id, data) => api.put(`/marketing/calendar/${id}`, data),
  delete: (id) => api.delete(`/marketing/calendar/${id}`),
  notionStatus: () => api.get('/marketing/calendar/notion/status'),
  notionPush: (params) => api.post('/marketing/calendar/notion/push', null, { params }),
  notionPull: (params) => api.post('/marketing/calendar/notion/pull', null, { params }),
}

export const marketingAlertsApi = {
  list: (params) => api.get('/marketing/alerts', { params }),
  get: (id) => api.get(`/marketing/alerts/${id}`),
  create: (data) => api.post('/marketing/alerts', data),
  update: (id, data) => api.patch(`/marketing/alerts/${id}`, data),
  delete: (id) => api.delete(`/marketing/alerts/${id}`),
  stats: () => api.get('/marketing/alerts/stats'),
  markAllRead: () => api.post('/marketing/alerts/mark-all-read'),
  runEngine: () => api.post('/marketing/alerts/engine/run'),
}

export const marketingDocumentsApi = {
  list: (params) => api.get('/marketing/documents', { params }),
  get: (id) => api.get(`/marketing/documents/${id}`),
  create: (data) => api.post('/marketing/documents', data),
  upload: (formData) => api.post('/marketing/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/marketing/documents/${id}`, data),
  delete: (id) => api.delete(`/marketing/documents/${id}`),
  stats: () => api.get('/marketing/documents/stats'),
  // Versions
  listVersions: (docId) => api.get(`/marketing/documents/${docId}/versions`),
  uploadVersion: (docId, formData) => api.post(`/marketing/documents/${docId}/versions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  // Links
  listLinks: (docId) => api.get(`/marketing/documents/${docId}/links`),
  createLink: (docId, data) => api.post(`/marketing/documents/${docId}/links`, data),
  deleteLink: (docId, linkId) => api.delete(`/marketing/documents/${docId}/links/${linkId}`),
  // Google Drive browser
  driveBrowse: (folder = 'content') => api.get('/marketing/documents/drive/browse', { params: { folder } }),
  driveStatus: () => api.get('/marketing/documents/drive/status'),
}

// Calendar sync
export const calendarSyncApi = {
  sync: (daysAhead = 30) => api.post('/dashboard/calendar/sync', null, { params: { days_ahead: daysAhead } }),
}

export const marketingAnalyticsApi = {
  overview: () => api.get('/marketing/analytics/overview'),
}

export const externalAnalyticsApi = {
  // GA4
  ga4Traffic: (params) => api.get('/analytics/external/ga4/traffic', { params }),
  ga4Sources: (params) => api.get('/analytics/external/ga4/sources', { params }),
  ga4Countries: (params) => api.get('/analytics/external/ga4/countries', { params }),
  // GSC
  gscPerformance: (params) => api.get('/analytics/external/gsc/performance', { params }),
  gscQueries: (params) => api.get('/analytics/external/gsc/queries', { params }),
  gscPages: (params) => api.get('/analytics/external/gsc/pages', { params }),
  gscCountries: (params) => api.get('/analytics/external/gsc/countries', { params }),
  // Lemlist
  lemlistCampaigns: () => api.get('/analytics/external/lemlist/campaigns'),
  lemlistCampaignStats: (id) => api.get(`/analytics/external/lemlist/campaigns/${id}`),
  lemlistAddLead: (campaignId, params) => api.post(`/analytics/external/lemlist/campaigns/${campaignId}/leads`, null, { params }),
  lemlistLeadActivity: (campaignId, email) => api.get(`/analytics/external/lemlist/campaigns/${campaignId}/leads/${email}`),
  lemlistTeam: () => api.get('/analytics/external/lemlist/team'),
  // Brevo
  brevoLists: () => api.get('/analytics/external/brevo/lists'),
  brevoAddNurturing: (params) => api.post('/analytics/external/brevo/nurturing', null, { params }),
  brevoCheckReactivation: (email) => api.get(`/analytics/external/brevo/reactivation/${email}`),
  // Clarity
  claritySummary: (params) => api.get('/analytics/external/clarity/summary', { params }),
}

export const agentsApi = {
  list: () => api.get('/agents/'),
  scoreLeadICP: (leadId) => api.post(`/agents/lead-intelligence/${leadId}`),
  bulkScoreLeads: (leadIds) => api.post('/agents/lead-intelligence/bulk', { lead_ids: leadIds }),
  qualifyCall: (data) => api.post('/agents/bant-qualifier', data),
  audit: (params) => api.get('/agents/audit', { params }),
  getPrompts: (agentId) => api.get(`/agents/prompts/${agentId}`),
  updatePrompt: (agentId, data) => api.put(`/agents/prompts/${agentId}`, data),
  generateProposal: (data) => api.post('/agents/proposal-generator', data),
  analyzeCustomer: (data) => api.post('/agents/customer-success', data),
  exportPDF: (data) => api.post('/agents/export-pdf', data, { responseType: 'blob' }),
}

export const dealroomApi = {
  create: (opportunityId) => api.post(`/dealroom/${opportunityId}/create`),
  listFiles: (opportunityId, params) => api.get(`/dealroom/${opportunityId}/files`, { params }),
  upload: (opportunityId, formData, params) => api.post(`/dealroom/${opportunityId}/upload`, formData, { params, headers: { 'Content-Type': 'multipart/form-data' } }),
  createShareLink: (data) => api.post('/dealroom/share', data),
}

export const dealRoomDocsApi = {
  upload: (roomId, formData, recipientEmail) => api.post(`/dealroom/${roomId}/documents/upload?recipient_email=${encodeURIComponent(recipientEmail)}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: (roomId) => api.get(`/dealroom/${roomId}/documents`),
  pageEvent: (roomId, docId, params) => api.post(`/dealroom/${roomId}/documents/${docId}/page-event`, null, { params }),
  analytics: (roomId, docId) => api.get(`/dealroom/${roomId}/documents/${docId}/analytics`),
  requestNda: (roomId, params) => api.post(`/dealroom/${roomId}/nda/request`, null, { params }),
  ndaStatus: (roomId, params) => api.get(`/dealroom/${roomId}/nda/status`, { params }),
  confirmNda: (roomId, params) => api.post(`/dealroom/${roomId}/nda/confirm-checkbox`, null, { params }),
}

export const contractsApi = {
  generate: (opportunityId) => api.post(`/contracts/${opportunityId}/generate`, null, { responseType: 'blob' }),
  status: (opportunityId) => api.get(`/contracts/${opportunityId}/status`),
}

export const costControlApi = {
  summary: () => api.get('/costs/summary'),
  evaluate: (toolId, estimatedCost) => api.get(`/costs/evaluate/${toolId}`, { params: { estimated_cost: estimatedCost } }),
  record: (data) => api.post('/costs/record', data),
  listCaps: () => api.get('/costs/caps'),
  updateCap: (toolId, data) => api.put(`/costs/caps/${toolId}`, data),
  log: (params) => api.get('/costs/log', { params }),
  predictive: () => api.get('/costs/predictive'),
  roi: () => api.get('/costs/roi'),
  departments: () => api.get('/costs/departments'),
  setDepartmentBudgets: (budgets) => api.put('/costs/departments/budgets', budgets),
  predictiveAdvanced: () => api.get('/costs/predictive-advanced'),
  burnRate: (params) => api.get('/costs/burn-rate', { params }),
}

export const partnersApi = {
  dashboard: () => api.get('/analytics/external/partners/dashboard'),
  list: () => api.get('/analytics/external/partners'),
  create: (params) => api.post('/analytics/external/partners', null, { params }),
  referrals: (params) => api.get('/analytics/external/partners/referrals', { params }),
  trackSale: (params) => api.post('/analytics/external/partners/track-sale', null, { params }),
}

// ─── GTM Modules ──────────────────────────────────────────────

export const brandApi = {
  get: () => api.get('/brand/'),
  update: (data) => api.put('/brand/', data),
}

export const pricingApi = {
  listTiers: () => api.get('/pricing/'),
  createTier: (data) => api.post('/pricing/', data),
  calculate: (params) => api.get('/pricing/calculate', { params }),
  seed: () => api.post('/pricing/seed'),
  stats: () => api.get('/pricing/stats'),
}

export const competitorsApi = {
  list: () => api.get('/competitors/'),
  get: (id) => api.get(`/competitors/${id}`),
  create: (data) => api.post('/competitors/', data),
  update: (id, data) => api.put(`/competitors/${id}`, data),
  battleCardPDF: (id) => api.get(`/competitors/${id}/battle-card/pdf`, { responseType: 'blob' }),
  seed: () => api.post('/competitors/seed'),
  stats: () => api.get('/competitors/stats'),
}

export const playbookApi = {
  list: (params) => api.get('/playbook/', { params }),
  create: (data) => api.post('/playbook/', data),
  update: (id, data) => api.put(`/playbook/${id}`, data),
  seed: () => api.post('/playbook/seed'),
  stats: () => api.get('/playbook/stats'),
  exportPDF: () => api.get('/playbook/export-pdf', { responseType: 'blob' }),
}

export const gtmApi = {
  dashboard: () => api.get('/gtm/'),
  targets: () => api.get('/gtm/targets'),
  updateTarget: (kpiId, data) => api.put(`/gtm/targets/${kpiId}`, data),
  seedAll: () => api.post('/gtm/seed-all'),
  exportPDF: () => api.get('/gtm/export-pdf', { responseType: 'blob' }),
  forecast: () => api.get('/gtm/forecast'),
  pocTracker: () => api.get('/gtm/poc-tracker'),
  checkAlerts: () => api.post('/gtm/check-alerts'),
  winLoss: () => api.get('/gtm/win-loss'),
  suggestCompetitor: (sector) => api.get('/gtm/suggest-competitor', { params: { sector } }),
  weeklyDigest: () => api.post('/gtm/weekly-digest'),
  pipelineAnalytics: () => api.get('/gtm/pipeline-analytics'),
  snapshotKpis: () => api.post('/gtm/snapshot-kpis'),
}

export const auditGlobalApi = {
  list: (params) => api.get('/audit-global/', { params }),
}

export const okrApi = {
  list: (params) => api.get('/okr/', { params }),
  create: (data) => api.post('/okr/', data),
  createKeyResult: (data) => api.post('/okr/key-results', data),
  updateKeyResult: (id, data) => api.put(`/okr/key-results/${id}`, data),
  seed: () => api.post('/okr/seed'),
}

export const mediaApi = {
  trifecta: () => api.get('/media/trifecta'),
  paidCampaigns: (params) => api.get('/media/paid/campaigns', { params }),
  createAdCampaign: (data) => api.post('/media/paid/campaigns', data),
  updateAdCampaign: (id, data) => api.put(`/media/paid/campaigns/${id}`, data),
  paidStats: () => api.get('/media/paid/stats'),
  earnedMentions: (params) => api.get('/media/earned/mentions', { params }),
  createMention: (data) => api.post('/media/earned/mentions', data),
  earnedStats: () => api.get('/media/earned/stats'),
  seedPaidCampaigns: () => api.post('/media/paid/seed'),
}

export const auditLogApi = {
  list: (params) => api.get('/marketing/audit', { params }),
  stats: () => api.get('/marketing/audit/stats'),
}

export const llmVisibilityApi = {
  list: (params) => api.get('/marketing/llm-visibility', { params }),
  get: (id) => api.get(`/marketing/llm-visibility/${id}`),
  create: (data) => api.post('/marketing/llm-visibility', data),
  update: (id, data) => api.put(`/marketing/llm-visibility/${id}`, data),
  delete: (id) => api.delete(`/marketing/llm-visibility/${id}`),
  seed: () => api.post('/marketing/llm-visibility/seed'),
  runOne: (id) => api.post(`/marketing/llm-visibility/run/${id}`),
  runAll: () => api.post('/marketing/llm-visibility/run-all'),
  results: (params) => api.get('/marketing/llm-visibility/results', { params }),
  stats: () => api.get('/marketing/llm-visibility/stats'),
}

// ─── Llamadas IA ─────────────────────────────────────────────────

export const callsApi = {
  list: (params) => api.get('/calls', { params }),
  get: (id) => api.get(`/calls/${id}`),
  initiate: (data) => api.post('/calls/initiate', data),
  complete: (id, data) => api.post(`/calls/${id}/complete`, data),
  stats: () => api.get('/calls/stats'),
  promptAnalytics: () => api.get('/calls/prompts/analytics'),
  comparePrompts: (a, b) => api.get('/calls/prompts/compare', { params: { prompt_a: a, prompt_b: b } }),
  rgpdConsents: (params) => api.get('/calls/rgpd/consents', { params }),
  updateConsent: (id, consent) => api.post(`/calls/${id}/consent`, null, { params: { consent } }),
  deleteRecording: (id) => api.delete(`/calls/${id}/recording`),
  rgpdStats: () => api.get('/calls/rgpd/stats'),
}

export const callQueuesApi = {
  list: (params) => api.get('/calls/queues', { params }),
  get: (id) => api.get(`/calls/queues/${id}`),
  create: (data) => api.post('/calls/queues', data),
  update: (id, data) => api.put(`/calls/queues/${id}`, data),
  delete: (id) => api.delete(`/calls/queues/${id}`),
  start: (id) => api.post(`/calls/queues/${id}/start`),
  pause: (id) => api.post(`/calls/queues/${id}/pause`),
  cancel: (id) => api.post(`/calls/queues/${id}/cancel`),
  retryFailed: (id) => api.post(`/calls/queues/${id}/retry-failed`),
  stats: () => api.get('/calls/queues/stats'),
}

export const callPromptsApi = {
  list: (params) => api.get('/calls/prompts', { params }),
  get: (id) => api.get(`/calls/prompts/${id}`),
  create: (data) => api.post('/calls/prompts', data),
  update: (id, data) => api.put(`/calls/prompts/${id}`, data),
  delete: (id) => api.delete(`/calls/prompts/${id}`),
  versions: (id) => api.get(`/calls/prompts/${id}/versions`),
  seed: () => api.post('/calls/prompts/seed'),
}

// ─── SEO Command Center ────────────────────────────────────────

export const seoCenterApi = {
  articles: (params) => api.get('/seo-center/articles', { params }),
  getArticle: (id) => api.get(`/seo-center/articles/${id}`),
  createArticle: (data) => api.post('/seo-center/articles', data),
  updateArticle: (id, data) => api.put(`/seo-center/articles/${id}`, data),
  deleteArticle: (id) => api.delete(`/seo-center/articles/${id}`),
  publishArticle: (id) => api.post(`/seo-center/articles/${id}/publish`),
  archiveArticle: (id) => api.post(`/seo-center/articles/${id}/archive`),
  generateArticle: (params) => api.post('/seo-center/articles/generate', null, { params, timeout: 120000 }),
  providers: () => api.get('/seo-center/providers'),
  exportMarkdown: (id) => api.get(`/seo-center/articles/${id}/export/markdown`, { responseType: 'blob' }),
  exportHtml: (id) => api.get(`/seo-center/articles/${id}/export/html`, { responseType: 'blob' }),
  exportToDrive: (id) => api.post(`/seo-center/articles/${id}/export/drive`),
  keywordResearch: (params) => api.post('/seo-center/keywords/research', null, { params, timeout: 120000 }),
  keywordSuggestions: (params) => api.get('/seo-center/keywords/suggestions', { params }),
  keywordHistory: (id) => api.get(`/seo-center/keywords/${id}/history`),
  keywordsOverview: () => api.get('/seo-center/keywords/rankings-overview'),
  backlinks: (params) => api.get('/seo-center/backlinks', { params }),
  createBacklink: (params) => api.post('/seo-center/backlinks', null, { params }),
  updateBacklink: (id, params) => api.put(`/seo-center/backlinks/${id}`, null, { params }),
  deleteBacklink: (id) => api.delete(`/seo-center/backlinks/${id}`),
  backlinkStats: () => api.get('/seo-center/backlinks/stats'),
  internalLinks: () => api.get('/seo-center/internal-links'),
  competitorAnalysis: () => api.get('/seo-center/competitor-analysis'),
  siteAudit: () => api.get('/seo-center/site-audit'),
  topicGraph: () => api.get('/seo-center/topic-graph'),
  backlinksGraph: () => api.get('/seo-center/backlinks/graph'),
  competitorsBubble: () => api.get('/seo-center/competitors/bubble'),
  contentCalendar: (params) => api.get('/seo-center/content-calendar', { params }),
  dashboard: () => api.get('/seo-center/dashboard'),
  repurposeArticle: (id, params) => api.post(`/seo-center/articles/${id}/repurpose`, null, { params }),
  auditArticle: (id) => api.post(`/seo-center/articles/${id}/audit`),
  publications: (params) => api.get('/seo-center/publications', { params }),
  createPublication: (params) => api.post('/seo-center/publications', null, { params }),
  updatePublication: (id, params) => api.put(`/seo-center/publications/${id}`, null, { params }),
  deletePublication: (id) => api.delete(`/seo-center/publications/${id}`),
  publicationStats: () => api.get('/seo-center/publications/stats'),
}

export const smartFormsApi = {
  generate: (params) => api.post('/forms/generate-smart', null, { params, timeout: 60000 }),
  repurposeArticle: (id, params) => api.post(`/seo-center/articles/${id}/repurpose`, null, { params }),
  auditArticle: (id) => api.post(`/seo-center/articles/${id}/audit`),
  dashboard: () => api.get('/seo-center/dashboard'),
  brandMonitor: () => api.get('/seo-center/brand-monitor'),
}

// ─── YouTube ───────────────────────────────────────────────────

export const youtubeApi = {
  status: () => api.get('/youtube/status'),
  channel: () => api.get('/youtube/channel'),
  videos: (params) => api.get('/youtube/videos', { params }),
  video: (id) => api.get(`/youtube/videos/${id}`),
  analytics: (params) => api.get('/youtube/analytics', { params }),
  search: (params) => api.get('/youtube/search', { params }),
}

// ─── Airtable ──────────────────────────────────────────────────

export const airtableApi = {
  status: () => api.get('/airtable/status'),
  bases: () => api.get('/airtable/bases'),
  tables: () => api.get('/airtable/tables'),
  syncLeads: (params) => api.post('/airtable/sync/leads', null, { params }),
  syncPipeline: (params) => api.post('/airtable/sync/pipeline', null, { params }),
  syncKpis: (params) => api.post('/airtable/sync/kpis', null, { params }),
}

// ─── MCP Gateway ───────────────────────────────────────────────

export const mcpApi = {
  tools: () => api.get('/mcp/tools'),
  kpis: () => api.get('/mcp/kpis'),
  searchLeads: (params) => api.get('/mcp/leads/search', { params }),
  pipeline: () => api.get('/mcp/pipeline'),
  actionsPending: (params) => api.get('/mcp/actions/pending', { params }),
  activity: (params) => api.get('/mcp/activity', { params }),
}

// ─── WhatsApp Business ──────────────────────────────────────────

export const whatsappApi = {
  conversations: (params) => api.get('/whatsapp/conversations', { params }),
  messages: (id, params) => api.get(`/whatsapp/conversations/${id}/messages`, { params }),
  send: (params) => api.post('/whatsapp/send', null, { params }),
  templates: () => api.get('/whatsapp/templates'),
  toggleBot: (id) => api.post(`/whatsapp/conversations/${id}/toggle-bot`),
  stats: () => api.get('/whatsapp/stats'),
}

// ─── Webhooks ───────────────────────────────────────────────────

export const webhooksApi = {
  logs: (params) => api.get('/webhooks/logs', { params }),
  stats: () => api.get('/webhooks/stats'),
  // Outgoing subscriptions
  subscriptions: () => api.get('/webhooks/subscriptions'),
  createSubscription: (data) => api.post('/webhooks/subscriptions', data),
  updateSubscription: (id, data) => api.put(`/webhooks/subscriptions/${id}`, data),
  deleteSubscription: (id) => api.delete(`/webhooks/subscriptions/${id}`),
  testSubscription: (id) => api.post(`/webhooks/subscriptions/${id}/test`),
  availableEvents: () => api.get('/webhooks/subscriptions/events'),
}

// ─── SEO & Geo-SEO ──────────────────────────────────────────────

export const seoApi = {
  // Keywords
  listKeywords: (params) => api.get('/marketing/seo/keywords', { params }),
  createKeyword: (data) => api.post('/marketing/seo/keywords', data),
  updateKeyword: (id, data) => api.put(`/marketing/seo/keywords/${id}`, data),
  deleteKeyword: (id) => api.delete(`/marketing/seo/keywords/${id}`),
  seedKeywords: () => api.post('/marketing/seo/keywords/seed'),
  // Rankings
  listRankings: (params) => api.get('/marketing/seo/rankings', { params }),
  createRanking: (data) => api.post('/marketing/seo/rankings', data),
  bulkRankings: (items) => api.post('/marketing/seo/rankings/bulk', items),
  // Geo Pages
  listGeoPages: (params) => api.get('/marketing/seo/geo/pages', { params }),
  createGeoPage: (data) => api.post('/marketing/seo/geo/pages', data),
  updateGeoPage: (id, data) => api.put(`/marketing/seo/geo/pages/${id}`, data),
  deleteGeoPage: (id) => api.delete(`/marketing/seo/geo/pages/${id}`),
  // NAP Audits
  listNAP: (params) => api.get('/marketing/seo/geo/nap', { params }),
  createNAP: (data) => api.post('/marketing/seo/geo/nap', data),
  deleteNAP: (id) => api.delete(`/marketing/seo/geo/nap/${id}`),
  // Geo Rankings
  listGeoRankings: (params) => api.get('/marketing/seo/geo/rankings', { params }),
  createGeoRanking: (data) => api.post('/marketing/seo/geo/rankings', data),
  bulkGeoRankings: (items) => api.post('/marketing/seo/geo/rankings/bulk', items),
  // Stats
  stats: () => api.get('/marketing/seo/stats'),
}


// ─── Payments ───────────────────────────────────────────────────

export const paymentsApi = {
  list: (params) => api.get('/payments', { params }),
  stats: () => api.get('/payments/stats'),
  plans: () => api.get('/payments/plans'),
  createPlan: (data) => api.post('/payments/plans', data),
  checkout: (params) => api.post('/payments/checkout', null, { params }),
  subscription: (params) => api.post('/payments/subscription', null, { params }),
  invoice: (params) => api.post('/payments/invoice', null, { params }),
  paypalOrder: (params) => api.post('/payments/paypal/order', null, { params }),
  paypalCapture: (params) => api.post('/payments/paypal/capture', null, { params }),
  config: () => api.get('/payments/config'),
}

export const orgApi = {
  me: () => api.get('/org/me'),
  update: (params) => api.put('/org/me', null, { params }),
  members: () => api.get('/org/members'),
  plan: () => api.get('/org/plan'),
}

export const affiliatesApi = {
  list: (params) => api.get('/affiliates', { params }),
  click: (id) => api.post(`/affiliates/${id}/click`),
  adminAll: () => api.get('/affiliates/admin/all'),
  adminCreate: (params) => api.post('/affiliates/admin/create', null, { params }),
  adminUpdate: (id, params) => api.put(`/affiliates/admin/${id}`, null, { params }),
  adminDelete: (id) => api.delete(`/affiliates/admin/${id}`),
  adminDashboard: (params) => api.get('/affiliates/admin/dashboard', { params }),
}

export default api
