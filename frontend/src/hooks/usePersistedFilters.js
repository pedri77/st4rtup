import { useState, useEffect } from 'react'

/**
 * Custom hook para persistir filtros en localStorage
 * 
 * @param {string} key - Key única para identificar los filtros en localStorage
 * @param {object} initialFilters - Estructura inicial de filtros
 * @returns {[filters, setFilters, resetFilters]} - Filtros, setter y reset
 * 
 * @example
 * const [filters, setFilters, resetFilters] = usePersistedFilters('leads-filters', {
 *   status: { type: 'multiselect', label: 'Estado', options: [...], value: [] },
 *   date_range: { type: 'daterange', label: 'Fecha', value: { from: '', to: '' } },
 * })
 */
export function usePersistedFilters(key, initialFilters) {
  // Initialize from localStorage or use initial filters
  const [filters, setFilters] = useState(() => {
    try {
      const stored = localStorage.getItem(`filters_${key}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with initialFilters to ensure all required filters exist
        const merged = { ...initialFilters }
        Object.keys(parsed).forEach(filterKey => {
          if (merged[filterKey]) {
            merged[filterKey] = {
              ...merged[filterKey],
              value: parsed[filterKey].value,
            }
          }
        })
        return merged
      }
    } catch (error) {
      // localStorage read error — use defaults
    }
    return initialFilters
  })

  // Persist to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(`filters_${key}`, JSON.stringify(filters))
    } catch (error) {
      // localStorage write error — ignore
    }
  }, [key, filters])

  // Reset filters to initial state
  const resetFilters = () => {
    setFilters(initialFilters)
    try {
      localStorage.removeItem(`filters_${key}`)
    } catch (error) {
      // localStorage remove error — ignore
    }
  }

  return [filters, setFilters, resetFilters]
}

/**
 * Custom hook para persistir búsqueda en localStorage
 * 
 * @param {string} key - Key única para identificar la búsqueda en localStorage
 * @param {string} initialValue - Valor inicial de búsqueda
 * @returns {[searchQuery, setSearchQuery, clearSearch]} - Query, setter y clear
 */
export function usePersistedSearch(key, initialValue = '') {
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      const stored = localStorage.getItem(`search_${key}`)
      return stored || initialValue
    } catch (error) {
      // localStorage read error — use default
      return initialValue
    }
  })

  useEffect(() => {
    try {
      if (searchQuery) {
        localStorage.setItem(`search_${key}`, searchQuery)
      } else {
        localStorage.removeItem(`search_${key}`)
      }
    } catch (error) {
      // localStorage write error — ignore
    }
  }, [key, searchQuery])

  const clearSearch = () => {
    setSearchQuery('')
    try {
      localStorage.removeItem(`search_${key}`)
    } catch (error) {
      // localStorage clear error — ignore
    }
  }

  return [searchQuery, setSearchQuery, clearSearch]
}

/**
 * Custom hook combinado para filtros y búsqueda persistentes
 * 
 * @param {string} key - Key única base (se añade sufijo para search/filters)
 * @param {object} initialFilters - Estructura inicial de filtros
 * @returns {object} - { filters, setFilters, resetFilters, searchQuery, setSearchQuery, clearSearch, clearAll }
 */
export function usePersistedFilterSearch(key, initialFilters) {
  const [filters, setFilters, resetFilters] = usePersistedFilters(key, initialFilters)
  const [searchQuery, setSearchQuery, clearSearch] = usePersistedSearch(key)

  const clearAll = () => {
    resetFilters()
    clearSearch()
  }

  return {
    filters,
    setFilters,
    resetFilters,
    searchQuery,
    setSearchQuery,
    clearSearch,
    clearAll,
  }
}
