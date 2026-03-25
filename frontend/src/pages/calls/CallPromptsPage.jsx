import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Pencil, Trash2, Loader2, Sprout, ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { callPromptsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const inputStyle = {
  backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg,
  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
  width: '100%', outline: 'none',
}
const optionStyle = { backgroundColor: T.muted, color: T.fg }

const OBJETIVOS = [
  { value: 'prospecting', label: 'Prospeccion', color: T.cyan },
  { value: 'followup_demo', label: 'Seguimiento demo', color: 'hsl(210,70%,55%)' },
  { value: 'closing', label: 'Cierre', color: T.success },
  { value: 'reactivation', label: 'Reactivacion', color: T.warning },
  { value: 'qualification', label: 'Cualificacion', color: T.purple },
]

function ObjetivoBadge({ objetivo }) {
  const obj = OBJETIVOS.find(o => o.value === objetivo)
  const color = obj?.color || T.fgMuted
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color, backgroundColor: `${color}15` }}>
      {obj?.label || objetivo}
    </span>
  )
}

function PromptForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    nombre: '', objetivo: 'prospecting', persona_target: [], regulatory_focus: [],
    idioma: 'es', voz_id: '', system_prompt: '', primer_mensaje: '',
    variables_dinamicas: [], objetivo_llamada: '',
    duracion_objetivo_min: 5, max_duracion_min: 15, activo: true,
  })

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))
  const handleArrayChange = (field, value) => {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean)
    setForm(prev => ({ ...prev, [field]: arr }))
  }

  return (
    <div className="rounded-xl p-6 space-y-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="prompt-nombre" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Nombre</label>
          <input id="prompt-nombre" name="nombre" type="text" value={form.nombre}
            onChange={e => handleChange('nombre', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="prompt-objetivo" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Objetivo</label>
          <select id="prompt-objetivo" name="objetivo" value={form.objetivo}
            onChange={e => handleChange('objetivo', e.target.value)} style={inputStyle}>
            {OBJETIVOS.map(o => <option key={o.value} value={o.value} style={optionStyle}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="prompt-persona" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Persona target (coma sep.)</label>
          <input id="prompt-persona" name="persona_target" type="text"
            value={(form.persona_target || []).join(', ')}
            onChange={e => handleArrayChange('persona_target', e.target.value)}
            placeholder="CEO, DPO, CTO" style={inputStyle} />
        </div>
        <div>
          <label htmlFor="prompt-regulatory" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Regulatory focus (coma sep.)</label>
          <input id="prompt-regulatory" name="regulatory_focus" type="text"
            value={(form.regulatory_focus || []).join(', ')}
            onChange={e => handleArrayChange('regulatory_focus', e.target.value)}
            placeholder="ENS, NIS2, DORA" style={inputStyle} />
        </div>
      </div>

      <div>
        <label htmlFor="prompt-system" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>System Prompt</label>
        <textarea id="prompt-system" name="system_prompt" rows={5}
          value={form.system_prompt} onChange={e => handleChange('system_prompt', e.target.value)}
          placeholder="Instrucciones para el agente IA..."
          style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace" }} />
      </div>

      <div>
        <label htmlFor="prompt-primer" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Primer mensaje</label>
        <textarea id="prompt-primer" name="primer_mensaje" rows={3}
          value={form.primer_mensaje} onChange={e => handleChange('primer_mensaje', e.target.value)}
          placeholder="Hola {{lead_nombre}}, soy de St4rtup..." style={inputStyle} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="prompt-obj-llamada" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Objetivo llamada</label>
          <input id="prompt-obj-llamada" name="objetivo_llamada" type="text"
            value={form.objetivo_llamada || ''} onChange={e => handleChange('objetivo_llamada', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="prompt-duracion" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Duracion objetivo (min)</label>
          <input id="prompt-duracion" name="duracion_objetivo_min" type="number"
            value={form.duracion_objetivo_min} onChange={e => handleChange('duracion_objetivo_min', parseInt(e.target.value) || 5)} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="prompt-max-duracion" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Max duracion (min)</label>
          <input id="prompt-max-duracion" name="max_duracion_min" type="number"
            value={form.max_duracion_min} onChange={e => handleChange('max_duracion_min', parseInt(e.target.value) || 15)} style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="prompt-variables" className="block text-sm font-medium mb-1" style={{ color: T.fgMuted }}>Variables dinamicas (coma sep.)</label>
          <input id="prompt-variables" name="variables_dinamicas" type="text"
            value={(form.variables_dinamicas || []).join(', ')}
            onChange={e => handleArrayChange('variables_dinamicas', e.target.value)}
            placeholder="lead_nombre, lead_empresa, regulatory_focus" style={inputStyle} />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: T.fgMuted }}>
            <input type="checkbox" name="activo" checked={form.activo}
              onChange={e => handleChange('activo', e.target.checked)}
              className="rounded" style={{ accentColor: T.cyan }} />
            Activo
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm"
            style={{ border: `1px solid ${T.border}`, color: T.fgMuted }}>
            Cancelar
          </button>
        )}
        <button type="button" onClick={() => onSubmit(form)}
          disabled={loading || !form.nombre || !form.system_prompt || !form.primer_mensaje}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          style={{ backgroundColor: T.cyan, color: T.bg }}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar
        </button>
      </div>
    </div>
  )
}

export default function CallPromptsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [filterObjetivo, setFilterObjetivo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['call-prompts', filterObjetivo],
    queryFn: () => callPromptsApi.list({ page_size: 50, objetivo: filterObjetivo || undefined }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => callPromptsApi.create(data),
    onSuccess: () => { toast.success('Prompt creado'); setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['call-prompts'] }) },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error creando prompt'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => callPromptsApi.update(id, data),
    onSuccess: () => { toast.success('Prompt actualizado'); setEditingId(null); queryClient.invalidateQueries({ queryKey: ['call-prompts'] }) },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error actualizando'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => callPromptsApi.delete(id),
    onSuccess: () => { toast.success('Prompt eliminado'); queryClient.invalidateQueries({ queryKey: ['call-prompts'] }) },
  })

  const seedMutation = useMutation({
    mutationFn: () => callPromptsApi.seed(),
    onSuccess: (res) => { toast.success(res.data.detail); queryClient.invalidateQueries({ queryKey: ['call-prompts'] }) },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error en seed'),
  })

  const prompts = data?.items || []

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 space-y-6" style={{ backgroundColor: T.bg, minHeight: '100vh' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"
            style={{ fontFamily: fontDisplay, color: T.fg }}>
            <FileText className="w-7 h-7" style={{ color: T.cyan }} />
            Prompts de Llamadas
          </h1>
          <p className="mt-1 text-sm" style={{ color: T.fgMuted }}>Gestiona los guiones y prompts para llamadas con IA</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app/calls" className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
            Consola
          </Link>
          <button type="button" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: `${T.warning}10`, border: `1px solid ${T.warning}30`, color: T.warning }}>
            {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sprout className="w-4 h-4" />}
            Seed growth
          </button>
          <button type="button" onClick={() => { setShowCreate(!showCreate); setEditingId(null) }}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{ backgroundColor: T.cyan, color: T.bg }}>
            <Plus className="w-4 h-4" />
            Nuevo prompt
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setFilterObjetivo('')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: !filterObjetivo ? `${T.cyan}20` : T.muted,
            color: !filterObjetivo ? T.cyan : T.fgMuted,
            border: `1px solid ${!filterObjetivo ? T.cyan : T.border}`,
          }}>
          Todos
        </button>
        {OBJETIVOS.map(o => (
          <button type="button" key={o.value} onClick={() => setFilterObjetivo(o.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: filterObjetivo === o.value ? `${o.color}20` : T.muted,
              color: filterObjetivo === o.value ? o.color : T.fgMuted,
              border: `1px solid ${filterObjetivo === o.value ? o.color : T.border}`,
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {showCreate && (
        <PromptForm onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-12" style={{ color: T.fgMuted }}>
          <FileText className="w-12 h-12 mx-auto mb-3" />
          <p>No hay prompts. Usa "Seed growth" para crear 5 prompts de ejemplo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map(prompt => (
            <div key={prompt.id} className="rounded-xl overflow-hidden"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              {editingId === prompt.id ? (
                <div className="p-4">
                  <PromptForm initial={prompt} onSubmit={(data) => updateMutation.mutate({ id: prompt.id, data })}
                    onCancel={() => setEditingId(null)} loading={updateMutation.isPending} />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setExpandedId(expandedId === prompt.id ? null : prompt.id)}
                        style={{ color: T.fgMuted }}>
                        {expandedId === prompt.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: T.fg }}>{prompt.nombre}</span>
                          <ObjetivoBadge objetivo={prompt.objetivo} />
                          <span className="text-xs" style={{ color: T.fgMuted }}>v{prompt.version}</span>
                          {!prompt.activo && (
                            <span className="px-2 py-0.5 rounded-full text-xs"
                              style={{ color: T.destructive, backgroundColor: `${T.destructive}15` }}>Inactivo</span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: T.fgMuted }}>
                          {(prompt.persona_target || []).join(', ')} | {prompt.idioma} | {prompt.duracion_objetivo_min}-{prompt.max_duracion_min} min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditingId(prompt.id)} className="p-1.5 rounded-lg"
                        style={{ color: T.fgMuted }}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => { if (confirm('Eliminar prompt?')) deleteMutation.mutate(prompt.id) }}
                        className="p-1.5 rounded-lg" style={{ color: T.fgMuted }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expandedId === prompt.id && (
                    <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: `1px solid ${T.border}` }}>
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: T.fgMuted }}>System Prompt</p>
                        <pre className="text-sm rounded-lg p-3 whitespace-pre-wrap"
                          style={{ color: T.fg, backgroundColor: T.muted, border: `1px solid ${T.border}`, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {prompt.system_prompt}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Primer mensaje</p>
                        <pre className="text-sm rounded-lg p-3 whitespace-pre-wrap"
                          style={{ color: T.fg, backgroundColor: `${T.cyan}05`, border: `1px solid ${T.cyan}20` }}>
                          {prompt.primer_mensaje}
                        </pre>
                      </div>
                      {prompt.objetivo_llamada && (
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Objetivo</p>
                          <p className="text-sm" style={{ color: T.fg }}>{prompt.objetivo_llamada}</p>
                        </div>
                      )}
                      {prompt.variables_dinamicas?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: T.fgMuted }}>Variables</p>
                          <div className="flex flex-wrap gap-1">
                            {prompt.variables_dinamicas.map(v => (
                              <span key={v} className="px-2 py-0.5 text-xs rounded"
                                style={{ color: T.cyan, backgroundColor: `${T.cyan}10`, fontFamily: "'IBM Plex Mono', monospace" }}>
                                {`{{${v}}}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
