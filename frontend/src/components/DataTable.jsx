// ═══════════════════════════════════════════════════════════════════════
// Data Table - Tabla responsive con sorting, paginación y acciones
// ═══════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { TableSkeleton, EmptyState } from './LoadingStates'

// ─── Table Component ───────────────────────────────────────────────────

export default function DataTable({
  columns,
  data = [],
  isLoading = false,
  emptyState,
  onRowClick,
  sortable = true,
  paginated = true,
  pageSize: initialPageSize = 20,
  className = ""
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  // Sorting
  const sortedData = sortable && sortConfig.key
    ? [...data].sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]

        if (aVal === bVal) return 0
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        const comparison = aVal < bVal ? -1 : 1
        return sortConfig.direction === 'asc' ? comparison : -comparison
      })
    : data

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = paginated
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData

  const handleSort = (key) => {
    if (!sortable) return

    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (columnKey) => {
    if (!sortable || sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4 text-brand" />
      : <ChevronDown className="w-4 h-4 text-brand" />
  }

  // Loading State
  if (isLoading) {
    return <TableSkeleton rows={pageSize} columns={columns.length} />
  }

  // Empty State
  if (!data || data.length === 0) {
    if (emptyState) {
      return emptyState
    }
    return (
      <EmptyState
        title="Sin datos"
        description="No hay registros para mostrar"
      />
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className="bg-gray-50 border-b border-gray-200/50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={clsx(
                      "px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider",
                      column.sortable !== false && sortable && "cursor-pointer hover:bg-gray-50 transition-colors select-none",
                      column.className
                    )}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                    style={{ width: column.width }}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable !== false && sortable && getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-gray-700/50">
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className={clsx(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-gray-100",
                    rowIndex % 2 === 0 ? "bg-transparent" : "bg-gray-50"
                  )}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        "px-4 py-3 text-sm text-gray-800",
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-gray-200/50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length}
            </span>
            <select
              id="dt-page-size"
              aria-label="Filas por página"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="ml-2 border border-gray-200 rounded-md px-2 py-1 text-sm bg-gray-100 text-gray-800 focus:ring-2 focus:ring-brand-light focus:border-transparent"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size} por página</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Primera
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 mx-2">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={clsx(
                        "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                        currentPage === page
                          ? "bg-brand text-gray-800"
                          : "hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      {page}
                    </button>
                  )
                }
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-1 text-gray-400">...</span>
                }
                return null
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Última
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Column Helpers ────────────────────────────────────────────────────

export const ColumnRenderers = {
  // Badge renderer
  badge: (value, variant = 'default') => {
    const variants = {
      default: 'bg-gray-100 text-gray-700',
      success: 'bg-green-50 text-green-400',
      warning: 'bg-yellow-50 text-yellow-400',
      error: 'bg-red-900/30 text-red-400',
      info: 'bg-blue-900/30 text-blue-400',
    }
    return (
      <span className={`badge ${variants[variant]}`}>
        {value}
      </span>
    )
  },

  // Date renderer
  date: (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  },

  // Currency renderer
  currency: (value, currency = 'EUR') => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency
    }).format(value)
  },

  // Percentage renderer
  percentage: (value) => {
    if (value === null || value === undefined) return '-'
    return `${value}%`
  },

  // Truncate text
  truncate: (value, length = 50) => {
    if (!value) return '-'
    if (value.length <= length) return value
    return `${value.slice(0, length)}...`
  },
}
