import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CreditCard, ExternalLink, Receipt, Zap, ArrowRight } from 'lucide-react'
import api from '@/services/api'
import { useOrganization } from '@/hooks/useOrganization'
import { useThemeColors, fontDisplay, fontMono } from '@/utils/theme'



const PLAN_INFO = {
  starter: { name: 'Starter', price: '€0', color: '#94A3B8', features: ['1 usuario', '100 leads', 'Pipeline básico'] },
  growth: { name: 'Growth', price: '€19/mes', color: '#1E6FD9', features: ['3 usuarios', '5.000 leads', 'Marketing + IA + SEO'] },
  scale: { name: 'Scale', price: '€49/mes', color: '#8B5CF6', features: ['10 usuarios', 'Leads ilimitados', 'Deal Room + API + Todo'] },
}

export default function BillingPage() {
  const T = useThemeColors()
  const { org, plan, limits } = useOrganization()

  const { data: subscription } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => api.get('/billing/subscription').then(r => r.data),
  })

  const { data: invoices } = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: () => api.get('/billing/invoices').then(r => r.data),
  })

  const planInfo = PLAN_INFO[plan] || PLAN_INFO.starter

  async function openPortal() {
    try {
      const res = await api.get('/billing/portal-url')
      if (res.data?.portal_url) {
        window.open(res.data.portal_url, '_blank')
      } else {
        alert(res.data?.message || 'No hay suscripción activa para gestionar')
      }
    } catch { alert('Error al abrir el portal') }
  }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6" style={{ color: T.fg, fontFamily: fontDisplay }}>
        <CreditCard className="w-6 h-6" style={{ color: T.cyan }} /> Facturación
      </h1>

      {/* Current plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-xl p-6" style={{ backgroundColor: T.card, border: `2px solid ${planInfo.color}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 10, backgroundColor: `${planInfo.color}15`, color: planInfo.color, fontWeight: 700, textTransform: 'uppercase', fontFamily: fontMono }}>Plan actual</span>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: T.fg, fontFamily: fontDisplay, marginTop: 8 }}>{planInfo.name}</h2>
              <p style={{ fontSize: 20, fontWeight: 700, color: planInfo.color, fontFamily: fontMono }}>{planInfo.price}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {subscription?.status === 'trialing' && (
                <p style={{ fontSize: 12, color: T.warning, fontWeight: 600 }}>
                  Trial hasta {subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString('es-ES') : '—'}
                </p>
              )}
              {subscription?.current_period_end && (
                <p style={{ fontSize: 11, color: T.fgMuted, marginTop: 4 }}>
                  Próximo cobro: {new Date(subscription.current_period_end).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {planInfo.features.map(f => (
              <span key={f} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, backgroundColor: T.muted, color: T.fgMuted }}>{f}</span>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={openPortal} style={{ padding: '10px 20px', borderRadius: 10, backgroundColor: T.cyan, color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ExternalLink size={14} /> Gestionar suscripción
            </button>
            <Link to="/pricing" style={{ padding: '10px 20px', borderRadius: 10, backgroundColor: T.muted, color: T.fg, border: `1px solid ${T.border}`, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              Cambiar plan <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Usage */}
        <div className="rounded-xl p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16, fontFamily: fontDisplay }}>Uso actual</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span style={{ fontSize: 12, color: T.fgMuted }}>Usuarios</span>
                <span style={{ fontSize: 12, fontFamily: fontMono, color: T.fg }}>{org?.members || 1} / {limits.users}</span>
              </div>
              <div style={{ height: 6, backgroundColor: T.muted, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, ((org?.members || 1) / limits.users) * 100)}%`, height: '100%', backgroundColor: T.cyan, borderRadius: 3 }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span style={{ fontSize: 12, color: T.fgMuted }}>Leads</span>
                <span style={{ fontSize: 12, fontFamily: fontMono, color: T.fg }}>{org?.leads || 0} / {limits.leads === 999999 ? '∞' : limits.leads}</span>
              </div>
              <div style={{ height: 6, backgroundColor: T.muted, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, ((org?.leads || 0) / Math.max(limits.leads, 1)) * 100)}%`, height: '100%', backgroundColor: T.success, borderRadius: 3 }} />
              </div>
            </div>
          </div>
          <Link to="/app/marketplace" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.cyan, marginTop: 16, textDecoration: 'none', fontWeight: 600 }}>
            <Zap size={14} /> Ver add-ons disponibles
          </Link>
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
          <Receipt size={18} /> Historial de pagos
        </h3>
        {(invoices?.items || []).length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: `2px solid ${T.border}` }}>
              {['Fecha', 'Importe', 'Estado', 'Descripción', 'Recibo'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: T.fgMuted, fontWeight: 500, fontFamily: fontMono, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {invoices.items.map(inv => (
                <tr key={inv.id} style={{ borderBottom: `1px solid ${T.muted}` }}>
                  <td style={{ padding: '10px 12px', fontFamily: fontMono, color: T.fgMuted, fontSize: 12 }}>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('es-ES') : new Date(inv.created_at).toLocaleDateString('es-ES')}</td>
                  <td style={{ padding: '10px 12px', fontFamily: fontMono, fontWeight: 700, color: T.fg }}>€{(inv.amount_eur || 0).toFixed(2)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: inv.status === 'completed' ? '#10B98115' : inv.status === 'failed' ? '#EF444415' : '#F59E0B15', color: inv.status === 'completed' ? T.success : inv.status === 'failed' ? T.destructive : T.warning }}>{inv.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: T.fgMuted, fontSize: 12 }}>{inv.description || inv.provider}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {inv.receipt_url && <a href={inv.receipt_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.cyan, textDecoration: 'none' }}>Ver recibo ↗</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: T.fgMuted, fontSize: 13, textAlign: 'center', padding: 32 }}>Sin pagos registrados</p>
        )}
      </div>
    </div>
  )
}
