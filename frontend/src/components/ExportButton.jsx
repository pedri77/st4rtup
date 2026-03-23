import { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { exportToExcel, exportToCSV } from '@/utils/export'
import clsx from 'clsx'

export default function ExportButton({
  data,
  filename,
  columns,
  transform,
  className = '',
  disabled = false,
  size = 'md' // 'sm' | 'md' | 'lg'
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format) => {
    setExporting(true)
    setShowMenu(false)

    try {
      // Pequeño delay para feedback visual
      await new Promise(resolve => setTimeout(resolve, 300))

      if (format === 'excel') {
        exportToExcel(data, filename, { columns, transform })
      } else if (format === 'csv') {
        exportToCSV(data, filename, { columns, transform })
      }
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Error al exportar datos. Intenta de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || exporting || !data || data.length === 0}
        className={clsx(
          'btn-secondary flex items-center gap-2',
          sizeClasses[size],
          className,
          (disabled || !data || data.length === 0) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {exporting ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Exportar
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && !exporting && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-20 overflow-hidden">
            <button
              onClick={() => handleExport('excel')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left"
            >
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-white">Excel (.xlsx)</p>
                <p className="text-xs text-gray-500">Recomendado</p>
              </div>
            </button>

            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left border-t border-gray-700"
            >
              <FileText className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-white">CSV</p>
                <p className="text-xs text-gray-500">Compatible universal</p>
              </div>
            </button>

            <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700">
              <p className="text-xs text-gray-400">
                {data?.length || 0} registro{data?.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
