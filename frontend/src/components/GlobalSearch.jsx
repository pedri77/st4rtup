import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, X, TrendingUp, Mail, Calendar, Target, FileText, Award } from 'lucide-react'
import { leadsApi, emailsApi, actionsApi, opportunitiesApi, visitsApi } from '@/services/api'
import { mockLeads, USE_MOCK_DATA } from '@/mocks/mockData'
import { useThemeColors } from '@/utils/theme'


const categoryIcons = {
  leads: TrendingUp, emails: Mail, actions: Calendar,
  opportunities: Target, visits: FileText, reviews: Award,
}

export default function GlobalSearch({ isOpen, onClose }) {
  const T = useThemeColors()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (query.length < 2) return { leads: [], emails: [], actions: [], opportunities: [], visits: [] }

      if (USE_MOCK_DATA) {
        const searchLower = query.toLowerCase()
        const leads = mockLeads.items
          .filter(lead =>
            lead.company_name.toLowerCase().includes(searchLower) ||
            lead.contact_name?.toLowerCase().includes(searchLower) ||
            lead.contact_email?.toLowerCase().includes(searchLower)
          ).slice(0, 5)
        return { leads, emails: [], actions: [], opportunities: [], visits: [] }
      }

      try {
        const [leads, emails, actions, opportunities, visits] = await Promise.all([
          leadsApi.list({ search: query, page_size: 5 }).then(r => r.data.items || []).catch(() => []),
          emailsApi.list({ search: query, page_size: 5 }).then(r => r.data.items || []).catch(() => []),
          actionsApi.list({ search: query, page_size: 5 }).then(r => r.data.items || []).catch(() => []),
          opportunitiesApi.list({ search: query, page_size: 5 }).then(r => r.data.items || []).catch(() => []),
          visitsApi.list({ search: query, page_size: 5 }).then(r => r.data.items || []).catch(() => []),
        ])
        return { leads, emails, actions, opportunities, visits }
      } catch {
        return { leads: mockLeads.items.slice(0, 5), emails: [], actions: [], opportunities: [], visits: [] }
      }
    },
    enabled: isOpen && query.length >= 2,
  })

  const allResults = results ? [
    ...results.leads.map(item => ({ ...item, type: 'leads', label: item.company_name })),
    ...results.emails.map(item => ({ ...item, type: 'emails', label: item.subject })),
    ...results.actions.map(item => ({ ...item, type: 'actions', label: item.title })),
    ...results.opportunities.map(item => ({ ...item, type: 'opportunities', label: item.name })),
    ...results.visits.map(item => ({ ...item, type: 'visits', label: `Visita - ${item.visit_date}` })),
  ] : []

  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus() }, [isOpen])
  useEffect(() => { if (!isOpen) { setQuery(''); setSelectedIndex(0) } }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)) }
      else if (e.key === 'Enter' && allResults[selectedIndex]) { e.preventDefault(); handleSelect(allResults[selectedIndex]) }
      else if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, allResults])

  const handleSelect = (item) => {
    const routes = { leads: `/leads/${item.id}`, emails: `/emails`, actions: `/actions`, opportunities: `/pipeline`, visits: `/visits` }
    navigate(routes[item.type])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" style={{ backgroundColor: 'hsla(220,60%,2%,0.7)' }}>
      <div className="w-full max-w-2xl mx-4 overflow-hidden rounded-xl shadow-2xl"
        style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
          <Search className="w-5 h-5" style={{ color: T.fgMuted }} />
          <input
            ref={inputRef} id="global-search" name="global-search" type="text"
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar leads, emails, acciones, oportunidades..."
            className="flex-1 outline-none text-base bg-transparent"
            style={{ color: T.fg }}
            aria-label="Buscar leads, emails, acciones, oportunidades"
          />
          {query && (
            <button aria-label="Cerrar" onClick={() => setQuery('')} style={{ color: T.fgMuted }}>
              <X className="w-5 h-5" />
            </button>
          )}
          <kbd className="px-2 py-1 text-xs rounded" style={{ backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}` }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading && query.length >= 2 && (
            <div className="p-8 text-center" style={{ color: T.fgMuted }}>
              <div className="inline-block animate-spin rounded-full h-8 w-8 mb-2" style={{ borderBottom: `2px solid ${T.cyan}` }} />
              <p className="mt-2">Buscando...</p>
            </div>
          )}

          {!isLoading && query.length < 2 && (
            <div className="p-8 text-center" style={{ color: T.fgMuted }}>
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Escribe al menos 2 caracteres para buscar</p>
              <p className="text-xs mt-2 opacity-70">Busca en leads, emails, acciones, oportunidades y visitas</p>
            </div>
          )}

          {!isLoading && query.length >= 2 && allResults.length === 0 && (
            <div className="p-8 text-center" style={{ color: T.fgMuted }}>
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No se encontraron resultados</p>
              <p className="text-sm mt-1 opacity-70">Intenta con otros terminos de busqueda</p>
            </div>
          )}

          {!isLoading && allResults.length > 0 && (
            <div className="py-2">
              {Object.entries(results).map(([category, items]) => {
                if (items.length === 0) return null
                const Icon = categoryIcons[category]
                const categoryLabels = { leads: 'Leads', emails: 'Emails', actions: 'Acciones', opportunities: 'Oportunidades', visits: 'Visitas' }

                return (
                  <div key={category} className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold uppercase flex items-center gap-2"
                      style={{ color: T.fgMuted, borderBottom: `1px solid ${T.border}` }}>
                      <Icon className="w-4 h-4" />
                      {categoryLabels[category]}
                    </div>
                    {items.map((item) => {
                      const globalIndex = allResults.findIndex(r => r.id === item.id && r.type === category)
                      const isSelected = globalIndex === selectedIndex

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect({ ...item, type: category })}
                          className="w-full px-4 py-3 text-left transition-colors"
                          style={{ backgroundColor: isSelected ? `${T.cyan}10` : 'transparent' }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate" style={{ color: T.fg }}>
                                {category === 'leads' && item.company_name}
                                {category === 'emails' && item.subject}
                                {category === 'actions' && item.title}
                                {category === 'opportunities' && item.name}
                                {category === 'visits' && `Visita - ${new Date(item.visit_date).toLocaleDateString('es-ES')}`}
                              </p>
                              {category === 'leads' && item.contact_email && (
                                <p className="text-sm truncate" style={{ color: T.fgMuted }}>{item.contact_email}</p>
                              )}
                              {category === 'emails' && item.to_email && (
                                <p className="text-sm truncate" style={{ color: T.fgMuted }}>Para: {item.to_email}</p>
                              )}
                              {category === 'actions' && (
                                <p className="text-sm" style={{ color: T.fgMuted }}>Vence: {new Date(item.due_date).toLocaleDateString('es-ES')}</p>
                              )}
                              {category === 'opportunities' && item.value && (
                                <p className="text-sm" style={{ color: T.fgMuted }}>{item.value.toLocaleString('es-ES')} EUR</p>
                              )}
                            </div>
                            {isSelected && (
                              <kbd className="px-2 py-1 text-xs rounded" style={{ backgroundColor: T.muted, color: T.fgMuted, border: `1px solid ${T.border}` }}>Enter</kbd>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {allResults.length > 0 && (
          <div className="px-4 py-2 text-xs flex items-center justify-between"
            style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.muted, color: T.fgMuted }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>Up</kbd>
                <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>Down</kbd>
                <span className="ml-1">Navegar</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>Enter</kbd>
                <span className="ml-1">Abrir</span>
              </div>
            </div>
            <span>{allResults.length} resultados</span>
          </div>
        )}
      </div>
    </div>
  )
}
