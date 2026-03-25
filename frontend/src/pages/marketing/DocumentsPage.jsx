import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Upload, FolderOpen, Search, Plus, Trash2, Eye, Download,
  ExternalLink, Clock, Tag, Shield, Users, ChevronLeft, History, Link2,
  Filter, X, MoreVertical, File, FileImage, FileSpreadsheet, Presentation,
  ArrowLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { marketingDocumentsApi, campaignsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const tealAccent = 'hsl(170,60%,45%)'

const FOLDERS = [
  { value: '', label: 'Todas', icon: FolderOpen },
  { value: 'templates', label: 'Templates', icon: FileText },
  { value: 'campaigns', label: 'Campañas', icon: FileText },
  { value: 'content', label: 'Contenido', icon: FileText },
  { value: 'battlecards', label: 'Battlecards', icon: Shield },
  { value: 'legal', label: 'Legal', icon: FileText },
]

const STATUSES = [
  { value: '', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
  { value: 'archived', label: 'Archivado' },
]

const STATUS_COLORS = {
  draft: { bg: 'rgba(234,179,8,0.2)', text: T.warning },
  published: { bg: 'rgba(34,197,94,0.2)', text: T.success },
  archived: { bg: 'rgba(107,114,128,0.2)', text: T.fgMuted },
}

const LANGUAGES = [
  { value: '', label: 'Todos' },
  { value: 'es', label: 'ES' },
  { value: 'en', label: 'EN' },
  { value: 'pt', label: 'PT' },
]

const REGULATORY = ['SaaS Best Practices', 'EU AI Act', 'Mixto']
const PERSONAS = ['CEO', 'DPO', 'CTO', 'Compliance Officer', 'CEO', 'IT Manager']

function getFileIcon(fileType) {
  const type = (fileType || '').toLowerCase()
  if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(type)) return FileImage
  if (['xlsx', 'csv'].includes(type)) return FileSpreadsheet
  if (['pptx'].includes(type)) return Presentation
  return File
}

function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const inputStyle = {
  width: '100%', padding: '8px 12px', backgroundColor: T.bg, border: `1px solid ${T.border}`,
  borderRadius: 8, color: T.fg, fontSize: 14, outline: 'none',
}
const selectStyle = { ...inputStyle }
const labelStyle = { display: 'block', fontSize: 14, color: T.fgMuted, marginBottom: 4 }

export default function DocumentsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ folder: '', status: '', language: '', search: '' })
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editDoc, setEditDoc] = useState(null)
  const [showVersionUpload, setShowVersionUpload] = useState(false)

  // ─── Queries ───────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['marketing', 'documents', filters],
    queryFn: async () => {
      const params = { page_size: 50 }
      if (filters.folder) params.folder = filters.folder
      if (filters.status) params.status = filters.status
      if (filters.language) params.language = filters.language
      if (filters.search) params.search = filters.search
      const res = await marketingDocumentsApi.list(params)
      return res.data
    },
  })

  const { data: statsData } = useQuery({
    queryKey: ['marketing', 'documents', 'stats'],
    queryFn: async () => {
      const res = await marketingDocumentsApi.stats()
      return res.data
    },
  })

  const { data: detailData } = useQuery({
    queryKey: ['marketing', 'documents', 'detail', selectedDoc],
    queryFn: async () => {
      const res = await marketingDocumentsApi.get(selectedDoc)
      return res.data
    },
    enabled: !!selectedDoc,
  })

  const { data: versionsData } = useQuery({
    queryKey: ['marketing', 'documents', 'versions', selectedDoc],
    queryFn: async () => {
      const res = await marketingDocumentsApi.listVersions(selectedDoc)
      return res.data
    },
    enabled: !!selectedDoc,
  })

  const { data: campaignsData } = useQuery({
    queryKey: ['marketing', 'campaigns', 'select'],
    queryFn: async () => {
      const res = await campaignsApi.list({ page_size: 100 })
      return res.data?.items || []
    },
  })

  // ─── Mutations ─────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: (formData) => marketingDocumentsApi.upload(formData),
    onSuccess: () => {
      toast.success('Documento subido correctamente')
      queryClient.invalidateQueries({ queryKey: ['marketing', 'documents'] })
      setShowUpload(false)
    },
    onError: () => toast.error('Error al subir documento'),
  })

  const createMutation = useMutation({
    mutationFn: (data) => marketingDocumentsApi.create(data),
    onSuccess: () => {
      toast.success('Documento creado correctamente')
      queryClient.invalidateQueries({ queryKey: ['marketing', 'documents'] })
      setShowCreate(false)
    },
    onError: () => toast.error('Error al crear documento'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => marketingDocumentsApi.update(id, data),
    onSuccess: () => {
      toast.success('Documento actualizado')
      queryClient.invalidateQueries({ queryKey: ['marketing', 'documents'] })
      setEditDoc(null)
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => marketingDocumentsApi.delete(id),
    onSuccess: () => {
      toast.success('Documento eliminado')
      queryClient.invalidateQueries({ queryKey: ['marketing', 'documents'] })
      setSelectedDoc(null)
    },
    onError: () => toast.error('Error al eliminar'),
  })

  const uploadVersionMutation = useMutation({
    mutationFn: ({ docId, formData }) => marketingDocumentsApi.uploadVersion(docId, formData),
    onSuccess: () => {
      toast.success('Nueva versión subida')
      queryClient.invalidateQueries({ queryKey: ['marketing', 'documents'] })
      setShowVersionUpload(false)
    },
    onError: () => toast.error('Error al subir versión'),
  })

  // ─── Detail View ───────────────────────────────────────────

  if (selectedDoc && detailData) {
    const doc = detailData
    const Icon = getFileIcon(doc.file_type)
    const sc = STATUS_COLORS[doc.status] || {}
    return (
      <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

        {/* Back button */}
        <button onClick={() => setSelectedDoc(null)} className="flex items-center gap-2" style={{ color: T.fgMuted, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', fontSize: 14 }}>
          <ChevronLeft className="w-4 h-4" /> Volver a documentos
        </button>

        {/* Header */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${tealAccent}, ${T.cyan})` }}>
                <Icon className="w-7 h-7" style={{ color: '#fff' }} />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, fontFamily: fontDisplay }}>{doc.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, backgroundColor: sc.bg, color: sc.text }}>
                    {doc.status}
                  </span>
                  <span style={{ fontSize: 14, color: T.fgMuted }}>{doc.file_type?.toUpperCase()}</span>
                  <span style={{ fontSize: 14, color: T.fgMuted }}>v{doc.version}</span>
                  <span style={{ fontSize: 14, color: T.fgMuted }}>{formatSize(doc.file_size)}</span>
                  <span style={{ fontSize: 12, backgroundColor: T.muted, color: T.fg, padding: '2px 8px', borderRadius: 4 }}>{doc.language?.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {doc.drive_url && (
                <a href={doc.drive_url} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '8px 12px', backgroundColor: 'hsl(210,80%,55%)', color: '#fff', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                  <ExternalLink className="w-4 h-4" /> Abrir en Drive
                </a>
              )}
              <button onClick={() => setShowVersionUpload(true)}
                style={{ padding: '8px 12px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, border: 'none', cursor: 'pointer' }}>
                <Upload className="w-4 h-4" /> Nueva versión
              </button>
              <button onClick={() => setEditDoc(doc)}
                style={{ padding: '8px 12px', backgroundColor: T.muted, color: T.fg, borderRadius: 8, fontSize: 14, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
                Editar
              </button>
              <button onClick={() => { if (confirm('Eliminar este documento?')) deleteMutation.mutate(doc.id) }}
                style={{ padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.1)', color: T.destructive, borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <span style={{ fontSize: 12, color: T.fgMuted }}>Carpeta</span>
              <p style={{ fontSize: 14, color: T.fg, textTransform: 'capitalize' }}>{doc.folder}</p>
            </div>
            {doc.regulatory_focus && (
              <div>
                <span style={{ fontSize: 12, color: T.fgMuted }}>Normativa</span>
                <p style={{ fontSize: 14, color: T.fg }}>{doc.regulatory_focus}</p>
              </div>
            )}
            {doc.persona_target && (
              <div>
                <span style={{ fontSize: 12, color: T.fgMuted }}>Persona</span>
                <p style={{ fontSize: 14, color: T.fg }}>{doc.persona_target}</p>
              </div>
            )}
            <div>
              <span style={{ fontSize: 12, color: T.fgMuted }}>Creado</span>
              <p style={{ fontSize: 14, color: T.fg }}>{new Date(doc.created_at).toLocaleDateString('es-ES')}</p>
            </div>
          </div>

          {doc.description && (
            <p style={{ marginTop: 16, fontSize: 14, color: T.fgMuted }}>{doc.description}</p>
          )}

          {doc.tags?.length > 0 && (
            <div className="flex gap-2 mt-3">
              {doc.tags.map((t) => (
                <span key={t} style={{ fontSize: 12, backgroundColor: T.muted, color: T.fg, padding: '2px 8px', borderRadius: 4 }}>
                  <Tag className="w-3 h-3 inline mr-1" />{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Versions */}
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
          <h2 className="flex items-center gap-2 mb-4" style={{ fontSize: 18, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>
            <History className="w-5 h-5" style={{ color: T.cyan }} /> Historial de versiones
          </h2>
          {versionsData?.length > 0 ? (
            <div className="space-y-3">
              {versionsData.map((v) => (
                <div key={v.id} className="flex items-center justify-between" style={{ backgroundColor: T.bg, borderRadius: 8, padding: 12 }}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 14, fontWeight: 500, color: T.cyan, fontFamily: fontMono }}>v{v.version}</span>
                    <span style={{ fontSize: 14, color: T.fgMuted }}>{formatSize(v.file_size)}</span>
                    <span style={{ fontSize: 12, color: T.fgMuted }}>{new Date(v.created_at).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.notes && <span style={{ fontSize: 12, color: T.fgMuted }}>{v.notes}</span>}
                    {v.drive_url && (
                      <a href={v.drive_url} target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(210,80%,55%)' }}>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: T.fgMuted }}>Sin versiones anteriores.</p>
          )}
        </div>

        {/* Upload version modal */}
        {showVersionUpload && (
          <UploadVersionModal
            docId={selectedDoc}
            onClose={() => setShowVersionUpload(false)}
            onSubmit={(formData) => uploadVersionMutation.mutate({ docId: selectedDoc, formData })}
            loading={uploadVersionMutation.isPending}
          />
        )}

        {/* Edit modal */}
        {editDoc && (
          <DocumentFormModal
            doc={editDoc}
            campaigns={campaignsData || []}
            onClose={() => setEditDoc(null)}
            onSubmit={(data) => updateMutation.mutate({ id: editDoc.id, data })}
            loading={updateMutation.isPending}
          />
        )}
      </div>
    )
  }

  // ─── List View ─────────────────────────────────────────────

  const documents = data?.items || []

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/app/marketing" style={{ color: T.fgMuted, transition: 'color .2s' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="flex items-center gap-3" style={{ fontSize: 28, fontWeight: 700, color: T.fg, fontFamily: fontDisplay }}>
              <FileText className="w-8 h-8" style={{ color: tealAccent }} />
              Gestor Documental
            </h1>
            <p style={{ marginTop: 4, color: T.fgMuted, fontSize: 14 }}>
              Documentos de marketing con versionado y Google Drive.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '8px 16px', backgroundColor: T.muted, color: T.fg, borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
            <Plus className="w-4 h-4" /> Crear registro
          </button>
          <button onClick={() => setShowUpload(true)}
            style={{ padding: '8px 16px', background: `linear-gradient(135deg, ${tealAccent}, ${T.cyan})`, color: '#fff', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer' }}>
            <Upload className="w-4 h-4" /> Subir archivo
          </button>
        </div>
      </div>

      {/* Stats */}
      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total documentos', value: statsData.total, color: T.fg },
            { label: 'Publicados', value: statsData.by_status?.published || 0, color: T.success },
            { label: 'Borradores', value: statsData.by_status?.draft || 0, color: T.warning },
            { label: 'Tamaño total', value: formatSize(statsData.total_size_bytes), color: T.fg },
          ].map((s, i) => (
            <div key={i} style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 14, color: T.fgMuted }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: fontDisplay }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.fgMuted }} />
          <input id="documents-input-24" aria-label="Buscar documentos..." type="text"
            placeholder="Buscar documentos..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ ...inputStyle, paddingLeft: 40, backgroundColor: T.muted }}
          />
        </div>
        <select id="documents-select-25" aria-label="Selector" value={filters.folder} onChange={(e) => setFilters({ ...filters, folder: e.target.value })}
          style={{ ...selectStyle, backgroundColor: T.muted, width: 'auto' }}>
          {FOLDERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select id="documents-select-26" aria-label="Selector" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{ ...selectStyle, backgroundColor: T.muted, width: 'auto' }}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select id="documents-select-27" aria-label="Selector" value={filters.language} onChange={(e) => setFilters({ ...filters, language: e.target.value })}
          style={{ ...selectStyle, backgroundColor: T.muted, width: 'auto' }}>
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        {(filters.folder || filters.status || filters.language || filters.search) && (
          <button onClick={() => setFilters({ folder: '', status: '', language: '', search: '' })}
            className="flex items-center gap-1"
            style={{ color: T.fgMuted, fontSize: 14, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>
            <X className="w-4 h-4" /> Limpiar
          </button>
        )}
      </div>

      {/* Folder tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FOLDERS.map((f) => {
          const Icon = f.icon
          const count = f.value ? (statsData?.by_folder?.[f.value] || 0) : statsData?.total || 0
          const isActive = filters.folder === f.value
          return (
            <button
              key={f.value}
              onClick={() => setFilters({ ...filters, folder: f.value })}
              className="flex items-center gap-2 whitespace-nowrap"
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                backgroundColor: isActive ? `${tealAccent}30` : T.card,
                color: isActive ? tealAccent : T.fgMuted,
                border: `1px solid ${isActive ? `${tealAccent}80` : T.border}`,
              }}
            >
              <Icon className="w-4 h-4" />
              {f.label}
              <span style={{ fontSize: 12, backgroundColor: T.muted, padding: '2px 6px', borderRadius: 4 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Documents table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full animate-spin" style={{ border: `2px solid ${T.cyan}`, borderTopColor: 'transparent' }} />
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: T.fgMuted }}>
          <FileText className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.5 }} />
          <p>No hay documentos.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {['Documento', 'Carpeta', 'Tipo', 'Estado', 'Idioma', 'Versión', 'Tamaño', 'Fecha', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: i === 8 ? 'right' : 'left', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: T.fgMuted, textTransform: 'uppercase', fontFamily: fontMono }}>{h === '' ? 'Acciones' : h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const Icon = getFileIcon(doc.file_type)
                const sc = STATUS_COLORS[doc.status] || {}
                return (
                  <tr key={doc.id} style={{ borderBottom: `1px solid ${T.border}50`, cursor: 'pointer' }} onClick={() => setSelectedDoc(doc.id)}>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 flex-shrink-0" style={{ color: tealAccent }} />
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 500, color: T.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>{doc.name}</p>
                          {doc.description && (
                            <p style={{ fontSize: 12, color: T.fgMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 14, color: T.fg, textTransform: 'capitalize' }}>{doc.folder}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, backgroundColor: T.muted, color: T.fg, padding: '2px 8px', borderRadius: 4 }}>{doc.file_type?.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, backgroundColor: sc.bg, color: sc.text }}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, color: T.fgMuted }}>{doc.language?.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 14, color: T.fg, fontFamily: fontMono }}>v{doc.version}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 14, color: T.fgMuted }}>{formatSize(doc.file_size)}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, color: T.fgMuted }}>{new Date(doc.created_at).toLocaleDateString('es-ES')}</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {doc.drive_url && (
                          <a href={doc.drive_url} target="_blank" rel="noopener noreferrer"
                            style={{ padding: 6, color: T.fgMuted, display: 'inline-flex' }}>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => setEditDoc(doc)}
                          style={{ padding: 6, color: T.fgMuted, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm('Eliminar?')) deleteMutation.mutate(doc.id) }}
                          style={{ padding: 6, color: T.fgMuted, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          campaigns={campaignsData || []}
          onClose={() => setShowUpload(false)}
          onSubmit={(formData) => uploadMutation.mutate(formData)}
          loading={uploadMutation.isPending}
        />
      )}

      {/* Create record modal (without file) */}
      {showCreate && (
        <DocumentFormModal
          campaigns={campaignsData || []}
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}

      {/* Edit modal */}
      {editDoc && !selectedDoc && (
        <DocumentFormModal
          doc={editDoc}
          campaigns={campaignsData || []}
          onClose={() => setEditDoc(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editDoc.id, data })}
          loading={updateMutation.isPending}
        />
      )}
    </div>
  )
}


// ─── Upload Modal ────────────────────────────────────────────

function UploadModal({ campaigns, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    name: '', folder: 'content', status: 'draft', language: 'es',
    description: '', regulatory_focus: '', persona_target: '', campaign_id: '',
  })
  const [file, setFile] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!file) return toast.error('Selecciona un archivo')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', form.name || file.name)
    formData.append('folder', form.folder)
    formData.append('status', form.status)
    formData.append('language', form.language)
    if (form.description) formData.append('description', form.description)
    if (form.regulatory_focus) formData.append('regulatory_focus', form.regulatory_focus)
    if (form.persona_target) formData.append('persona_target', form.persona_target)
    if (form.campaign_id) formData.append('campaign_id', form.campaign_id)
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, width: '100%', maxWidth: 512, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${T.border}` }}>
          <h2 className="flex items-center gap-2" style={{ fontSize: 18, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>
            <Upload className="w-5 h-5" style={{ color: tealAccent }} /> Subir documento
          </h2>
          <button onClick={onClose} style={{ color: T.fgMuted, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label style={labelStyle} htmlFor="documents-field-1">Archivo *</label>
            <input id="documents-field-1" type="file" onChange={(e) => {
              const f = e.target.files[0]
              setFile(f)
              if (f && !form.name) setForm({ ...form, name: f.name })
            }}
              style={{ width: '100%', fontSize: 14, color: T.fgMuted }}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-gray-800 file:cursor-pointer"
            />
            <style>{`.file\\:mr-4::-webkit-file-upload-button { background-color: ${tealAccent}; }`}</style>
          </div>
          <div>
            <label style={labelStyle} htmlFor="documents-field-2">Nombre</label>
            <input id="documents-field-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle} htmlFor="documents-field-3">Carpeta</label>
              <select id="documents-field-3" value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} style={selectStyle}>
                {FOLDERS.filter(f => f.value).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="documents-field-4">Estado</label>
              <select id="documents-field-4" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={selectStyle}>
                {STATUSES.filter(s => s.value).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle} htmlFor="documents-field-5">Idioma</label>
              <select id="documents-field-5" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} style={selectStyle}>
                {LANGUAGES.filter(l => l.value).map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="documents-field-6">Normativa</label>
              <select id="documents-field-6" value={form.regulatory_focus} onChange={(e) => setForm({ ...form, regulatory_focus: e.target.value })} style={selectStyle}>
                <option value="">Ninguna</option>
                {REGULATORY.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle} htmlFor="documents-field-7">Persona</label>
              <select id="documents-field-7" value={form.persona_target} onChange={(e) => setForm({ ...form, persona_target: e.target.value })} style={selectStyle}>
                <option value="">Ninguna</option>
                {PERSONAS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="documents-field-8">Campaña</label>
              <select id="documents-field-8" value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })} style={selectStyle}>
                <option value="">Sin campaña</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="documents-field-9">Descripción</label>
            <textarea id="documents-field-9" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', color: T.fgMuted, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>Cancelar</button>
            <button type="submit" disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: tealAccent, color: '#fff', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Subiendo...' : 'Subir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// ─── Document Form Modal (Create / Edit) ─────────────────────

function DocumentFormModal({ doc, campaigns, onClose, onSubmit, loading }) {
  const isEdit = !!doc
  const [form, setForm] = useState({
    name: doc?.name || '',
    folder: doc?.folder || 'content',
    file_type: doc?.file_type || 'pdf',
    status: doc?.status || 'draft',
    language: doc?.language || 'es',
    description: doc?.description || '',
    regulatory_focus: doc?.regulatory_focus || '',
    persona_target: doc?.persona_target || '',
    campaign_id: doc?.campaign_id || '',
    drive_url: doc?.drive_url || '',
    drive_file_id: doc?.drive_file_id || '',
    file_url: doc?.file_url || '',
    preview_url: doc?.preview_url || '',
    tags: doc?.tags?.join(', ') || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { ...form }
    payload.tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null
    if (!payload.campaign_id) delete payload.campaign_id
    if (!payload.drive_url) delete payload.drive_url
    if (!payload.drive_file_id) delete payload.drive_file_id
    if (!payload.file_url) delete payload.file_url
    if (!payload.preview_url) delete payload.preview_url
    onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, width: '100%', maxWidth: 512, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${T.border}` }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>
            {isEdit ? 'Editar documento' : 'Crear registro'}
          </h2>
          <button onClick={onClose} style={{ color: T.fgMuted, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label style={labelStyle} htmlFor="documents-field-10">Nombre *</label>
            <input id="documents-field-10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={inputStyle} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle} htmlFor="documents-field-11">Carpeta</label>
              <select id="documents-field-11" value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} style={selectStyle}>
                {FOLDERS.filter(f => f.value).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="documents-field-12">Tipo archivo</label>
              <input id="documents-field-12" value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}
                style={inputStyle} placeholder="pdf, docx, pptx..." />
            </div>
            <div>
              <label style={labelStyle} htmlFor="documents-field-13">Estado</label>
              <select id="documents-field-13" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={selectStyle}>
                {STATUSES.filter(s => s.value).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle} htmlFor="documents-field-14">Idioma</label>
              <select id="documents-field-14" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} style={selectStyle}>
                {LANGUAGES.filter(l => l.value).map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="documents-field-15">Normativa</label>
              <select id="documents-field-15" value={form.regulatory_focus} onChange={(e) => setForm({ ...form, regulatory_focus: e.target.value })} style={selectStyle}>
                <option value="">Ninguna</option>
                {REGULATORY.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="documents-field-16">Persona</label>
              <select id="documents-field-16" value={form.persona_target} onChange={(e) => setForm({ ...form, persona_target: e.target.value })} style={selectStyle}>
                <option value="">Ninguna</option>
                {PERSONAS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="documents-field-17">Campaña</label>
            <select id="documents-field-17" value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })} style={selectStyle}>
              <option value="">Sin campaña</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle} htmlFor="documents-field-18">Drive URL</label>
              <input id="documents-field-18" value={form.drive_url} onChange={(e) => setForm({ ...form, drive_url: e.target.value })}
                style={inputStyle} placeholder="https://drive.google.com/..." />
            </div>
            <div>
              <label style={labelStyle} htmlFor="documents-field-19">Drive File ID</label>
              <input id="documents-field-19" value={form.drive_file_id} onChange={(e) => setForm({ ...form, drive_file_id: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="documents-field-20">Descripción</label>
            <textarea id="documents-field-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="documents-field-21">Tags (separados por coma)</label>
            <input id="documents-field-21" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
              style={inputStyle} placeholder="nis2, guía, españa..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', color: T.fgMuted, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>Cancelar</button>
            <button type="submit" disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: tealAccent, color: '#fff', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// ─── Upload Version Modal ────────────────────────────────────

function UploadVersionModal({ docId, onClose, onSubmit, loading }) {
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!file) return toast.error('Selecciona un archivo')
    const formData = new FormData()
    formData.append('file', file)
    if (notes) formData.append('notes', notes)
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 12, width: '100%', maxWidth: 448 }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${T.border}` }}>
          <h2 className="flex items-center gap-2" style={{ fontSize: 18, fontWeight: 600, color: T.fg, fontFamily: fontDisplay }}>
            <History className="w-5 h-5" style={{ color: T.cyan }} /> Nueva versión
          </h2>
          <button onClick={onClose} style={{ color: T.fgMuted, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label style={labelStyle} htmlFor="documents-field-22">Archivo *</label>
            <input id="documents-field-22" type="file" onChange={(e) => setFile(e.target.files[0])}
              style={{ width: '100%', fontSize: 14, color: T.fgMuted }}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-gray-800 file:cursor-pointer"
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="documents-field-23">Notas del cambio</label>
            <textarea id="documents-field-23" value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Qué cambió en esta versión..."
              style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', color: T.fgMuted, border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}>Cancelar</button>
            <button type="submit" disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: T.cyan, color: '#fff', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Subiendo...' : 'Subir versión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
