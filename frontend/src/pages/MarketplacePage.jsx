import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Check, Lock, Zap } from 'lucide-react'
import featuresMatrix from '@/data/features-matrix.json'
import { useOrganization } from '@/hooks/useOrganization'

const T = { bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B', cyan: '#1E6FD9', success: '#10B981', warning: '#F59E0B' }
const fontDisplay = "'Rajdhani', sans-serif"

const PLAN_RANK = { starter: 0, growth: 1, scale: 2, enterprise: 3 }

export default function MarketplacePage() {
  const { org, plan } = useOrganization()
  const userRank = PLAN_RANK[plan] || 0
  const [filter, setFilter] = useState('all')
  const activeAddons = org?.settings?.addons || []

  const categories = featuresMatrix.categories
  const addons = featuresMatrix.addons || []

  function getFeatureStatus(f) {
    const planValue = f[plan] || f.starter
    if (planValue === true) return 'included'
    if (typeof planValue === 'string') return 'limited'
    // Check if available in higher plan
    if (f.growth === true || f.scale === true) return 'locked'
    return 'locked'
  }

  function getRequiredPlan(f) {
    if (f.growth === true && userRank < 1) return 'Growth'
    if (f.scale === true && userRank < 2) return 'Scale'
    return 'Scale'
  }

  const allFeatures = categories.flatMap(c => c.features.map(f => ({ ...f, category: c.name })))
  const filtered = filter === 'all' ? allFeatures
    : filter === 'included' ? allFeatures.filter(f => getFeatureStatus(f) === 'included' || getFeatureStatus(f) === 'limited')
    : allFeatures.filter(f => getFeatureStatus(f) === 'locked')

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <ShoppingBag className="w-6 h-6" style={{ color: T.cyan }} /> Marketplace
          </h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Tu plan: <strong style={{ color: T.cyan }}>{plan?.charAt(0).toUpperCase() + plan?.slice(1)}</strong> — {filtered.filter(f => getFeatureStatus(f) === 'included' || getFeatureStatus(f) === 'limited').length} funcionalidades activas</p>
        </div>
        <div className="flex gap-2">
          {['all', 'included', 'locked'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              backgroundColor: filter === f ? T.cyan : T.muted, color: filter === f ? 'white' : T.fgMuted,
            }}>{f === 'all' ? 'Todas' : f === 'included' ? 'Activas' : 'Bloqueadas'}</button>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {filtered.map(f => {
          const status = getFeatureStatus(f)
          return (
            <div key={f.id} className="rounded-xl p-4" style={{
              backgroundColor: T.card, border: `1px solid ${T.border}`,
              opacity: status === 'locked' ? 0.7 : 1,
            }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm" style={{ color: T.fg }}>{f.name}</h3>
                {status === 'included' ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#10B98115', color: T.success }}>
                    <Check size={12} /> Incluido
                  </span>
                ) : status === 'limited' ? (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F59E0B15', color: T.warning }}>
                    {f[plan]}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#64748B15', color: T.fgMuted }}>
                    <Lock size={10} /> {getRequiredPlan(f)}
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: T.fgMuted }}>{f.desc}</p>
              <p className="text-xs mt-2" style={{ color: T.fgMuted, opacity: 0.7 }}>{f.category}</p>
            </div>
          )
        })}
      </div>

      {/* Add-ons */}
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
        <Zap className="w-5 h-5" style={{ color: T.warning }} /> Add-ons disponibles
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {addons.map(a => {
          const isActive = activeAddons.includes(a.id)
          return (
          <div key={a.id} className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${isActive ? T.success : T.border}` }}>
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold" style={{ color: T.fg }}>{a.name}</h3>
              {isActive && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: '#10B98115', color: T.success, fontWeight: 600 }}>✓ Activo</span>}
            </div>
            <p className="text-xs mb-2" style={{ color: T.fgMuted }}>{a.desc}</p>
            <Link to="/app/docs" style={{ fontSize: 11, color: T.cyan, textDecoration: 'none', marginBottom: 8, display: 'inline-block' }}>📖 Ver documentación</Link>
            <div className="flex items-center justify-between">
              <span className="font-bold" style={{ color: isActive ? T.success : T.cyan }}>{isActive ? 'Incluido' : `€${a.price_monthly}/mes`}</span>
              {!isActive && <button onClick={async () => {
                try {
                  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.st4rtup.com/api/v1'
                  const orgId = org?.org_id || ''
                  const res = await fetch(`${apiUrl}/payments/public/checkout?plan=${a.id}&email=&org_id=${orgId}`, { method: 'POST' })
                  const data = await res.json()
                  if (data.checkout_url) window.location.href = data.checkout_url
                  else alert('Contacta con soporte para activar este add-on')
                } catch { alert('Error de conexión') }
              }} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: T.cyan, color: 'white', border: 'none', cursor: 'pointer' }}>
                Comprar
              </button>}
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
