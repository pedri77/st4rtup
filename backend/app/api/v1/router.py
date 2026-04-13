from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    billing, analytics_internal, service_catalog,
    users, leads, visits, emails, actions, opportunities, offers, accounts,
    reviews, surveys, dashboard, automations, automation_tasks, notifications,
    settings as settings_endpoints, chat, contacts, reports,
    campaigns, funnels, marketing_assets, utm_codes, marketing_calendar, marketing_alerts,
    marketing_analytics, marketing_documents, audit_log, llm_visibility, seo,
    webhooks, calls, marketing_webhooks, external_analytics, agents, dealroom, cost_control,
    brand, pricing, competitors, playbook, gtm_dashboard, media, okr, contracts, social, audit_global,
    support, landings, email_tracking, content_pipeline, report_builder, public_api, forms,
    public_forms,
    airtable, mcp_gateway, seo_center, youtube,
    whatsapp,
    payments,
    organizations,
    admin,
    affiliates,
    linkedin,
    pipeline_rules,
    security,
)
api_router = APIRouter()

# Auth (registration)
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reportes"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(leads.router, prefix="/leads", tags=["Leads"])
api_router.include_router(visits.router, prefix="/visits", tags=["Visitas"])
api_router.include_router(emails.router, prefix="/emails", tags=["Emails"])
api_router.include_router(actions.router, prefix="/actions", tags=["Acciones"])
api_router.include_router(opportunities.router, prefix="/opportunities", tags=["Oportunidades"])
api_router.include_router(offers.router, prefix="/offers", tags=["Ofertas"])
api_router.include_router(accounts.router, prefix="/account-plans", tags=["Planes de Cuenta"])
api_router.include_router(reviews.router, prefix="/monthly-reviews", tags=["Seguimiento Mensual"])
api_router.include_router(surveys.router, prefix="/surveys", tags=["Encuestas"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["Contactos"])
api_router.include_router(automations.router, prefix="/automations", tags=["Automatizaciones"])
api_router.include_router(automation_tasks.router, prefix="/automation-tasks", tags=["Automation Tasks"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notificaciones"])
api_router.include_router(settings_endpoints.router, prefix="/settings", tags=["Configuración"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat IA"])

# Marketing Hub
api_router.include_router(campaigns.router, prefix="/marketing/campaigns", tags=["Marketing - Campañas"])
api_router.include_router(funnels.router, prefix="/marketing/funnels", tags=["Marketing - Funnels"])
api_router.include_router(marketing_assets.router, prefix="/marketing/assets", tags=["Marketing - Assets"])
api_router.include_router(utm_codes.router, prefix="/marketing/utm-codes", tags=["Marketing - UTM"])
api_router.include_router(marketing_calendar.router, prefix="/marketing/calendar", tags=["Marketing - Calendario"])
api_router.include_router(marketing_alerts.router, prefix="/marketing/alerts", tags=["Marketing - Alertas"])
api_router.include_router(marketing_analytics.router, prefix="/marketing/analytics", tags=["Marketing - Analytics"])
api_router.include_router(marketing_documents.router, prefix="/marketing/documents", tags=["Marketing - Documentos"])
api_router.include_router(audit_log.router, prefix="/marketing/audit", tags=["Marketing - Audit Log"])
api_router.include_router(llm_visibility.router, prefix="/marketing/llm-visibility", tags=["Marketing - LLM Visibility"])
api_router.include_router(seo.router, prefix="/marketing/seo", tags=["Marketing - SEO & Geo-SEO"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
api_router.include_router(marketing_webhooks.router, prefix="/marketing/webhooks", tags=["Marketing - Webhooks n8n"])

# External Analytics (GA4 + GSC)
api_router.include_router(external_analytics.router, prefix="/analytics/external", tags=["Analytics Externo — GA4 & GSC"])

# Deal Room (Microsoft Graph)
api_router.include_router(dealroom.router, prefix="/dealroom", tags=["Deal Room"])

# Contracts
api_router.include_router(contracts.router, prefix="/contracts", tags=["Contracts"])

# Cost Control (MOD-COST-001)
api_router.include_router(cost_control.router, prefix="/costs", tags=["Cost Control"])

# Organizations (Multi-tenancy)
api_router.include_router(organizations.router, prefix="/org", tags=["Organizations"])

# Admin Dashboard
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Dashboard"])

# Affiliates
api_router.include_router(affiliates.router, prefix="/affiliates", tags=["Affiliates"])

# GTM
api_router.include_router(brand.router, prefix="/brand", tags=["Brand & Positioning"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["Pricing Engine"])
api_router.include_router(competitors.router, prefix="/competitors", tags=["Competitive Intelligence"])
api_router.include_router(playbook.router, prefix="/playbook", tags=["Sales Playbook"])
api_router.include_router(gtm_dashboard.router, prefix="/gtm", tags=["GTM Dashboard"])
api_router.include_router(media.router, prefix="/media", tags=["Media Trifecta"])
api_router.include_router(okr.router, prefix="/okr", tags=["OKR"])
api_router.include_router(social.router, prefix="/social", tags=["Social Media"])
api_router.include_router(linkedin.router, prefix="/linkedin", tags=["LinkedIn Studio"])
api_router.include_router(pipeline_rules.router, prefix="/pipeline-rules", tags=["Pipeline Automation"])
api_router.include_router(audit_global.router, prefix="/audit-global", tags=["Audit Global"])
api_router.include_router(support.router, prefix="/support", tags=["Support"])
api_router.include_router(landings.router, prefix="/landings", tags=["Landing Pages"])
api_router.include_router(email_tracking.router, prefix="/tracking", tags=["Email Tracking"])
api_router.include_router(content_pipeline.router, prefix="/content-pipeline", tags=["Content Pipeline IA"])
api_router.include_router(report_builder.router, prefix="/report-builder", tags=["Report Builder"])
api_router.include_router(forms.router, prefix="/forms", tags=["Formularios Operativos"])

# Agentes LLM
api_router.include_router(agents.router, prefix="/agents", tags=["Agentes LLM"])

# Llamadas IA
api_router.include_router(calls.router, prefix="/calls", tags=["Llamadas IA"])

# API Publica (auth via X-API-Key)
api_router.include_router(public_api.router, prefix="/public", tags=["API Publica"])

# Formularios publicos (sin auth)
api_router.include_router(public_forms.router, prefix="/public-forms", tags=["Formularios Publicos"])

# Airtable
api_router.include_router(airtable.router, prefix="/airtable", tags=["Airtable"])

# MCP Gateway
api_router.include_router(mcp_gateway.router, prefix="/mcp", tags=["MCP Gateway"])

# SEO Command Center
api_router.include_router(seo_center.router, prefix="/seo-center", tags=["SEO Command Center"])

# YouTube
api_router.include_router(youtube.router, prefix="/youtube", tags=["YouTube"])

# WhatsApp Business
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["WhatsApp Business"])

# Payments (Stripe + PayPal)
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing"])
api_router.include_router(analytics_internal.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(service_catalog.router, prefix="/service-catalog", tags=["Service Catalog"])

# Security (2FA + Sessions)
api_router.include_router(security.router, prefix="/security", tags=["Security"])
