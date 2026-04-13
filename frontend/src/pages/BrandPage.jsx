import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Save, Loader2, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import Breadcrumbs from '@/components/Breadcrumbs'
import toast from 'react-hot-toast'
import { brandApi } from '@/services/api'
import { useThemeColors } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const FRAMEWORKS = ['Scale', 'SaaS Best Practices', 'EU AI Act', 'SOC 2', 'GDPR']

export default function BrandPage() {
  const T = useThemeColors()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({})

  const { data, isLoading } = useQuery({
    queryKey: ['brand'],
    queryFn: () => brandApi.get().then(r => r.data),
  })

  useEffect(() => { if (data) setForm(data) }, [data])

  const mutation = useMutation({
    mutationFn: (d) => brandApi.update(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['brand'] }); toast.success('Configuración guardada') },
    onError: () => toast.error('Error al guardar'),
  })

  const toggleFramework = (fw) => {
    const current = form.regulatory_frameworks || []
    const updated = current.includes(fw) ? current.filter(f => f !== fw) : [...current, fw]
    setForm(f => ({ ...f, regulatory_frameworks: updated }))
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="max-w-3xl space-y-6">
        <Breadcrumbs items={[{ label: 'GTM', href: '/app/gtm' }, { label: 'Brand & Positioning' }]} />
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-4" style={{ color: T.fg, fontFamily: fontDisplay }}>
          <Building2 className="w-7 h-7" style={{ color: T.cyan }} /> Brand & Positioning
        </h1>

        <div className="space-y-4">
          {[
            { key: 'company_name', label: 'Nombre comercial', type: 'text' },
            { key: 'domain', label: 'Dominio', type: 'text' },
            { key: 'slogan', label: 'Slogan', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }} htmlFor="brand-field-1">{f.label}</label>
              <input id="brand-field-1" type="text" value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="input" />
            </div>
          ))}

          {['mission', 'vision', 'values'].map(key => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1 capitalize" style={{ color: T.fgMuted }} htmlFor="brand-field-2">{key === 'values' ? 'Valores' : key === 'mission' ? 'Misión' : 'Visión'}</label>
              <textarea id="brand-field-2" value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} rows={3} className="input" />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }} htmlFor="brand-field-3">Segmento objetivo</label>
            <select id="brand-field-3" value={form.segment || 'enterprise'} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))} className="input">
              <option value="enterprise">Scale</option>
              <option value="smb">Growth</option>
              <option value="both">Ambos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: T.fgMuted }}>Frameworks regulatorios cubiertos</label>
            <div className="flex flex-wrap gap-2">
              {FRAMEWORKS.map(fw => (
                <button key={fw} onClick={() => toggleFramework(fw)}
                  className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    backgroundColor: (form.regulatory_frameworks || []).includes(fw) ? 'hsla(185,72%,48%,0.2)' : T.card,
                    border: `1px solid ${(form.regulatory_frameworks || []).includes(fw) ? 'hsla(185,72%,48%,0.5)' : T.border}`,
                    color: (form.regulatory_frameworks || []).includes(fw) ? T.cyan : T.fgMuted,
                  }}>
                  {(form.regulatory_frameworks || []).includes(fw) && <Check className="w-3 h-3 inline mr-1" />}
                  {fw}
                </button>
              ))}
            </div>
          </div>

          {/* GTM Budget */}
          <div className="pt-4 mt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg, fontFamily: fontDisplay }}>Presupuesto GTM</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="brand-field-4">Total anual (€)</label>
                <input id="brand-field-4" type="number" value={form.gtm_budget_annual || ''} onChange={e => setForm(p => ({ ...p, gtm_budget_annual: parseFloat(e.target.value) || 0 }))} className="input text-sm" />
              </div>
              {['q1', 'q2', 'q3', 'q4'].map(q => (
                <div key={q}>
                  <label className="text-xs mb-1 block" style={{ color: T.fgMuted }} htmlFor="brand-field-5">{q.toUpperCase()} (€)</label>
                  <input id="brand-field-5" type="number" value={form[`gtm_budget_${q}`] || ''} onChange={e => setForm(p => ({ ...p, [`gtm_budget_${q}`]: parseFloat(e.target.value) || 0 }))} className="input text-sm" />
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
            className="btn-primary flex items-center gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
