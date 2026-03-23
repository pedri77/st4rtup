import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Calculator, PenTool, Crosshair, Loader2, Copy, Check,
  DollarSign, TrendingUp, Target, BarChart3, AlertTriangle,
  Sparkles, Plus, ExternalLink, Globe, Shield,
  Send, FileText
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { chatApi, competitorsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#06B6D4', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

// ═══════════════════════════════════════════════════════════════════
// TAB 1: ROI CALCULATOR
// ═══════════════════════════════════════════════════════════════════

function ROICalculator() {
  const [inputs, setInputs] = useState({
    // Campaign costs
    ad_spend: 5000,
    tool_costs: 500,
    agency_fees: 0,
    content_costs: 1000,
    team_hours: 40,
    hourly_rate: 50,
    // Funnel metrics
    impressions: 50000,
    clicks: 2500,
    leads: 100,
    mqls: 40,
    sqls: 20,
    opportunities: 10,
    closed_won: 3,
    // Deal values
    avg_deal_value: 15000,
    customer_lifetime_months: 24,
    monthly_recurring: 1500,
  })

  const set = (key, val) => setInputs(prev => ({ ...prev, [key]: parseFloat(val) || 0 }))

  // Calculations
  const totalCost = inputs.ad_spend + inputs.tool_costs + inputs.agency_fees + inputs.content_costs + (inputs.team_hours * inputs.hourly_rate)
  const revenue = inputs.closed_won * inputs.avg_deal_value
  const ltv = inputs.monthly_recurring * inputs.customer_lifetime_months * inputs.closed_won
  const roi = totalCost > 0 ? ((revenue - totalCost) / totalCost * 100) : 0
  const roiLTV = totalCost > 0 ? ((ltv - totalCost) / totalCost * 100) : 0
  const cpl = inputs.leads > 0 ? totalCost / inputs.leads : 0
  const cac = inputs.closed_won > 0 ? totalCost / inputs.closed_won : 0
  const ctr = inputs.impressions > 0 ? (inputs.clicks / inputs.impressions * 100) : 0
  const convRate = inputs.clicks > 0 ? (inputs.leads / inputs.clicks * 100) : 0
  const mqlRate = inputs.leads > 0 ? (inputs.mqls / inputs.leads * 100) : 0
  const sqlRate = inputs.mqls > 0 ? (inputs.sqls / inputs.mqls * 100) : 0
  const winRate = inputs.opportunities > 0 ? (inputs.closed_won / inputs.opportunities * 100) : 0
  const roas = totalCost > 0 ? (revenue / totalCost) : 0

  const inputFieldStyle = {
    width: '100%', padding: '8px 12px', backgroundColor: T.muted, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.fg, fontSize: 12, outline: 'none', fontFamily: fontMono,
  }

  const InputField = ({ label, field, prefix, suffix }) => (
    <div>
      <label style={{ display: 'block', fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4, fontFamily: fontMono }}>{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ fontSize: 12, color: T.fgMuted }}>{prefix}</span>}
        <input
          type="number"
          value={inputs[field]}
          onChange={(e) => set(field, e.target.value)}
          style={{ ...inputFieldStyle, paddingLeft: prefix ? 28 : 12, paddingRight: suffix ? 32 : 12 }}
        />
        {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ fontSize: 12, color: T.fgMuted }}>{suffix}</span>}
      </div>
    </div>
  )

  const MetricCard = ({ label, value, color = T.fg, sub }) => (
    <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12 }}>
      <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontWeight: 500, fontFamily: fontMono }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color, fontFamily: fontDisplay }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: T.fgMuted, marginTop: 2 }}>{sub}</p>}
    </div>
  )

  const barColors = { cyan: T.cyan, blue: 'hsl(210,80%,55%)', purple: T.purple, indigo: 'hsl(230,60%,55%)', green: T.success }

  return (
    <div className="space-y-6">
      {/* Results KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="ROI" value={`${roi.toFixed(1)}%`} color={roi > 0 ? T.success : T.destructive} sub="Revenue directo" />
        <MetricCard label="ROI (LTV)" value={`${roiLTV.toFixed(1)}%`} color={roiLTV > 0 ? T.success : T.destructive} sub="Lifetime value" />
        <MetricCard label="ROAS" value={`${roas.toFixed(2)}x`} color={roas >= 1 ? T.cyan : T.warning} />
        <MetricCard label="CPL" value={`${cpl.toFixed(2)}`} sub="Coste por Lead" />
        <MetricCard label="CAC" value={`${cac.toFixed(0)}`} sub="Coste por Cliente" />
        <MetricCard label="Revenue" value={`${revenue.toLocaleString('es-ES')}`} color={T.success} sub={`LTV: ${ltv.toLocaleString('es-ES')}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Costs */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}50`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: fontDisplay }}>
            <DollarSign className="w-4 h-4" style={{ color: T.destructive }} /> Costes
          </h3>
          <div className="space-y-3">
            <InputField label="Inversión publicitaria" field="ad_spend" prefix="€" />
            <InputField label="Herramientas/Software" field="tool_costs" prefix="€" />
            <InputField label="Agencia/Freelance" field="agency_fees" prefix="€" />
            <InputField label="Producción de contenido" field="content_costs" prefix="€" />
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Horas equipo" field="team_hours" suffix="h" />
              <InputField label="€/hora" field="hourly_rate" prefix="€" />
            </div>
            <div style={{ backgroundColor: T.bg, borderRadius: 8, padding: 12, marginTop: 8 }}>
              <p style={{ fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>Coste Total</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: T.destructive, fontFamily: fontDisplay }}>{totalCost.toLocaleString('es-ES')} €</p>
            </div>
          </div>
        </div>

        {/* Funnel */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}50`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: fontDisplay }}>
            <Target className="w-4 h-4" style={{ color: T.cyan }} /> Funnel
          </h3>
          <div className="space-y-3">
            <InputField label="Impresiones" field="impressions" />
            <InputField label="Clicks" field="clicks" />
            <InputField label="Leads generados" field="leads" />
            <InputField label="MQLs" field="mqls" />
            <InputField label="SQLs" field="sqls" />
            <InputField label="Oportunidades" field="opportunities" />
            <InputField label="Deals cerrados" field="closed_won" />
          </div>
        </div>

        {/* Conversion rates + deal */}
        <div className="space-y-4">
          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}50`, borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: fontDisplay }}>
              <TrendingUp className="w-4 h-4" style={{ color: T.success }} /> Deal
            </h3>
            <div className="space-y-3">
              <InputField label="Valor medio del deal" field="avg_deal_value" prefix="€" />
              <InputField label="MRR por cliente" field="monthly_recurring" prefix="€" />
              <InputField label="Lifetime (meses)" field="customer_lifetime_months" suffix="m" />
            </div>
          </div>

          <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}50`, borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: fontDisplay }}>
              <BarChart3 className="w-4 h-4" style={{ color: T.purple }} /> Tasas de conversión
            </h3>
            <div className="space-y-2">
              {[
                { label: 'CTR', value: ctr, color: 'cyan' },
                { label: 'Click → Lead', value: convRate, color: 'blue' },
                { label: 'Lead → MQL', value: mqlRate, color: 'purple' },
                { label: 'MQL → SQL', value: sqlRate, color: 'indigo' },
                { label: 'Win Rate', value: winRate, color: 'green' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span style={{ fontSize: 10, color: T.fgMuted, width: 80, fontFamily: fontMono }}>{label}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: T.muted }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(value, 100)}%`, backgroundColor: barColors[color] || T.fgMuted }}
                    />
                  </div>
                  <span style={{ fontSize: 12, fontFamily: fontMono, color: T.fg, width: 56, textAlign: 'right' }}>{value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2: CONTENT GENERATOR (Claude API)
// ═══════════════════════════════════════════════════════════════════

const CONTENT_TEMPLATES = [
  {
    id: 'email_followup',
    name: 'Email de seguimiento',
    icon: Send,
    prompt: (vars) => `Redacta un email de seguimiento comercial en español para un lead interesado en ${vars.regulation || 'ciberseguridad GRC'}.
Empresa: ${vars.company || '[nombre empresa]'}. Sector: ${vars.sector || 'tecnología'}.
Tono: profesional pero cercano. Incluye CTA claro. Máximo 200 palabras.
${vars.context ? `Contexto adicional: ${vars.context}` : ''}`,
    fields: [
      { key: 'company', label: 'Empresa', placeholder: 'Nombre de la empresa' },
      { key: 'sector', label: 'Sector', placeholder: 'Banca, Salud, Tecnología...' },
      { key: 'regulation', label: 'Normativa de interés', placeholder: 'NIS2, DORA, ENS, ISO 27001...' },
      { key: 'context', label: 'Contexto adicional', placeholder: 'Tras reunión, tras webinar, cold...', multiline: true },
    ],
  },
  {
    id: 'linkedin_post',
    name: 'Post LinkedIn',
    icon: Globe,
    prompt: (vars) => `Crea un post de LinkedIn en español sobre ${vars.topic || 'ciberseguridad GRC'}.
Objetivo: ${vars.goal || 'generar awareness y engagement'}.
Público: ${vars.audience || 'CISOs, DPOs y responsables de compliance en España'}.
Incluye emojis relevantes, hashtags y CTA. Tono: experto pero accesible. Máximo 300 palabras.
${vars.context ? `Notas: ${vars.context}` : ''}`,
    fields: [
      { key: 'topic', label: 'Tema', placeholder: 'NIS2 deadline, DORA compliance, AI Act...' },
      { key: 'goal', label: 'Objetivo', placeholder: 'Awareness, leads, engagement...' },
      { key: 'audience', label: 'Audiencia', placeholder: 'CISOs, CTOs, compliance managers...' },
      { key: 'context', label: 'Notas adicionales', placeholder: '', multiline: true },
    ],
  },
  {
    id: 'blog_outline',
    name: 'Artículo SEO (outline)',
    icon: FileText,
    prompt: (vars) => `Crea un outline detallado para un artículo de blog SEO en español sobre "${vars.keyword || 'compliance ciberseguridad'}".
Keyword principal: ${vars.keyword || '[keyword]'}. Keywords secundarias: ${vars.secondary || ''}.
Target: ${vars.audience || 'empresas españolas sujetas a regulación de ciberseguridad'}.
Incluye: título H1 optimizado, meta description (155 chars), H2s y H3s con keywords, CTA final.
Longitud estimada del artículo: ${vars.length || '2000'} palabras.
${vars.context ? `Enfoque: ${vars.context}` : ''}`,
    fields: [
      { key: 'keyword', label: 'Keyword principal', placeholder: 'compliance NIS2 España' },
      { key: 'secondary', label: 'Keywords secundarias', placeholder: 'normativa NIS2, directiva NIS2...' },
      { key: 'audience', label: 'Target', placeholder: 'Empresas medianas, sector financiero...' },
      { key: 'length', label: 'Palabras estimadas', placeholder: '2000' },
      { key: 'context', label: 'Enfoque/notas', placeholder: '', multiline: true },
    ],
  },
  {
    id: 'sales_battlecard',
    name: 'Battlecard competitiva',
    icon: Shield,
    prompt: (vars) => `Crea una battlecard de ventas en español comparando St4rtup (plataforma SaaS GRC de ciberseguridad) contra ${vars.competitor || '[competidor]'}.
Incluye:
1. Overview del competidor
2. Fortalezas de St4rtup vs competidor
3. Debilidades del competidor
4. Objeciones comunes y respuestas
5. Preguntas trampa para el competidor
6. Killer features de St4rtup
Mercado: España/Europa. Normativas: ENS, NIS2, DORA, ISO 27001.
${vars.context ? `Info adicional: ${vars.context}` : ''}`,
    fields: [
      { key: 'competitor', label: 'Competidor', placeholder: 'Nombre del competidor' },
      { key: 'context', label: 'Info adicional', placeholder: 'Puntos débiles conocidos, deals perdidos...', multiline: true },
    ],
  },
  {
    id: 'ad_copy',
    name: 'Copy para Ads',
    icon: Sparkles,
    prompt: (vars) => `Crea ${vars.count || '3'} variantes de copy para ${vars.platform || 'Google Ads'} en español.
Producto: St4rtup (plataforma SaaS GRC ciberseguridad).
Objetivo: ${vars.goal || 'generación de leads'}.
Audiencia: ${vars.audience || 'CISOs y responsables de compliance en España'}.
USP: ${vars.usp || 'Cumplimiento normativo simplificado (ENS, NIS2, DORA, ISO 27001)'}.
Incluye headline, description y CTA para cada variante.
${vars.context ? `Notas: ${vars.context}` : ''}`,
    fields: [
      { key: 'platform', label: 'Plataforma', placeholder: 'Google Ads, LinkedIn Ads, Meta Ads...' },
      { key: 'goal', label: 'Objetivo', placeholder: 'Leads, demos, webinar registro...' },
      { key: 'audience', label: 'Audiencia', placeholder: '' },
      { key: 'usp', label: 'USP / Propuesta de valor', placeholder: '' },
      { key: 'count', label: 'Variantes', placeholder: '3' },
      { key: 'context', label: 'Notas', placeholder: '', multiline: true },
    ],
  },
  {
    id: 'email_discovery',
    name: 'Email Discovery',
    icon: Send,
    prompt: (vars) => `Redacta un email de primer contacto (discovery) en español para un prospecto que NO nos conoce.
Empresa: ${vars.company || '[empresa]'}. Sector: ${vars.sector || 'regulado'}. Cargo: ${vars.title || 'CISO/CTO'}.
Producto: St4rtup (plataforma GRC ciberseguridad: ENS Alto, NIS2, DORA).
Dolor: ${vars.pain || 'necesidad de cumplimiento normativo'}.
Tono: profesional, directo, sin rodeos. Máximo 150 palabras. CTA: agendar demo de 15 min.`,
    fields: [
      { key: 'company', label: 'Empresa', placeholder: 'Nombre' },
      { key: 'sector', label: 'Sector', placeholder: 'Banca, Salud, Energía...' },
      { key: 'title', label: 'Cargo del contacto', placeholder: 'CISO, CTO, DPO...' },
      { key: 'pain', label: 'Dolor / necesidad', placeholder: 'Auditoría ENS pendiente, deadline NIS2...' },
    ],
  },
  {
    id: 'email_post_demo',
    name: 'Email Post-Demo',
    icon: Send,
    prompt: (vars) => `Redacta un email de seguimiento DESPUÉS de una demo en español.
Empresa: ${vars.company || '[empresa]'}. Contacto: ${vars.contact || '[nombre]'}.
Puntos tratados: ${vars.points || 'cumplimiento ENS Alto, gestión de riesgos, SOC'}.
Próximos pasos propuestos: ${vars.next || 'PoC 90 días €19.500'}.
Incluye resumen de valor demostrado + CTA para avanzar. Máximo 200 palabras.`,
    fields: [
      { key: 'company', label: 'Empresa', placeholder: '' },
      { key: 'contact', label: 'Contacto', placeholder: 'Nombre del contacto' },
      { key: 'points', label: 'Puntos clave de la demo', placeholder: 'ENS, riesgos, SOC, detección...', multiline: true },
      { key: 'next', label: 'Próximos pasos', placeholder: 'PoC 90 días, pricing, contrato...' },
    ],
  },
  {
    id: 'email_proposal',
    name: 'Email Envío Propuesta',
    icon: FileText,
    prompt: (vars) => `Redacta un email en español para acompañar el envío de una propuesta comercial.
Empresa: ${vars.company || '[empresa]'}. Valor: ${vars.value || '€19.500 PoC'}.
Módulos incluidos: ${vars.modules || 'GRC Core + ENS Alto'}.
Deadline del cliente: ${vars.deadline || 'sin deadline específico'}.
Tono: ejecutivo, confiado. Incluye urgencia sutil. CTA: revisar y confirmar esta semana. Máximo 150 palabras.`,
    fields: [
      { key: 'company', label: 'Empresa', placeholder: '' },
      { key: 'value', label: 'Valor propuesta', placeholder: '€19.500, €57.000...' },
      { key: 'modules', label: 'Módulos incluidos', placeholder: 'GRC Core, ENS Alto, NIS2, SOC...' },
      { key: 'deadline', label: 'Deadline del cliente', placeholder: 'Auditoría en junio, NIS2 octubre...' },
    ],
  },
  {
    id: 'email_reactivation',
    name: 'Email Reactivación',
    icon: Send,
    prompt: (vars) => `Redacta un email de reactivación en español para un lead que se ha enfriado (sin respuesta 30+ días).
Empresa: ${vars.company || '[empresa]'}. Último contacto: ${vars.last || 'hace 1 mes'}.
Aporta valor nuevo: ${vars.value_add || 'nuevo informe sobre deadline NIS2, caso de éxito sector similar'}.
Tono: útil, no insistente. No pedir disculpas. Máximo 120 palabras. CTA suave: ¿sigue siendo relevante?`,
    fields: [
      { key: 'company', label: 'Empresa', placeholder: '' },
      { key: 'last', label: 'Último contacto', placeholder: 'Hace 1 mes, tras webinar...' },
      { key: 'value_add', label: 'Valor nuevo a aportar', placeholder: 'Informe NIS2, caso éxito, webinar...' },
    ],
  },
]

function ContentGenerator() {
  const [selectedTemplate, setSelectedTemplate] = useState(CONTENT_TEMPLATES[0])
  const [vars, setVars] = useState({})
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)

  const { data: providers = [] } = useQuery({
    queryKey: ['chat-providers'],
    queryFn: () => chatApi.providers().then(r => r.data),
  })

  const configuredProvider = providers.find(p => p.configured)

  const generateMutation = useMutation({
    mutationFn: async (prompt) => {
      if (!configuredProvider) throw new Error('No hay proveedor de IA configurado')
      const conv = await chatApi.createConversation({
        provider: configuredProvider.id,
        model: configuredProvider.models[0],
      })
      const res = await chatApi.sendMessage(conv.data.id, {
        message: prompt,
        provider: configuredProvider.id,
        model: configuredProvider.models[0],
        temperature: 0.7,
      })
      return res.data
    },
    onSuccess: (data) => {
      const content = data.assistant_message?.content
        || data.messages?.find(m => m.role === 'assistant')?.content
        || data.content
        || data.response
        || (typeof data === 'string' ? data : 'Sin respuesta')
      setResult(content)
    },
    onError: (err) => {
      toast.error(`Error: ${err.response?.data?.detail || err.message}`)
    },
  })

  const handleGenerate = () => {
    const prompt = selectedTemplate.prompt(vars)
    generateMutation.mutate(prompt)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    toast.success('Copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTemplateChange = (template) => {
    setSelectedTemplate(template)
    setVars({})
    setResult('')
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', backgroundColor: T.muted, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.fg, fontSize: 12, outline: 'none',
  }

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div className="flex flex-wrap gap-2">
        {CONTENT_TEMPLATES.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => handleTemplateChange(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: `1px solid ${selectedTemplate.id === t.id ? T.cyan + '80' : T.border}`,
                backgroundColor: selectedTemplate.id === t.id ? 'rgba(0,188,212,0.1)' : T.card,
                color: selectedTemplate.id === t.id ? T.cyan : T.fgMuted,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.name}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input form */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}50`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16, fontFamily: fontDisplay }}>{selectedTemplate.name}</h3>
          <div className="space-y-3">
            {selectedTemplate.fields.map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: 10, color: T.fgMuted, textTransform: 'uppercase', fontWeight: 500, marginBottom: 4, fontFamily: fontMono }}>{field.label}</label>
                {field.multiline ? (
                  <textarea id="marketingtools-textarea-1" aria-label="Texto" value={vars[field.key] || ''}
                    onChange={(e) => setVars(v => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ ...inputStyle, resize: 'none', height: 80 }}
                  />
                ) : (
                  <input
                    type="text"
                    value={vars[field.key] || ''}
                    onChange={(e) => setVars(v => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !configuredProvider}
            style={{ width: '100%', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', opacity: (generateMutation.isPending || !configuredProvider) ? 0.5 : 1 }}
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generar con IA</>
            )}
          </button>

          {!configuredProvider && (
            <div style={{ backgroundColor: 'rgba(234,179,8,0.05)', border: `1px solid rgba(234,179,8,0.2)`, borderRadius: 8, padding: 12, marginTop: 12 }}>
              <p className="flex items-center gap-1.5 mb-1" style={{ fontSize: 12, color: T.warning }}>
                <AlertTriangle className="w-3.5 h-3.5" /> Sin proveedor de IA configurado
              </p>
              <p style={{ fontSize: 10, color: T.fgMuted }}>
                Configura <code style={{ color: T.cyan }}>MISTRAL_API_KEY</code> o <code style={{ color: T.cyan }}>OPENAI_API_KEY</code> en
                Fly.io secrets, o añade la API key en <Link to="/integrations" style={{ color: T.cyan, textDecoration: 'underline' }}>Integraciones</Link> → IA.
              </p>
            </div>
          )}
        </div>

        {/* Output */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}50`, borderRadius: 12, padding: 20 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>Resultado</h3>
            {result && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1"
                style={{ fontSize: 12, color: T.fgMuted, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
              >
                {copied ? <Check className="w-3.5 h-3.5" style={{ color: T.success }} /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>
          {result ? (
            <div>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: T.fg, backgroundColor: T.bg, borderRadius: 8, padding: 16, border: `1px solid ${T.border}50`, maxHeight: 500, overflowY: 'auto', fontFamily: 'inherit', lineHeight: 1.6 }}>
                {result}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Sparkles className="w-10 h-10 mb-3" style={{ color: T.muted }} />
              <p style={{ fontSize: 14, color: T.fgMuted }}>
                Rellena los campos y pulsa "Generar con IA"
              </p>
              <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 4 }}>
                Usa {configuredProvider?.name || 'OpenAI/Anthropic'} para generar contenido
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3: COMPETITOR TRACKER
// ═══════════════════════════════════════════════════════════════════

function CompetitorTracker() {
  const { data, isLoading } = useQuery({
    queryKey: ['competitors-tools'],
    queryFn: () => competitorsApi.list().then(r => r.data),
  })

  const [filter, setFilter] = useState('all')
  const competitors = data?.competitors || []

  const tierMap = { critical: 'high', high: 'high', medium: 'medium', low: 'low' }
  const threatColors = {
    high: { bg: 'rgba(239,68,68,0.1)', text: T.destructive, border: `${T.destructive}50`, label: 'Alto' },
    medium: { bg: 'rgba(234,179,8,0.1)', text: T.warning, border: `${T.warning}50`, label: 'Medio' },
    low: { bg: 'rgba(34,197,94,0.1)', text: T.success, border: `${T.success}50`, label: 'Bajo' },
  }
  const regionLabels = { local: '🇪🇸', europe: '🇪🇺', global: '🌐' }

  const mapped = competitors.map(c => ({ ...c, threat: tierMap[c.tier] || 'medium' }))
  const filtered = filter === 'all' ? mapped : mapped.filter(c => c.threat === filter)
  const byThreat = { high: mapped.filter(c => c.threat === 'high').length, medium: mapped.filter(c => c.threat === 'medium').length, low: mapped.filter(c => c.threat === 'low').length }

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: T.cyan }} /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-4 gap-3 flex-1">
          {[
            { key: 'all', label: 'Total', value: mapped.length, color: T.fg },
            { key: 'high', label: 'Crítica/Alta', value: byThreat.high, color: T.destructive },
            { key: 'medium', label: 'Media', value: byThreat.medium, color: T.warning },
            { key: 'low', label: 'Baja', value: byThreat.low, color: T.success },
          ].map(item => (
            <button key={item.key} onClick={() => setFilter(item.key)}
              style={{
                backgroundColor: T.card, border: `1px solid ${filter === item.key ? item.color + '80' : T.border}`,
                borderRadius: 8, padding: 12, textAlign: 'center', cursor: 'pointer',
              }}
            >
              <p style={{ fontSize: 20, fontWeight: 700, color: item.color, fontFamily: fontDisplay }}>{item.value}</p>
              <p style={{ fontSize: 10, color: item.color, textTransform: 'uppercase', fontFamily: fontMono }}>{item.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, color: T.fgMuted }}>
          Datos compartidos con <Link to="/gtm/competitors" style={{ color: T.cyan }}>GTM → Competitive Intelligence</Link>
        </p>
        <Link to="/gtm/competitors" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
          <Plus className="w-3.5 h-3.5" /> Gestionar competidores
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((comp) => {
          const threat = threatColors[comp.threat] || threatColors.medium
          return (
            <div key={comp.id} style={{ backgroundColor: T.card, border: `1px solid ${threat.border}`, borderRadius: 12, padding: 20, transition: 'border-color .2s' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="flex items-center gap-2" style={{ fontSize: 14, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>
                    {regionLabels[comp.region] || '🌐'} {comp.name}
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, fontWeight: 500, backgroundColor: threat.bg, color: threat.text }}>
                      {threat.label}
                    </span>
                  </h4>
                  <span style={{ fontSize: 10, color: T.fgMuted }}>{comp.scope}</span>
                </div>
                {comp.website && (
                  <a href={`https://${comp.website}`} target="_blank" rel="noopener noreferrer" style={{ padding: 4, color: T.fgMuted }}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              {/* Maturity bar */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: T.muted }}>
                  <div className="h-1.5 rounded-full"
                    style={{
                      width: `${comp.maturity_score || 50}%`,
                      backgroundColor: (comp.maturity_score || 50) >= 75 ? T.destructive : (comp.maturity_score || 50) >= 50 ? T.warning : T.success,
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: T.fgMuted, fontFamily: fontMono }}>{comp.maturity_score || 50}%</span>
              </div>
              {comp.weakness && <p style={{ fontSize: 12, color: T.fgMuted, lineHeight: 1.5 }}>{comp.weakness}</p>}
              {comp.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {comp.tags.slice(0, 4).map(t => <span key={t} style={{ fontSize: 9, border: `1px solid ${T.border}`, color: T.fgMuted, padding: '2px 6px', borderRadius: 4 }}>{t}</span>)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && <p style={{ textAlign: 'center', padding: '32px 0', color: T.fgMuted, fontSize: 14 }}>Sin competidores con este filtro</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'roi', name: 'Calculadora ROI', icon: Calculator },
  { id: 'content', name: 'Generador de Contenido', icon: PenTool },
  { id: 'competitors', name: 'Competitor Tracker', icon: Crosshair },
]

export default function MarketingToolsPage() {
  const [activeTab, setActiveTab] = useState('roi')

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link to="/marketing" style={{ color: T.fgMuted, transition: 'color .2s' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, fontFamily: fontDisplay, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calculator className="w-7 h-7" style={{ color: T.cyan }} />
            Marketing Tools
          </h1>
        </div>
        <p className="ml-8" style={{ fontSize: 13, color: T.fgMuted }}>
          Calculadora ROI, generador de contenido con IA y tracker de competidores.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: T.card, border: `1px solid ${T.border}50` }}>
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                border: activeTab === tab.id ? `1px solid ${T.cyan}50` : '1px solid transparent',
                backgroundColor: activeTab === tab.id ? 'rgba(0,188,212,0.1)' : 'transparent',
                color: activeTab === tab.id ? T.cyan : T.fgMuted,
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'roi' && <ROICalculator />}
      {activeTab === 'content' && <ContentGenerator />}
      {activeTab === 'competitors' && <CompetitorTracker />}
    </div>
  )
}
