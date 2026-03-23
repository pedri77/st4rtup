import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard, Receipt, FileText, DollarSign, TrendingUp, Users,
  Clock, Plus, ExternalLink, ChevronLeft, ChevronRight, X, RefreshCw,
  Check, AlertTriangle, Ban, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentsApi } from '@/services/api'

/* ── Design tokens ─────────────────────────────────────────────────── */
const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#06B6D4', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

/* ── Helpers ───────────────────────────────────────────────────────── */
const fmt = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

function statusColor(status) {
  switch (status) {
    case 'completed': case 'paid': return T.success
    case 'pending': return T.warning
    case 'failed': return T.destructive
    case 'refunded': case 'cancelled': return T.fgMuted
    default: return T.fgMuted
  }
}

function providerColor(provider) {
  if (provider === 'stripe') return T.purple
  if (provider === 'paypal') return T.cyan
  return T.fgMuted
}

function Badge({ children, color }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {children}
    </span>
  )
}

function KpiCard({ icon: Icon, label, value, color = T.cyan }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.fgMuted }}>{label}</p>
          <p className="text-xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>{value}</p>
        </div>
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder, required, ...rest }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wider" style={{ color: T.fgMuted }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
        style={{
          backgroundColor: T.muted, color: T.fg, border: `1px solid ${T.border}`,
          fontFamily: type === 'number' ? fontMono : 'inherit',
        }}
        {...rest}
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options, required }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wider" style={{ color: T.fgMuted }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors appearance-none"
        style={{ backgroundColor: T.muted, color: T.fg, border: `1px solid ${T.border}` }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function Btn({ children, onClick, variant = 'primary', disabled, type = 'button', className = '' }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50'
  const styles = variant === 'primary'
    ? { background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})`, color: '#fff' }
    : variant === 'destructive'
      ? { backgroundColor: `${T.destructive}20`, color: T.destructive, border: `1px solid ${T.destructive}40` }
      : { backgroundColor: T.muted, color: T.fg, border: `1px solid ${T.border}` }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${className}`} style={styles}>
      {children}
    </button>
  )
}

/* ── Tab: Pagos ────────────────────────────────────────────────────── */
function PagosTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 15

  const [form, setForm] = useState({
    provider: 'stripe', amount: '', email: '', description: '', type: 'one_time',
  })

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['payments', 'stats'],
    queryFn: async () => { const r = await paymentsApi.stats(); return r.data },
  })

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['payments', 'list', page],
    queryFn: async () => { const r = await paymentsApi.list({ page, page_size: pageSize }); return r.data },
  })

  const checkoutMut = useMutation({
    mutationFn: (params) => paymentsApi.checkout(params),
    onSuccess: (res) => {
      const url = res.data?.checkout_url || res.data?.url
      if (url) window.location.href = url
      else toast.error('No se recibi\u00f3 URL de checkout')
    },
    onError: () => toast.error('Error al crear sesi\u00f3n de Stripe'),
  })

  const paypalMut = useMutation({
    mutationFn: (params) => paymentsApi.paypalOrder(params),
    onSuccess: (res) => {
      const url = res.data?.approval_url || res.data?.url
      if (url) window.location.href = url
      else toast.error('No se recibi\u00f3 URL de PayPal')
    },
    onError: () => toast.error('Error al crear orden de PayPal'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const params = {
      amount: parseFloat(form.amount),
      currency: 'eur',
      customer_email: form.email,
      description: form.description,
      payment_type: form.type,
    }
    if (form.provider === 'stripe') checkoutMut.mutate(params)
    else paypalMut.mutate(params)
  }

  const payments = paymentsData?.items || paymentsData || []
  const totalPages = paymentsData?.total_pages || 1
  const isBusy = checkoutMut.isPending || paypalMut.isPending

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="Revenue total" value={loadingStats ? '...' : fmt(stats?.total_revenue)} color={T.success} />
        <KpiCard icon={TrendingUp} label="MRR" value={loadingStats ? '...' : fmt(stats?.mrr)} color={T.cyan} />
        <KpiCard icon={Users} label="Suscripciones activas" value={loadingStats ? '...' : (stats?.active_subscriptions ?? 0)} color={T.purple} />
        <KpiCard icon={Clock} label="Facturas pendientes" value={loadingStats ? '...' : (stats?.pending_invoices ?? 0)} color={T.warning} />
      </div>

      {/* New payment form toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Historial de pagos</h3>
        <Btn onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Nuevo cobro'}
        </Btn>
      </div>

      {/* New payment form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl p-5 space-y-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: T.cyan }}>Nuevo cobro</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SelectField
              label="Proveedor"
              value={form.provider}
              onChange={(v) => setForm({ ...form, provider: v })}
              options={[
                { value: 'stripe', label: 'Stripe' },
                { value: 'paypal', label: 'PayPal' },
              ]}
              required
            />
            <InputField label="Importe (EUR)" type="number" step="0.01" min="0.50" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} placeholder="99.00" required />
            <InputField label="Email cliente" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="cliente@empresa.com" required />
            <InputField label="Descripci\u00f3n" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Licencia St4rtup Pro" required />
            <SelectField
              label="Tipo"
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v })}
              options={[
                { value: 'one_time', label: 'Pago \u00fanico' },
                { value: 'subscription', label: 'Suscripci\u00f3n' },
              ]}
              required
            />
          </div>
          <div className="flex justify-end">
            <Btn type="submit" disabled={isBusy}>
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {form.provider === 'stripe' ? 'Pagar con Stripe' : 'Pagar con PayPal'}
            </Btn>
          </div>
        </form>
      )}

      {/* Payments table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: T.fg }}>
            <thead>
              <tr style={{ backgroundColor: T.muted }}>
                {['Fecha', 'Cliente', 'Importe', 'Proveedor', 'Estado', 'Recibo'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: T.fgMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingPayments ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: T.fgMuted }}>
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Cargando...
                </td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: T.fgMuted }}>
                  No hay pagos registrados
                </td></tr>
              ) : payments.map((p, i) => (
                <tr key={p.id || i} className="transition-colors" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: i % 2 === 0 ? 'transparent' : `${T.muted}50` }}>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: fontMono, fontSize: '12px' }}>{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3">{p.customer_email || p.customer || '-'}</td>
                  <td className="px-4 py-3 font-bold" style={{ fontFamily: fontMono }}>{fmt(p.amount)}</td>
                  <td className="px-4 py-3"><Badge color={providerColor(p.provider)}>{p.provider || '-'}</Badge></td>
                  <td className="px-4 py-3"><Badge color={statusColor(p.status)}>{p.status || '-'}</Badge></td>
                  <td className="px-4 py-3">
                    {p.receipt_url ? (
                      <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: T.cyan }}>
                        <ExternalLink className="w-3 h-3" /> Ver
                      </a>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.muted }}>
            <span className="text-xs" style={{ color: T.fgMuted }}>P\u00e1gina {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: T.fgMuted, backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: T.fgMuted, backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Tab: Planes ───────────────────────────────────────────────────── */
function PlanesTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', price: '', interval: 'month', features: '', trial_days: '0', max_users: '', max_leads: '',
  })

  const { data: plans, isLoading } = useQuery({
    queryKey: ['payments', 'plans'],
    queryFn: async () => { const r = await paymentsApi.plans(); return r.data },
  })

  const createMut = useMutation({
    mutationFn: (data) => paymentsApi.createPlan(data),
    onSuccess: () => {
      toast.success('Plan creado')
      queryClient.invalidateQueries({ queryKey: ['payments', 'plans'] })
      setShowForm(false)
      setForm({ name: '', price: '', interval: 'month', features: '', trial_days: '0', max_users: '', max_leads: '' })
    },
    onError: () => toast.error('Error al crear plan'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createMut.mutate({
      name: form.name,
      price: parseFloat(form.price),
      interval: form.interval,
      features: form.features.split(',').map((f) => f.trim()).filter(Boolean),
      trial_days: parseInt(form.trial_days) || 0,
      max_users: form.max_users ? parseInt(form.max_users) : null,
      max_leads: form.max_leads ? parseInt(form.max_leads) : null,
    })
  }

  const plansList = Array.isArray(plans) ? plans : plans?.items || []

  const intervalLabel = { month: 'Mensual', year: 'Anual', one_time: 'Pago \u00fanico' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Planes de precio</h3>
        <Btn onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Nuevo plan'}
        </Btn>
      </div>

      {/* New plan form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl p-5 space-y-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: T.cyan }}>Nuevo plan</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InputField label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Pro" required />
            <InputField label="Precio (EUR)" type="number" step="0.01" min="0" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="99.00" required />
            <SelectField
              label="Intervalo"
              value={form.interval}
              onChange={(v) => setForm({ ...form, interval: v })}
              options={[
                { value: 'month', label: 'Mensual' },
                { value: 'year', label: 'Anual' },
                { value: 'one_time', label: 'Pago \u00fanico' },
              ]}
              required
            />
            <InputField label="Features (separadas por coma)" value={form.features} onChange={(v) => setForm({ ...form, features: v })} placeholder="Leads ilimitados, Soporte 24/7" />
            <InputField label="D\u00edas de prueba" type="number" min="0" value={form.trial_days} onChange={(v) => setForm({ ...form, trial_days: v })} />
            <InputField label="M\u00e1x. usuarios" type="number" min="1" value={form.max_users} onChange={(v) => setForm({ ...form, max_users: v })} placeholder="Ilimitado" />
            <InputField label="M\u00e1x. leads" type="number" min="1" value={form.max_leads} onChange={(v) => setForm({ ...form, max_leads: v })} placeholder="Ilimitado" />
          </div>
          <div className="flex justify-end">
            <Btn type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear plan
            </Btn>
          </div>
        </form>
      )}

      {/* Plans grid */}
      {isLoading ? (
        <div className="text-center py-12" style={{ color: T.fgMuted }}>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Cargando planes...
        </div>
      ) : plansList.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.fgMuted }}>
          No hay planes creados
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plansList.map((plan, i) => (
            <div key={plan.id || i} className="rounded-xl p-5 space-y-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>{plan.name}</h4>
                <Badge color={plan.active !== false ? T.success : T.fgMuted}>
                  {plan.active !== false ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold" style={{ fontFamily: fontMono, color: T.cyan }}>{fmt(plan.price)}</span>
                <span className="text-xs" style={{ color: T.fgMuted }}>/ {intervalLabel[plan.interval] || plan.interval}</span>
              </div>
              {plan.trial_days > 0 && (
                <p className="text-xs" style={{ color: T.warning }}>{plan.trial_days} d\u00edas de prueba gratis</p>
              )}
              {plan.features && plan.features.length > 0 && (
                <ul className="space-y-1">
                  {(Array.isArray(plan.features) ? plan.features : []).map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs" style={{ color: T.fg }}>
                      <Check className="w-3 h-3 flex-shrink-0" style={{ color: T.success }} /> {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-4 text-xs pt-1" style={{ color: T.fgMuted }}>
                {plan.max_users && <span>Max usuarios: {plan.max_users}</span>}
                {plan.max_leads && <span>Max leads: {plan.max_leads}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Tab: Facturas ─────────────────────────────────────────────────── */
function FacturasTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    customer_email: '', customer_name: '', cif_nif: '', amount: '', description: '', due_days: '30', tax_rate: '21',
  })

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', 'list', 'invoices'],
    queryFn: async () => { const r = await paymentsApi.list({ type: 'invoice', page_size: 50 }); return r.data },
  })

  const invoiceMut = useMutation({
    mutationFn: (params) => paymentsApi.invoice(params),
    onSuccess: () => {
      toast.success('Factura creada')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setShowForm(false)
      setForm({ customer_email: '', customer_name: '', cif_nif: '', amount: '', description: '', due_days: '30', tax_rate: '21' })
    },
    onError: () => toast.error('Error al crear factura'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    invoiceMut.mutate({
      customer_email: form.customer_email,
      customer_name: form.customer_name,
      cif_nif: form.cif_nif,
      amount: parseFloat(form.amount),
      description: form.description,
      due_days: parseInt(form.due_days) || 30,
      tax_rate: parseFloat(form.tax_rate) || 21,
    })
  }

  const invoices = Array.isArray(paymentsData) ? paymentsData : paymentsData?.items || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Facturas</h3>
        <Btn onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Nueva factura'}
        </Btn>
      </div>

      {/* New invoice form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl p-5 space-y-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: T.cyan }}>Nueva factura</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InputField label="Email cliente" type="email" value={form.customer_email} onChange={(v) => setForm({ ...form, customer_email: v })} placeholder="cliente@empresa.com" required />
            <InputField label="Nombre cliente" value={form.customer_name} onChange={(v) => setForm({ ...form, customer_name: v })} placeholder="Empresa S.L." required />
            <InputField label="CIF/NIF" value={form.cif_nif} onChange={(v) => setForm({ ...form, cif_nif: v })} placeholder="B12345678" required />
            <InputField label="Importe base (EUR)" type="number" step="0.01" min="0.01" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} placeholder="1000.00" required />
            <InputField label="Descripci\u00f3n" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Licencia anual St4rtup" required />
            <InputField label="D\u00edas de vencimiento" type="number" min="1" value={form.due_days} onChange={(v) => setForm({ ...form, due_days: v })} />
            <InputField label="IVA (%)" type="number" step="0.01" min="0" max="100" value={form.tax_rate} onChange={(v) => setForm({ ...form, tax_rate: v })} />
          </div>
          <div className="flex justify-end">
            <Btn type="submit" disabled={invoiceMut.isPending}>
              {invoiceMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              Crear factura
            </Btn>
          </div>
        </form>
      )}

      {/* Invoices table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: T.fg }}>
            <thead>
              <tr style={{ backgroundColor: T.muted }}>
                {['N\u00famero', 'Cliente', 'Base', 'IVA', 'Total', 'Estado', 'Vencimiento', 'PDF'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: T.fgMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: T.fgMuted }}>
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Cargando...
                </td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: T.fgMuted }}>
                  No hay facturas registradas
                </td></tr>
              ) : invoices.map((inv, i) => {
                const base = inv.amount || 0
                const taxRate = inv.tax_rate ?? 21
                const tax = base * (taxRate / 100)
                const total = base + tax
                return (
                  <tr key={inv.id || i} className="transition-colors" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: i % 2 === 0 ? 'transparent' : `${T.muted}50` }}>
                    <td className="px-4 py-3 font-bold" style={{ fontFamily: fontMono, fontSize: '12px' }}>{inv.invoice_number || inv.number || `#${i + 1}`}</td>
                    <td className="px-4 py-3">
                      <div>{inv.customer_name || '-'}</div>
                      <div className="text-xs" style={{ color: T.fgMuted }}>{inv.customer_email || ''}</div>
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: fontMono }}>{fmt(base)}</td>
                    <td className="px-4 py-3" style={{ fontFamily: fontMono }}>{fmt(tax)} <span className="text-xs" style={{ color: T.fgMuted }}>({taxRate}%)</span></td>
                    <td className="px-4 py-3 font-bold" style={{ fontFamily: fontMono }}>{fmt(total)}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(inv.status)}>{inv.status || 'pending'}</Badge></td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: fontMono, fontSize: '12px' }}>{fmtDate(inv.due_date)}</td>
                    <td className="px-4 py-3">
                      {inv.pdf_url ? (
                        <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: T.cyan }}>
                          <FileText className="w-3 h-3" /> PDF
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────────── */
const TABS = [
  { id: 'pagos', label: 'Pagos', icon: CreditCard },
  { id: 'planes', label: 'Planes', icon: DollarSign },
  { id: 'facturas', label: 'Facturas', icon: Receipt },
]

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('pagos')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Pagos y Facturaci\u00f3n</h1>
        <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Gestiona cobros, planes de suscripci\u00f3n y facturas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center"
              style={{
                fontFamily: fontDisplay,
                backgroundColor: isActive ? `${T.cyan}15` : 'transparent',
                color: isActive ? T.cyan : T.fgMuted,
                border: isActive ? `1px solid ${T.cyan}30` : '1px solid transparent',
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'pagos' && <PagosTab />}
      {activeTab === 'planes' && <PlanesTab />}
      {activeTab === 'facturas' && <FacturasTab />}
    </div>
  )
}
