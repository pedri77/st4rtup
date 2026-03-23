import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  MarkerType, Position
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Target, ArrowLeft, Plus, Edit3, Trash2, X, ChevronRight,
  ArrowDown, Layers, Eye, GripVertical, Maximize2, Minimize2
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { funnelsApi, campaignsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#06B6D4', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const STATUS_CONFIG = {
  draft: { label: 'Borrador', bg: T.muted, color: T.fgMuted },
  active: { label: 'Activo', bg: 'hsla(142,71%,45%,0.15)', color: T.success },
  archived: { label: 'Archivado', bg: 'hsla(220,60%,50%,0.15)', color: 'hsl(220,60%,60%)' },
}

const DEFAULT_STAGES = [
  { name: 'Awareness', channel: '', asset: '', cta: '', trigger_score: 0 },
  { name: 'Consideración', channel: '', asset: '', cta: '', trigger_score: 20 },
  { name: 'Decisión', channel: '', asset: '', cta: '', trigger_score: 50 },
  { name: 'Acción', channel: '', asset: '', cta: '', trigger_score: 80 },
]

const STAGE_COLORS = [
  'from-cyan-500 to-blue-600',
  'from-blue-500 to-indigo-600',
  'from-indigo-500 to-purple-600',
  'from-purple-500 to-pink-600',
  'from-pink-500 to-rose-600',
  'from-rose-500 to-red-600',
]

const STAGE_HEX = ['#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e']

const INITIAL_FORM = {
  name: '',
  description: '',
  status: 'draft',
  stages: DEFAULT_STAGES,
  campaign_id: '',
}

const inputStyle = {
  width: '100%', padding: '8px 12px', backgroundColor: T.bg, border: `1px solid ${T.border}`,
  borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none',
}
const selectStyle = { ...inputStyle }
const labelStyle = { display: 'block', fontSize: 14, color: T.fgMuted, marginBottom: 4 }

// ─── Custom Node for React Flow ─────────────────────────────────

function StageNode({ data }) {
  return (
    <div
      className="rounded-xl px-5 py-4 min-w-[220px] shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${data.colorStart}22, ${data.colorEnd}22)`,
        border: `2px solid ${data.colorStart}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ background: `linear-gradient(135deg, ${data.colorStart}, ${data.colorEnd})`, color: '#fff', fontFamily: fontMono }}
        >
          {data.index + 1}
        </div>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: T.fg }}>{data.label}</h4>
      </div>
      <div className="space-y-1">
        {data.channel && (
          <p style={{ fontSize: 10, color: T.fgMuted }}><span style={{ color: T.fgMuted }}>Canal:</span> {data.channel}</p>
        )}
        {data.asset && (
          <p style={{ fontSize: 10, color: T.fgMuted }}><span style={{ color: T.fgMuted }}>Asset:</span> {data.asset}</p>
        )}
        {data.cta && (
          <p style={{ fontSize: 10, color: T.fgMuted }}><span style={{ color: T.fgMuted }}>CTA:</span> {data.cta}</p>
        )}
        {data.trigger_score > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: T.muted }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${data.trigger_score}%`, background: data.colorStart }}
              />
            </div>
            <span style={{ fontSize: 10, fontFamily: fontMono, color: T.fgMuted }}>{data.trigger_score}</span>
          </div>
        )}
      </div>
    </div>
  )
}

const nodeTypes = { stage: StageNode }

// ─── Funnel Flow View ───────────────────────────────────────────

function FunnelFlowView({ funnel, onBack, onEdit }) {
  const stages = funnel.stages || []
  const [fullscreen, setFullscreen] = useState(false)
  const sc = STATUS_CONFIG[funnel.status] || STATUS_CONFIG.draft

  const initialNodes = useMemo(() =>
    stages.map((stage, idx) => ({
      id: `stage-${idx}`,
      type: 'stage',
      position: { x: 250, y: idx * 160 },
      data: {
        label: stage.name,
        index: idx,
        channel: stage.channel,
        asset: stage.asset,
        cta: stage.cta,
        trigger_score: stage.trigger_score,
        colorStart: STAGE_HEX[idx % STAGE_HEX.length],
        colorEnd: STAGE_HEX[(idx + 1) % STAGE_HEX.length],
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    })),
  [stages])

  const initialEdges = useMemo(() =>
    stages.slice(0, -1).map((_, idx) => ({
      id: `edge-${idx}`,
      source: `stage-${idx}`,
      target: `stage-${idx + 1}`,
      type: 'smoothstep',
      animated: true,
      style: { stroke: STAGE_HEX[idx % STAGE_HEX.length], strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: STAGE_HEX[(idx + 1) % STAGE_HEX.length] },
    })),
  [stages])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  return (
    <div className={clsx(
      'space-y-4',
      fullscreen && 'fixed inset-0 z-50 p-4'
    )} style={fullscreen ? { backgroundColor: T.bg } : {}}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={fullscreen ? () => setFullscreen(false) : onBack}
            className="transition-colors"
            style={{ color: T.fgMuted }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="flex items-center gap-2" style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 700, color: T.fg }}>
              {funnel.name}
              <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 10, fontWeight: 500, backgroundColor: sc.bg, color: sc.color }}>
                {sc.label}
              </span>
            </h2>
            {funnel.description && (
              <p style={{ fontSize: 12, color: T.fgMuted, marginTop: 2 }}>{funnel.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: T.fgMuted }}
            title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 transition-colors"
            style={{ padding: '6px 12px', backgroundColor: T.muted, color: T.fg, borderRadius: 8, fontSize: 12 }}
          >
            <Edit3 className="w-3.5 h-3.5" /> Editar
          </button>
        </div>
      </div>

      {/* Stage summary pills */}
      <div className="flex flex-wrap gap-2">
        {stages.map((stage, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span
              className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
              style={{ background: `linear-gradient(135deg, ${STAGE_HEX[idx % STAGE_HEX.length]}, ${STAGE_HEX[(idx + 1) % STAGE_HEX.length]})`, color: '#fff' }}
            >
              {stage.name}
            </span>
            {idx < stages.length - 1 && <ChevronRight className="w-3 h-3" style={{ color: T.fgMuted }} />}
          </div>
        ))}
      </div>

      {/* React Flow Canvas */}
      <div className={clsx(
        'rounded-xl overflow-hidden',
        fullscreen ? 'flex-1 h-[calc(100vh-140px)]' : 'h-[500px]'
      )} style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }}>
        {stages.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color={T.border} gap={20} size={1} />
            <Controls
              className="!bg-gray-800 !border-gray-700 !rounded-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-400 [&>button:hover]:!bg-gray-700"
            />
            <MiniMap
              nodeColor={(n) => n.data?.colorStart || '#6366f1'}
              maskColor="rgba(0,0,0,0.7)"
              className="!bg-gray-900 !border-gray-700 !rounded-lg"
            />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: T.fgMuted }}>
            Sin etapas configuradas
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────

export default function FunnelsPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingFunnel, setEditingFunnel] = useState(null)
  const [viewingFunnel, setViewingFunnel] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['marketing', 'funnels'],
    queryFn: () => funnelsApi.list({ page_size: 50 }).then(r => r.data),
  })

  const { data: campaignsData } = useQuery({
    queryKey: ['marketing', 'campaigns', 'all'],
    queryFn: () => campaignsApi.list({ page_size: 100 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => funnelsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'funnels'] })
      toast.success('Funnel creado')
      closeModal()
    },
    onError: () => toast.error('Error al crear funnel'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => funnelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'funnels'] })
      toast.success('Funnel actualizado')
      closeModal()
    },
    onError: () => toast.error('Error al actualizar funnel'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => funnelsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing', 'funnels'] })
      toast.success('Funnel eliminado')
      if (viewingFunnel) setViewingFunnel(null)
    },
    onError: () => toast.error('Error al eliminar funnel'),
  })

  function closeModal() {
    setShowModal(false)
    setEditingFunnel(null)
    setForm(INITIAL_FORM)
  }

  function openCreate() {
    setForm(INITIAL_FORM)
    setEditingFunnel(null)
    setShowModal(true)
  }

  function openEdit(funnel) {
    setEditingFunnel(funnel)
    setForm({
      name: funnel.name,
      description: funnel.description || '',
      status: funnel.status,
      stages: funnel.stages?.length > 0 ? funnel.stages : DEFAULT_STAGES,
      campaign_id: funnel.campaign_id || '',
    })
    setShowModal(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      description: form.description || null,
      campaign_id: form.campaign_id || null,
      stages: form.stages.filter(s => s.name.trim()),
    }

    if (editingFunnel) {
      updateMutation.mutate({ id: editingFunnel.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function updateStage(index, field, value) {
    setForm(f => ({
      ...f,
      stages: f.stages.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }))
  }

  function addStage() {
    setForm(f => ({
      ...f,
      stages: [...f.stages, { name: '', channel: '', asset: '', cta: '', trigger_score: 0 }]
    }))
  }

  function removeStage(index) {
    setForm(f => ({ ...f, stages: f.stages.filter((_, i) => i !== index) }))
  }

  const funnels = data?.items || []
  const campaigns = campaignsData?.items || []

  // ─── Detail view with React Flow ─────────────────────────────
  if (viewingFunnel) {
    return (
      <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <FunnelFlowView
          funnel={viewingFunnel}
          onBack={() => setViewingFunnel(null)}
          onEdit={() => { setViewingFunnel(null); openEdit(viewingFunnel) }}
        />
      </div>
    )
  }

  // ─── List view ────────────────────────────────────────────────
  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/marketing" className="transition-colors" style={{ color: T.fgMuted }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2" style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: T.fg }}>
              <Target className="w-6 h-6" style={{ color: T.purple }} />
              Funnels
            </h1>
            <p style={{ fontSize: 14, color: T.fgMuted, marginTop: 2 }}>
              {data?.total ?? 0} funnels configurados
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 transition-colors"
          style={{ padding: '8px 16px', backgroundColor: T.cyan, color: T.bg, borderRadius: 8, fontSize: 14, fontWeight: 500 }}
        >
          <Plus className="w-4 h-4" /> Nuevo Funnel
        </button>
      </div>

      {/* Funnel cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <div className="h-5 rounded animate-pulse w-3/4 mb-3" style={{ backgroundColor: T.muted }} />
              <div className="h-4 rounded animate-pulse w-1/2" style={{ backgroundColor: T.muted }} />
            </div>
          ))
        ) : funnels.length === 0 ? (
          <div className="col-span-full text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 48 }}>
            <Layers className="w-8 h-8 mx-auto mb-2" style={{ color: T.fgMuted }} />
            <p style={{ color: T.fgMuted }}>No hay funnels</p>
            <button onClick={openCreate} className="mt-2" style={{ color: T.cyan, fontSize: 14 }}>
              Crear primer funnel
            </button>
          </div>
        ) : (
          funnels.map((funnel) => {
            const stages = funnel.stages || []
            const sc = STATUS_CONFIG[funnel.status] || STATUS_CONFIG.draft
            return (
              <div
                key={funnel.id}
                className="cursor-pointer transition-all"
                style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}
                onClick={() => setViewingFunnel(funnel)}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.cyan}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 style={{ color: T.fg, fontWeight: 600 }}>{funnel.name}</h3>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 500, marginTop: 4, backgroundColor: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEdit(funnel)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: T.fgMuted }}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar "${funnel.name}"?`)) deleteMutation.mutate(funnel.id)
                      }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: T.fgMuted }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {funnel.description && (
                  <p className="line-clamp-2 mb-3" style={{ fontSize: 14, color: T.fgMuted }}>{funnel.description}</p>
                )}

                {/* Mini funnel preview */}
                <div className="flex items-center gap-1">
                  {stages.slice(0, 5).map((stage, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: `linear-gradient(135deg, ${STAGE_HEX[idx % STAGE_HEX.length]}, ${STAGE_HEX[(idx + 1) % STAGE_HEX.length]})`, color: '#fff' }}
                      >
                        {stage.name}
                      </span>
                      {idx < Math.min(stages.length, 5) - 1 && (
                        <ChevronRight className="w-3 h-3" style={{ color: T.fgMuted }} />
                      )}
                    </div>
                  ))}
                  {stages.length > 5 && (
                    <span style={{ fontSize: 12, color: T.fgMuted }}>+{stages.length - 5}</span>
                  )}
                  {stages.length === 0 && (
                    <span style={{ fontSize: 12, color: T.fgMuted }}>Sin etapas</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 12 }}>
            <div className="flex items-center justify-between" style={{ padding: 20, borderBottom: `1px solid ${T.border}` }}>
              <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.fg }}>
                {editingFunnel ? 'Editar Funnel' : 'Nuevo Funnel'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-lg transition-colors">
                <X className="w-5 h-5" style={{ color: T.fgMuted }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" style={{ padding: 20 }}>
              <div>
                <label style={labelStyle} htmlFor="funnels-field-1">Nombre *</label>
                <input id="funnels-field-1" type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Ej: Funnel NIS2 - CISO España"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle} htmlFor="funnels-field-2">Estado</label>
                  <select id="funnels-field-2" value={form.status}
                    onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                    style={selectStyle}
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="funnels-field-3">Campaña asociada</label>
                  <select id="funnels-field-3" value={form.campaign_id}
                    onChange={(e) => setForm(f => ({ ...f, campaign_id: e.target.value }))}
                    style={selectStyle}
                  >
                    <option value="">Sin campaña</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="funnels-field-4">Descripción</label>
                <textarea id="funnels-field-4" rows={2}
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              {/* Stages editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label style={{ fontSize: 14, color: T.fgMuted, fontWeight: 500 }}>Etapas del Funnel</label>
                  <button
                    type="button"
                    onClick={addStage}
                    className="flex items-center gap-1"
                    style={{ fontSize: 12, color: T.cyan }}
                  >
                    <Plus className="w-3 h-3" /> Añadir etapa
                  </button>
                </div>
                <div className="space-y-3">
                  {form.stages.map((stage, idx) => (
                    <div key={idx} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12 }}>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ background: `linear-gradient(135deg, ${STAGE_HEX[idx % STAGE_HEX.length]}, ${STAGE_HEX[(idx + 1) % STAGE_HEX.length]})`, color: '#fff', fontFamily: fontMono }}
                        >
                          Etapa {idx + 1}
                        </span>
                        {form.stages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStage(idx)}
                            className="transition-colors"
                            style={{ color: T.fgMuted }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <input id="funnels-input-5" aria-label="Nombre *" type="text"
                          placeholder="Nombre *"
                          value={stage.name}
                          onChange={(e) => updateStage(idx, 'name', e.target.value)}
                          className="col-span-2 sm:col-span-1"
                          style={{ padding: '6px 8px', backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.fg, fontSize: 12, outline: 'none' }}
                        />
                        <input id="funnels-input-6" aria-label="Canal" type="text"
                          placeholder="Canal"
                          value={stage.channel}
                          onChange={(e) => updateStage(idx, 'channel', e.target.value)}
                          style={{ padding: '6px 8px', backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.fg, fontSize: 12, outline: 'none' }}
                        />
                        <input id="funnels-input-7" aria-label="Asset" type="text"
                          placeholder="Asset"
                          value={stage.asset}
                          onChange={(e) => updateStage(idx, 'asset', e.target.value)}
                          style={{ padding: '6px 8px', backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.fg, fontSize: 12, outline: 'none' }}
                        />
                        <input id="funnels-input-8" aria-label="CTA" type="text"
                          placeholder="CTA"
                          value={stage.cta}
                          onChange={(e) => updateStage(idx, 'cta', e.target.value)}
                          style={{ padding: '6px 8px', backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.fg, fontSize: 12, outline: 'none' }}
                        />
                        <input id="funnels-input-9" aria-label="Score" type="number"
                          placeholder="Score"
                          min="0"
                          max="100"
                          value={stage.trigger_score}
                          onChange={(e) => updateStage(idx, 'trigger_score', parseInt(e.target.value) || 0)}
                          style={{ padding: '6px 8px', backgroundColor: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, color: T.fg, fontSize: 12, outline: 'none', fontFamily: fontMono }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                <button
                  type="button"
                  onClick={closeModal}
                  className="transition-colors"
                  style={{ padding: '8px 16px', color: T.fgMuted, fontSize: 14 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="disabled:opacity-50 transition-colors"
                  style={{ padding: '8px 16px', backgroundColor: T.cyan, color: T.bg, borderRadius: 8, fontSize: 14, fontWeight: 500 }}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Guardando...'
                    : editingFunnel ? 'Guardar' : 'Crear Funnel'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
