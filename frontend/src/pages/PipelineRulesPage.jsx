/**
 * PipelineRulesPage — Visual pipeline automation rules.
 * Create rules that trigger actions when deals change stage.
 */
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import api from '@/services/api'

const rulesApi = {
  list: () => api.get('/pipeline-rules/'),
  create: (data) => api.post('/pipeline-rules/', data),
  update: (id, data) => api.put(`/pipeline-rules/${id}`, data),
  delete: (id) => api.delete(`/pipeline-rules/${id}`),
  seedDefaults: () => api.post('/pipeline-rules/seed-defaults'),
}

const STAGES = [
  { value: 'discovery', label: 'Discovery', color: 'bg-gray-400' },
  { value: 'qualification', label: 'Qualification', color: 'bg-blue-500' },
  { value: 'proposal', label: 'Proposal', color: 'bg-yellow-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { value: 'closed_won', label: 'Closed Won', color: 'bg-green-500' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
]

const ACTION_TYPES = [
  { value: 'create_action', label: 'Crear accion', icon: '✅' },
  { value: 'notify', label: 'Notificar', icon: '🔔' },
  { value: 'send_email', label: 'Enviar email', icon: '📧' },
  { value: 'update_field', label: 'Actualizar campo', icon: '✏️' },
  { value: 'score', label: 'Deal scoring', icon: '📊' },
]

export default function PipelineRulesPage() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingRule, setEditingRule] = useState(null)

  const [form, setForm] = useState({
    name: '', description: '', trigger_stage: 'qualification',
    trigger_condition: 'enters', conditions: {}, actions: [], priority: 0,
  })

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
      setForm({ name: '', description: '', trigger_stage: 'qualification', trigger_condition: 'enters', conditions: {}, actions: [], priority: 0 })
      loadRules()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta regla?')) return
    try {
      await rulesApi.delete(id)
      toast.success('Regla eliminada')
      loadRules()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  const handleToggle = async (rule) => {
    try {
      await rulesApi.update(rule.id, { is_active: !rule.is_active })
      loadRules()
    } catch (e) { toast.error('Error') }
  }

  const addAction = () => {
    setForm(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'create_action', config: { description: '', priority: 'medium', due_days: 3 } }],
    }))
  }

  const removeAction = (idx) => {
    setForm(prev => ({ ...prev, actions: prev.actions.filter((_, i) => i !== idx) }))
  }

  const updateAction = (idx, field, value) => {
    setForm(prev => {
      const actions = [...prev.actions]
      if (field === 'type') actions[idx] = { type: value, config: {} }
      else actions[idx] = { ...actions[idx], config: { ...actions[idx].config, [field]: value } }
      return { ...prev, actions }
    })
  }

  const stageColor = (stage) => STAGES.find(s => s.value === stage)?.color || 'bg-gray-400'
  const stageLabel = (stage) => STAGES.find(s => s.value === stage)?.label || stage

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline Automation</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Reglas automaticas cuando un deal cambia de stage</p>
        </div>
        <div className="flex gap-2">
          <button onClick={async () => {
            try { const { data } = await rulesApi.seedDefaults(); toast.success(`${data.seeded} reglas por defecto`); loadRules() }
            catch (e) { toast.error(e.response?.data?.detail || 'Error') }
          }} className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
            Cargar defaults
          </button>
          <button onClick={() => { setEditingRule(null); setForm({ name: '', description: '', trigger_stage: 'qualification', trigger_condition: 'enters', conditions: {}, actions: [], priority: 0 }); setShowCreate(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Nueva regla
          </button>
        </div>
      </div>

      {/* Create/Edit form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">{editingRule ? 'Editar regla' : 'Nueva regla'}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre de la regla"
              className="rounded-lg border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm" />
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descripcion (opcional)"
              className="rounded-lg border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cuando el deal entra en</label>
              <select value={form.trigger_stage} onChange={e => setForm(p => ({ ...p, trigger_stage: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm">
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Condicion</label>
              <select value={form.trigger_condition} onChange={e => setForm(p => ({ ...p, trigger_condition: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm">
                <option value="enters">Entra en stage</option>
                <option value="leaves">Sale del stage</option>
                <option value="any">Cualquier cambio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valor minimo (EUR)</label>
              <input type="number" value={form.conditions.min_value || ''} onChange={e => setForm(p => ({ ...p, conditions: { ...p.conditions, min_value: Number(e.target.value) || undefined } }))}
                placeholder="Sin minimo"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Acciones ({form.actions.length})</label>
              <button onClick={addAction} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Añadir accion</button>
            </div>
            <div className="space-y-2">
              {form.actions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <select value={action.type} onChange={e => updateAction(idx, 'type', e.target.value)}
                    className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100">
                    {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.icon} {a.label}</option>)}
                  </select>
                  {action.type === 'create_action' && (
                    <>
                      <input value={action.config.description || ''} onChange={e => updateAction(idx, 'description', e.target.value)} placeholder="Descripcion..."
                        className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100" />
                      <select value={action.config.priority || 'medium'} onChange={e => updateAction(idx, 'priority', e.target.value)}
                        className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100">
                        <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Critica</option>
                      </select>
                    </>
                  )}
                  {action.type === 'notify' && (
                    <input value={action.config.message || ''} onChange={e => updateAction(idx, 'message', e.target.value)} placeholder="Mensaje..."
                      className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1.5 text-gray-900 dark:text-gray-100" />
                  )}
                  <button onClick={() => removeAction(idx)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {editingRule ? 'Guardar cambios' : 'Crear regla'}
            </button>
            <button onClick={() => { setShowCreate(false); setEditingRule(null) }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">Sin reglas configuradas</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Crea una regla o carga las reglas por defecto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-colors ${rule.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => handleToggle(rule)} className={`w-10 h-5 rounded-full transition-colors relative ${rule.is_active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rule.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">{rule.name}</h3>
                    <span className={`w-2 h-2 rounded-full ${stageColor(rule.trigger_stage)}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{stageLabel(rule.trigger_stage)}</span>
                  </div>
                  {rule.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rule.description}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-400">{rule.actions?.length || 0} acciones</span>
                    <span className="text-[10px] text-gray-400">Ejecutada {rule.times_triggered || 0}x</span>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button onClick={() => { setEditingRule(rule.id); setForm({ name: rule.name, description: rule.description || '', trigger_stage: rule.trigger_stage, trigger_condition: rule.trigger_condition, conditions: rule.conditions || {}, actions: rule.actions || [], priority: rule.priority }); setShowCreate(true) }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600">Editar</button>
                  <button onClick={() => handleDelete(rule.id)} className="px-2 py-1 text-xs text-gray-500 hover:text-red-600">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
