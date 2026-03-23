import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Plus, FileText, Send, CheckCircle2, XCircle, Clock, Edit3,
  Trash2, X, Eye, RefreshCw, Building2, Calendar, Search,
  ChevronLeft, ChevronRight, Download, Package, PenTool, Receipt
} from 'lucide-react'
import toast from 'react-hot-toast'
import { offersApi } from '@/services/api'
import { useLeadsSelect } from '@/hooks/useLeadsSelect'
import { generateOfferPDF } from '@/utils/offerPdf'
import ExportButton from '@/components/ExportButton'
import { formatDateForExport } from '@/utils/export'
import { ListItemSkeleton } from '@/components/LoadingStates'

const T = {
  bg: 'hsl(220,60%,4%)',
  card: 'hsl(220,40%,8%)',
  muted: 'hsl(220,30%,12%)',
  border: 'hsl(220,20%,18%)',
  fg: 'hsl(220,20%,90%)',
  fgMuted: 'hsl(220,15%,55%)',
  cyan: '#06B6D4',
  purple: 'hsl(265,60%,55%)',
  destructive: 'hsl(0,70%,50%)',
  success: 'hsl(150,60%,40%)',
  warning: 'hsl(40,90%,50%)',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"
const inputStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' }

const STATUS_CONFIG = {
  draft: { label: 'Borrador', icon: Edit3, color: T.fgMuted },
  sent: { label: 'Enviada', icon: Send, color: T.cyan },
  accepted: { label: 'Aceptada', icon: CheckCircle2, color: T.success },
  rejected: { label: 'Rechazada', icon: XCircle, color: T.destructive },
  expired: { label: 'Expirada', icon: Clock, color: T.fgMuted },
  revision: { label: 'En revision', icon: RefreshCw, color: T.warning },
}

const EMPTY_ITEM = { name: '', description: '', quantity: 1, unit_price: 0, total: 0 }

const PRODUCT_CATALOG = [
  { category: 'Plataforma GRC', name: 'St4rtup Platform - Licencia Anual', description: 'Plataforma GRC completa: gestion de riesgos, cumplimiento y gobernanza', unit_price: 12000 },
  { category: 'Plataforma GRC', name: 'St4rtup Platform - Licencia Mensual', description: 'Plataforma GRC completa, facturacion mensual', unit_price: 1200 },
  { category: 'Plataforma GRC', name: 'Usuarios adicionales (pack 5)', description: 'Pack de 5 usuarios adicionales para la plataforma', unit_price: 2500 },
  { category: 'Modulos Cumplimiento', name: 'Modulo ENS', description: 'Esquema Nacional de Seguridad - Gestion de cumplimiento y evidencias', unit_price: 4500 },
  { category: 'Modulos Cumplimiento', name: 'Modulo NIS2', description: 'Directiva NIS2 - Evaluacion de requisitos y plan de adecuacion', unit_price: 4500 },
  { category: 'Modulos Cumplimiento', name: 'Modulo DORA', description: 'Digital Operational Resilience Act - Cumplimiento sector financiero', unit_price: 5000 },
  { category: 'Modulos Cumplimiento', name: 'Modulo ISO 27001', description: 'Sistema de Gestion de Seguridad de la Informacion', unit_price: 4000 },
  { category: 'Modulos Cumplimiento', name: 'Modulo EU AI Act', description: 'Reglamento Europeo de IA - Evaluacion de riesgo y cumplimiento', unit_price: 3500 },
  { category: 'Modulos Cumplimiento', name: 'Pack Normativo Completo', description: 'ENS + NIS2 + DORA + ISO 27001 + EU AI Act (20% dto.)', unit_price: 17200 },
  { category: 'Modulos Funcionales', name: 'Modulo Gestion de Riesgos', description: 'Identificacion, analisis y tratamiento de riesgos de seguridad', unit_price: 3000 },
  { category: 'Modulos Funcionales', name: 'Modulo Gestion de Activos', description: 'Inventario y clasificacion de activos de informacion', unit_price: 2500 },
  { category: 'Modulos Funcionales', name: 'Modulo Gestion de Incidentes', description: 'Registro, seguimiento y respuesta a incidentes de seguridad', unit_price: 2500 },
  { category: 'Modulos Funcionales', name: 'Modulo Auditoria y Evidencias', description: 'Planificacion de auditorias y gestion documental de evidencias', unit_price: 3000 },
  { category: 'Modulos Funcionales', name: 'Modulo Dashboard Ejecutivo', description: 'Cuadros de mando y reportes para direccion', unit_price: 1500 },
  { category: 'Servicios', name: 'Implantacion y Configuracion', description: 'Setup inicial, configuracion de la plataforma y carga de datos', unit_price: 3000 },
  { category: 'Servicios', name: 'Formacion Equipo (8h)', description: 'Formacion presencial/online para el equipo (jornada completa)', unit_price: 1600 },
  { category: 'Servicios', name: 'Formacion Equipo (4h)', description: 'Formacion presencial/online para el equipo (media jornada)', unit_price: 900 },
  { category: 'Servicios', name: 'Consultoria GRC (jornada)', description: 'Consultoria especializada en GRC y ciberseguridad', unit_price: 1200 },
  { category: 'Servicios', name: 'Consultoria GRC (pack 5 jornadas)', description: 'Pack de 5 jornadas de consultoria (10% dto.)', unit_price: 5400 },
  { category: 'Servicios', name: 'Gap Analysis Normativo', description: 'Analisis de brechas de cumplimiento normativo', unit_price: 4000 },
  { category: 'Servicios', name: 'Auditoria de Seguridad', description: 'Auditoria tecnica de seguridad de la informacion', unit_price: 5000 },
  { category: 'Soporte', name: 'Soporte Premium Anual', description: 'Soporte prioritario 8x5, SLA 4h, gestor dedicado', unit_price: 3600 },
  { category: 'Soporte', name: 'Soporte Basico Anual', description: 'Soporte estandar 8x5, SLA 24h', unit_price: 1200 },
  { category: 'Soporte', name: 'Bolsa de Horas Soporte (20h)', description: 'Pack de 20 horas de soporte tecnico especializado', unit_price: 2000 },
  { category: 'Design Partners', name: 'Design Partner - Licencia Anual Bonificada', description: 'Licencia anual con condiciones especiales para Design Partners (50% dto.)', unit_price: 6000 },
  { category: 'Design Partners', name: 'Design Partner - Co-desarrollo Modulo', description: 'Participacion en co-desarrollo de nuevo modulo normativo con acceso anticipado', unit_price: 0 },
  { category: 'Design Partners', name: 'Design Partner - Acceso Beta Features', description: 'Acceso anticipado a nuevas funcionalidades en fase beta', unit_price: 0 },
  { category: 'Design Partners', name: 'Design Partner - Feedback & Advisory', description: 'Programa de feedback estructurado y participacion en advisory board', unit_price: 0 },
  { category: 'Design Partners', name: 'Design Partner - Caso de Exito', description: 'Desarrollo de caso de exito conjunto para uso comercial y marketing', unit_price: 0 },
  { category: 'Design Partners', name: 'Design Partner - Formacion Incluida (16h)', description: 'Formacion completa incluida en el programa Design Partner', unit_price: 0 },
  { category: 'Design Partners', name: 'Design Partner - Soporte Premium Incluido', description: 'Soporte Premium con SLA prioritario incluido durante el programa', unit_price: 0 },
]

export default function OffersPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState(null)
  const [viewingOffer, setViewingOffer] = useState(null)
  const [signingOffer, setSigningOffer] = useState(null)
  const [invoicingOffer, setInvoicingOffer] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['offers', { page, status: statusFilter, search: searchQuery }],
    queryFn: async () => {
      const params = { page, page_size: 20 }
      if (statusFilter) params.status = statusFilter
      if (searchQuery) params.search = searchQuery
      const res = await offersApi.list(params)
      return res.data
    },
  })

  const offers = data?.items || []
  const totalPages = data?.pages || 1

  const createOffer = useMutation({
    mutationFn: (data) => offersApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['offers'] }); toast.success('Oferta creada'); setShowModal(false) },
    onError: (err) => toast.error(`Error: ${err.response?.data?.detail || err.message}`),
  })

  const updateOffer = useMutation({
    mutationFn: ({ id, data }) => offersApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['offers'] }); toast.success('Oferta actualizada'); setShowModal(false); setEditingOffer(null) },
    onError: (err) => toast.error(`Error: ${err.response?.data?.detail || err.message}`),
  })

  const deleteOffer = useMutation({
    mutationFn: (id) => offersApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['offers'] }); toast.success('Oferta eliminada') },
  })

  const handleDelete = (offer) => { if (window.confirm(`Eliminar oferta ${offer.reference}?`)) deleteOffer.mutate(offer.id) }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg, color: T.fg, fontFamily: fontDisplay }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: T.fg, fontFamily: fontDisplay }}>
            <FileText className="w-7 h-7" style={{ color: T.cyan }} />
            Ofertas
          </h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Propuestas comerciales</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton data={offers || []} filename="ofertas" transform={(o) => ({ 'Referencia': o.reference || '', 'Empresa': o.lead_name || '', 'Estado': o.status, 'Importe Total': o.total_amount || 0, 'Valida Hasta': formatDateForExport(o.valid_until), 'Enviada': formatDateForExport(o.sent_at), 'Creado': formatDateForExport(o.created_at) })} size="sm" />
          <button onClick={() => { setEditingOffer(null); setShowModal(true) }} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors" style={{ backgroundColor: T.cyan, color: T.bg }}>
            <Plus className="w-4 h-4" /> Nueva Oferta
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.fgMuted }} />
          <input id="offer-filter-search" type="text" placeholder="Buscar por titulo o referencia..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }} style={{ ...inputStyle, paddingLeft: '2.5rem' }} aria-label="Buscar ofertas" />
        </div>
        <select id="offer-filter-status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} style={{ ...inputStyle, width: '12rem' }} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, { label, icon: Icon, color }]) => {
          const count = offers.filter(o => o.status === key).length
          const isActive = statusFilter === key
          return (
            <button key={key} onClick={() => { setStatusFilter(statusFilter === key ? '' : key); setPage(1) }} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all" style={{ backgroundColor: isActive ? `${T.cyan}15` : T.card, border: `1px solid ${isActive ? `${T.cyan}40` : T.border}`, color: isActive ? T.cyan : T.fgMuted }}>
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs">{label}</span>
              <span className="ml-auto font-bold tabular-nums" style={{ color: isActive ? T.cyan : T.fg, fontFamily: fontMono }}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="mb-6" style={{ height: '1px', backgroundColor: T.border }} />

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <ListItemSkeleton key={i} />)}</div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 rounded-lg" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <FileText className="w-10 h-10 mx-auto mb-4" style={{ color: T.fgMuted }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: T.fg, fontFamily: fontDisplay }}>No hay ofertas</h3>
          <p className="text-sm mb-6" style={{ color: T.fgMuted }}>Crea tu primera propuesta comercial</p>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 mx-auto transition-colors" style={{ backgroundColor: T.cyan, color: T.bg }}>
            <Plus className="w-4 h-4" /> Nueva Oferta
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onView={() => setViewingOffer(offer)} onEdit={() => { setEditingOffer(offer); setShowModal(true) }} onDelete={() => handleDelete(offer)} onStatusChange={(newStatus) => updateOffer.mutate({ id: offer.id, data: { status: newStatus } })} onSign={() => setSigningOffer(offer)} onInvoice={() => setInvoicingOffer(offer)} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg disabled:opacity-30 transition-colors" style={{ border: `1px solid ${T.border}`, color: T.fgMuted }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs tabular-nums" style={{ color: T.fgMuted, fontFamily: fontMono }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg disabled:opacity-30 transition-colors" style={{ border: `1px solid ${T.border}`, color: T.fgMuted }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {showModal && <OfferModal offer={editingOffer} onClose={() => { setShowModal(false); setEditingOffer(null) }} onSubmit={(formData) => { if (editingOffer) { updateOffer.mutate({ id: editingOffer.id, data: formData }) } else { createOffer.mutate(formData) } }} isLoading={createOffer.isPending || updateOffer.isPending} />}
      {viewingOffer && <OfferViewModal offer={viewingOffer} onClose={() => setViewingOffer(null)} onEdit={() => { setViewingOffer(null); setEditingOffer(viewingOffer); setShowModal(true) }} onSign={() => { setViewingOffer(null); setSigningOffer(viewingOffer) }} onInvoice={() => { setViewingOffer(null); setInvoicingOffer(viewingOffer) }} />}
      {signingOffer && <SignatureModal offer={signingOffer} onClose={() => setSigningOffer(null)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['offers'] }); setSigningOffer(null) }} />}
      {invoicingOffer && <InvoiceModal offer={invoicingOffer} onClose={() => setInvoicingOffer(null)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['offers'] }); setInvoicingOffer(null) }} />}
    </div>
  )
}


function OfferCard({ offer, onView, onEdit, onDelete, onStatusChange, onSign, onInvoice }) {
  const config = STATUS_CONFIG[offer.status] || STATUS_CONFIG.draft
  const StatusIcon = config.icon

  const sigColor = offer.signature_status === 'signed' ? T.success : offer.signature_status === 'pending' ? T.warning : T.fgMuted
  const invColor = offer.invoice_status === 'paid' ? T.success : offer.invoice_status === 'sent' ? T.cyan : T.fgMuted

  return (
    <div className="rounded-lg p-4 transition-all group" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded" style={{ color: T.cyan, backgroundColor: `${T.cyan}15`, border: `1px solid ${T.cyan}20`, fontFamily: fontMono }}>{offer.reference}</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs" style={{ color: config.color, backgroundColor: `${config.color}15` }}>
              <StatusIcon className="w-3 h-3" />{config.label}
            </span>
            {offer.signature_status && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs" style={{ color: sigColor, backgroundColor: `${sigColor}15` }}>
                <PenTool className="w-3 h-3" />
                {offer.signature_status === 'pending' ? 'Firma pendiente' : offer.signature_status === 'signed' ? 'Firmado' : offer.signature_status === 'declined' ? 'Firma rechazada' : 'Firma expirada'}
              </span>
            )}
            {offer.invoice_status && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs" style={{ color: invColor, backgroundColor: `${invColor}15` }}>
                <Receipt className="w-3 h-3" />
                {offer.invoice_status === 'draft' ? 'Factura borrador' : offer.invoice_status === 'sent' ? 'Factura enviada' : offer.invoice_status === 'paid' ? 'Factura pagada' : 'Factura vencida'}
              </span>
            )}
          </div>
          <h3 className="font-semibold mb-1 truncate" style={{ color: T.fg }}>{offer.title}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: T.fgMuted }}>
            {offer.lead_name && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {offer.lead_id ? <Link to={`/leads/${offer.lead_id}`} style={{ color: T.cyan }}>{offer.lead_name}</Link> : offer.lead_name}
              </span>
            )}
            {offer.valid_until && (
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Valida hasta {new Date(offer.valid_until).toLocaleDateString('es-ES')}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums" style={{ color: T.cyan, fontFamily: fontMono }}>
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: offer.currency || 'EUR' }).format(offer.total || 0)}
            </div>
            {offer.items?.length > 0 && <div className="text-xs tabular-nums" style={{ color: T.fgMuted, fontFamily: fontMono }}>{offer.items.length} linea{offer.items.length !== 1 ? 's' : ''}</div>}
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={onView} className="p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }} title="Ver"><Eye className="w-4 h-4" /></button>
            <button onClick={onEdit} className="p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }} title="Editar"><Edit3 className="w-4 h-4" /></button>
            {offer.status === 'draft' && <button onClick={() => onStatusChange('sent')} className="p-2 rounded-lg transition-colors" style={{ color: T.cyan }} title="Marcar como enviada"><Send className="w-4 h-4" /></button>}
            {!offer.signature_status && <button onClick={onSign} className="p-2 rounded-lg transition-colors" style={{ color: T.purple }} title="Enviar para firma"><PenTool className="w-4 h-4" /></button>}
            {(offer.status === 'accepted' || offer.status === 'sent') && !offer.invoice_id && <button onClick={onInvoice} className="p-2 rounded-lg transition-colors" style={{ color: T.purple }} title="Crear factura"><Receipt className="w-4 h-4" /></button>}
            <button onClick={() => generateOfferPDF(offer)} className="p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }} title="Descargar PDF"><Download className="w-4 h-4" /></button>
            <button onClick={onDelete} className="p-2 rounded-lg transition-colors" style={{ color: T.fgMuted }} title="Eliminar"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}


function OfferModal({ offer, onClose, onSubmit, isLoading }) {
  const { leads } = useLeadsSelect()
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [formData, setFormData] = useState({
    lead_id: offer?.lead_id || '', title: offer?.title || '', description: offer?.description || '',
    status: offer?.status || 'draft', items: offer?.items || [{ ...EMPTY_ITEM }],
    tax_rate: offer?.tax_rate ?? 21, discount_percent: offer?.discount_percent ?? 0,
    valid_until: offer?.valid_until || '', payment_terms: offer?.payment_terms || '',
    terms_conditions: offer?.terms_conditions || '', notes: offer?.notes || '', currency: offer?.currency || 'EUR',
  })

  const updateItem = (idx, field, value) => {
    const newItems = [...formData.items]
    newItems[idx] = { ...newItems[idx], [field]: value }
    if (field === 'quantity' || field === 'unit_price') newItems[idx].total = (parseFloat(newItems[idx].quantity) || 0) * (parseFloat(newItems[idx].unit_price) || 0)
    setFormData({ ...formData, items: newItems })
  }

  const addItem = () => setFormData({ ...formData, items: [...formData.items, { ...EMPTY_ITEM }] })
  const addCatalogProduct = (product) => {
    const newItem = { name: product.name, description: product.description, quantity: 1, unit_price: product.unit_price, total: product.unit_price }
    setFormData({ ...formData, items: [...formData.items.filter(i => i.name || i.unit_price), newItem] })
    setCatalogOpen(false)
  }
  const removeItem = (idx) => { if (formData.items.length <= 1) return; setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) }) }

  const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)
  const discountAmount = subtotal * (parseFloat(formData.discount_percent) || 0) / 100
  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * (parseFloat(formData.tax_rate) || 0) / 100
  const total = taxableAmount + taxAmount

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.lead_id) return toast.error('Selecciona un lead')
    if (!formData.title) return toast.error('El titulo es obligatorio')
    const payload = { ...formData, subtotal, tax_amount: taxAmount, discount_amount: discountAmount, total, items: formData.items.map(item => ({ ...item, quantity: parseFloat(item.quantity) || 0, unit_price: parseFloat(item.unit_price) || 0, total: parseFloat(item.total) || 0 })) }
    if (!payload.valid_until) delete payload.valid_until
    onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4" style={{ backgroundColor: 'hsla(220,60%,2%,0.8)' }}>
      <div className="rounded-lg w-full max-w-4xl my-8" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${T.border}` }}>
          <h2 className="text-xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>{offer ? `Editar ${offer.reference}` : 'Nueva Oferta'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
        </div>
        <div style={{ borderBottom: `2px solid ${T.cyan}` }} />

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="offer-lead" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Lead *</label>
              <select id="offer-lead" value={formData.lead_id} onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })} style={inputStyle} disabled={!!offer}>
                <option value="">Seleccionar lead...</option>
                {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="offer-title" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Titulo *</label>
              <input id="offer-title" type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={inputStyle} placeholder="Propuesta Plataforma GRC..." />
            </div>
          </div>

          <div>
            <label htmlFor="offer-description" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Descripcion</label>
            <textarea id="offer-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={inputStyle} rows={2} placeholder="Descripcion general de la oferta..." />
          </div>

          {offer && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label htmlFor="offer-status" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Estado</label><select id="offer-status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>{Object.entries(STATUS_CONFIG).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}</select></div>
              <div><label htmlFor="offer-valid-until" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Valida hasta</label><input id="offer-valid-until" type="date" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} style={inputStyle} /></div>
              <div><label htmlFor="offer-currency" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Moneda</label><select id="offer-currency" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} style={inputStyle}><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option></select></div>
            </div>
          )}

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-medium" style={{ color: T.fgMuted }}>Lineas de la oferta</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setCatalogOpen(!catalogOpen)} className="text-xs flex items-center gap-1.5" style={{ color: T.cyan }}><Package className="w-3.5 h-3.5" /> Catalogo</button>
                <button type="button" onClick={addItem} className="text-xs flex items-center gap-1.5" style={{ color: T.fgMuted }}><Plus className="w-3.5 h-3.5" /> Linea manual</button>
              </div>
            </div>

            {catalogOpen && (
              <div className="mb-4 rounded-lg p-4 max-h-64 overflow-y-auto" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
                {[...new Set(PRODUCT_CATALOG.map(p => p.category))].map(category => (
                  <div key={category} className="mb-3 last:mb-0">
                    <h4 className="text-xs mb-2" style={{ color: T.cyan, fontFamily: fontMono }}>{category}</h4>
                    <div className="space-y-0.5">
                      {PRODUCT_CATALOG.filter(p => p.category === category).map((product, idx) => (
                        <button key={idx} type="button" onClick={() => addCatalogProduct(product)} className="w-full flex items-center justify-between px-3 py-1.5 rounded transition-colors text-left" style={{ color: T.fg }}>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm" style={{ fontFamily: fontMono }}>{product.name}</span>
                            <span className="text-xs ml-2 hidden sm:inline" style={{ color: T.fgMuted }}>{product.description}</span>
                          </div>
                          <span className="text-sm font-medium ml-3 whitespace-nowrap tabular-nums" style={{ color: T.cyan, fontFamily: fontMono }}>{product.unit_price.toLocaleString('es-ES')} EUR</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-12 gap-2 text-xs px-1" style={{ color: T.fgMuted }}>
                <div className="col-span-4">Concepto</div><div className="col-span-3">Descripcion</div><div className="col-span-1 text-center">Cant.</div><div className="col-span-2 text-right">P. Unit.</div><div className="col-span-1 text-right">Total</div><div className="col-span-1" />
              </div>
              {formData.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input type="text" value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} placeholder="Concepto" style={{ ...inputStyle }} className="col-span-12 md:col-span-4" aria-label={`Concepto linea ${idx + 1}`} />
                  <input type="text" value={item.description || ''} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Descripcion" style={{ ...inputStyle }} className="col-span-12 md:col-span-3" aria-label={`Descripcion linea ${idx + 1}`} />
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} min="0" step="1" style={{ ...inputStyle, textAlign: 'center' }} className="col-span-4 md:col-span-1" aria-label={`Cantidad linea ${idx + 1}`} />
                  <input type="number" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} min="0" step="0.01" style={{ ...inputStyle, textAlign: 'right' }} className="col-span-4 md:col-span-2" aria-label={`Precio unitario linea ${idx + 1}`} />
                  <div className="col-span-3 md:col-span-1 text-right text-sm tabular-nums" style={{ color: T.fgMuted, fontFamily: fontMono }}>{(parseFloat(item.total) || 0).toFixed(2)}</div>
                  <button type="button" onClick={() => removeItem(idx)} className="col-span-1 p-1 rounded transition-colors" style={{ color: T.fgMuted }} disabled={formData.items.length <= 1}><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full md:w-72 space-y-2 rounded-lg p-4" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}>
              <div className="flex justify-between text-sm" style={{ fontFamily: fontMono }}><span style={{ color: T.fgMuted }}>Subtotal</span><span style={{ color: T.fg }} className="tabular-nums">{subtotal.toFixed(2)} {formData.currency}</span></div>
              <div className="flex justify-between text-sm items-center gap-2" style={{ fontFamily: fontMono }}>
                <span style={{ color: T.fgMuted }}>Descuento</span>
                <div className="flex items-center gap-1">
                  <input id="offer-discount" type="number" value={formData.discount_percent} onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })} min="0" max="100" step="0.5" className="w-16 text-right tabular-nums" style={{ ...inputStyle, width: '4rem', padding: '0.125rem 0.5rem' }} aria-label="Porcentaje de descuento" />
                  <span className="text-xs" style={{ color: T.fgMuted }}>%</span>
                  <span className="ml-2 tabular-nums" style={{ color: T.destructive }}>-{discountAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm items-center gap-2" style={{ fontFamily: fontMono }}>
                <span style={{ color: T.fgMuted }}>IVA</span>
                <div className="flex items-center gap-1">
                  <input id="offer-tax-rate" type="number" value={formData.tax_rate} onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })} min="0" max="100" step="0.5" className="w-16 text-right tabular-nums" style={{ ...inputStyle, width: '4rem', padding: '0.125rem 0.5rem' }} aria-label="Porcentaje de IVA" />
                  <span className="text-xs" style={{ color: T.fgMuted }}>%</span>
                  <span className="ml-2 tabular-nums" style={{ color: T.fgMuted }}>+{taxAmount.toFixed(2)}</span>
                </div>
              </div>
              <div style={{ height: '1px', backgroundColor: T.border }} />
              <div className="flex justify-between text-base font-bold pt-1" style={{ fontFamily: fontMono }}><span style={{ color: T.fg }}>Total</span><span className="tabular-nums" style={{ color: T.cyan }}>{total.toFixed(2)} {formData.currency}</span></div>
            </div>
          </div>

          {/* Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="offer-payment-terms" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Condiciones de pago</label><textarea id="offer-payment-terms" value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })} style={inputStyle} rows={2} placeholder="30 dias fecha factura..." /></div>
            <div><label htmlFor="offer-notes" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Notas internas</label><textarea id="offer-notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={inputStyle} rows={2} placeholder="Notas internas..." /></div>
          </div>

          {!offer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label htmlFor="offer-valid-until-create" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Valida hasta</label><input id="offer-valid-until-create" type="date" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} style={inputStyle} /></div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: T.cyan, color: T.bg }} disabled={isLoading}>{isLoading ? 'Guardando...' : offer ? 'Actualizar' : 'Crear Oferta'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}


function OfferViewModal({ offer, onClose, onEdit, onSign, onInvoice }) {
  const config = STATUS_CONFIG[offer.status] || STATUS_CONFIG.draft
  const StatusIcon = config.icon

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4" style={{ backgroundColor: 'hsla(220,60%,2%,0.8)' }}>
      <div className="rounded-lg w-full max-w-3xl my-8" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm" style={{ color: T.cyan, fontFamily: fontMono }}>{offer.reference}</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs" style={{ color: config.color, backgroundColor: `${config.color}15` }}><StatusIcon className="w-3 h-3" />{config.label}</span>
            </div>
            <h2 className="text-xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>{offer.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!offer.signature_status && <button onClick={onSign} className="px-3 py-1.5 rounded-lg text-sm flex items-center" style={{ backgroundColor: T.cyan, color: T.bg }}><PenTool className="w-4 h-4 mr-1.5" /> Firma electronica</button>}
            {(offer.status === 'accepted' || offer.status === 'sent') && !offer.invoice_id && <button onClick={onInvoice} className="px-3 py-1.5 rounded-lg text-sm flex items-center" style={{ backgroundColor: T.purple, color: '#fff' }}><Receipt className="w-4 h-4 mr-1.5" /> Facturar</button>}
            <button onClick={() => generateOfferPDF(offer)} className="px-3 py-1.5 rounded-lg text-sm flex items-center" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}><Download className="w-4 h-4 mr-1.5" /> PDF</button>
            <button onClick={onEdit} className="px-3 py-1.5 rounded-lg text-sm flex items-center" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}><Edit3 className="w-4 h-4 mr-1.5" /> Editar</button>
            <button onClick={onClose} className="p-2 rounded-lg" style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div style={{ borderBottom: `2px solid ${T.cyan}` }} />

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><span className="text-xs" style={{ color: T.fgMuted }}>Lead</span><p className="text-sm mt-1" style={{ color: T.fg }}>{offer.lead_id ? <Link to={`/leads/${offer.lead_id}`} style={{ color: T.cyan }} onClick={onClose}>{offer.lead_name || '--'}</Link> : '--'}</p></div>
            <div><span className="text-xs" style={{ color: T.fgMuted }}>Valida hasta</span><p className="text-sm mt-1" style={{ color: T.fg }}>{offer.valid_until ? new Date(offer.valid_until).toLocaleDateString('es-ES') : '--'}</p></div>
            <div><span className="text-xs" style={{ color: T.fgMuted }}>Creada</span><p className="text-sm mt-1" style={{ color: T.fg }}>{new Date(offer.created_at).toLocaleDateString('es-ES')}</p></div>
            <div><span className="text-xs" style={{ color: T.fgMuted }}>Total</span><p className="text-lg font-bold tabular-nums mt-1" style={{ color: T.cyan, fontFamily: fontMono }}>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: offer.currency || 'EUR' }).format(offer.total || 0)}</p></div>
          </div>

          {offer.description && <div><span className="text-xs" style={{ color: T.fgMuted }}>Descripcion</span><p className="text-sm mt-1" style={{ color: T.fgMuted }}>{offer.description}</p></div>}

          {offer.items?.length > 0 && (
            <div>
              <span className="text-xs" style={{ color: T.fgMuted }}>Lineas</span>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm" style={{ fontFamily: fontMono }}>
                  <thead><tr style={{ borderBottom: `1px solid ${T.border}`, color: T.fgMuted }}><th className="text-left py-2 px-2 text-xs font-normal">Concepto</th><th className="text-center py-2 px-2 text-xs font-normal">Cant.</th><th className="text-right py-2 px-2 text-xs font-normal">P. Unit.</th><th className="text-right py-2 px-2 text-xs font-normal">Total</th></tr></thead>
                  <tbody>
                    {offer.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td className="py-2.5 px-2"><div style={{ color: T.fg }}>{item.name}</div>{item.description && <div className="text-xs" style={{ color: T.fgMuted }}>{item.description}</div>}</td>
                        <td className="text-center py-2.5 px-2 tabular-nums" style={{ color: T.fgMuted }}>{item.quantity}</td>
                        <td className="text-right py-2.5 px-2 tabular-nums" style={{ color: T.fgMuted }}>{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                        <td className="text-right py-2.5 px-2 font-medium tabular-nums" style={{ color: T.fg }}>{parseFloat(item.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <div className="w-64 space-y-1.5 text-sm" style={{ fontFamily: fontMono }}>
                  <div className="flex justify-between" style={{ color: T.fgMuted }}><span>Subtotal</span><span className="tabular-nums">{(offer.subtotal || 0).toFixed(2)}</span></div>
                  {offer.discount_percent > 0 && <div className="flex justify-between" style={{ color: T.destructive }}><span>Descuento ({offer.discount_percent}%)</span><span className="tabular-nums">-{(offer.discount_amount || 0).toFixed(2)}</span></div>}
                  <div className="flex justify-between" style={{ color: T.fgMuted }}><span>IVA ({offer.tax_rate}%)</span><span className="tabular-nums">+{(offer.tax_amount || 0).toFixed(2)}</span></div>
                  <div style={{ height: '1px', backgroundColor: T.border }} />
                  <div className="flex justify-between font-bold pt-1"><span style={{ color: T.fg }}>Total</span><span className="tabular-nums" style={{ color: T.cyan }}>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: offer.currency || 'EUR' }).format(offer.total || 0)}</span></div>
                </div>
              </div>
            </div>
          )}

          {(offer.payment_terms || offer.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offer.payment_terms && <div><span className="text-xs" style={{ color: T.fgMuted }}>Condiciones de pago</span><p className="text-sm mt-1" style={{ color: T.fgMuted }}>{offer.payment_terms}</p></div>}
              {offer.notes && <div><span className="text-xs" style={{ color: T.fgMuted }}>Notas</span><p className="text-sm mt-1" style={{ color: T.fgMuted }}>{offer.notes}</p></div>}
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs pt-4" style={{ borderTop: `1px solid ${T.border}`, color: T.fgMuted, fontFamily: fontMono }}>
            {offer.sent_at && <span>Enviada: {new Date(offer.sent_at).toLocaleDateString('es-ES')}</span>}
            {offer.accepted_at && <span>Aceptada: {new Date(offer.accepted_at).toLocaleDateString('es-ES')}</span>}
            {offer.rejected_at && <span>Rechazada: {new Date(offer.rejected_at).toLocaleDateString('es-ES')}{offer.rejection_reason && ` -- ${offer.rejection_reason}`}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}


function SignatureModal({ offer, onClose, onSuccess }) {
  const [provider, setProvider] = useState('yousign')
  const [signerEmail, setSignerEmail] = useState('')
  const [signerName, setSignerName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!signerEmail || !signerName) { toast.error('Email y nombre del firmante son obligatorios'); return }
    setSending(true)
    try {
      await offersApi.sign(offer.id, { provider, signer_email: signerEmail, signer_name: signerName, message: message || undefined })
      toast.success(`Oferta enviada para firma via ${provider === 'yousign' ? 'YouSign' : 'DocuSign'}`)
      onSuccess()
    } catch (err) { toast.error(`Error: ${err.response?.data?.detail || err.message}`) }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'hsla(220,60%,2%,0.8)' }}>
      <div className="rounded-lg w-full max-w-lg" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}><PenTool className="w-5 h-5" style={{ color: T.cyan }} />Firma Electronica</h2>
            <p className="text-sm mt-1" style={{ color: T.fgMuted }}>{offer.reference} -- {offer.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
        </div>
        <div style={{ borderBottom: `2px solid ${T.cyan}` }} />

        <form onSubmit={handleSend} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-3" style={{ color: T.fgMuted }}>Proveedor de firma</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ id: 'yousign', name: 'YouSign', desc: 'Firma electronica europea' }, { id: 'docusign', name: 'DocuSign', desc: 'Firma electronica global' }].map(p => (
                <button key={p.id} type="button" onClick={() => setProvider(p.id)} className="p-3 rounded-lg text-sm transition-all text-left" style={{ backgroundColor: provider === p.id ? `${T.cyan}10` : T.muted, border: `1px solid ${provider === p.id ? `${T.cyan}40` : T.border}`, color: provider === p.id ? T.cyan : T.fgMuted }}>
                  <div className="font-semibold" style={{ color: provider === p.id ? T.fg : T.fgMuted }}>{p.name}</div>
                  <div className="text-xs opacity-75 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div><label htmlFor="offer-signer-name" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Nombre del firmante *</label><input id="offer-signer-name" type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)} style={inputStyle} placeholder="Juan Garcia Lopez" required /></div>
          <div><label htmlFor="offer-signer-email" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Email del firmante *</label><input id="offer-signer-email" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} style={inputStyle} placeholder="juan.garcia@empresa.com" required /></div>
          <div><label htmlFor="offer-sign-message" className="block text-xs font-medium mb-2" style={{ color: T.fgMuted }}>Mensaje personalizado (opcional)</label><textarea id="offer-sign-message" value={message} onChange={(e) => setMessage(e.target.value)} style={inputStyle} rows={3} placeholder="Estimado/a, adjuntamos la propuesta comercial..." /></div>

          <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, fontFamily: fontMono }}>
            <div className="flex justify-between" style={{ color: T.fgMuted }}><span>Oferta</span><span style={{ color: T.fg }}>{offer.reference}</span></div>
            <div className="flex justify-between mt-1" style={{ color: T.fgMuted }}><span>Importe</span><span className="font-semibold tabular-nums" style={{ color: T.cyan }}>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: offer.currency || 'EUR' }).format(offer.total || 0)}</span></div>
            <div className="flex justify-between mt-1" style={{ color: T.fgMuted }}><span>Cliente</span><span style={{ color: T.fg }}>{offer.lead_name || '--'}</span></div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" style={{ backgroundColor: T.cyan, color: T.bg }} disabled={sending}><PenTool className="w-4 h-4" />{sending ? 'Enviando...' : 'Enviar para firma'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}


function InvoiceModal({ offer, onClose, onSuccess }) {
  const [provider, setProvider] = useState('')
  const [creating, setCreating] = useState(false)
  const PROVIDERS = [
    { id: 'holded', name: 'Holded', desc: 'Facturacion y contabilidad para empresas en Espana' },
    { id: 'stripe', name: 'Stripe', desc: 'Facturacion y cobros online internacionales' },
    { id: 'facturama', name: 'Facturama', desc: 'Facturacion electronica CFDI para Mexico y LATAM' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!provider) { toast.error('Selecciona un proveedor de facturacion'); return }
    setCreating(true)
    try { await offersApi.invoice(offer.id, { provider }); toast.success('Factura creada correctamente'); onSuccess() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error creando factura') }
    finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'hsla(220,60%,2%,0.8)' }}>
      <div className="rounded-lg w-full max-w-md" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${T.border}` }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}><Receipt className="w-5 h-5" style={{ color: T.cyan }} />Crear factura</h2>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: T.fgMuted }}><X className="w-5 h-5" /></button>
        </div>
        <div style={{ borderBottom: `2px solid ${T.cyan}` }} />

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-3" style={{ color: T.fgMuted }}>Proveedor de facturacion</label>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <label key={p.id} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all" style={{ backgroundColor: provider === p.id ? `${T.cyan}10` : T.muted, border: `1px solid ${provider === p.id ? `${T.cyan}40` : T.border}` }}>
                  <input type="radio" name="provider" value={p.id} checked={provider === p.id} onChange={() => setProvider(p.id)} />
                  <div><div className="font-medium text-sm" style={{ color: T.fg }}>{p.name}</div><div className="text-xs" style={{ color: T.fgMuted }}>{p.desc}</div></div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, fontFamily: fontMono }}>
            <div className="flex justify-between" style={{ color: T.fgMuted }}><span>Oferta</span><span style={{ color: T.fg }}>{offer.reference}</span></div>
            <div className="flex justify-between mt-1" style={{ color: T.fgMuted }}><span>Importe</span><span className="font-semibold tabular-nums" style={{ color: T.cyan }}>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: offer.currency || 'EUR' }).format(offer.total || 0)}</span></div>
            <div className="flex justify-between mt-1" style={{ color: T.fgMuted }}><span>Cliente</span><span style={{ color: T.fg }}>{offer.lead_name || '--'}</span></div>
            {offer.items?.length > 0 && <div className="flex justify-between mt-1" style={{ color: T.fgMuted }}><span>Lineas</span><span className="tabular-nums" style={{ color: T.fg }}>{offer.items.length}</span></div>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2" style={{ backgroundColor: T.cyan, color: T.bg }} disabled={creating}><Receipt className="w-4 h-4" />{creating ? 'Creando...' : 'Crear factura'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
