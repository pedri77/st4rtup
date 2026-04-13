import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarCheck, Mail, GitBranch,
  CheckSquare, BarChart3, MessageSquare, Settings, Zap, Search, Bell, FileText, Shield, Menu, X,
  Plug, Sparkles, Contact, Calendar, Megaphone, Phone, Bot, DollarSign, Target, Heart, Columns3, BrainCircuit,
  CalendarDays, CreditCard, BookOpen, ShoppingBag, ChevronLeft, ChevronRight, LogOut, Activity,
  Star, Clock
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
import SetupChecklist from '@/components/SetupChecklist'
import TrialBanner from '@/components/TrialBanner'
import { useNotificationStream } from '@/hooks/useNotificationStream'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { useSetupProgress } from '@/hooks/useSetupProgress'
import { useTranslation } from '@/i18n/useTranslation'
import { useThemeColors, LIGHT as T, fontDisplay, fontMono } from '@/utils/theme'


/* ── Design tokens ─────────────────────────────────────────────────── */


function getNavigationGroups(t) {
  return [
    {
      label: t('nav.group.operations'),
      items: [
        { name: t('nav.my_day'), href: '/app/my-day', icon: CalendarDays },
        { name: t('nav.dashboard'), href: '/app/dashboard', icon: LayoutDashboard },
        { name: t('nav.leads'), href: '/app/leads', icon: Users },
        { name: t('nav.pipeline'), href: '/app/pipeline', icon: GitBranch },
        { name: t('nav.kanban'), href: '/app/pipeline/kanban', icon: Columns3 },
        { name: 'Pipeline Rules', href: '/app/pipeline/rules', icon: Zap },
        { name: t('nav.offers'), href: '/app/offers', icon: FileText },
        { name: t('nav.calendar'), href: '/app/calendar', icon: Calendar },
      ],
    },
    {
      label: t('nav.group.activity'),
      items: [
        { name: t('nav.visits'), href: '/app/visits', icon: CalendarCheck },
        { name: t('nav.emails'), href: '/app/emails', icon: Mail },
        { name: t('nav.actions'), href: '/app/actions', icon: CheckSquare },
        { name: t('nav.kanban'), href: '/app/actions/kanban', icon: Columns3 },
        { name: t('nav.contacts'), href: '/app/clients', icon: Contact },
        { name: t('nav.surveys'), href: '/app/surveys', icon: MessageSquare },
        { name: t('nav.reviews'), href: '/app/reviews', icon: BarChart3 },
      ],
    },
    {
      label: t('nav.group.intelligence'),
      items: [
        { name: t('nav.gtm'), href: '/app/gtm', icon: Target },
        { name: t('nav.agents'), href: '/app/agents', icon: Bot },
        { name: t('nav.seo_center'), href: '/app/marketing/seo-center', icon: Search },
        { name: t('nav.marketing'), href: '/app/marketing', icon: Megaphone },
        { name: t('nav.calls'), href: '/app/calls', icon: Phone },
        { name: t('nav.reports'), href: '/app/reports', icon: FileText },
        { name: t('nav.report_builder'), href: '/app/report-builder', icon: BarChart3 },
        { name: t('nav.social_media'), href: '/app/marketing/social', icon: Megaphone },
        { name: 'LinkedIn Studio', href: '/app/marketing/linkedin', icon: Activity },
        { name: t('nav.customer_health'), href: '/app/customer-health', icon: Heart },
      ],
    },
    {
      label: t('nav.group.system'),
      items: [
        { name: t('nav.automations'), href: '/app/automations', icon: Zap },
{ name: t('nav.cost_control'), href: '/app/cost-control', icon: DollarSign, adminOnly: true },
        { name: t('nav.integrations'), href: '/app/integrations', icon: Plug },
        { name: t('nav.forms'), href: '/app/formularios', icon: FileText },
        { name: t('nav.alert_channels'), href: '/app/alert-channels', icon: Bell },
        { name: t('nav.webhooks'), href: '/app/webhooks', icon: Zap },
        { name: t('nav.mcp_gateway'), href: '/app/integrations?tab=airtable', icon: BrainCircuit },
        { name: t('nav.whatsapp'), href: '/app/whatsapp', icon: MessageSquare },
        { name: t('nav.payments'), href: '/app/payments', icon: CreditCard },
        { name: 'Pricing', href: '/app/billing', icon: CreditCard },
        { name: 'Docs', href: '/app/docs', icon: BookOpen },
        { name: 'Marketplace', href: '/app/marketplace', icon: ShoppingBag },
        { name: t('nav.chat'), href: '/app/chat', icon: Sparkles },
        { name: 'Admin', href: '/app/admin', icon: Shield },
      ],
    },
  ]
}

function ApiCostWidget() {
  const [data, setData] = useState(null)
  useEffect(() => {
    import('@/services/api').then(({ default: api }) => {
      api.get('/admin/api-costs').then(r => setData(r.data)).catch(() => {})
    })
  }, [])
  const cost = data?.total_cost_usd || 0
  const budget = data?.budget_usd || 50
  const pct = Math.min((cost / budget) * 100, 100)
  return (
    <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}` }}>
      <div style={{ fontSize: '.65rem', color: T.fgMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>API · uso mensual</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontFamily: fontMono, fontWeight: 700, fontSize: '.9rem', color: pct > 80 ? T.destructive : T.cyan }}>${cost.toFixed(2)}</span>
        <span style={{ fontSize: '.65rem', color: T.fgMuted }}>/ ${budget}</span>
      </div>
      <div style={{ height: 4, background: T.muted, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: pct > 80 ? T.destructive : T.cyan, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

export default function Layout() {
  const T = useThemeColors()
  const { searchOpen, setSearchOpen, notificationsOpen, setNotificationsOpen } = useUIStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('st4rtup_sidebar_collapsed') === 'true')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  useDynamicFavicon()
  const { user, logout } = useAuth()
  const { hasRole } = useHasRole()
  const location = useLocation()
  const toggleSidebar = () => { const n = !collapsed; setCollapsed(n); localStorage.setItem('st4rtup_sidebar_collapsed', String(n)) }
  const { t } = useTranslation()

  useNotificationStream()
  useRealtimeNotifications()
  useSetupProgress()

  const navigationGroups = getNavigationGroups(t)
  const visibleGroups = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !item.adminOnly || hasRole('admin')),
  })).filter(group => group.items.length > 0)

  // Favorites + Recents
  const { favorites, recents, addFavorite, removeFavorite, addRecent } = useUserPreferencesStore()
  const allNavItems = navigationGroups.flatMap(g => g.items)

  // Track recent pages on navigation
  useEffect(() => {
    const match = allNavItems.find(item => location.pathname === item.href || location.pathname.startsWith(item.href + '/'))
    if (match) addRecent({ href: match.href, name: match.name })
  }, [location.pathname])

  const toggleFavorite = (item) => {
    if (favorites.some(f => f.href === item.href)) removeFavorite(item.href)
    else addFavorite({ href: item.href, name: item.name })
  }

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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col transform transition-all duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: collapsed ? 64 : 256, backgroundColor: T.card, borderRight: `1px solid ${T.border}` }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})` }}>
              <span className="text-gray-800 font-bold text-sm">S4</span>
            </div>
            <span style={{ fontFamily: fontDisplay, color: T.fg }} className="font-semibold text-lg">St4rtup CRM</span>
          </div>
          <button aria-label="Cerrar" onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Favorites */}
          {!collapsed && favorites.length > 0 && (
            <div>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: T.warning, opacity: 0.8 }}>
                <Star className="w-3 h-3" /> Favoritos
              </p>
              <div className="space-y-0.5">
                {favorites.map(fav => {
                  const navItem = allNavItems.find(n => n.href === fav.href)
                  const Icon = navItem?.icon || Star
                  return (
                    <NavLink key={fav.href} to={fav.href}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors group"
                      style={({ isActive }) => ({ fontFamily: fontDisplay, letterSpacing: '0.02em', backgroundColor: isActive ? `${T.cyan}15` : 'transparent', color: isActive ? T.cyan : T.fgMuted, borderLeft: isActive ? `3px solid ${T.cyan}` : '3px solid transparent' })}>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{fav.name}</span>
                      <button onClick={e => { e.preventDefault(); e.stopPropagation(); removeFavorite(fav.href) }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <X className="w-3 h-3" style={{ color: T.fgMuted }} />
                      </button>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recents */}
          {!collapsed && recents.length > 0 && (
            <div>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: T.fgMuted, opacity: 0.6 }}>
                <Clock className="w-3 h-3" /> Recientes
              </p>
              <div className="space-y-0.5">
                {recents.slice(0, 5).map(recent => {
                  const navItem = allNavItems.find(n => n.href === recent.href)
                  const Icon = navItem?.icon || FileText
                  return (
                    <div key={recent.href} className="flex items-center group">
                      <NavLink to={recent.href}
                        className="flex-1 flex items-center gap-3 px-3 py-1 rounded-lg text-xs transition-colors"
                        style={({ isActive }) => ({ color: isActive ? T.cyan : T.fgMuted, backgroundColor: isActive ? `${T.cyan}08` : 'transparent' })}>
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{recent.name}</span>
                      </NavLink>
                      <button onClick={() => toggleFavorite({ href: recent.href, name: recent.name })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5" style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        title={favorites.some(f => f.href === recent.href) ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
                        <Star className="w-3 h-3" style={{ color: favorites.some(f => f.href === recent.href) ? T.warning : T.fgMuted, fill: favorites.some(f => f.href === recent.href) ? T.warning : 'none' }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: T.fgMuted, opacity: 0.6 }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <div key={item.name} className="flex items-center group">
                    <NavLink
                      to={item.href}
                      className="flex-1 flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                      style={({ isActive }) => ({
                        fontFamily: fontDisplay,
                        letterSpacing: '0.02em',
                        backgroundColor: isActive ? `${T.cyan}15` : 'transparent',
                        color: isActive ? T.cyan : T.fgMuted,
                        borderLeft: isActive ? `3px solid ${T.cyan}` : '3px solid transparent',
                      })}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && item.name}
                    </NavLink>
                    {!collapsed && (
                      <button onClick={() => toggleFavorite(item)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 mr-1" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Star className="w-3 h-3" style={{ color: favorites.some(f => f.href === item.href) ? T.warning : T.fgMuted, fill: favorites.some(f => f.href === item.href) ? T.warning : 'none' }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* User profile */}
          <div className="pt-3 mt-3" style={{ borderTop: `1px solid ${T.border}` }}>
            <Link
              to="/app/profile"
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

        {/* Onboarding Progress Widget */}
        {!collapsed && (() => {
          const steps = [
            { key: 'lead', label: 'Crear lead' },
            { key: 'pipeline', label: 'Pipeline' },
            { key: 'email', label: 'Enviar email' },
            { key: 'action', label: 'Crear acción' },
          ]
          const done = steps.filter(s => localStorage.getItem(`onb_${s.key}`) === '1').length
          const pct = Math.round((done / steps.length) * 100)
          if (pct >= 100) return null
          return (
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: '.65rem', color: T.fgMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Onboarding</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontFamily: fontMono, fontWeight: 700, fontSize: '.85rem', color: pct > 50 ? T.success : T.cyan }}>{pct}%</span>
                <span style={{ fontSize: '.65rem', color: T.fgMuted }}>{done}/{steps.length}</span>
              </div>
              <div style={{ height: 4, background: T.muted, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: pct > 50 ? T.success : T.cyan, transition: 'width 0.3s' }} />
              </div>
            </div>
          )
        })()}

        {/* API Cost Widget */}
        {!collapsed && <ApiCostWidget />}
        {/* Collapse toggle */}
        <button onClick={toggleSidebar} style={{ width: '100%', padding: 12, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', color: T.fgMuted, backgroundColor: 'transparent', borderTop: `1px solid ${T.border}` }} title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6"
          style={{ backgroundColor: T.card, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-3 flex-1">
            <button aria-label="Abrir menú" onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }}>
              <Menu className="w-5 h-5" />
            </button>

            {/* Search bar */}
            <div className="hidden md:block flex-1 max-w-2xl">
              <button aria-label="Buscar"
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

            <button aria-label="Buscar" onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 rounded-lg transition-colors ml-auto" style={{ color: T.fgMuted }}>
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-2 md:ml-6">
            {/* Docs help */}
            <Link to="/app/docs" title="Documentación" style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.border}`, color: T.fgMuted, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>?</Link>
            {/* Notifications */}
            <div className="relative">
              <button aria-label="Notificaciones" onClick={() => setNotificationsOpen(true)}
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

            {/* User avatar + dropdown */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} style={{
                width: 32, height: 32, borderRadius: '50%', backgroundColor: T.cyan,
                color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </button>
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 40, right: 0, width: 200,
                  backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.1)', zIndex: 50, padding: 8,
                }}>
                  <p style={{ padding: '8px 12px', fontSize: 11, color: T.fgMuted, borderBottom: `1px solid ${T.border}`, margin: 0 }}>{user?.email}</p>
                  {[
                    { to: '/app/profile', label: 'Perfil' },
                    { to: '/app/billing', label: 'Facturación' },
                    { to: '/app/docs', label: 'Documentación' },
                  ].map(item => (
                    <NavLink key={item.to} to={item.to} onClick={() => setUserMenuOpen(false)}
                      style={{ display: 'block', padding: '8px 12px', fontSize: 13, color: T.fg, textDecoration: 'none', borderRadius: 6 }}>
                      {item.label}
                    </NavLink>
                  ))}
                  <button onClick={() => { setUserMenuOpen(false); logout() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', fontSize: 13, color: T.destructive, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, borderTop: `1px solid ${T.border}`, marginTop: 4 }}>
                    <LogOut size={14} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>

            {/* Settings */}
            {hasRole('admin') && (
              <NavLink to="/app/settings" className="p-2 rounded-lg transition-colors"
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
      <InAppPrompts />
      <SetupChecklist />
      <KeyboardShortcuts />
      <Changelog />
    </div>
  )
}
