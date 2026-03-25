import { useState, Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { Star, Save, Pencil, Trash2, Check, X, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { hasActiveFilters } from '@/hooks/useSavedFilterPresets'

/**
 * Component to manage saved filter presets
 *
 * @example
 * <SavedFilterPresets
 *   presets={presets}
 *   currentFilters={filters}
 *   onSave={savePreset}
 *   onLoad={loadPreset}
 *   onDelete={deletePreset}
 *   onUpdate={updatePreset}
 *   onRename={renamePreset}
 *   isCurrentPreset={isCurrentPreset}
 * />
 */
export default function SavedFilterPresets({
  presets,
  currentFilters,
  onSave,
  onLoad,
  onDelete,
  onUpdate,
  onRename,
  isCurrentPreset,
}) {
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [editingPresetId, setEditingPresetId] = useState(null)
  const [presetName, setPresetName] = useState('')

  const hasFilters = hasActiveFilters(currentFilters)

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error('⚠️ Introduce un nombre para el filtro')
      return
    }

    try {
      onSave(presetName)
      toast.success(`✅ Filtro "${presetName}" guardado`)
      setPresetName('')
      setShowSaveDialog(false)
    } catch (error) {
      toast.error(`❌ Error: ${error.message}`)
    }
  }

  const handleLoadPreset = (presetId, presetName) => {
    try {
      onLoad(presetId)
      toast.success(`✅ Filtro "${presetName}" cargado`)
    } catch (error) {
      toast.error(`❌ Error: ${error.message}`)
    }
  }

  const handleDeletePreset = (presetId, presetName) => {
    if (confirm(`¿Eliminar el filtro "${presetName}"?`)) {
      try {
        onDelete(presetId)
        toast.success(`🗑️ Filtro "${presetName}" eliminado`)
      } catch (error) {
        toast.error(`❌ Error: ${error.message}`)
      }
    }
  }

  const handleUpdatePreset = (presetId, presetName) => {
    if (confirm(`¿Actualizar el filtro "${presetName}" con los filtros actuales?`)) {
      try {
        onUpdate(presetId)
        toast.success(`✅ Filtro "${presetName}" actualizado`)
      } catch (error) {
        toast.error(`❌ Error: ${error.message}`)
      }
    }
  }

  const handleRenamePreset = (presetId, oldName) => {
    const newName = prompt(`Nuevo nombre para "${oldName}":`, oldName)
    if (newName && newName.trim() && newName !== oldName) {
      try {
        onRename(presetId, newName)
        toast.success(`✅ Filtro renombrado a "${newName}"`)
      } catch (error) {
        toast.error(`❌ Error: ${error.message}`)
      }
    }
  }

  return (
    <div className="relative">
      <Menu as="div" className="relative inline-block text-left">
        <Menu.Button
          className={clsx(
            'btn-secondary flex items-center gap-2',
            presets.length > 0 && 'relative'
          )}
        >
          <Star className="w-4 h-4" />
          Filtros Guardados
          <ChevronDown className="w-4 h-4 text-gray-400" />
          {presets.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-indigo-600 text-gray-800 text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {presets.length}
            </span>
          )}
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-80 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-200/50">
            <div className="p-2">
              {/* Save current filters button */}
              <Menu.Item>
                <button
                  onClick={() => setShowSaveDialog(true)}
                  disabled={!hasFilters}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    hasFilters
                      ? 'text-indigo-400 bg-indigo-900/30 hover:bg-indigo-900/50'
                      : 'text-gray-500 bg-gray-50 cursor-not-allowed'
                  )}
                >
                  <Save className="w-4 h-4" />
                  Guardar filtros actuales
                </button>
              </Menu.Item>

              {/* Divider */}
              {presets.length > 0 && (
                <div className="my-2 border-t border-gray-200/50" />
              )}

              {/* Saved presets list */}
              {presets.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <Star className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    No hay filtros guardados
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Configura filtros y guárdalos para acceso rápido
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {presets.map((preset) => (
                    <PresetItem
                      key={preset.id}
                      preset={preset}
                      isActive={isCurrentPreset(preset.id)}
                      onLoad={() => handleLoadPreset(preset.id, preset.name)}
                      onUpdate={() => handleUpdatePreset(preset.id, preset.name)}
                      onRename={() => handleRenamePreset(preset.id, preset.name)}
                      onDelete={() => handleDeletePreset(preset.id, preset.name)}
                    />
                  ))}
                </div>
              )}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Guardar Filtros
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del filtro
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePreset()
                  if (e.key === 'Escape') setShowSaveDialog(false)
                }}
                placeholder="Ej: Hot Leads, Este Mes, Críticos..."
                className="input"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Podrás cargar estos filtros más tarde con un solo clic
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setPresetName('')
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual preset item in the dropdown
 */
function PresetItem({ preset, isActive, onLoad, onUpdate, onRename, onDelete }) {
  const [showActions, setShowActions] = useState(false)

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <div
      className={clsx(
        'group relative rounded-md transition-colors',
        isActive ? 'bg-indigo-900/30' : 'hover:bg-gray-100'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button
        onClick={onLoad}
        className="w-full text-left px-3 py-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={clsx(
              'text-sm font-medium flex items-center gap-2',
              isActive ? 'text-indigo-300' : 'text-gray-800'
            )}>
              {preset.name}
              {isActive && (
                <Check className="w-3 h-3 text-indigo-600" />
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Guardado {formatDate(preset.createdAt)}
            </p>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onUpdate}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Actualizar con filtros actuales"
              >
                <Save className="w-3.5 h-3.5 text-gray-500 hover:text-indigo-600" />
              </button>
              <button
                onClick={onRename}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Renombrar"
              >
                <Pencil className="w-3.5 h-3.5 text-gray-500 hover:text-blue-600" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-600" />
              </button>
            </div>
          )}
        </div>
      </button>
    </div>
  )
}
