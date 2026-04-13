/**
 * PipelineRulesPage — Visual pipeline automation rules.
 * Create rules that trigger actions when deals change stage.
 */
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { GitBranch, Plus, Trash2, Pencil, Zap, ChevronRight, Power, Loader2, ArrowRight } from 'lucide-react'
import api from '@/services/api'

const rulesApi = {
  list: () => api.get('/pipeline-rules/'),
  create: (data) => api.post('/pipeline-rules/', data),
  update: (id, data) => api.put(`/pipeline-rules/${id}`, data),
  delete: (id) => api.delete(`/pipeline-rules/${id}`),
  seedDefaults: () => api.post('/pipeline-rules/seed-defaults'),
}

const STAGES = [
  { value: 'discovery', label: 'Discovery', color: '#9CA3AF', bg: '#F3F4F6' },
  { value: 'qualification', label: 'Qualification', color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'proposal', label: 'Proposal', color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'negotiation', label: 'Negotiation', color: '#F97316', bg: '#FFF7ED' },
  { value: 'closed_won', label: 'Closed Won', color: '#10B981', bg: '#ECFDF5' },
  { value: 'closed_lost', label: 'Closed Lost', color: '#EF4444', bg: '#FEF2F2' },
]

const ACTION_TYPES = [
  { value: 'create_action', label: 'Crear accion', icon: '✅', desc: 'Crea una tarea asignada al comercial' },
  { value: 'notify', label: 'Notificar', icon: '🔔', desc: 'Envia notificacion por Telegram' },
  { value: 'send_email', label: 'Enviar email', icon: '📧', desc: 'Envia email automatico al lead' },
  { value: 'update_field', label: 'Actualizar campo', icon: '✏️', desc: 'Cambia un campo del lead' },
  { value: 'score', label: 'Deal scoring', icon: '📊', desc: 'Recalcula el score del deal' },
]

const CONDITIONS = [
  { value: 'enters', label: 'Entra en stage' },
  { value: 'leaves', label: 'Sale del stage' },
  { value: 'any', label: 'Cualquier cambio' },
]

const EMPTY_FORM = {
  name: '', description: '', trigger_stage: 'qualification',
  trigger_condition: 'enters', conditions: {}, actions: [], priority: 0, is_active: true,
}

export default function PipelineRulesPage() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => { loadRules() }, [])

  const loadRules = async () => {
    try {
      const { data } = await rulesApi.list()
      setRules(data.rules || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('Nombre requerido'); return }
    if (form.actions.length === 0) { toast.error('Anade al menos una accion'); return }
    try {
      if (editingRule) {
        await rulesApi.update(editingRule, form)
        toast.success('Regla actualizada')
      } else {
        await rulesApi.create(form)
        toast.success('Regla creada')
      }
      setShowCreate(false)
      setEditingRule(null)
      setForm(EMPTY_FORM)
      loadRules()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta regla?')) return
    try { await rulesApi.delete(id); toast.success('Eliminada'); loadRules() }
    catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  const handleToggle = async (rule) => {
    try { await rulesApi.update(rule.id, { is_active: !rule.is_active }); loadRules() }
    catch { toast.error('Error') }
  }

  const startEdit = (rule) => {
    setEditingRule(rule.id)
    setForm({
      name: rule.name, description: rule.description || '',
      trigger_stage: rule.trigger_stage, trigger_condition: rule.trigger_condition,
      conditions: rule.conditions || {}, actions: rule.actions || [],
      priority: rule.priority || 0, is_active: rule.is_active,
    })
    setShowCreate(true)
  }

  const addAction = () => {
    setForm(p => ({ ...p, actions: [...p.actions, { type: 'create_action', config: { description: '', priority: 'medium', due_days: 3 } }] }))
  }

  const removeAction = (idx) => {
    setForm(p => ({ ...p, actions: p.actions.filter((_, i) => i !== idx) }))
  }

  const updateAction = (idx, field, value) => {
    setForm(p => {
      const actions = [...p.actions]
      if (field === 'type') actions[idx] = { type: value, config: {} }
      else actions[idx] = { ...actions[idx], config: { ...actions[idx].config, [field]: value } }
      return { ...p, actions }
    })
  }

  const getStage = (v) => STAGES.find(s => s.value === v) || STAGES[0]
  const getActionType = (v) => ACTION_TYPES.find(a => a.value === v) || ACTION_TYPES[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pipeline Automation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reglas automaticas cuando un deal cambia de stage</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={async () => {
            try { const { data } = await rulesApi.seedDefaults(); toast.success(`${data.seeded} reglas por defecto`); loadRules() }
            catch (e) { toast.error(e.response?.data?.detail || 'Error') }
          }} className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Zap className="w-4 h-4 inline mr-1" />Defaults
          </button>
          <button onClick={() => { setEditingRule(null); setForm(EMPTY_FORM); setShowCreate(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
            <Plus className="w-4 h-4" />Nueva regla
          </button>
        </div>
      </div>

      {/* Visual stage flow */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STAGES.map((stage, i) => {
          const count = rules.filter(r => r.trigger_stage === stage.value && r.is_active).length
          return (
            <div key={stage.value} className="flex items-center">
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="rounded-lg px-3 py-1.5 text-xs font-medium border"
                  style={{ backgroundColor: stage.bg, borderColor: stage.color, color: stage.color }}>
                  {stage.label}
                </div>
                {count > 0 && (
                  <span className="text-[10px] mt-1 font-medium" style={{ color: stage.color }}>{count} regla{count > 1 ? 's' : ''}</span>
                )}
              </div>
              {i < STAGES.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-1 flex-shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* Create/Edit form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm p-6 space-y-5">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {editingRule ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingRule ? 'Editar regla' : 'Nueva regla'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Follow-up post-proposal"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripcion</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Opcional"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Trigger visual */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Trigger</label>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-600 dark:text-gray-300">Cuando un deal</span>
              <select value={form.trigger_condition} onChange={e => setForm(p => ({ ...p, trigger_condition: e.target.value }))}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm font-medium">
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label.toLowerCase()}</option>)}
              </select>
              <select value={form.trigger_stage} onChange={e => setForm(p => ({ ...p, trigger_stage: e.target.value }))}
                className="rounded-lg border-2 px-3 py-1.5 text-sm font-semibold"
                style={{ borderColor: getStage(form.trigger_stage).color, color: getStage(form.trigger_stage).color, backgroundColor: getStage(form.trigger_stage).bg }}>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">valor min:</span>
                <input type="number" value={form.conditions.min_value || ''} onChange={e => setForm(p => ({ ...p, conditions: { ...p.conditions, min_value: Number(e.target.value) || undefined } }))}
                  placeholder="—" className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1 text-gray-900 dark:text-gray-100" />
                <span className="text-xs text-gray-400">EUR</span>
              </div>
            </div>
          </div>

          {/* Actions builder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Acciones ({form.actions.length})
              </label>
              <button onClick={addAction} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" />Anadir accion
              </button>
            </div>
            <div className="space-y-2">
              {form.actions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700">
                  <span className="text-lg mt-0.5">{getActionType(action.type).icon}</span>
                  <div className="flex-1 space-y-2">
                    <select value={action.type} onChange={e => updateAction(idx, 'type', e.target.value)}
                      className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100 font-medium">
                      {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>

                    {action.type === 'create_action' && (
                      <div className="flex gap-2">
                        <input value={action.config.description || ''} onChange={e => updateAction(idx, 'description', e.target.value)} placeholder="Descripcion de la tarea..."
                          className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100" />
                        <select value={action.config.priority || 'medium'} onChange={e => updateAction(idx, 'priority', e.target.value)}
                          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100">
                          <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Critica</option>
                        </select>
                        <input type="number" value={action.config.due_days || ''} onChange={e => updateAction(idx, 'due_days', Number(e.target.value))} placeholder="Dias"
                          className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100" title="Dias hasta vencimiento" />
                      </div>
                    )}
                    {action.type === 'notify' && (
                      <input value={action.config.message || ''} onChange={e => updateAction(idx, 'message', e.target.value)} placeholder="Mensaje de notificacion..."
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100" />
                    )}
                    {action.type === 'send_email' && (
                      <div className="flex gap-2">
                        <input value={action.config.subject || ''} onChange={e => updateAction(idx, 'subject', e.target.value)} placeholder="Asunto del email..."
                          className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100" />
                        <input value={action.config.template || ''} onChange={e => updateAction(idx, 'template', e.target.value)} placeholder="Template ID"
                          className="w-32 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100" />
                      </div>
                    )}
                    {action.type === 'update_field' && (
                      <div className="flex gap-2">
                        <select value={action.config.field || ''} onChange={e => updateAction(idx, 'field', e.target.value)}
                          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100">
                          <option value="">Campo...</option>
                          <option value="status">Estado del lead</option>
                          <option value="priority">Prioridad</option>
                          <option value="assigned_to">Asignado a</option>
                          <option value="tags">Tags</option>
                        </select>
                        <input value={action.config.value || ''} onChange={e => updateAction(idx, 'value', e.target.value)} placeholder="Nuevo valor..."
                          className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100" />
                      </div>
                    )}
                    {action.type === 'score' && (
                      <p className="text-xs text-gray-400">Recalcula automaticamente el deal score con el agente AGENT-DEAL-001</p>
                    )}
                  </div>
                  <button onClick={() => removeAction(idx)} className="text-gray-400 hover:text-red-500 mt-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {form.actions.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  Sin acciones — haz clic en "+ Anadir accion"
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
              {editingRule ? 'Guardar cambios' : 'Crear regla'}
            </button>
            <button onClick={() => { setShowCreate(false); setEditingRule(null) }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />Cargando reglas...
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <GitBranch className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Sin reglas configuradas</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">Crea una regla o carga las reglas por defecto</p>
          <button onClick={async () => {
            try { const { data } = await rulesApi.seedDefaults(); toast.success(`${data.seeded} reglas creadas`); loadRules() }
            catch (e) { toast.error(e.response?.data?.detail || 'Error') }
          }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Zap className="w-4 h-4 inline mr-1" />Cargar 5 reglas por defecto
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const stage = getStage(rule.trigger_stage)
            const cond = CONDITIONS.find(c => c.value === rule.trigger_condition) || CONDITIONS[0]
            return (
              <div key={rule.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all hover:shadow-sm ${rule.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-50'}`}>
                <div className="flex items-center gap-4">
                  {/* Toggle */}
                  <button onClick={() => handleToggle(rule)} className="flex-shrink-0" title={rule.is_active ? 'Desactivar' : 'Activar'}>
                    <Power className={`w-5 h-5 ${rule.is_active ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`} />
                  </button>

                  {/* Rule info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm">{rule.name}</h3>
                      <ChevronRight className="w-3 h-3 text-gray-300" />
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: stage.bg, color: stage.color, border: `1px solid ${stage.color}30` }}>
                        {cond.label} {stage.label}
                      </span>
                      <ChevronRight className="w-3 h-3 text-gray-300" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(rule.actions || []).map(a => getActionType(a.type).icon).join(' ')} {rule.actions?.length || 0} accion{(rule.actions?.length || 0) !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    {rule.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{rule.description}</p>}
                  </div>

                  {/* Stats + actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400 tabular-nums">{rule.times_triggered || 0}x</span>
                    <button onClick={() => startEdit(rule)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
