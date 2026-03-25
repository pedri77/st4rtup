import { useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarCheck, Mail, GitBranch,
  CheckSquare, BarChart3, MessageSquare, Settings, Zap, Search, Bell, Phone
} from 'lucide-react'
import { clsx } from 'clsx'
import { useQuery } from '@tanstack/react-query'
import GlobalSearch from './GlobalSearch'
import NotificationsPanel from './NotificationsPanel'
import { useUIStore } from '@/store/useUIStore'
import api from '@/services/api'
import { mockNotificationStats, mockDelay, USE_MOCK_DATA } from '@/mocks/mockData'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Visitas', href: '/visits', icon: CalendarCheck },
  { name: 'Emails', href: '/emails', icon: Mail },
  { name: 'Pipeline', href: '/pipeline', icon: GitBranch },
  { name: 'Acciones', href: '/actions', icon: CheckSquare },
  { name: 'Seguimiento', href: '/reviews', icon: BarChart3 },
  { name: 'Encuestas', href: '/surveys', icon: MessageSquare },
  { name: 'Automatizaciones', href: '/automations', icon: Zap },
  { name: 'Llamadas IA', href: '/calls', icon: Phone },
]

export default function Layout() {
  const { searchOpen, setSearchOpen, notificationsOpen, setNotificationsOpen } = useUIStore()

  // Contador de notificaciones no leídas
  const { data: notificationStats } = useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await mockDelay(400)
        return mockNotificationStats
      }
      try {
        const response = await api.get('/notifications/stats')
        return response.data
      } catch {
        return mockNotificationStats
      }
    },
    refetchInterval: 60000,
  })

  const unreadCount = notificationStats?.unread ?? 0

  // Keyboard shortcut: Ctrl+K o Cmd+K → búsqueda global
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSearchOpen])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <span className="text-gray-800 font-bold text-sm">RS</span>
            </div>
            <span className="font-semibold text-lg text-gray-900">St4rtup CRM</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-brand'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-brand text-sm font-medium">D</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">David</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex-1 max-w-2xl">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-left"
            >
              <Search className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Buscar en todo el CRM...</span>
              <kbd className="ml-auto px-2 py-1 text-xs bg-white rounded border border-gray-300">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-4 ml-6">
            {/* Notificaciones */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Notificaciones"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-gray-800 text-[10px] font-bold px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {/* Settings */}
            <NavLink
              to="/settings"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  )
}
