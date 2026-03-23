import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, CheckCircle2, AlertCircle, Download, FileText } from 'lucide-react'
import { leadsApi } from '@/services/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Papa from 'papaparse'

const REQUIRED_FIELDS = ['company_name']
const OPTIONAL_FIELDS = [
  'company_cif', 'company_website', 'company_sector', 'company_size',
  'company_city', 'company_province', 'company_country',
  'contact_name', 'contact_title', 'contact_email', 'contact_phone',
  'source', 'status', 'score'
]

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

export default function LeadsImport({ isOpen, onClose }) {
  const [step, setStep] = useState(1) // 1: Upload, 2: Mapping, 3: Preview, 4: Import
  const [file, setFile] = useState(null)
  const [csvData, setCsvData] = useState(null)
  const [mapping, setMapping] = useState({})
  const [importResults, setImportResults] = useState(null)
  const queryClient = useQueryClient()

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0]
    if (!uploadedFile) return

    if (!uploadedFile.name.endsWith('.csv')) {
      toast.error('❌ Solo se permiten archivos CSV')
      return
    }

    setFile(uploadedFile)

    // Parse CSV
    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error('❌ El archivo CSV está vacío')
          return
        }

        setCsvData(results)

        // Auto-map columns that match exactly
        const autoMapping = {}
        const csvHeaders = results.meta.fields
        csvHeaders.forEach(header => {
          const normalizedHeader = header.toLowerCase().trim()
          const match = ALL_FIELDS.find(field =>
            field.toLowerCase() === normalizedHeader ||
            field.toLowerCase().replace('_', '') === normalizedHeader.replace(/\s+/g, '')
          )
          if (match) {
            autoMapping[header] = match
          }
        })

        setMapping(autoMapping)
        setStep(2)
        toast.success(`✅ Archivo cargado: ${results.data.length} filas`)
      },
      error: (error) => {
        toast.error(`❌ Error al leer CSV: ${error.message}`)
      }
    })
  }

  const importLeads = useMutation({
    mutationFn: async (leads) => {
      const results = {
        total: leads.length,
        success: 0,
        failed: 0,
        errors: []
      }

      for (const lead of leads) {
        try {
          await leadsApi.create(lead)
          results.success++
        } catch (error) {
          results.failed++
          results.errors.push({
            lead: lead.company_name,
            error: error.response?.data?.detail || 'Error desconocido'
          })
        }
      }

      return results
    },
    onSuccess: (results) => {
      setImportResults(results)
      setStep(4)
      queryClient.invalidateQueries(['leads'])

      if (results.failed === 0) {
        toast.success(`✅ ${results.success} leads importados correctamente`)
      } else {
        toast.error(`⚠️ ${results.success} exitosos, ${results.failed} fallidos`)
      }
    },
    onError: (error) => {
      toast.error(`❌ Error en la importación: ${error.message}`)
    }
  })

  const handleImport = () => {
    // Transform CSV data using mapping
    const leads = csvData.data.map(row => {
      const lead = {
        is_critical_infrastructure: false,
        is_public_sector: false
      }

      Object.entries(mapping).forEach(([csvHeader, crmField]) => {
        if (crmField && row[csvHeader]) {
          lead[crmField] = row[csvHeader]
        }
      })

      // Set defaults
      if (!lead.score) lead.score = 50
      if (!lead.source) lead.source = 'other'
      if (!lead.status) lead.status = 'new'
      if (!lead.company_country) lead.company_country = 'España'

      return lead
    })

    // Filter only leads with company_name
    const validLeads = leads.filter(l => l.company_name)

    if (validLeads.length === 0) {
      toast.error('❌ No hay leads válidos para importar')
      return
    }

    setStep(3)

    // Auto-import after showing preview (or add a confirm button)
    setTimeout(() => {
      importLeads.mutate(validLeads)
    }, 1000)
  }

  const downloadTemplate = () => {
    const template = [
      {
        company_name: 'Ejemplo Corp S.L.',
        company_cif: 'B12345678',
        company_website: 'https://ejemplo.com',
        company_sector: 'Tecnología',
        company_size: '51-200',
        company_city: 'Madrid',
        company_province: 'Madrid',
        company_country: 'España',
        contact_name: 'Juan Pérez',
        contact_title: 'CTO',
        contact_email: 'juan@ejemplo.com',
        contact_phone: '+34 600000000',
        source: 'website',
        status: 'new',
        score: 75
      }
    ]

    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_leads.csv'
    a.click()
    URL.revokeObjectURL(url)

    toast.success('✅ Plantilla descargada')
  }

  const reset = () => {
    setStep(1)
    setFile(null)
    setCsvData(null)
    setMapping({})
    setImportResults(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700/50">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Importar Leads</h2>
            <p className="text-sm text-gray-600 mt-1">
              Paso {step} de 4
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <Step1Upload
              onFileSelect={handleFileUpload}
              onDownloadTemplate={downloadTemplate}
            />
          )}

          {step === 2 && csvData && (
            <Step2Mapping
              csvHeaders={csvData.meta.fields}
              mapping={mapping}
              onMappingChange={setMapping}
              onNext={handleImport}
              onBack={reset}
            />
          )}

          {step === 3 && (
            <Step3Importing />
          )}

          {step === 4 && importResults && (
            <Step4Results
              results={importResults}
              onClose={onClose}
              onImportMore={reset}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function Step1Upload({ onFileSelect, onDownloadTemplate }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Sube tu archivo CSV
        </h3>
        <p className="text-sm text-gray-600">
          Importa múltiples leads de una vez desde un archivo CSV
        </p>
      </div>

      {/* Upload area */}
      <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-cyan-500 transition-colors cursor-pointer">
        <input
          type="file"
          accept=".csv"
          onChange={onFileSelect}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-white mb-1">
            Click para seleccionar archivo CSV
          </p>
          <p className="text-xs text-gray-500">
            o arrastra y suelta aquí
          </p>
        </label>
      </div>

      {/* Download template */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-300">
              ¿Primera vez importando?
            </h4>
            <p className="text-sm text-blue-400 mt-1">
              Descarga nuestra plantilla para ver el formato correcto
            </p>
            <button
              onClick={onDownloadTemplate}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Descargar plantilla CSV →
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3">
          Campos del CSV:
        </h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>company_name</strong> (obligatorio)</li>
          <li>• company_cif, company_website, company_sector, company_size</li>
          <li>• company_city, company_province, company_country</li>
          <li>• contact_name, contact_title, contact_email, contact_phone</li>
          <li>• source, status, score</li>
        </ul>
      </div>
    </div>
  )
}

function Step2Mapping({ csvHeaders, mapping, onMappingChange, onNext, onBack }) {
  const unmappedCount = csvHeaders.filter(h => !mapping[h]).length
  const hasRequiredFields = REQUIRED_FIELDS.every(field =>
    Object.values(mapping).includes(field)
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Mapea las columnas
        </h3>
        <p className="text-sm text-gray-600">
          Relaciona las columnas del CSV con los campos del CRM
        </p>
      </div>

      {!hasRequiredFields && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">
              Falta mapear campos obligatorios
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Debes mapear al menos: <strong>company_name</strong>
            </p>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div className="border border-gray-700/50 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Columna CSV
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Campo CRM
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {csvHeaders.map((header) => (
              <tr key={header}>
                <td className="px-4 py-3 text-sm font-medium text-white">
                  {header}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={mapping[header] || ''}
                    onChange={(e) => {
                      const newMapping = { ...mapping }
                      if (e.target.value) {
                        newMapping[header] = e.target.value
                      } else {
                        delete newMapping[header]
                      }
                      onMappingChange(newMapping)
                    }}
                    aria-label={`Mapear columna ${header}`}
                    className="input text-sm"
                  >
                    <option value="">No mapear</option>
                    <optgroup label="Obligatorios">
                      {REQUIRED_FIELDS.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Opcionales">
                      {OPTIONAL_FIELDS.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </optgroup>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-gray-600">Columnas mapeadas:</span>{' '}
          <span className="font-semibold text-white">
            {csvHeaders.length - unmappedCount}/{csvHeaders.length}
          </span>
        </div>
        {unmappedCount > 0 && (
          <span className="text-yellow-600">
            {unmappedCount} columnas sin mapear serán ignoradas
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary">
          Atrás
        </button>
        <button
          onClick={onNext}
          disabled={!hasRequiredFields}
          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}

function Step3Importing() {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-6"></div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Importando leads...
      </h3>
      <p className="text-sm text-gray-600">
        Esto puede tomar unos momentos
      </p>
    </div>
  )
}

function Step4Results({ results, onClose, onImportMore }) {
  const hasErrors = results.failed > 0

  return (
    <div className="space-y-6">
      <div className="text-center">
        {hasErrors ? (
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        ) : (
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        )}
        <h3 className="text-lg font-semibold text-white mb-2">
          Importación completada
        </h3>
        <p className="text-sm text-gray-600">
          {results.success} leads importados correctamente
          {hasErrors && `, ${results.failed} fallidos`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-white">{results.total}</p>
          <p className="text-sm text-gray-600">Total</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">{results.success}</p>
          <p className="text-sm text-gray-600">Exitosos</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-600">{results.failed}</p>
          <p className="text-sm text-gray-600">Fallidos</p>
        </div>
      </div>

      {/* Errors list */}
      {hasErrors && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">
            Errores de importación:
          </h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {results.errors.map((error, idx) => (
              <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-900">{error.lead}</p>
                <p className="text-xs text-red-700 mt-1">{error.error}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onImportMore} className="btn-secondary flex-1">
          Importar Más
        </button>
        <button onClick={onClose} className="btn-primary flex-1">
          Cerrar
        </button>
      </div>
    </div>
  )
}
