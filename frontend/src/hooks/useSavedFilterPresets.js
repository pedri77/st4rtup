import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook para gestionar presets guardados de filtros
 *
 * Los presets permiten a los usuarios guardar configuraciones de filtros
 * con un nombre personalizado y cargarlas rápidamente.
 *
 * @param {string} key - Key única para identificar los presets (ej: 'leads', 'reviews')
 * @param {object} currentFilters - Filtros actuales
 * @param {string} currentSearch - Búsqueda actual
 * @param {function} onLoadPreset - Callback cuando se carga un preset
 *
 * @returns {object} - API para gestionar presets
 *
 * @example
 * const {
 *   presets,
 *   savePreset,
 *   loadPreset,
 *   deletePreset,
 *   updatePreset,
 * } = useSavedFilterPresets('leads', filters, searchQuery, ({ filters, searchQuery }) => {
 *   setFilters(filters)
 *   setSearchQuery(searchQuery)
 * })
 */
export function useSavedFilterPresets(key, currentFilters, currentSearch, onLoadPreset) {
  const storageKey = `filter-presets:${key}`

  // Load presets from localStorage
  const [presets, setPresets] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Ensure it's an array
        return Array.isArray(parsed) ? parsed : []
      }
    } catch (error) {
      // localStorage read error — use defaults
    }
    return []
  })

  // Persist presets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(presets))
    } catch (error) {
      // localStorage write error — ignore
    }
  }, [storageKey, presets])

  /**
   * Save current filters and search as a named preset
   * @param {string} name - Name for the preset
   * @returns {object} - The created preset
   */
  const savePreset = useCallback((name) => {
    if (!name || !name.trim()) {
      throw new Error('Preset name is required')
    }

    const newPreset = {
      id: generateId(),
      name: name.trim(),
      filters: currentFilters,
      searchQuery: currentSearch || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setPresets(prev => [...prev, newPreset])
    return newPreset
  }, [currentFilters, currentSearch])

  /**
   * Load a saved preset
   * @param {string} presetId - ID of the preset to load
   */
  const loadPreset = useCallback((presetId) => {
    const preset = presets.find(p => p.id === presetId)
    if (!preset) {
      throw new Error('Preset not found')
    }

    onLoadPreset({
      filters: preset.filters,
      searchQuery: preset.searchQuery,
    })

    return preset
  }, [presets, onLoadPreset])

  /**
   * Delete a saved preset
   * @param {string} presetId - ID of the preset to delete
   */
  const deletePreset = useCallback((presetId) => {
    setPresets(prev => prev.filter(p => p.id !== presetId))
  }, [])

  /**
   * Update an existing preset with current filters
   * @param {string} presetId - ID of the preset to update
   */
  const updatePreset = useCallback((presetId) => {
    setPresets(prev => prev.map(preset => {
      if (preset.id === presetId) {
        return {
          ...preset,
          filters: currentFilters,
          searchQuery: currentSearch || '',
          updatedAt: new Date().toISOString(),
        }
      }
      return preset
    }))
  }, [currentFilters, currentSearch])

  /**
   * Rename a preset
   * @param {string} presetId - ID of the preset to rename
   * @param {string} newName - New name for the preset
   */
  const renamePreset = useCallback((presetId, newName) => {
    if (!newName || !newName.trim()) {
      throw new Error('Preset name is required')
    }

    setPresets(prev => prev.map(preset => {
      if (preset.id === presetId) {
        return {
          ...preset,
          name: newName.trim(),
          updatedAt: new Date().toISOString(),
        }
      }
      return preset
    }))
  }, [])

  /**
   * Check if current filters match a saved preset
   * @param {string} presetId - ID of the preset to check
   * @returns {boolean}
   */
  const isCurrentPreset = useCallback((presetId) => {
    const preset = presets.find(p => p.id === presetId)
    if (!preset) return false

    // Deep comparison of filters and search
    return (
      JSON.stringify(preset.filters) === JSON.stringify(currentFilters) &&
      preset.searchQuery === (currentSearch || '')
    )
  }, [presets, currentFilters, currentSearch])

  return {
    presets,
    savePreset,
    loadPreset,
    deletePreset,
    updatePreset,
    renamePreset,
    isCurrentPreset,
  }
}

/**
 * Generate a simple unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Hook to check if there are any active filters
 * @param {object} filters - Filter object from usePersistedFilters
 * @returns {boolean}
 */
export function hasActiveFilters(filters) {
  return Object.values(filters).some(filter => {
    if (Array.isArray(filter.value)) {
      return filter.value.length > 0
    }
    if (typeof filter.value === 'object' && filter.value !== null) {
      // For date ranges
      return Object.values(filter.value).some(v => v !== '' && v !== null)
    }
    return filter.value !== '' && filter.value !== null && filter.value !== undefined
  })
}
