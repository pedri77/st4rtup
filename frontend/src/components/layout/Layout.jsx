import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarCheck, Mail, GitBranch,
  CheckSquare, BarChart3, MessageSquare, Settings, Zap, Search, Bell, FileText, Shield, Menu, X,
  Plug, Sparkles, Contact, Calendar, Megaphone, Phone, Bot, DollarSign, Target, Heart, Columns3, BrainCircuit,
  CalendarDays, CreditCard
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import GlobalSearch from '@/components/GlobalSearch'
import NotificationsPanel from '@/components/NotificationsPanel'
import ChatWidget from '@/components/ChatWidget'
// WebChatWidget is for embedding on st4rtup.app public site, not inside the CRM
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import { useHasRole } from '@/components/RoleGuard'
import { useAuth } from '@/contexts/AuthContext'
import { useUIStore } from '@/store/useUIStore'
import ThemeToggle from '@/components/ThemeToggle'
import useDynamicFavicon from '@/hooks/useDynamicFavicon'
import api from '@/services/api'
import Changelog from '@/components/Changelog'
import QuickActions from '@/components/QuickActions'
import InstallPrompt from '@/components/InstallPrompt'
import FeedbackWidget from '@/components/FeedbackWidget'
import InAppPrompts from '@/components/InAppPrompts'
import TrialBanner from '@/components/TrialBanner'
import { useNotificationStream } from '@/hooks/useNotificationStream'
import { useTranslation } from '@/i18n/useTranslation'

/* ── Design tokens ─────────────────────────────────────────────────── */
const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

function getNavigationGroups(t) {
  return [
    {
      label: t('nav.group.operations'),
      items: [
        { name: t('nav.my_day'), href: '/my-day', icon: CalendarDays },
        { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.leads'), href: '/leads', icon: Users },
        { name: t('nav.pipeline'), href: '/pipeline', icon: GitBranch },
        { name: t('nav.kanban'), href: '/pipeline/kanban', icon: Columns3 },
        { name: t('nav.offers'), href: '/offers', icon: FileText },
        { name: t('nav.calendar'), href: '/calendar', icon: Calendar },
      ],
    },
    {
      label: t('nav.group.activity'),
      items: [
        { name: t('nav.visits'), href: '/visits', icon: CalendarCheck },
        { name: t('nav.emails'), href: '/emails', icon: Mail },
        { name: t('nav.actions'), href: '/actions', icon: CheckSquare },
        { name: t('nav.kanban'), href: '/actions/kanban', icon: Columns3 },
        { name: t('nav.contacts'), href: '/clients', icon: Contact },
        { name: t('nav.surveys'), href: '/surveys', icon: MessageSquare },
        { name: t('nav.reviews'), href: '/reviews', icon: BarChart3 },
      ],
    },
    {
      label: t('nav.group.intelligence'),
      items: [
        { name: t('nav.gtm'), href: '/gtm', icon: Target },
        { name: t('nav.agents'), href: '/agents', icon: Bot },
        { name: t('nav.seo_center'), href: '/marketing/seo-center', icon: Search },
        { name: t('nav.marketing'), href: '/marketing', icon: Megaphone },
        { name: t('nav.calls'), href: '/calls', icon: Phone },
        { name: t('nav.reports'), href: '/reports', icon: FileText },
        { name: t('nav.report_builder'), href: '/report-builder', icon: BarChart3 },
        { name: t('nav.social_media'), href: '/marketing/social', icon: Megaphone },
        { name: t('nav.customer_health'), href: '/customer-health', icon: Heart },
      ],
    },
    {
      label: t('nav.group.system'),
      items: [
        { name: t('nav.automations'), href: '/automations', icon: Zap },
        { name: t('nav.cost_control'), href: '/cost-control', icon: DollarSign, adminOnly: true },
        { name: t('nav.integrations'), href: '/integrations', icon: Plug },
        { name: t('nav.forms'), href: '/formularios', icon: FileText },
        { name: t('nav.alert_channels'), href: '/alert-channels', icon: Bell },
        { name: t('nav.webhooks'), href: '/webhooks', icon: Zap },
        { name: t('nav.mcp_gateway'), href: '/integrations?tab=airtable', icon: BrainCircuit },
        { name: t('nav.whatsapp'), href: '/whatsapp', icon: MessageSquare },
        { name: t('nav.payments'), href: '/payments', icon: CreditCard },
        { name: t('nav.chat'), href: '/chat', icon: Sparkles },
        { name: t('nav.users'), href: '/admin/users', icon: Shield, adminOnly: true },
      ],
    },
  ]
}

export default function Layout() {
  const { searchOpen, setSearchOpen, notificationsOpen, setNotificationsOpen } = useUIStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useDynamicFavicon()
  const { user } = useAuth()
  const { hasRole } = useHasRole()
  const location = useLocation()
  const { t } = useTranslation()

  useNotificationStream()

  const navigationGroups = getNavigationGroups(t)
  const visibleGroups = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.adminOnly || hasRole('admin')),
  })).filter(group => group.items.length > 0)

  const { data: notificationStats } = useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: async () => {
      try { const response = await api.get('/notifications/stats'); return response.data }
      catch { return null }
    },
    refetchInterval: 30000,
  })
  const unreadCount = notificationStats?.unread ?? 0

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ backgroundColor: 'hsla(220,60%,2%,0.6)' }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: T.card, borderRight: `1px solid ${T.border}` }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})` }}>
              <span className="text-white font-bold text-sm">RS</span>
            </div>
            <span style={{ fontFamily: fontDisplay, color: T.fg }} className="font-semibold text-lg">St4rtup CRM</span>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: T.fgMuted, opacity: 0.6 }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                    style={({ isActive }) => ({
                      fontFamily: fontDisplay,
                      letterSpacing: '0.02em',
                      backgroundColor: isActive ? `${T.cyan}15` : 'transparent',
                      color: isActive ? T.cyan : T.fgMuted,
                      borderLeft: isActive ? `3px solid ${T.cyan}` : '3px solid transparent',
                    })}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* User profile */}
          <div className="pt-3 mt-3" style={{ borderTop: `1px solid ${T.border}` }}>
            <Link
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ fontFamily: fontDisplay, letterSpacing: '0.02em', color: T.fgMuted }}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${T.cyan}15` }}>
                <span style={{ color: T.cyan }} className="text-[10px] font-medium">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              {user?.email?.split('@')[0] || 'Usuario'}
            </Link>
          </div>
        </nav>

        {/* API Cost Widget */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: '.65rem', color: T.fgMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>API · uso mensual</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontFamily: fontMono, fontWeight: 700, fontSize: '.9rem', color: T.cyan }}>$0.00</span>
            <span style={{ fontSize: '.65rem', color: T.fgMuted }}>/ $50</span>
          </div>
          <div style={{ height: 4, background: T.muted, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: '0%', height: '100%', borderRadius: 2, background: T.cyan }} />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6"
          style={{ backgroundColor: T.card, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-3 flex-1">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
              <Menu className="w-5 h-5" />
            </button>

            {/* Search bar */}
            <div className="hidden md:block flex-1 max-w-2xl">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-left"
                style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}
              >
                <Search className="w-4 h-4" style={{ color: T.fgMuted }} />
                <span className="text-sm" style={{ color: T.fgMuted }}>{t('common.search_placeholder')}</span>
                <kbd className="ml-auto px-2 py-1 text-xs rounded" style={{ backgroundColor: T.bg, color: T.fgMuted, border: `1px solid ${T.border}` }}>
                  Ctrl+K
                </kbd>
              </button>
            </div>

            <button onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 rounded-lg transition-colors ml-auto" style={{ color: T.fgMuted }}>
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-2 md:ml-6">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotificationsOpen(true)}
                className="p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
                <Bell className="w-5 h-5" />
              </button>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: '#EF4444', color: 'white' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Settings */}
            {hasRole('admin') && (
              <NavLink to="/settings" className="p-2 rounded-lg transition-colors"
                style={{ color: T.fgMuted }}>
                <Settings className="w-5 h-5" />
              </NavLink>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto" style={{ backgroundColor: T.bg }}>
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationsPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <ChatWidget />
      <QuickActions />
      <InstallPrompt />
      <KeyboardShortcuts />
      <Changelog />
    </div>
  )
}
