import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opportunitiesApi, agentsApi, contractsApi, dashboardApi } from '@/services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { useLeadsSelect } from '@/hooks/useLeadsSelect'
import { useLeadsByIds } from '@/hooks/useLeadsByIds'
import { Plus, X, FileText, Loader2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { mockOpportunities, mockDelay, USE_MOCK_DATA } from '@/mocks/mockData'
import ExportButton from '@/components/ExportButton'
import { DealScoreBadge as DealScoreCardInline } from '@/components/DealScoreCard'
import { formatDateForExport } from '@/utils/export'
import { ListItemSkeleton } from '@/components/LoadingStates'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const STAGES = {
  discovery:     { label: 'DISCOVERY',     color: T.cyan },
  qualification: { label: 'QUALIFICATION', color: T.purple },
  proposal:      { label: 'PROPOSAL',      color: T.warning },
  negotiation:   { label: 'NEGOTIATION',   color: T.warning },
  closed_won:    { label: 'CERRADA WON',   color: T.success },
  closed_lost:   { label: 'CERRADA LOST',  color: T.destructive },
}

function formatCurrency(value) {
  if (!value) return '—'
  return `€${value.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
}

function shortDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`
}

function ProbBar({ value }) {
  const pct = value || 0
  const color = pct >= 70 ? T.success : pct >= 40 ? T.cyan : T.fgMuted
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded overflow-hidden" style={{ backgroundColor: T.muted }}>
        <div className="h-full transition-all rounded" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs tabular-nums" style={{ fontFamily: fontMono, color }}>{pct}%</span>
    </div>
  )
}

export default function PipelinePage() {
  const T = useThemeColors()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [draggedOpp, setDraggedOpp] = useState(null)
  const queryClient = useQueryClient()

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await mockDelay(600)
        return mockOpportunities.items
      }
      try {
        return await opportunitiesApi.list().then(r => {
          const d = r.data
          return Array.isArray(d) ? d : (d?.items || [])
        })
      } catch (err) {
        await mockDelay(400)
        return mockOpportunities.items
      }
    },
  })

  const createOpportunity = useMutation({
    mutationFn: (data) => opportunitiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['opportunities'])
      toast.success('Oportunidad creada')
      setShowCreateModal(false)
    },
    onError: (error) => {
      toast.error(`Error: ${error.response?.data?.detail || 'No se pudo crear'}`)
    },
  })

  const updateOpportunityStage = useMutation({
    mutationFn: ({ id, stage }) => {
      if (USE_MOCK_DATA) return Promise.resolve({ id, stage })
      return opportunitiesApi.update(id, { stage })
    },
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['opportunities'] })
      const previous = queryClient.getQueryData(['opportunities'])
      queryClient.setQueryData(['opportunities'], (old = []) =>
        old.map(o => o.id === id ? { ...o, stage } : o)
      )
      return { previous }
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(['opportunities'], context.previous)
      toast.error(`Error: ${error.response?.data?.detail || 'No se pudo actualizar'}`)
    },
    onSuccess: () => { toast.success('Etapa actualizada') },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['opportunities'] }) },
  })

  const handleDragStart = (opportunity) => setDraggedOpp(opportunity)
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const handleDrop = (e, targetStage) => {
    e.preventDefault()
    if (!draggedOpp || draggedOpp.stage === targetStage) { setDraggedOpp(null); return }
    updateOpportunityStage.mutate({ id: draggedOpp.id, stage: targetStage })
    setDraggedOpp(null)
  }
  const handleDragEnd = () => setDraggedOpp(null)

  const leadIds = opportunities.map(o => o.lead_id).filter(Boolean)
  const { data: leadsMap = {} } = useLeadsByIds(leadIds)

  const opportunitiesByStage = {
    discovery: opportunities.filter(o => o.stage === 'discovery'),
    qualification: opportunities.filter(o => o.stage === 'qualification'),
    proposal: opportunities.filter(o => o.stage === 'proposal'),
    negotiation: opportunities.filter(o => o.stage === 'negotiation'),
    closed_won: opportunities.filter(o => o.stage === 'closed_won'),
    closed_lost: opportunities.filter(o => o.stage === 'closed_lost'),
  }

  const activeOpportunities = opportunities.filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
  const totalValue = activeOpportunities.reduce((sum, o) => sum + (o.value || 0), 0)
  const weightedValue = activeOpportunities.reduce((sum, o) => sum + ((o.value || 0) * (o.probability || 0) / 100), 0)
  const wonValue = opportunities.filter(o => o.stage === 'closed_won').reduce((sum, o) => sum + (o.value || 0), 0)
  const winRate = (opportunitiesByStage.closed_won.length + opportunitiesByStage.closed_lost.length) > 0
    ? Math.round((opportunitiesByStage.closed_won.length / (opportunitiesByStage.closed_won.length + opportunitiesByStage.closed_lost.length)) * 100)
    : 0

  const statItems = [
    { label: 'PIPELINE TOTAL', value: formatCurrency(totalValue) },
    { label: 'PONDERADO', value: formatCurrency(weightedValue) },
    { label: 'CERRADAS WON', value: formatCurrency(wonValue), color: T.success },
    { label: 'WIN RATE', value: `${winRate}%`, color: winRate >= 50 ? T.success : T.warning },
    { label: 'ACTIVAS', value: activeOpportunities.length, color: T.cyan },
  ]

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-full" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Pipeline</h1>
          <p className="text-sm mt-1" style={{ fontFamily: fontMono, color: T.fgMuted }}>{activeOpportunities.length} operaciones activas</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={opportunities || []}
            filename="pipeline"
            transform={(o) => ({
              'Nombre': o.name,
              'Empresa': o.lead_name || '',
              'Etapa': o.stage,
              'Valor': o.value || 0,
              'Probabilidad': o.probability || 0,
              'Cierre Esperado': formatDateForExport(o.expected_close_date),
              'Creado': formatDateForExport(o.created_at),
            })}
            size="sm"
          />
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 20px ${T.cyan}40`}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
            <Plus className="w-4 h-4" /> Nueva Op.
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {statItems.map((s) => (
          <div key={s.label} className="rounded-lg p-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-xs uppercase tracking-[0.15em]" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums" style={{ fontFamily: fontMono, color: s.color || T.fg }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <ListItemSkeleton key={i} />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {['discovery', 'qualification', 'proposal', 'negotiation'].map(stage => (
              <StageColumn
                key={stage}
                stage={stage}
                opportunities={opportunitiesByStage[stage]}
                leadsMap={leadsMap}
                draggedOpp={draggedOpp}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
            <StageColumn stage="closed_won" opportunities={opportunitiesByStage.closed_won.slice(0, 5)} leadsMap={leadsMap}
              draggedOpp={draggedOpp} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd} compact />
            <StageColumn stage="closed_lost" opportunities={opportunitiesByStage.closed_lost.slice(0, 5)} leadsMap={leadsMap}
              draggedOpp={draggedOpp} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd} compact />
          </div>
        </>
      )}

      {/* Funnel Conversion */}
      <FunnelConversion />

      {/* Pipeline Flow */}
      <PipelineFlowChart />

      {showCreateModal && (
        <CreateOpportunityModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createOpportunity.mutate(data)}
          isLoading={createOpportunity.isPending}
        />
      )}
    </div>
  )
}

function FunnelConversion() {
  const { data, isLoading } = useQuery({
    queryKey: ['pipeline-funnel'],
    queryFn: () => dashboardApi.funnel().then(r => r.data),
    staleTime: 120000,
  })

  const funnel = data?.stages || data || []
  if (isLoading || !Array.isArray(funnel) || funnel.length === 0) return null

  const maxCount = Math.max(...funnel.map(f => f.count || 0), 1)

  return (
    <div className="mt-6 rounded-lg" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
        <h2 className="text-sm font-bold uppercase tracking-[0.1em]" style={{ fontFamily: fontDisplay, color: T.fg }}>Embudo de Conversion</h2>
      </div>
      <div className="p-4">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {funnel.map((stage, i) => {
            const width = Math.max(20, ((stage.count || 0) / maxCount) * 100)
            const opacity = Math.round(30 + (70 * (1 - i / funnel.length)))
            const hexOpacity = opacity.toString(16).padStart(2, '0')
            return (
              <div key={stage.stage || i} style={{ width: `${width}%`, textAlign: 'center' }}>
                <div style={{
                  backgroundColor: `${T.cyan}${hexOpacity}`,
                  padding: '8px 12px', borderRadius: 6,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, color: T.fg, fontWeight: 500, textTransform: 'uppercase' }}>
                    {(stage.stage || '').replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 12, color: T.fg, fontFamily: fontMono, fontWeight: 700 }}>{stage.count || 0}</span>
                </div>
                {stage.conversion_from_prev != null && stage.conversion_from_prev < 100 && i > 0 && (
                  <p style={{ fontSize: 9, color: T.fgMuted, margin: '2px 0', fontFamily: fontMono }}>{stage.conversion_from_prev}%</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const chartTooltipStyle = {
  backgroundColor: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: '6px',
  color: T.fg,
  fontSize: '12px',
  fontFamily: fontMono,
}

const FLOW_COLORS = [
  '#1E6FD9',   // cyan
  'hsl(210,80%,55%)',    // blue
  'hsl(240,60%,55%)',    // indigo
  '#F5820B',    // purple
]

function PipelineFlowChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['pipeline-sankey'],
    queryFn: () => dashboardApi.sankey().then(r => r.data),
    staleTime: 60000,
  })

  if (isLoading) return null

  const stages = data?.stages || data?.nodes || []
  if (!stages.length) return null

  const chartData = stages.map((s, i) => ({
    stage: s.label || s.name || s.stage || `Stage ${i + 1}`,
    count: s.count || s.value || 0,
    value: s.total_value || s.value_eur || 0,
  }))

  return (
    <div className="mt-6 rounded-lg" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
        <h2 className="text-sm font-bold uppercase tracking-[0.1em]" style={{ fontFamily: fontDisplay, color: T.fg }}>Pipeline Flow</h2>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" barCategoryGap="20%">
            <defs>
              {FLOW_COLORS.map((color, i) => (
                <linearGradient key={`gradFlow-${i}`} id={`gradFlow-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke={T.border} strokeDasharray="none" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={{ stroke: T.border }} />
            <YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: T.fgMuted, fontFamily: fontMono }} stroke={T.border} tickLine={false} axisLine={false} width={100} />
            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: `${T.muted}` }}
              formatter={(value, name) => [value, name === 'count' ? 'Deals' : 'Valor']} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={`url(#gradFlow-${i % FLOW_COLORS.length})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StageColumn({ stage, opportunities, leadsMap, draggedOpp, onDragStart, onDragOver, onDrop, onDragEnd, compact = false }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const s = STAGES[stage]
  const totalValue = opportunities.reduce((sum, o) => sum + (o.value || 0), 0)

  return (
    <div className="flex flex-col">
      {/* Column Header */}
      <div className="rounded-t-lg px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: T.card, borderTop: `2px solid ${s.color}`, borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="text-xs font-bold uppercase tracking-[0.15em]" style={{ fontFamily: fontDisplay, color: T.fg }}>{s.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded" style={{ fontFamily: fontMono, color: s.color, backgroundColor: `${s.color}15` }}>{opportunities.length}</span>
          <span className="text-xs tabular-nums" style={{ fontFamily: fontMono, color: T.fgMuted }}>{formatCurrency(totalValue)}</span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 space-y-2 p-3 rounded-b-lg transition-all min-h-[180px] ${compact ? 'max-h-64 overflow-y-auto' : ''}`}
        style={{
          backgroundColor: isDragOver ? `${T.cyan}08` : `${T.card}80`,
          border: isDragOver ? `1px dashed ${T.cyan}60` : `1px solid ${T.border}40`,
          borderTop: 'none',
        }}
        onDragOver={(e) => { e.preventDefault(); if (draggedOpp && draggedOpp.stage !== stage) { setIsDragOver(true); onDragOver(e) } }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(e, stage) }}
      >
        {opportunities.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ fontFamily: fontMono, color: T.fgMuted }}>
            {isDragOver ? 'Soltar aqui' : 'Sin oportunidades'}
          </p>
        ) : (
          opportunities.map(opp => (
            <OpportunityCard key={opp.id} opportunity={opp} lead={leadsMap[opp.lead_id] || null}
              isDragging={draggedOpp?.id === opp.id} onDragStart={onDragStart} onDragEnd={onDragEnd} />
          ))
        )}
      </div>
    </div>
  )
}

function OpportunityCard({ opportunity, lead, isDragging, onDragStart, onDragEnd }) {
  const [proposal, setProposal] = useState(null)
  const proposalMutation = useMutation({
    mutationFn: () => agentsApi.generateProposal({ opportunity_id: opportunity.id, lead_id: opportunity.lead_id }).then(r => r.data),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return }
      setProposal(data.proposal_markdown)
      toast.success('Propuesta generada')
    },
    onError: () => toast.error('Error generando propuesta'),
  })

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(opportunity) }}
      onDragEnd={onDragEnd}
      className="rounded-lg p-3 cursor-move transition-all"
      style={{
        backgroundColor: T.card,
        border: `1px solid ${T.border}`,
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
      }}
      onMouseEnter={(e) => { if (!isDragging) { e.currentTarget.style.borderColor = `${T.cyan}40`; e.currentTarget.style.boxShadow = `0 0 15px ${T.cyan}10` } }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none' }}
    >
      <h4 className="text-base font-semibold mb-1.5 line-clamp-2 leading-tight" style={{ fontFamily: fontDisplay, color: T.fg }}>
        {opportunity.name}
      </h4>

      {lead && (
        <p className="text-xs mb-2 truncate" style={{ color: T.fgMuted }}>{lead.company_name}</p>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold tabular-nums" style={{ fontFamily: fontMono, color: T.fg }}>
          {formatCurrency(opportunity.value)}
        </span>
      </div>

      <ProbBar value={opportunity.probability} />

      <div className="flex items-center justify-between mt-2.5 pt-2" style={{ borderTop: `1px solid ${T.border}40` }}>
        {opportunity.expected_close_date ? (
          <span className="text-xs tabular-nums" style={{ fontFamily: fontMono, color: T.fgMuted }}>{shortDate(opportunity.expected_close_date)}</span>
        ) : <span />}
        {opportunity.products?.length > 0 && (
          <div className="flex gap-1">
            {opportunity.products.slice(0, 2).map((p, idx) => (
              <span key={idx} className="text-xs px-1.5 py-0.5 rounded" style={{ fontFamily: fontMono, color: T.fgMuted, border: `1px solid ${T.border}` }}>
                {p.length > 10 ? p.slice(0, 10) + '...' : p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tier & Competitor selects */}
      <div className="flex gap-1.5 mt-2" onClick={e => e.stopPropagation()}>
        <select id="pipeline-select-2" aria-label="Selector" value={opportunity.pricing_plan || ''}
          onChange={async (e) => {
            try { await opportunitiesApi.update(opportunity.id, { pricing_plan: e.target.value || null }); toast.success('Tier actualizado') } catch (err) { toast.error('Error al actualizar tier'); console.error(err) }
          }}
          className="flex-1 text-[10px] bg-gray-50/50 border border-gray-200 rounded px-1.5 py-1 text-gray-400"
        >
          <option value="">Tier...</option>
          <option value="pilot_poc">Starter</option>
          <option value="enterprise">Scale</option>
          <option value="smb">Growth</option>
        </select>
        <input id="pipeline-input-1" aria-label="Competidor..." type="text"
          defaultValue={opportunity.competitor || ''}
          placeholder="Competidor..."
          onBlur={async (e) => {
            if (e.target.value !== (opportunity.competitor || '')) {
              try { await opportunitiesApi.update(opportunity.id, { competitor: e.target.value || null }); toast.success('Competidor actualizado') } catch (err) { toast.error('Error al actualizar competidor'); console.error(err) }
            }
          }}
          className="flex-1 text-[10px] bg-gray-50/50 border border-gray-200 rounded px-1.5 py-1 text-gray-400"
        />
      </div>

      {/* Deal Score */}
      <div className="mt-2" onClick={e => e.stopPropagation()}>
        <DealScoreCardInline opportunityId={opportunity.id} />
      </div>

      {/* Generate Proposal Button */}
      <button
        onClick={(e) => { e.stopPropagation(); proposalMutation.mutate() }}
        disabled={proposalMutation.isPending}
        className="w-full mt-2 text-xs py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
        style={{ color: T.cyan, border: `1px solid ${T.border}`, background: 'transparent' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${T.cyan}10` }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        {proposalMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
        Generar Propuesta
      </button>

      {/* Generate Contract Button */}
      <button
        onClick={async (e) => {
          e.stopPropagation()
          try {
            const resp = await contractsApi.generate(opportunity.id)
            const url = window.URL.createObjectURL(new Blob([resp.data]))
            const a = document.createElement('a'); a.href = url; a.download = `contrato_${opportunity.name.replace(/\s/g, '_')}.pdf`; a.click()
            window.URL.revokeObjectURL(url)
            toast.success('Contrato generado')
          } catch { toast.error('Error generando contrato') }
        }}
        className="w-full mt-1 text-xs py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
        style={{ color: T.purple, border: `1px solid ${T.border}`, background: 'transparent' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${T.purple}10` }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <FileText className="w-3 h-3" /> Generar Contrato
      </button>

      {/* Proposal Modal */}
      {proposal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setProposal(null)}>
          <div className="bg-gray-50 border border-gray-200 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Propuesta — {opportunity.name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const resp = await agentsApi.exportPDF({ markdown: proposal, title: `Propuesta — ${opportunity.name}`, filename: `propuesta_${opportunity.name.replace(/\s/g, '_')}.pdf` })
                      const url = window.URL.createObjectURL(new Blob([resp.data]))
                      const a = document.createElement('a'); a.href = url; a.download = `propuesta_${opportunity.name.replace(/\s/g, '_')}.pdf`; a.click()
                      window.URL.revokeObjectURL(url)
                      toast.success('PDF descargado')
                    } catch { toast.error('Error generando PDF') }
                  }}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button aria-label="Cerrar" onClick={() => setProposal(null)} className="text-gray-500 hover:text-gray-800"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{proposal}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateOpportunityModal({ onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: '', lead_id: '', stage: 'discovery', probability: 10,
    value: '', currency: 'EUR', recurring_revenue: '',
    expected_close_date: '', products: [], description: '',
  })

  const [productInput, setProductInput] = useState('')
  const { leads } = useLeadsSelect()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.lead_id) { toast.error('Completa los campos requeridos'); return }
    onSubmit({
      ...formData,
      value: formData.value ? parseFloat(formData.value) : null,
      recurring_revenue: formData.recurring_revenue ? parseFloat(formData.recurring_revenue) : null,
      probability: parseInt(formData.probability),
    })
  }

  const addProduct = () => {
    if (productInput.trim()) {
      setFormData({ ...formData, products: [...formData.products, productInput.trim()] })
      setProductInput('')
    }
  }

  const removeProduct = (index) => {
    setFormData({ ...formData, products: formData.products.filter((_, i) => i !== index) })
  }

  const iStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' }
  const lStyle = { fontFamily: fontDisplay, color: T.fgMuted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', display: 'block' }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg max-w-2xl w-full my-8 p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, boxShadow: `0 0 40px ${T.cyan}08` }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Nueva Operacion</h2>
            <div className="w-12 h-0.5 mt-1" style={{ backgroundColor: T.cyan }} />
          </div>
          <button aria-label="Cerrar" onClick={onClose} style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-xs uppercase tracking-[0.15em] font-bold pb-1" style={{ fontFamily: fontDisplay, color: T.cyan, borderBottom: `1px solid ${T.border}` }}>Objetivo</div>
          <div className="space-y-4">
            <div>
              <label htmlFor="opp-lead" style={lStyle}>Lead <span style={{ color: T.destructive }}>*</span></label>
              <select id="opp-lead" value={formData.lead_id} onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })} style={iStyle} required>
                <option value="">Seleccionar...</option>
                {leads.map(lead => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="opp-name" style={lStyle}>Nombre <span style={{ color: T.destructive }}>*</span></label>
              <input id="opp-name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={iStyle} placeholder="Ej: Implementacion growth Scale" required />
            </div>
            <div>
              <label htmlFor="opp-description" style={lStyle}>Descripcion</label>
              <textarea id="opp-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ ...iStyle, resize: 'vertical' }} rows={2} placeholder="Detalles..." />
            </div>
          </div>

          <div className="text-xs uppercase tracking-[0.15em] font-bold pb-1" style={{ fontFamily: fontDisplay, color: T.cyan, borderBottom: `1px solid ${T.border}` }}>Parametros</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="opp-stage" style={lStyle}>Etapa</label>
              <select id="opp-stage" value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value })} style={iStyle}>
                <option value="discovery">Discovery</option>
                <option value="qualification">Qualification</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
              </select>
            </div>
            <div>
              <label htmlFor="opp-probability" style={lStyle}>Probabilidad (%)</label>
              <input id="opp-probability" type="number" value={formData.probability} onChange={(e) => setFormData({ ...formData, probability: e.target.value })} style={iStyle} min="0" max="100" />
            </div>
            <div>
              <label htmlFor="opp-value" style={lStyle}>Valor (EUR)</label>
              <input id="opp-value" type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} style={iStyle} placeholder="50000" min="0" step="0.01" />
            </div>
            <div>
              <label htmlFor="opp-arr" style={lStyle}>ARR/MRR (EUR)</label>
              <input id="opp-arr" type="number" value={formData.recurring_revenue} onChange={(e) => setFormData({ ...formData, recurring_revenue: e.target.value })} style={iStyle} placeholder="5000" min="0" step="0.01" />
            </div>
            <div>
              <label htmlFor="opp-close-date" style={lStyle}>Cierre Estimado</label>
              <input id="opp-close-date" type="date" value={formData.expected_close_date} onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })} style={iStyle} />
            </div>
          </div>

          <div className="text-xs uppercase tracking-[0.15em] font-bold pb-1" style={{ fontFamily: fontDisplay, color: T.cyan, borderBottom: `1px solid ${T.border}` }}>Productos</div>
          <div className="flex gap-2">
            <input id="opp-products" type="text" value={productInput} onChange={(e) => setProductInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addProduct())}
              style={{ ...iStyle, flex: 1 }} placeholder="Ej: St4rtup Scale" />
            <button type="button" onClick={addProduct}
              className="px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ border: `1px solid ${T.border}`, color: T.cyan }}>+</button>
          </div>
          {formData.products.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.products.map((product, index) => (
                <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                  style={{ fontFamily: fontMono, color: T.cyan, border: `1px solid ${T.cyan}30` }}>
                  {product}
                  <button aria-label="Cerrar" type="button" onClick={() => removeProduct(index)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={{ fontFamily: fontDisplay, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}
              disabled={isLoading}>CANCELAR</button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}
              disabled={isLoading}>{isLoading ? 'CREANDO...' : 'CREAR OP.'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
