// ═══════════════════════════════════════════════════════════════════════
// Advanced Filters - Componente reutilizable para filtros avanzados
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Search, Filter, X, Calendar, Tag, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

// ─── Multi-Select Dropdown ─────────────────────────────────────────────

export function MultiSelectDropdown({ label, options, value = [], onChange, className = "" }) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOption = (optionValue) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const selectedCount = value.length

  return (
    <div className={`relative ${className}`}>
      <button aria-label="Desplegar"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-sm",
          isOpen ? "border-brand ring-2 ring-brand-light" : "border-gray-200 hover:border-gray-500",
          selectedCount > 0 && "bg-brand-light border-brand"
        )}
      >
        <span className={clsx(
          "truncate",
          selectedCount > 0 ? "text-brand font-medium" : "text-gray-500"
        )}>
          {selectedCount > 0 ? `${label} (${selectedCount})` : label}
        </span>
        <ChevronDown className={clsx(
          "w-4 h-4 transition-transform ml-2 flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200/50 rounded-lg shadow-lg z-20 max-h-64 overflow-auto animate-slide-up">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  id={`msd-${option.value}`}
                  checked={value.includes(option.value)}
                  onChange={() => toggleOption(option.value)}
                  className="rounded border-gray-200 text-brand focus:ring-brand bg-gray-100"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
                {option.count !== undefined && (
                  <span className="ml-auto text-xs text-gray-400">({option.count})</span>
                )}
              </label>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-400">
                Sin opciones disponibles
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Date Range Picker ─────────────────────────────────────────────────

export function DateRangePicker({ label, value, onChange, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-xs font-medium text-gray-700">
        <Calendar className="w-3 h-3 inline mr-1" />
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={value?.from || ''}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          aria-label="Fecha desde"
          className="input text-sm py-1.5"
        />
        <input
          type="date"
          value={value?.to || ''}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          aria-label="Fecha hasta"
          className="input text-sm py-1.5"
        />
      </div>
    </div>
  )
}

// ─── Tag Filter ────────────────────────────────────────────────────────

export function TagFilter({ tags = [], onRemove }) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2 py-1 bg-brand-light text-brand rounded-md text-xs font-medium animate-scale-in"
        >
          <Tag className="w-3 h-3" />
          {tag.label}
          <button aria-label="Cerrar"
            onClick={() => onRemove(tag)}
            className="hover:text-brand-dark transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

// ─── Search Bar with Filters ───────────────────────────────────────────

export function SearchWithFilters({
  searchValue,
  onSearchChange,
  placeholder = "Buscar...",
  filters,
  onFiltersChange,
  className = ""
}) {
  const [showFilters, setShowFilters] = useState(false)
  const activeFiltersCount = Object.values(filters || {}).filter(Boolean).length

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            id="search-filters"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="input pl-10 pr-4"
          />
          {searchValue && (
            <button aria-label="Cerrar"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            "px-4 py-2 rounded-lg border transition-all font-medium text-sm flex items-center gap-2",
            showFilters || activeFiltersCount > 0
              ? "bg-brand text-gray-800 border-brand hover:bg-brand-dark"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-500"
          )}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card animate-slide-down space-y-4">
          {filters && Object.entries(filters).map(([key, filter]) => (
            <div key={key}>
              {filter.type === 'multiselect' && (
                <MultiSelectDropdown
                  label={filter.label}
                  options={filter.options}
                  value={filter.value || []}
                  onChange={(value) => onFiltersChange(key, value)}
                />
              )}
              {filter.type === 'daterange' && (
                <DateRangePicker
                  label={filter.label}
                  value={filter.value || {}}
                  onChange={(value) => onFiltersChange(key, value)}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                Object.keys(filters).forEach(key => onFiltersChange(key, null))
              }}
              className="btn-secondary flex-1 text-sm"
            >
              Limpiar
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="btn-primary flex-1 text-sm"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Filter Summary Bar ────────────────────────────────────────────────

export function FilterSummary({ filters, onClear, resultsCount }) {
  const activeTags = []

  if (filters) {
    Object.entries(filters).forEach(([key, filter]) => {
      if (filter.type === 'multiselect' && filter.value?.length > 0) {
        filter.value.forEach(v => {
          const option = filter.options.find(opt => opt.value === v)
          if (option) {
            activeTags.push({
              key,
              value: v,
              label: `${filter.label}: ${option.label}`
            })
          }
        })
      }
      if (filter.type === 'daterange' && (filter.value?.from || filter.value?.to)) {
        activeTags.push({
          key,
          label: `${filter.label}: ${filter.value.from || '...'} - ${filter.value.to || '...'}`
        })
      }
    })
  }

  if (activeTags.length === 0) return null

  return (
    <div className="flex items-center gap-3 p-3 bg-brand-light border border-brand-light rounded-lg animate-slide-down">
      <div className="flex items-center gap-2 text-sm text-brand font-medium">
        <Filter className="w-4 h-4" />
        {resultsCount !== undefined && (
          <span>{resultsCount} resultados</span>
        )}
      </div>
      <div className="flex-1 flex flex-wrap gap-2">
        <TagFilter
          tags={activeTags}
          onRemove={(tag) => {
            if (tag.value) {
              const currentValues = filters[tag.key].value
              onClear(tag.key, currentValues.filter(v => v !== tag.value))
            } else {
              onClear(tag.key, null)
            }
          }}
        />
      </div>
      <button
        onClick={() => Object.keys(filters).forEach(key => onClear(key, null))}
        className="text-sm text-brand hover:text-brand-dark font-medium whitespace-nowrap transition-colors"
      >
        Limpiar todo
      </button>
    </div>
  )
}
