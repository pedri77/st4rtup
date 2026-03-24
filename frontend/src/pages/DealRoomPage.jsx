import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  FolderOpen, Upload, Share2, FileText, Image, File, ArrowLeft,
  Loader2, ExternalLink, Download, Plus, Trash2, Shield, BarChart3,
  CheckCircle, Clock, AlertTriangle, Eye, Users
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { dealroomApi, dealRoomDocsApi, opportunitiesApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#3B82F6', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const SUBFOLDERS = ['Propuestas', 'Contratos', 'Presentaciones', 'Documentacion']
const MAIN_TABS = ['SharePoint', 'Documentos', 'Analytics', 'NDA']

const FILE_ICONS = {
  'application/pdf': FileText,
  'image/png': Image,
  'image/jpeg': Image,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileText,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': FileText,
}

const MAIN_TAB_ICONS = {
  SharePoint: FolderOpen,
  Documentos: FileText,
  Analytics: BarChart3,
  NDA: Shield,
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDuration(seconds) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

// ─── Documents Tab ──────────────────────────────────────────

function DocumentsTab({ opportunityId }) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const { data: docsData, isLoading } = useQuery({
    queryKey: ['dealroom-docs', opportunityId],
    queryFn: () => dealRoomDocsApi.list(opportunityId).then(r => r.data),
    enabled: !!opportunityId,
  })

  const docs = docsData?.items || []

  const doUpload = async (file) => {
    if (!file) return
    if (!file.name.endsWith('.pdf')) {
      toast.error('Solo se permiten archivos PDF')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await dealRoomDocsApi.upload(opportunityId, formData, recipientEmail)
      toast.success(`${file.name} subido con watermark`)
      queryClient.invalidateQueries({ queryKey: ['dealroom-docs'] })
    } catch {
      toast.error('Error subiendo documento')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e) => doUpload(e.target.files?.[0])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) doUpload(file)
  }, [recipientEmail, opportunityId])

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        className="rounded-xl p-6 text-center transition-colors cursor-pointer"
        style={{
          backgroundColor: dragOver ? 'hsla(185,72%,48%,0.08)' : 'hsla(220,25%,10%,0.5)',
          border: `2px dashed ${dragOver ? T.cyan : T.border}`,
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: dragOver ? T.cyan : T.fgMuted }} />
        <p className="text-sm mb-1" style={{ color: T.fg }}>Arrastra un PDF o haz clic para subir</p>
        <p className="text-xs mb-3" style={{ color: T.fgMuted }}>Se aplicara watermark automatico</p>
        <div className="flex items-center gap-2 justify-center mb-3">
          <input
            type="email"
            placeholder="Email del destinatario (opcional)"
            value={recipientEmail}
            onChange={e => setRecipientEmail(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg w-64"
            style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
          />
        </div>
        <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors"
          style={{ backgroundColor: T.cyan, color: T.bg, fontWeight: 600 }}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Subir PDF
          <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
      </div>

      {/* Watermark badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
        style={{ backgroundColor: 'hsla(185,72%,48%,0.06)', border: `1px solid hsla(185,72%,48%,0.15)`, color: T.cyan }}>
        <Shield className="w-3.5 h-3.5" />
        Todos los documentos se suben con watermark digital para trazabilidad
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      ) : docs.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: T.fgMuted }}>Sin documentos subidos</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: T.muted }}>
                <th className="text-left px-4 py-2.5 font-medium" style={{ color: T.fgMuted, fontFamily: fontMono, fontSize: '0.7rem', letterSpacing: '0.05em' }}>NOMBRE</th>
                <th className="text-center px-3 py-2.5 font-medium" style={{ color: T.fgMuted, fontFamily: fontMono, fontSize: '0.7rem' }}>PAG.</th>
                <th className="text-right px-3 py-2.5 font-medium" style={{ color: T.fgMuted, fontFamily: fontMono, fontSize: '0.7rem' }}>TAMANO</th>
                <th className="text-center px-3 py-2.5 font-medium" style={{ color: T.fgMuted, fontFamily: fontMono, fontSize: '0.7rem' }}>WATERMARK</th>
                <th className="text-left px-3 py-2.5 font-medium" style={{ color: T.fgMuted, fontFamily: fontMono, fontSize: '0.7rem' }}>SUBIDO POR</th>
                <th className="text-right px-4 py-2.5 font-medium" style={{ color: T.fgMuted, fontFamily: fontMono, fontSize: '0.7rem' }}>FECHA</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} className="transition-colors" style={{ borderTop: `1px solid ${T.border}` }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'hsla(220,25%,10%,0.5)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 flex-shrink-0" style={{ color: T.fgMuted }} />
                      <span className="truncate" style={{ color: T.fg }}>{doc.name}</span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-2.5" style={{ color: T.fgMuted, fontFamily: fontMono }}>{doc.page_count || '-'}</td>
                  <td className="text-right px-3 py-2.5" style={{ color: T.fgMuted, fontFamily: fontMono }}>{formatSize(doc.size_bytes)}</td>
                  <td className="text-center px-3 py-2.5">
                    {doc.watermarked ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'hsla(142,71%,45%,0.1)', color: T.success }}>
                        <CheckCircle className="w-3 h-3" /> Si
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: T.fgMuted }}>No</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: T.fgMuted }}>{doc.uploaded_by || '-'}</td>
                  <td className="text-right px-4 py-2.5 text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('es-ES') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Analytics Tab ──────────────────────────────────────────

function AnalyticsTab({ opportunityId }) {
  const [selectedDocId, setSelectedDocId] = useState(null)

  const { data: docsData } = useQuery({
    queryKey: ['dealroom-docs', opportunityId],
    queryFn: () => dealRoomDocsApi.list(opportunityId).then(r => r.data),
    enabled: !!opportunityId,
  })

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dealroom-analytics', opportunityId, selectedDocId],
    queryFn: () => dealRoomDocsApi.analytics(opportunityId, selectedDocId).then(r => r.data),
    enabled: !!opportunityId && !!selectedDocId,
  })

  const docs = docsData?.items || []

  return (
    <div className="space-y-4">
      {/* Document selector */}
      <div>
        <label className="text-xs font-medium mb-1.5 block" style={{ color: T.fgMuted, fontFamily: fontMono }}>SELECCIONAR DOCUMENTO</label>
        <select
          value={selectedDocId || ''}
          onChange={e => setSelectedDocId(e.target.value || null)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
        >
          <option value="">-- Selecciona un documento --</option>
          {docs.map(doc => (
            <option key={doc.id} value={doc.id}>{doc.name}</option>
          ))}
        </select>
      </div>

      {!selectedDocId && (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 mx-auto mb-3" style={{ color: T.fgMuted }} />
          <p className="text-sm" style={{ color: T.fgMuted }}>Selecciona un documento para ver su analytics</p>
        </div>
      )}

      {selectedDocId && analyticsLoading && (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
      )}

      {selectedDocId && analytics && !analyticsLoading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Sesiones', value: analytics.total_sessions, icon: Eye },
              { label: 'Visitantes', value: analytics.unique_visitors, icon: Users },
              { label: 'Eventos', value: analytics.total_events, icon: BarChart3 },
              { label: 'Tiempo total', value: formatDuration(analytics.total_time_seconds), icon: Clock },
            ].map(card => (
              <div key={card.label} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className="w-4 h-4" style={{ color: T.cyan }} />
                  <span className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>{card.label}</span>
                </div>
                <p className="text-xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Page heatmap */}
          {analytics.pages?.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg, fontFamily: fontDisplay }}>Heatmap por pagina</h3>
              <div className="space-y-1.5">
                {analytics.pages.map(page => (
                  <div key={page.page} className="flex items-center gap-3">
                    <span className="text-xs w-12 text-right" style={{ color: T.fgMuted, fontFamily: fontMono }}>P.{page.page}</span>
                    <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ backgroundColor: T.muted }}>
                      <div
                        className="h-full rounded-md transition-all"
                        style={{
                          width: `${Math.max(page.intensity * 100, 2)}%`,
                          background: `linear-gradient(90deg, ${T.cyan}, ${T.purple})`,
                          opacity: 0.3 + page.intensity * 0.7,
                        }}
                      />
                    </div>
                    <span className="text-xs w-16 text-right" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                      {page.views} vistas
                    </span>
                    <span className="text-xs w-14 text-right" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                      {formatDuration(page.total_seconds)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visitors list */}
          {analytics.visitors?.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg, fontFamily: fontDisplay }}>Visitantes</h3>
              <div className="space-y-2">
                {analytics.visitors.map((visitor, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg p-2.5"
                    style={{ backgroundColor: T.muted }}>
                    <Users className="w-4 h-4 flex-shrink-0" style={{ color: T.cyan }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: T.fg }}>{visitor.email}</p>
                      <p className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                        {visitor.sessions} sesiones -- {visitor.pages_viewed} paginas -- {formatDuration(visitor.total_seconds)}
                      </p>
                    </div>
                    {visitor.last_visit && (
                      <span className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                        {new Date(visitor.last_visit).toLocaleDateString('es-ES')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.total_events === 0 && (
            <div className="text-center py-8">
              <Eye className="w-10 h-10 mx-auto mb-2" style={{ color: T.fgMuted }} />
              <p className="text-sm" style={{ color: T.fgMuted }}>Sin eventos registrados para este documento</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── NDA Tab ────────────────────────────────────────────────

function NDATab({ opportunityId }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')

  const requestNdaMutation = useMutation({
    mutationFn: () => dealRoomDocsApi.requestNda(opportunityId, {
      member_email: email, member_name: name, company_name: company,
    }),
    onSuccess: (res) => {
      const data = res.data
      if (data.provider === 'checkbox') {
        toast.success('NDA configurado en modo checkbox (sin proveedor de firma)')
      } else if (data.sign_url) {
        toast.success(`NDA enviado via ${data.provider}`)
        window.open(data.sign_url, '_blank')
      } else {
        toast.success(`NDA enviado por email via ${data.provider}`)
      }
    },
    onError: () => toast.error('Error enviando NDA'),
  })

  const confirmCheckboxMutation = useMutation({
    mutationFn: () => dealRoomDocsApi.confirmNda(opportunityId, {
      member_email: email, member_name: name,
    }),
    onSuccess: () => toast.success('NDA confirmado via checkbox'),
    onError: () => toast.error('Error confirmando NDA'),
  })

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
          <Shield className="w-4 h-4" style={{ color: T.purple }} />
          NDA Gate
        </h3>
        <p className="text-xs mb-4" style={{ color: T.fgMuted }}>
          Envia un acuerdo de confidencialidad antes de compartir documentos. Usa Signaturit o DocuSign si estan configurados, o un checkbox de consentimiento como fallback.
        </p>

        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: T.fgMuted, fontFamily: fontMono }}>NOMBRE</label>
            <input
              type="text"
              placeholder="Nombre completo"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: T.fgMuted, fontFamily: fontMono }}>EMAIL</label>
            <input
              type="email"
              placeholder="email@empresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: T.fgMuted, fontFamily: fontMono }}>EMPRESA</label>
            <input
              type="text"
              placeholder="Nombre de la empresa"
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => requestNdaMutation.mutate()}
            disabled={!email || !name || requestNdaMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-opacity disabled:opacity-40"
            style={{ backgroundColor: T.purple, color: '#fff', fontWeight: 600 }}
          >
            {requestNdaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Enviar NDA
          </button>
          <button
            onClick={() => confirmCheckboxMutation.mutate()}
            disabled={!email || !name || confirmCheckboxMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-opacity disabled:opacity-40"
            style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
          >
            {confirmCheckboxMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Confirmar via Checkbox
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl p-4 text-xs space-y-2" style={{ backgroundColor: 'hsla(265,60%,58%,0.05)', border: `1px solid hsla(265,60%,58%,0.15)`, color: T.fgMuted }}>
        <p><strong style={{ color: T.purple }}>Proveedores soportados:</strong></p>
        <ul className="space-y-1 ml-4 list-disc">
          <li><strong>Signaturit</strong> (primario) -- Firma digital con validez legal en Europa</li>
          <li><strong>DocuSign</strong> (fallback) -- Envia el NDA por email para firma</li>
          <li><strong>Checkbox</strong> (sin proveedor) -- Consentimiento via checkbox como fallback</li>
        </ul>
        <p className="pt-1">Configura las API keys en Ajustes &rarr; Integraciones para activar la firma digital.</p>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────

export default function DealRoomPage() {
  const { opportunityId } = useParams()
  const queryClient = useQueryClient()
  const [mainTab, setMainTab] = useState('SharePoint')
  const [activeFolder, setActiveFolder] = useState('Propuestas')
  const [uploading, setUploading] = useState(false)

  const { data: opportunity } = useQuery({
    queryKey: ['opportunity', opportunityId],
    queryFn: () => opportunitiesApi.get(opportunityId).then(r => r.data),
    enabled: !!opportunityId,
  })

  const { data: filesData, isLoading } = useQuery({
    queryKey: ['dealroom-files', opportunityId, activeFolder],
    queryFn: () => dealroomApi.listFiles(opportunityId, { subfolder: activeFolder }).then(r => r.data),
    enabled: !!opportunityId && mainTab === 'SharePoint',
  })

  const createRoomMutation = useMutation({
    mutationFn: () => dealroomApi.create(opportunityId),
    onSuccess: () => {
      toast.success('Deal Room creado en SharePoint')
      queryClient.invalidateQueries({ queryKey: ['dealroom-files'] })
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Error creando Deal Room'),
  })

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await dealroomApi.upload(opportunityId, formData, { params: { subfolder: activeFolder } })
      toast.success(`${file.name} subido`)
      queryClient.invalidateQueries({ queryKey: ['dealroom-files'] })
    } catch {
      toast.error('Error subiendo archivo')
    } finally {
      setUploading(false)
    }
  }

  const files = filesData?.files || []
  const notConfigured = filesData?.error?.includes('no configurado')

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link to="/pipeline" className="transition-colors" style={{ color: T.fgMuted }}
            onMouseEnter={e => e.currentTarget.style.color = T.fg}
            onMouseLeave={e => e.currentTarget.style.color = T.fgMuted}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <FolderOpen className="w-7 h-7" style={{ color: T.cyan }} />
            Deal Room
          </h1>
        </div>
        {opportunity && (
          <p className="text-sm ml-8" style={{ color: T.fgMuted }}>
            {opportunity.name} — {opportunity.company_name}
          </p>
        )}
      </div>

      {/* Main tabs */}
      <div className="flex gap-1" style={{ borderBottom: `1px solid ${T.border}` }}>
        {MAIN_TABS.map(tab => {
          const Icon = MAIN_TAB_ICONS[tab]
          return (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-t-lg transition-colors"
              style={{
                backgroundColor: mainTab === tab ? T.card : 'transparent',
                color: mainTab === tab ? T.cyan : T.fgMuted,
                border: mainTab === tab ? `1px solid ${T.border}` : '1px solid transparent',
                borderBottom: mainTab === tab ? `1px solid ${T.card}` : '1px solid transparent',
                fontFamily: fontDisplay,
                fontWeight: mainTab === tab ? 600 : 400,
              }}
            >
              <Icon className="w-4 h-4" />
              {tab}
            </button>
          )
        })}
      </div>

      {/* ─── SharePoint Tab ─── */}
      {mainTab === 'SharePoint' && (
        <>
          {/* Not configured banner */}
          {notConfigured && (
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'hsla(38,92%,50%,0.05)', border: `1px solid hsla(38,92%,50%,0.2)`, color: T.warning }}>
              Microsoft Graph no configurado. Configuralo en Marketing &rarr; Integraciones &rarr; Microsoft Graph (Deal Room).
            </div>
          )}

          {/* Create Room button */}
          {!notConfigured && files.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 mx-auto mb-4" style={{ color: T.fgMuted }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: '#94A3B8', fontFamily: fontDisplay }}>Deal Room no creado</h3>
              <p className="text-sm mb-4" style={{ color: T.fgMuted }}>Crea la estructura de carpetas en SharePoint para esta oportunidad.</p>
              <button
                onClick={() => createRoomMutation.mutate()}
                disabled={createRoomMutation.isPending}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                {createRoomMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crear Deal Room
              </button>
            </div>
          )}

          {/* Folder tabs + files */}
          {!notConfigured && (
            <>
              <div className="flex gap-2 pb-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                {SUBFOLDERS.map(folder => (
                  <button
                    key={folder}
                    onClick={() => setActiveFolder(folder)}
                    className="px-4 py-2 text-sm rounded-t-lg transition-colors"
                    style={{
                      backgroundColor: activeFolder === folder ? T.card : 'transparent',
                      color: activeFolder === folder ? T.cyan : T.fgMuted,
                      border: activeFolder === folder ? `1px solid ${T.border}` : '1px solid transparent',
                      borderBottom: activeFolder === folder ? `1px solid ${T.card}` : '1px solid transparent',
                    }}
                  >
                    {folder}
                  </button>
                ))}
              </div>

              {/* Upload */}
              <div className="flex items-center gap-3">
                <label className="btn-primary text-sm flex items-center gap-1.5 cursor-pointer">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Subir archivo
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                <span className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>{files.length} archivos en {activeFolder}</span>
              </div>

              {/* File list */}
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} /></div>
              ) : (
                <div className="space-y-2">
                  {files.map(file => {
                    const Icon = FILE_ICONS[file.mime_type] || (file.is_folder ? FolderOpen : File)
                    return (
                      <div key={file.id} className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
                        <Icon className="w-5 h-5 flex-shrink-0" style={{ color: T.fgMuted }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" style={{ color: T.fg }}>{file.name}</p>
                          <p className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                            {formatSize(file.size)} -- {file.modified ? new Date(file.modified).toLocaleDateString('es-ES') : ''}
                          </p>
                        </div>
                        {file.url && (
                          <a href={file.url} target="_blank" rel="noopener noreferrer"
                            className="p-1" style={{ color: T.cyan }}>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )
                  })}
                  {files.length === 0 && !isLoading && (
                    <p className="text-center text-sm py-8" style={{ color: T.fgMuted }}>Sin archivos en {activeFolder}</p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── Documentos Tab ─── */}
      {mainTab === 'Documentos' && <DocumentsTab opportunityId={opportunityId} />}

      {/* ─── Analytics Tab ─── */}
      {mainTab === 'Analytics' && <AnalyticsTab opportunityId={opportunityId} />}

      {/* ─── NDA Tab ─── */}
      {mainTab === 'NDA' && <NDATab opportunityId={opportunityId} />}
    </div>
  )
}
