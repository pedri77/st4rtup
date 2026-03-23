import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, Calculator, Loader2, Zap, Building, Users, Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import Breadcrumbs from '@/components/Breadcrumbs'
import toast from 'react-hot-toast'
import { pricingApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#06B6D4', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const TIER_ICONS = { pilot_poc: Zap, enterprise: Building, smb: Users }
const TIER_COLORS = { pilot_poc: T.cyan, enterprise: T.purple, smb: T.success }

function TierCard({ tier }) {
  const Icon = TIER_ICONS[tier.slug] || DollarSign
  const color = TIER_COLORS[tier.slug] || T.fgMuted

  return (
    <div className="rounded-xl p-5 border" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ fontFamily: fontDisplay, color: T.fg }}>{tier.name}</h3>
          <p className="text-xs" style={{ color: T.fgMuted }}>{tier.description}</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Precio base</span><span className="font-bold" style={{ fontFamily: fontMono, color: T.fg }}>€{tier.base_price.toLocaleString('es-ES')}</span></div>
        <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Unidad</span><span style={{ color: T.fg }}>{tier.price_unit === 'fixed' ? 'Fijo' : tier.price_unit === 'month' ? '/mes' : '/año'}</span></div>
        {tier.duration_days && <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Duración</span><span style={{ fontFamily: fontMono, color: T.fg }}>{tier.duration_days} días</span></div>}
        {tier.min_price && <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Rango</span><span style={{ fontFamily: fontMono, color: T.fg }}>€{tier.min_price.toLocaleString('es-ES')} – €{tier.max_price?.toLocaleString('es-ES')}</span></div>}
        <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Coste infra/mes</span><span style={{ fontFamily: fontMono, color: T.fg }}>€{tier.infra_cost_monthly.toLocaleString('es-ES')}</span></div>
      </div>
      <div className="mt-3 pt-3 border-t" style={{ borderColor: `${T.border}80` }}>
        <p className="text-xs mb-1" style={{ color: T.fgMuted }}>Módulos incluidos:</p>
        <div className="flex flex-wrap gap-1">
          {(tier.modules_included || []).map(m => (
            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${T.cyan}18`, color: T.cyan }}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function PriceCalculator() {
  const [tier, setTier] = useState('pilot_poc')
  const [modules, setModules] = useState('')
  const [months, setMonths] = useState(12)
  const [discount, setDiscount] = useState(0)
  const [result, setResult] = useState(null)

  const calcMutation = useMutation({
    mutationFn: () => pricingApi.calculate({ tier_slug: tier, modules, duration_months: months, discount_pct: discount }).then(r => r.data),
    onSuccess: (data) => setResult(data),
  })

  return (
    <div className="rounded-xl p-5 border" style={{ backgroundColor: T.card, borderColor: T.border }}>
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4" style={{ fontFamily: fontDisplay, color: T.fg }}>
        <Calculator className="w-5 h-5" style={{ color: T.cyan }} /> Calculadora de Precio
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="pricing-field-1">Tier</label>
          <select id="pricing-field-1" value={tier} onChange={e => setTier(e.target.value)} className="input text-sm">
            <option value="pilot_poc">Pilot PoC</option>
            <option value="enterprise">Enterprise</option>
            <option value="smb">SMB</option>
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="pricing-field-2">Duración (meses)</label>
          <input id="pricing-field-2" type="number" value={months} onChange={e => setMonths(parseInt(e.target.value) || 12)} className="input text-sm" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="pricing-field-3">Módulos extra (coma)</label>
          <input id="pricing-field-3" type="text" value={modules} onChange={e => setModules(e.target.value)} placeholder="dora,soc,de" className="input text-sm" />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="pricing-field-4">Descuento (%)</label>
          <input id="pricing-field-4" type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="input text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => calcMutation.mutate()} disabled={calcMutation.isPending} className="btn-primary text-sm flex-1">
          {calcMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Calcular'}
        </button>
        <button onClick={() => { setResult(null); setTier('pilot_poc'); setModules(''); setMonths(12); setDiscount(0) }}
          className="btn-secondary text-sm px-4">Limpiar</button>
      </div>
      {result && (
        <div className="mt-4 rounded-lg p-3 space-y-1 text-sm" style={{ backgroundColor: `${T.bg}80` }}>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Subtotal</span><span style={{ fontFamily: fontMono, color: T.fg }}>€{result.subtotal.toLocaleString('es-ES')}</span></div>
          {result.module_surcharge > 0 && <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Módulos extra</span><span style={{ fontFamily: fontMono, color: T.fg }}>+€{result.module_surcharge.toLocaleString('es-ES')}</span></div>}
          {result.discount_amount > 0 && <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Descuento ({result.discount_pct}%)</span><span style={{ fontFamily: fontMono, color: T.destructive }}>-€{result.discount_amount.toLocaleString('es-ES')}</span></div>}
          <div className="flex justify-between border-t pt-1 mt-1" style={{ borderColor: T.border }}><span className="font-bold" style={{ color: T.fg }}>Precio final</span><span className="font-bold text-lg" style={{ fontFamily: fontMono, color: T.cyan }}>€{result.final_price.toLocaleString('es-ES')}</span></div>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Coste infra</span><span style={{ fontFamily: fontMono, color: T.fg }}>€{result.infra_cost.toLocaleString('es-ES')}</span></div>
          <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Margen bruto</span><span style={{ fontFamily: fontMono, color: result.margin_pct > 50 ? T.success : T.warning }}>€{result.gross_margin.toLocaleString('es-ES')} ({result.margin_pct}%)</span></div>
        </div>
      )}
    </div>
  )
}

export default function PricingPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['pricing-tiers'],
    queryFn: () => pricingApi.listTiers().then(r => r.data),
  })
  const { data: statsData } = useQuery({
    queryKey: ['pricing-stats'],
    queryFn: () => pricingApi.stats().then(r => r.data),
  })

  const seedMutation = useMutation({
    mutationFn: () => pricingApi.seed(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pricing-tiers'] }); toast.success('Tiers cargados') },
  })

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', slug: '', base_price: 0, price_unit: 'year', duration_days: null, infra_cost_monthly: 0, modules_included: '' })

  const createMutation = useMutation({
    mutationFn: (d) => pricingApi.createTier({ ...d, modules_included: d.modules_included ? d.modules_included.split(',').map(m => m.trim()) : [] }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pricing-tiers'] }); toast.success('Tier creado'); setShowAdd(false) },
    onError: () => toast.error('Error al crear'),
  })

  const tiers = data?.tiers || []
  const stats = statsData || {}

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Breadcrumbs items={[{ label: "GTM", href: "/gtm" }, { label: "Pricing Engine" }]} />
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <DollarSign className="w-7 h-7" style={{ color: T.cyan }} /> Pricing Engine
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Nuevo Tier</button>
          {tiers.length === 0 && <button onClick={() => seedMutation.mutate()} className="btn-secondary text-sm">Cargar defaults</button>}
        </div>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: T.cyan }}>€{(stats.total_revenue || 0).toLocaleString('es-ES')}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Revenue total</p>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: T.fg }}>{stats.total_deals_with_tier || 0}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Deals con tier</p>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: T.success }}>{stats.total_won || 0}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Cerrados</p>
        </div>
        <div className="rounded-xl p-3 text-center border" style={{ backgroundColor: T.card, borderColor: T.border }}>
          <p className="text-xl font-bold" style={{ fontFamily: fontMono, color: T.warning }}>{stats.deals_without_tier || 0}</p>
          <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>Sin tier asignado</p>
        </div>
      </div>

      {/* How it works */}
      <details className="rounded-xl border" style={{ backgroundColor: `${T.card}50`, borderColor: `${T.border}80` }}>
        <summary className="p-4 text-sm cursor-pointer" style={{ color: T.fgMuted }}>¿Cómo funciona el Pricing Engine?</summary>
        <div className="px-4 pb-4 text-xs space-y-2" style={{ color: T.fgMuted }}>
          <p>Cada oportunidad del pipeline puede tener un <strong style={{ color: T.fg }}>tier de pricing</strong> asignado (Pilot PoC, Enterprise, SMB).</p>
          <p>Al seleccionar tier + módulos + descuento, el sistema calcula automáticamente el <strong style={{ color: T.fg }}>precio final y margen bruto</strong>.</p>
          <p>Estos datos alimentan las propuestas de <strong style={{ color: T.cyan }}>AGENT-PROPOSAL-001</strong> y el <strong style={{ color: T.cyan }}>GTM Dashboard</strong>.</p>
        </div>
      </details>

      {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: T.cyan }} /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map(t => <TierCard key={t.id} tier={t} />)}
          </div>

          {/* Revenue by tier */}
          {stats.by_tier?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: fontDisplay, color: T.fg }}>Impacto por tier</h3>
              <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: T.card, borderColor: T.border }}>
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs" style={{ borderColor: T.border, color: T.fgMuted }}>
                    <th className="text-left p-3" style={{ fontFamily: fontMono }}>Tier</th><th className="text-right p-3" style={{ fontFamily: fontMono }}>Deals</th><th className="text-right p-3" style={{ fontFamily: fontMono }}>Won</th><th className="text-right p-3" style={{ fontFamily: fontMono }}>Win Rate</th><th className="text-right p-3" style={{ fontFamily: fontMono }}>Revenue</th><th className="text-right p-3" style={{ fontFamily: fontMono }}>Margen</th>
                  </tr></thead>
                  <tbody>{stats.by_tier.map((t, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: `${T.border}80` }}>
                      <td className="p-3 font-medium" style={{ color: T.cyan }}>{t.tier}</td>
                      <td className="p-3 text-right" style={{ fontFamily: fontMono, color: T.fg }}>{t.deals}</td>
                      <td className="p-3 text-right" style={{ fontFamily: fontMono, color: T.success }}>{t.won}</td>
                      <td className="p-3 text-right" style={{ fontFamily: fontMono, color: T.fg }}>{t.win_rate}%</td>
                      <td className="p-3 text-right font-medium" style={{ fontFamily: fontMono, color: T.fg }}>€{t.revenue.toLocaleString('es-ES')}</td>
                      <td className="p-3 text-right" style={{ fontFamily: fontMono, color: T.fg }}>{t.avg_margin}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}

          <PriceCalculator />
        </>
      )}

      {/* Add Tier Modal */}
      {showAdd && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={() => setShowAdd(false)}>
          <div className="rounded-xl p-6 w-full max-w-md border" style={{ backgroundColor: T.bg, borderColor: T.border }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Nuevo Tier / Producto</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5" style={{ color: T.fgMuted }} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre (ej: Enterprise Plus)" className="input text-sm" />
              <input type="text" value={addForm.slug} onChange={e => setAddForm(f => ({ ...f, slug: e.target.value }))} placeholder="Slug (ej: enterprise_plus)" className="input text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="pricing-field-5">Precio base (€)</label>
                  <input id="pricing-field-5" type="number" value={addForm.base_price} onChange={e => setAddForm(f => ({ ...f, base_price: parseFloat(e.target.value) || 0 }))} className="input text-sm" />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="pricing-field-6">Unidad</label>
                  <select id="pricing-field-6" value={addForm.price_unit} onChange={e => setAddForm(f => ({ ...f, price_unit: e.target.value }))} className="input text-sm">
                    <option value="year">Por año</option>
                    <option value="month">Por mes</option>
                    <option value="fixed">Fijo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="pricing-field-7">Duración (días, opcional)</label>
                  <input id="pricing-field-7" type="number" value={addForm.duration_days || ''} onChange={e => setAddForm(f => ({ ...f, duration_days: parseInt(e.target.value) || null }))} placeholder="90" className="input text-sm" />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="pricing-field-8">Coste infra/mes (€)</label>
                  <input id="pricing-field-8" type="number" value={addForm.infra_cost_monthly} onChange={e => setAddForm(f => ({ ...f, infra_cost_monthly: parseFloat(e.target.value) || 0 }))} className="input text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="pricing-field-9">Módulos incluidos (separados por coma)</label>
                <input id="pricing-field-9" type="text" value={addForm.modules_included} onChange={e => setAddForm(f => ({ ...f, modules_included: e.target.value }))} placeholder="grc_core, ens_alto, nis2, soc" className="input text-sm" />
              </div>
              <button onClick={() => addForm.name && addForm.slug && createMutation.mutate(addForm)} disabled={!addForm.name || !addForm.slug || createMutation.isPending}
                className="btn-primary w-full text-sm">{createMutation.isPending ? 'Creando...' : 'Crear Tier'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
