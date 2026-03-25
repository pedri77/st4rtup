import { lazy, Suspense, useEffect } from 'react'
import { initPostHog } from '@/utils/posthog'
import ErrorBoundary from '@/components/ErrorBoundary'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import RoleGuard from './components/RoleGuard'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import PricingPublicPage from './pages/PricingPublicPage'
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/legal/TermsPage'))
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'))

// Lazy-loaded pages (code splitting)
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const ReferralPage = lazy(() => import('./pages/ReferralPage'))
const BadgesPage = lazy(() => import('./pages/BadgesPage'))
const DemoPage = lazy(() => import('./pages/DemoPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'))
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'))
const StatusPage = lazy(() => import('./pages/StatusPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const RoiCalculatorPage = lazy(() => import('./pages/RoiCalculatorPage'))
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LeadsPage = lazy(() => import('./pages/LeadsPage'))
const LeadDetailPage = lazy(() => import('./pages/LeadDetailPage'))
const VisitsPage = lazy(() => import('./pages/VisitsPage'))
const EmailsPage = lazy(() => import('./pages/EmailsPage'))
const PipelinePage = lazy(() => import('./pages/PipelinePage'))
const ActionsPage = lazy(() => import('./pages/ActionsPage'))
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'))
const SurveysPage = lazy(() => import('./pages/SurveysPage'))
const AutomationsPage = lazy(() => import('./pages/AutomationsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const OffersPage = lazy(() => import('./pages/OffersPage'))
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const SurveyPublicPage = lazy(() => import('./pages/SurveyPublicPage'))
const MarketingPage = lazy(() => import('./pages/marketing/MarketingPage'))
const CampaignsPage = lazy(() => import('./pages/marketing/CampaignsPage'))
const AlertsPage = lazy(() => import('./pages/marketing/AlertsPage'))
const UTMGeneratorPage = lazy(() => import('./pages/marketing/UTMGeneratorPage'))
const MarketingCalendarPage = lazy(() => import('./pages/marketing/MarketingCalendarPage'))
const AnalyticsPage = lazy(() => import('./pages/marketing/AnalyticsPage'))
const FunnelsPage = lazy(() => import('./pages/marketing/FunnelsPage'))
const AssetsPage = lazy(() => import('./pages/marketing/AssetsPage'))
const DocumentsPage = lazy(() => import('./pages/marketing/DocumentsPage'))
const MarketingIntegrationsPage = lazy(() => import('./pages/marketing/MarketingIntegrationsPage'))
const MarketingToolsPage = lazy(() => import('./pages/marketing/MarketingToolsPage'))
const AuditLogPage = lazy(() => import('./pages/marketing/AuditLogPage'))
const LLMVisibilityPage = lazy(() => import('./pages/marketing/LLMVisibilityPage'))
const SEOPage = lazy(() => import('./pages/marketing/SEOPage'))
const SEOCenterPage = lazy(() => import('./pages/marketing/SEOCenterPage'))
const CallsConsolePage = lazy(() => import('./pages/calls/CallsConsolePage'))
const CallPromptsPage = lazy(() => import('./pages/calls/CallPromptsPage'))
const CallsDashboardPage = lazy(() => import('./pages/calls/CallsDashboardPage'))
const CallHistoryPage = lazy(() => import('./pages/calls/CallHistoryPage'))
const CallQueuesPage = lazy(() => import('./pages/calls/CallQueuesPage'))
const AgentsPage = lazy(() => import('./pages/AgentsPage'))
const CostControlPage = lazy(() => import('./pages/CostControlPage'))
const DealRoomPage = lazy(() => import('./pages/DealRoomPage'))
const DealRoomPublicPage = lazy(() => import('./pages/DealRoomPublicPage'))
const GTMDashboardPage = lazy(() => import('./pages/GTMDashboardPage'))
const BrandPage = lazy(() => import('./pages/BrandPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const CompetitorsPage = lazy(() => import('./pages/CompetitorsPage'))
const PlaybookPage = lazy(() => import('./pages/PlaybookPage'))
const PlaybookDetailPage = lazy(() => import('./pages/PlaybookDetailPage'))
const MediaTrifectaPage = lazy(() => import('./pages/MediaTrifectaPage'))
const InvestorViewPage = lazy(() => import('./pages/InvestorViewPage'))
const OKRPage = lazy(() => import('./pages/OKRPage'))
const ForecastPage = lazy(() => import('./pages/ForecastPage'))
const PocTrackerPage = lazy(() => import('./pages/PocTrackerPage'))
const ABMAccountPage = lazy(() => import('./pages/ABMAccountPage'))
const ActionsKanbanPage = lazy(() => import('./pages/ActionsKanbanPage'))
const CustomerHealthPage = lazy(() => import('./pages/CustomerHealthPage'))
const ProposalViewPage = lazy(() => import('./pages/ProposalViewPage'))
const SocialMediaPage = lazy(() => import('./pages/SocialMediaPage'))
const YouTubePage = lazy(() => import('./pages/marketing/YouTubePage'))
const PipelineFunnelPage = lazy(() => import('./pages/PipelineFunnelPage'))
const AlertChannelsPage = lazy(() => import('./pages/AlertChannelsPage'))
const WebhooksPage = lazy(() => import('./pages/WebhooksPage'))
const ReportBuilderPage = lazy(() => import('./pages/ReportBuilderPage'))
const ContentPipelinePage = lazy(() => import('./pages/ContentPipelinePage'))
const PipelineKanbanPage = lazy(() => import('./pages/PipelineKanbanPage'))
const PublicFormPage = lazy(() => import('./pages/PublicFormPage'))
const FormsManagerPage = lazy(() => import('./pages/FormsManagerPage'))
const MyDayPage = lazy(() => import('./pages/MyDayPage'))
const WhatsAppPage = lazy(() => import('./pages/WhatsAppPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const AffiliatesPage = lazy(() => import('./pages/AffiliatesPage'))
const ServiceCatalogPage = lazy(() => import('./pages/ServiceCatalogPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function App() {
  useEffect(() => { initPostHog() }, [])

  return (
    <ErrorBoundary>
    <KeyboardShortcuts />
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPublicPage />} />
        <Route path="/demo" element={<Suspense fallback={<PageLoader />}><DemoPage /></Suspense>} />
        <Route path="/blog" element={<Suspense fallback={<PageLoader />}><BlogPage /></Suspense>} />
        <Route path="/blog/:slug" element={<Suspense fallback={<PageLoader />}><BlogArticlePage /></Suspense>} />
        <Route path="/changelog" element={<Suspense fallback={<PageLoader />}><ChangelogPage /></Suspense>} />
        <Route path="/status" element={<Suspense fallback={<PageLoader />}><StatusPage /></Suspense>} />
        <Route path="/vs/:competitor" element={<Suspense fallback={<PageLoader />}><ComparePage /></Suspense>} />
        <Route path="/roi" element={<Suspense fallback={<PageLoader />}><RoiCalculatorPage /></Suspense>} />
        <Route path="/help" element={<Suspense fallback={<PageLoader />}><HelpCenterPage /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPage /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsPage /></Suspense>} />
        <Route path="/cookies" element={<Suspense fallback={<PageLoader />}><CookiesPage /></Suspense>} />
        <Route path="/affiliates" element={<Suspense fallback={<PageLoader />}><AffiliatesPage /></Suspense>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/survey/:token" element={<Suspense fallback={<PageLoader />}><SurveyPublicPage /></Suspense>} />
        <Route path="/proposal" element={<Suspense fallback={<PageLoader />}><ProposalViewPage /></Suspense>} />
        <Route path="/form/:formId" element={<Suspense fallback={<PageLoader />}><PublicFormPage /></Suspense>} />
        <Route path="/deal/:token" element={<Suspense fallback={<PageLoader />}><DealRoomPublicPage /></Suspense>} />

        {/* Onboarding (protected, no layout) */}
        <Route path="/app/onboarding" element={<PrivateRoute><Suspense fallback={<PageLoader />}><OnboardingPage /></Suspense></PrivateRoute>} />

        {/* Protected routes */}
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="my-day" element={<Suspense fallback={<PageLoader />}><MyDayPage /></Suspense>} />
          <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
          <Route path="leads" element={<Suspense fallback={<PageLoader />}><LeadsPage /></Suspense>} />
          <Route path="leads/:id" element={<Suspense fallback={<PageLoader />}><LeadDetailPage /></Suspense>} />
          <Route path="leads/:leadId/abm" element={<Suspense fallback={<PageLoader />}><ABMAccountPage /></Suspense>} />
          <Route path="visits" element={<Suspense fallback={<PageLoader />}><VisitsPage /></Suspense>} />
          <Route path="emails" element={<Suspense fallback={<PageLoader />}><EmailsPage /></Suspense>} />
          <Route path="pipeline" element={<Suspense fallback={<PageLoader />}><PipelinePage /></Suspense>} />
          <Route path="pipeline/kanban" element={<Suspense fallback={<PageLoader />}><PipelineKanbanPage /></Suspense>} />
          <Route path="offers" element={<Suspense fallback={<PageLoader />}><OffersPage /></Suspense>} />
          <Route path="offers/catalog" element={<Suspense fallback={<PageLoader />}><ServiceCatalogPage /></Suspense>} />
          <Route path="actions" element={<Suspense fallback={<PageLoader />}><ActionsPage /></Suspense>} />
          <Route path="actions/kanban" element={<Suspense fallback={<PageLoader />}><ActionsKanbanPage /></Suspense>} />
          <Route path="customer-health" element={<Suspense fallback={<PageLoader />}><CustomerHealthPage /></Suspense>} />
          <Route path="social" element={<Navigate to="/marketing/social" replace />} />
          <Route path="marketing/social" element={<Suspense fallback={<PageLoader />}><SocialMediaPage /></Suspense>} />
          <Route path="gtm/funnel" element={<Suspense fallback={<PageLoader />}><PipelineFunnelPage /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<PageLoader />}><ReviewsPage /></Suspense>} />
          <Route path="surveys" element={<Suspense fallback={<PageLoader />}><SurveysPage /></Suspense>} />
          <Route path="clients" element={<Suspense fallback={<PageLoader />}><ClientsPage /></Suspense>} />
          <Route path="calendar" element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />
          <Route path="automations" element={<Suspense fallback={<PageLoader />}><AutomationsPage /></Suspense>} />

          {/* Admin-only routes */}
          <Route
            path="admin/users"
            element={
              <RoleGuard allowedRoles="admin">
                <Suspense fallback={<PageLoader />}><UsersPage /></Suspense>
              </RoleGuard>
            }
          />
          <Route
            path="settings"
            element={
              <RoleGuard allowedRoles="admin">
                <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
              </RoleGuard>
            }
          />
          <Route path="integrations" element={<Suspense fallback={<PageLoader />}><IntegrationsPage /></Suspense>} />
          <Route path="chat" element={<Suspense fallback={<PageLoader />}><ChatPage /></Suspense>} />

          <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />

          {/* Marketing Hub */}
          <Route path="marketing" element={<Suspense fallback={<PageLoader />}><MarketingPage /></Suspense>} />
          <Route path="marketing/campaigns" element={<Suspense fallback={<PageLoader />}><CampaignsPage /></Suspense>} />
          <Route path="marketing/alerts" element={<Suspense fallback={<PageLoader />}><AlertsPage /></Suspense>} />
          <Route path="marketing/utm" element={<Suspense fallback={<PageLoader />}><UTMGeneratorPage /></Suspense>} />
          <Route path="marketing/calendar" element={<Suspense fallback={<PageLoader />}><MarketingCalendarPage /></Suspense>} />
          <Route path="marketing/analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
          <Route path="marketing/funnels" element={<Suspense fallback={<PageLoader />}><FunnelsPage /></Suspense>} />
          <Route path="marketing/assets" element={<Suspense fallback={<PageLoader />}><AssetsPage /></Suspense>} />
          <Route path="marketing/docs" element={<Suspense fallback={<PageLoader />}><DocumentsPage /></Suspense>} />
          <Route path="marketing/integrations" element={<Suspense fallback={<PageLoader />}><MarketingIntegrationsPage /></Suspense>} />
          <Route path="marketing/tools" element={<Suspense fallback={<PageLoader />}><MarketingToolsPage /></Suspense>} />
          <Route path="marketing/audit" element={<Suspense fallback={<PageLoader />}><AuditLogPage /></Suspense>} />
          <Route path="marketing/llm-visibility" element={<Suspense fallback={<PageLoader />}><LLMVisibilityPage /></Suspense>} />
          <Route path="marketing/seo" element={<Suspense fallback={<PageLoader />}><SEOPage /></Suspense>} />
          <Route path="marketing/seo-center" element={<Suspense fallback={<PageLoader />}><SEOCenterPage /></Suspense>} />
          <Route path="marketing/youtube" element={<Suspense fallback={<PageLoader />}><YouTubePage /></Suspense>} />

          {/* Llamadas IA */}
          <Route path="calls" element={<Suspense fallback={<PageLoader />}><CallsConsolePage /></Suspense>} />
          <Route path="calls/prompts" element={<Suspense fallback={<PageLoader />}><CallPromptsPage /></Suspense>} />
          <Route path="calls/dashboard" element={<Suspense fallback={<PageLoader />}><CallsDashboardPage /></Suspense>} />
          <Route path="calls/history" element={<Suspense fallback={<PageLoader />}><CallHistoryPage /></Suspense>} />
          <Route path="calls/queues" element={<Suspense fallback={<PageLoader />}><CallQueuesPage /></Suspense>} />

          {/* Agentes IA & Cost Control */}
          <Route path="agents" element={<Suspense fallback={<PageLoader />}><AgentsPage /></Suspense>} />
          <Route path="dealroom/:opportunityId" element={<Suspense fallback={<PageLoader />}><DealRoomPage /></Suspense>} />

          {/* GTM */}
          <Route path="gtm" element={<Suspense fallback={<PageLoader />}><GTMDashboardPage /></Suspense>} />
          <Route path="gtm/brand" element={<Suspense fallback={<PageLoader />}><BrandPage /></Suspense>} />
          <Route path="gtm/pricing" element={<Suspense fallback={<PageLoader />}><PricingPage /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<PageLoader />}><AdminDashboardPage /></Suspense>} />
          <Route path="referral" element={<Suspense fallback={<PageLoader />}><ReferralPage /></Suspense>} />
          <Route path="badges" element={<Suspense fallback={<PageLoader />}><BadgesPage /></Suspense>} />
          <Route path="gtm/competitors" element={<Suspense fallback={<PageLoader />}><CompetitorsPage /></Suspense>} />
          <Route path="gtm/playbook" element={<Suspense fallback={<PageLoader />}><PlaybookPage /></Suspense>} />
          <Route path="gtm/playbook/:tacticId" element={<Suspense fallback={<PageLoader />}><PlaybookDetailPage /></Suspense>} />
          <Route path="gtm/media" element={<Suspense fallback={<PageLoader />}><MediaTrifectaPage /></Suspense>} />
          <Route path="gtm/investor" element={<Suspense fallback={<PageLoader />}><InvestorViewPage /></Suspense>} />
          <Route path="gtm/okr" element={<Suspense fallback={<PageLoader />}><OKRPage /></Suspense>} />
          <Route path="gtm/forecast" element={<Suspense fallback={<PageLoader />}><ForecastPage /></Suspense>} />
          <Route path="gtm/poc-tracker" element={<Suspense fallback={<PageLoader />}><PocTrackerPage /></Suspense>} />
          <Route path="cost-control" element={<Suspense fallback={<PageLoader />}><CostControlPage /></Suspense>} />
          <Route path="alert-channels" element={<Suspense fallback={<PageLoader />}><AlertChannelsPage /></Suspense>} />
          <Route path="webhooks" element={<Suspense fallback={<PageLoader />}><WebhooksPage /></Suspense>} />
          <Route path="report-builder" element={<Suspense fallback={<PageLoader />}><ReportBuilderPage /></Suspense>} />
          <Route path="formularios" element={<Suspense fallback={<PageLoader />}><FormsManagerPage /></Suspense>} />
          <Route path="whatsapp" element={<Suspense fallback={<PageLoader />}><WhatsAppPage /></Suspense>} />
          <Route path="payments" element={<Suspense fallback={<PageLoader />}><PaymentsPage /></Suspense>} />
          <Route path="content-pipeline" element={<Suspense fallback={<PageLoader />}><Navigate to="/marketing/seo-center" replace /></Suspense>} />
        </Route>
      </Routes>
    </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
