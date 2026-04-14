import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Globe, BarChart3, Eye, MousePointerClick,
  ExternalLink, Pause, Play, Archive, Search, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { landingsApi } from '@/services/api'
import { useThemeColors, fontDisplay } from '@/utils/theme'



const STATUS_CONFIG = {
  active:   { label: 'Activa',    bg: 'hsla(142,71%,45%,0.15)', color: '#10B981', icon: Play },
  paused:   { label: 'Pausada',   bg: 'hsla(38,92%,50%,0.15)',  color: '#F59E0B', icon: Pause },
  archived: { label: 'Archivada', bg: 'hsla(220,9%,46%,0.12)',  color: '#64748B', icon: Archive },
}

const INITIAL_FORM = {
  name: '',
  url: '',
  campaign_id: '',
  clarity_project_id: '',
}

export default function LandingsManagerPage() {
  const T = useThemeColors()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)

  const queryParams = {
    ...(statusFilter && { status: statusFilter }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['landings', queryParams],
    queryFn: () => landingsApi.list(queryParams).then(r => r.data),
  })

  const landings = data?.landings ?? []

  const filtered = landings.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return l.name?.toLowerCase().includes(q) || l.url?.toLowerCase().includes(q)
  })

  // KPI calculations
  const totalLandings = landings.length
  const totalVisits = landings.reduce((s, l) => s + (l.visits || 0), 0)
  const totalConversions = landings.reduce((s, l) => s + (l.conversions || 0), 0)
  const avgConvRate = landings.length
    ? (landings.reduce((s, l) => s + (l.conv_rate || 0), 0) / landings.length).toFixed(2)
    : '0.00'

  const createMutation = useMutation({
    mutationFn: (payload) => landingsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landings'] })
      toast.success('Landing creada')
      setShowModal(false)
      setForm(INITIAL_FORM)
    },
    onError: () => toast.error('Error al crear landing'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.url) {
      toast.error('Nombre y URL son obligatorios')
      return
    }
    const payload = {
      name: form.name,
      url: form.url,
      campaign_id: form.campaign_id || null,
      clarity_project_id: form.clarity_project_id || null,
    }
    createMutation.mutate(payload)
  }

  const kpis = [
    { label: 'Total landings', value: totalLandings, icon: Globe, color: T.primary },
    { label: 'Visitas totales', value: totalVisits.toLocaleString(), icon: Eye, color: T.accent },
    { label: 'Conversiones', value: totalConversions.toLocaleString(), icon: MousePointerClick, color: T.success },
    { label: 'Conv. rate medio', value: `${avgConvRate}%`, icon: BarChart3, color: T.warning },
  ]

  const statusTabs = [
    { key: '', label: 'Todas' },
    { key: 'active', label: 'Activas' },
    { key: 'paused', label: 'Pausadas' },
    { key: 'archived', label: 'Archivadas' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: T.bg, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ ...fontDisplay, fontSize: 24, fontWeight: 700, color: T.fg, margin: 0 }}>
          Landings
        </h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            backgroundColor: T.primary, color: '#fff', cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
          }}
        >
          <Plus size={16} /> Nueva landing
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            backgroundColor: T.card, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              backgroundColor: `${k.color}18`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <k.icon size={20} style={{ color: k.color }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: T.fgMuted, marginBottom: 2 }}>{k.label}</div>
              <div style={{ ...fontDisplay, fontSize: 22, fontWeight: 700, color: T.fg }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20,
        backgroundColor: T.card, border: `1px solid ${T.border}`,
        borderRadius: 10, padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ color: T.fgMuted }} />
          <input
            type="text"
            placeholder="Buscar por nombre o URL..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none',
              backgroundColor: 'transparent', color: T.fg, fontSize: 14,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.fgMuted }}>
              <X size={14} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                backgroundColor: statusFilter === tab.key ? T.primary : 'transparent',
                color: statusFilter === tab.key ? '#fff' : T.fgMuted,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Landings grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.fgMuted }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
        }}>
          <Globe size={40} style={{ color: T.fgMuted, marginBottom: 12 }} />
          <p style={{ color: T.fgMuted, margin: 0 }}>No hay landings{search ? ' que coincidan con la busqueda' : ''}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(landing => {
            const sc = STATUS_CONFIG[landing.status] || STATUS_CONFIG.active
            const StatusIcon = sc.icon
            return (
              <div key={landing.id} style={{
                backgroundColor: T.card, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {/* Name + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ ...fontDisplay, fontSize: 16, fontWeight: 600, color: T.fg, margin: 0 }}>
                    {landing.name}
                  </h3>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 20,
                    backgroundColor: sc.bg, color: sc.color,
                    fontSize: 12, fontWeight: 600,
                  }}>
                    <StatusIcon size={12} />
                    {sc.label}
                  </span>
                </div>

                {/* URL */}
                <a
                  href={landing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    color: T.primary, fontSize: 13, textDecoration: 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  <ExternalLink size={13} />
                  {landing.url}
                </a>

                {/* Metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Visitas', value: (landing.visits || 0).toLocaleString(), icon: Eye },
                    { label: 'Conversiones', value: (landing.conversions || 0).toLocaleString(), icon: MousePointerClick },
                    { label: 'Conv. rate', value: `${(landing.conv_rate || 0).toFixed(2)}%`, icon: BarChart3 },
                    { label: 'Bounce rate', value: `${(landing.bounce_rate || 0).toFixed(1)}%`, icon: BarChart3 },
                  ].map(m => (
                    <div key={m.label} style={{
                      backgroundColor: T.muted, borderRadius: 8, padding: '8px 10px',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <m.icon size={14} style={{ color: T.fgMuted }} />
                      <div>
                        <div style={{ fontSize: 11, color: T.fgMuted }}>{m.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.fg }}>{m.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: T.card, borderRadius: 14, padding: 28,
              width: '100%', maxWidth: 480, border: `1px solid ${T.border}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ ...fontDisplay, fontSize: 18, fontWeight: 700, color: T.fg, margin: 0 }}>
                Nueva landing
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.fgMuted }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'name', label: 'Nombre', placeholder: 'Ej: Landing Webinar ENS', required: true },
                { key: 'url', label: 'URL', placeholder: 'https://riskitera.com/webinar', required: true },
                { key: 'campaign_id', label: 'Campaign ID (opcional)', placeholder: 'UUID de la campana' },
                { key: 'clarity_project_id', label: 'Clarity Project ID (opcional)', placeholder: 'ID de Microsoft Clarity' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: T.fg, marginBottom: 4 }}>
                    {f.label} {f.required && <span style={{ color: T.destructive }}>*</span>}
                  </label>
                  <input
                    type="text"
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${T.border}`, backgroundColor: T.bg,
                      color: T.fg, fontSize: 14, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px', borderRadius: 8,
                    border: `1px solid ${T.border}`, backgroundColor: 'transparent',
                    color: T.fg, cursor: 'pointer', fontSize: 14,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    backgroundColor: T.primary, color: '#fff', cursor: 'pointer',
                    fontSize: 14, fontWeight: 600,
                    opacity: createMutation.isPending ? 0.6 : 1,
                  }}
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear landing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
