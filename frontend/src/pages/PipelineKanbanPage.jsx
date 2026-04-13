import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, GripVertical, ChevronRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { opportunitiesApi } from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const STAGES = [
  { id: 'discovery', label: 'Discovery', color: T.cyan },
  { id: 'qualification', label: 'Qualification', color: T.purple },
  { id: 'proposal', label: 'Proposal', color: T.warning },
  { id: 'negotiation', label: 'Negotiation', color: '#f97316' },
  { id: 'closed_won', label: 'Won', color: T.success },
  { id: 'closed_lost', label: 'Lost', color: T.destructive },
]

function OpportunityCard({ opp, onMoveNext }) {
  return (
    <div
      style={{
        backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: '0.5rem',
        padding: '0.75rem', marginBottom: '0.5rem', cursor: 'grab',
      }}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('opp_id', opp.id)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: T.fg, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {opp.name}
          </p>
          <p style={{ fontSize: '0.7rem', color: T.fgMuted, margin: '2px 0 0 0' }}>
            {opp.lead_name || 'Sin empresa'}
          </p>
        </div>
        {opp.stage !== 'closed_won' && opp.stage !== 'closed_lost' && (
          <button onClick={() => onMoveNext(opp)} style={{ background: 'none', border: 'none', color: T.fgMuted, cursor: 'pointer', padding: 2 }} title="Avanzar etapa">
            <ChevronRight size={14} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <span style={{ fontFamily: fontMono, fontSize: '0.75rem', fontWeight: 700, color: T.success }}>
          {(opp.value || 0).toLocaleString('es-ES')} EUR
        </span>
        {opp.probability > 0 && (
          <span style={{ fontSize: '0.65rem', color: T.fgMuted }}>{opp.probability}%</span>
        )}
      </div>
      {opp.expected_close_date && (
        <p style={{ fontSize: '0.65rem', color: T.fgMuted, margin: '4px 0 0 0' }}>
          Cierre: {new Date(opp.expected_close_date).toLocaleDateString('es-ES')}
        </p>
      )}
    </div>
  )
}

export default function PipelineKanbanPage() {
  const T = useThemeColors()
  const queryClient = useQueryClient()
  const [draggingOver, setDraggingOver] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities-kanban'],
    queryFn: () => opportunitiesApi.list({ page_size: 200 }).then(r => r.data),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, stage }) => opportunitiesApi.update(id, { stage }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['opportunities-kanban'] }); toast.success('Etapa actualizada') },
  })

  const opportunities = data?.items || []

  const getStageOpps = (stageId) => opportunities.filter(o => o.stage === stageId)
  const getStageTotal = (stageId) => getStageOpps(stageId).reduce((sum, o) => sum + (o.value || 0), 0)

  const handleDrop = (stageId, e) => {
    e.preventDefault()
    setDraggingOver(null)
    const oppId = e.dataTransfer.getData('opp_id')
    if (oppId) {
      updateMut.mutate({ id: oppId, stage: stageId })
    }
  }

  const handleMoveNext = (opp) => {
    const idx = STAGES.findIndex(s => s.id === opp.stage)
    if (idx >= 0 && idx < STAGES.length - 2) {
      updateMut.mutate({ id: opp.id, stage: STAGES[idx + 1].id })
    }
  }

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={32} color={T.cyan} className="animate-spin" /></div>

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <DollarSign size={24} color={T.cyan} />
        <h1 style={{ fontFamily: fontDisplay, fontSize: '1.75rem', fontWeight: 700, color: T.fg, margin: 0 }}>
          PIPELINE KANBAN
        </h1>
        <a href="/app/pipeline" style={{ fontSize: '0.75rem', color: T.fgMuted, marginLeft: 'auto' }}>Vista tabla</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: '0.75rem', minHeight: '70vh' }}>
        {STAGES.map(stage => {
          const opps = getStageOpps(stage.id)
          const total = getStageTotal(stage.id)
          return (
            <div
              key={stage.id}
              onDragOver={(e) => { e.preventDefault(); setDraggingOver(stage.id) }}
              onDragLeave={() => setDraggingOver(null)}
              onDrop={(e) => handleDrop(stage.id, e)}
              style={{
                backgroundColor: draggingOver === stage.id ? `${stage.color}10` : T.muted,
                border: `1px solid ${draggingOver === stage.id ? stage.color : T.border}`,
                borderRadius: '0.75rem', padding: '0.75rem',
                transition: 'all 0.15s',
              }}
            >
              {/* Column header */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: stage.color }} />
                  <span style={{ fontFamily: fontDisplay, fontSize: '0.8rem', fontWeight: 700, color: T.fg, textTransform: 'uppercase' }}>
                    {stage.label}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: T.fgMuted, marginLeft: 'auto', fontFamily: fontMono }}>
                    {opps.length}
                  </span>
                </div>
                <div style={{ fontFamily: fontMono, fontSize: '0.75rem', color: stage.color, fontWeight: 700 }}>
                  {total.toLocaleString('es-ES')} EUR
                </div>
              </div>

              {/* Cards */}
              <div style={{ minHeight: 100 }}>
                {opps.map(opp => (
                  <OpportunityCard key={opp.id} opp={opp} onMoveNext={handleMoveNext} />
                ))}
                {opps.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.7rem', color: T.fgMuted }}>
                    Sin deals
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
