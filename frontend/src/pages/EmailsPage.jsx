import { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { emailsApi } from '@/services/api';
import { useLeadsSelect } from '@/hooks/useLeadsSelect';
import { Plus, Send, XCircle, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { mockEmails, mockDelay, USE_MOCK_DATA } from '@/mocks/mockData';
import ExportButton from '@/components/ExportButton';
import { formatDateForExport } from '@/utils/export';
import { ListItemSkeleton } from '@/components/LoadingStates';
import { SearchWithFilters, FilterSummary } from '@/components/AdvancedFilters';
import { usePersistedFilterSearch } from '@/hooks/usePersistedFilters';
import { useThemeColors, LIGHT as T } from '@/utils/theme'


;
const fontDisplay = "'Rajdhani', sans-serif";
const fontMono = "'IBM Plex Mono', monospace";
const inputStyle = { backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem', width: '100%', outline: 'none' };

const STATUS_MAP = {
  draft: { label: 'Borrador', color: T.fgMuted, bg: `${T.fgMuted}15` },
  sent: { label: 'Enviado', color: T.warning, bg: `${T.warning}15` },
  delivered: { label: 'Entregado', color: T.warning, bg: `${T.warning}15` },
  opened: { label: 'Abierto', color: T.cyan, bg: `${T.cyan}15` },
  clicked: { label: 'Click', color: T.success, bg: `${T.success}15` },
  failed: { label: 'Fallido', color: T.destructive, bg: `${T.destructive}15` }
};

function formatEmailDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function EmailsPage() {
  const T = useThemeColors()
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { filters, setFilters, searchQuery, setSearchQuery } = usePersistedFilterSearch('emails', {
    status: { type: 'multiselect', label: 'Estado', options: [{ value: 'draft', label: 'Borrador' }, { value: 'sent', label: 'Enviado' }, { value: 'delivered', label: 'Entregado' }, { value: 'opened', label: 'Abierto' }, { value: 'clicked', label: 'Click' }, { value: 'failed', label: 'Fallido' }], value: [] },
    follow_up: { type: 'multiselect', label: 'Tipo', options: [{ value: 'follow_up', label: 'Follow-up' }, { value: 'first_contact', label: 'Primer Contacto' }], value: [] },
    date_range: { type: 'daterange', label: 'Fecha de Envio', value: { from: '', to: '' } }
  });

  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: emailsData, isLoading } = useQuery({
    queryKey: ['emails', page],
    queryFn: async () => {
      if (USE_MOCK_DATA) {await mockDelay(600);return { items: mockEmails.items, total: mockEmails.items.length, pages: 1 };}
      try {const r = await emailsApi.list({ page, page_size: pageSize });return r.data;}
      catch {await mockDelay(400);return { items: mockEmails.items, total: mockEmails.items.length, pages: 1 };}
    }
  });
  const emails = emailsData?.items || [];
  const totalPages = emailsData?.pages || 1;
  const totalEmails = emailsData?.total || emails.length;

  const createEmail = useMutation({
    mutationFn: (data) => emailsApi.create(data),
    onSuccess: () => {queryClient.invalidateQueries(['emails']);toast.success('Email guardado');setShowCreateModal(false);},
    onError: (error) => {toast.error(`Error: ${error.response?.data?.detail || 'No se pudo crear'}`);}
  });

  const sendEmail = useMutation({
    mutationFn: (id) => USE_MOCK_DATA ? Promise.resolve({ id, status: 'sent' }) : emailsApi.send(id),
    onSuccess: () => {queryClient.invalidateQueries(['emails']);toast.success('Email enviado');},
    onError: (error) => {toast.error(`Error al enviar: ${error.response?.data?.detail || 'Error'}`);}
  });

  const handleFiltersChange = (key, value) => {setFilters({ ...filters, [key]: { ...filters[key], value } });};

  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!email.subject?.toLowerCase().includes(q) && !email.to_email?.toLowerCase().includes(q) && !email.lead_name?.toLowerCase().includes(q)) return false;
      }
      if (filters.status.value.length > 0 && !filters.status.value.includes(email.status)) return false;
      if (filters.follow_up.value.length > 0) {
        if (filters.follow_up.value.includes('follow_up') && !email.is_follow_up) return false;
        if (filters.follow_up.value.includes('first_contact') && email.is_follow_up) return false;
      }
      if (filters.date_range.value.from || filters.date_range.value.to) {
        const emailDate = new Date(email.sent_at || email.created_at);
        if (filters.date_range.value.from && emailDate < new Date(filters.date_range.value.from)) return false;
        if (filters.date_range.value.to && emailDate > new Date(filters.date_range.value.to)) return false;
      }
      return true;
    });
  }, [emails, searchQuery, filters]);

  const sortedEmails = useMemo(() => [...filteredEmails].sort((a, b) => new Date(b.created_at || b.sent_at) - new Date(a.created_at || a.sent_at)), [filteredEmails]);

  const sentCount = emails.filter((e) => e.status === 'sent' || e.status === 'delivered').length;
  const openedCount = emails.filter((e) => e.status === 'opened' || e.status === 'clicked').length;
  const openRate = sentCount > 0 ? Math.round(openedCount / sentCount * 100) : 0;
  const draftCount = emails.filter((e) => e.status === 'draft').length;
  const failedCount = emails.filter((e) => e.status === 'failed').length;

  const statCards = [
  { label: 'Total', value: emails.length, color: T.fg },
  { label: 'Enviados', value: sentCount, color: T.warning },
  { label: 'Abiertos', value: openedCount, color: T.cyan },
  { label: 'Tasa Apertura', value: `${openRate}%`, color: T.success },
  { label: 'Borradores', value: draftCount, color: T.fgMuted }];

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Emails</h1>
          <p className="text-sm mt-1" style={{ color: T.fgMuted }}>Centro de comunicaciones</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton data={emails || []} filename="emails" transform={(e) => ({ 'Asunto': e.subject, 'Para': e.to_email || '', 'Estado': e.status, 'Enviado': formatDateForExport(e.sent_at), 'Abierto': formatDateForExport(e.opened_at), 'Creado': formatDateForExport(e.created_at) })} size="sm" />
          <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
            <Plus className="w-4 h-4" /> Nuevo Email
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {statCards.map((s, i) =>
        <div key={i} className="rounded-lg p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-xs uppercase tracking-widest" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: fontMono, color: s.color }}>{s.value}</p>
          </div>
        )}
      </div>

      {failedCount > 0 &&
      <div className="rounded-lg p-3 mb-4 flex items-center gap-2" style={{ backgroundColor: `${T.destructive}10`, border: `1px solid ${T.destructive}30` }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: T.destructive }} />
          <span className="text-sm" style={{ fontFamily: fontMono, color: T.destructive }}>{failedCount} email{failedCount !== 1 ? 's' : ''} fallido{failedCount !== 1 ? 's' : ''}</span>
        </div>
      }

      {/* Search & Filters */}
      <SearchWithFilters searchValue={searchQuery} onSearchChange={setSearchQuery} placeholder="Buscar por asunto, destinatario, empresa..." filters={filters} onFiltersChange={handleFiltersChange} className="mb-4" />
      <FilterSummary filters={filters} onClear={handleFiltersChange} resultsCount={sortedEmails.length} />

      <div className="flex items-center gap-2 my-4">
        <div className="h-px flex-1" style={{ borderTop: `1px dashed ${T.border}` }} />
        <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{sortedEmails.length} email{sortedEmails.length !== 1 ? 's' : ''}</span>
        <div className="h-px flex-1" style={{ borderTop: `1px dashed ${T.border}` }} />
      </div>

      {/* Email list */}
      {isLoading ?
      <div className="space-y-3">{[...Array(5)].map((_, i) => <ListItemSkeleton key={i} />)}</div> :
      sortedEmails.length === 0 ?
      <div className="rounded-lg py-16 text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: T.fgMuted }} />
          <p className="text-sm" style={{ color: T.fgMuted }}>Sin emails</p>
        </div> :

      <div className="space-y-2">
          {sortedEmails.map((email) =>
        <EmailCard key={email.id} email={email} onSend={(id) => sendEmail.mutate(id)} />
        )}
        </div>
      }

      {/* Pagination */}
      {totalPages > 1 &&
      <div className="flex items-center justify-center gap-3 mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
        className="px-3 py-1.5 rounded-lg text-sm border disabled:opacity-30" style={{ borderColor: T.border, color: T.fgMuted }}>
            Anterior
          </button>
          <span className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>
            Página {page} de {totalPages} · {totalEmails} emails
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
        className="px-3 py-1.5 rounded-lg text-sm border disabled:opacity-30" style={{ borderColor: T.border, color: T.fgMuted }}>
            Siguiente
          </button>
        </div>
      }

      {showCreateModal &&
      <CreateEmailModal onClose={() => setShowCreateModal(false)} onSubmit={(data) => createEmail.mutate(data)} isLoading={createEmail.isPending} />
      }
    </div>);

}

function EmailCard({ email, onSend }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_MAP[email.status] || STATUS_MAP.draft;

  return (
    <div className="rounded-lg transition-all" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-0 cursor-pointer p-4" onClick={() => setExpanded(!expanded)}>
        {/* Status dot */}
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mr-4" style={{ backgroundColor: status.bg }}>
          <Mail className="w-5 h-5" style={{ color: status.color }} />
        </div>

        {/* Timestamp */}
        <div className="w-36 flex-shrink-0 pr-4">
          <div className="text-xs" style={{ fontFamily: fontMono, color: T.fgMuted }}>{formatEmailDate(email.sent_at || email.created_at)}</div>
          <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block" style={{ color: status.color, backgroundColor: status.bg }}>{status.label}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-medium truncate" style={{ color: T.fg }}>{email.subject || '(sin asunto)'}</span>
            {email.is_follow_up &&
            <span className="text-xs px-2 py-0.5 rounded" style={{ color: T.warning, backgroundColor: `${T.warning}15` }}>
                FUP-{email.follow_up_sequence || '?'}
              </span>
            }
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: T.fgMuted }}>
            <span className="flex items-center gap-1"><Send className="w-3 h-3" /> {email.to_email}</span>
            {email.lead_name && (
            email.lead_id ?
            <Link to={`/app/leads/${email.lead_id}`} style={{ color: T.fgMuted }} onClick={(e) => e.stopPropagation()}>{email.lead_name}</Link> :
            <span>{email.lead_name}</span>)
            }
          </div>
          {/* Timeline */}
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: T.fgMuted }}>
            {email.sent_at && <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full" style={{ backgroundColor: T.warning }} /> Enviado {formatEmailDate(email.sent_at)}</span>}
            {email.opened_at && <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full" style={{ backgroundColor: T.cyan }} /> Abierto {formatEmailDate(email.opened_at)}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-3 flex-shrink-0">
          {email.status === 'draft' &&
          <button onClick={(e) => {e.stopPropagation();onSend(email.id);}}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              Enviar
            </button>
          }
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: T.fgMuted }} /> : <ChevronDown className="w-4 h-4" style={{ color: T.fgMuted }} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded &&
      <div className="px-4 pb-4 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="ml-14">
            {/* Metadata */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div><span style={{ color: T.fgMuted }}>De: </span><span style={{ color: T.fg }}>{email.from_email || 'sistema'}</span></div>
              <div><span style={{ color: T.fgMuted }}>Para: </span><span style={{ color: T.fg }}>{email.to_email}</span></div>
              <div><span style={{ color: T.fgMuted }}>Estado: </span><span style={{ color: status.color }}>{status.label}</span></div>
            </div>

            {/* Body */}
            {email.body_html ?
          <div className="prose prose-sm prose-invert max-w-none p-4 rounded-lg text-sm" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body_html) }} /> :
          email.body_text ?
          <pre className="text-sm whitespace-pre-wrap p-4 rounded-lg leading-relaxed" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg, fontFamily: fontMono }}>{email.body_text}</pre> :

          <div className="text-sm p-4 rounded-lg text-center" style={{ backgroundColor: T.muted, border: `1px dashed ${T.border}`, color: T.fgMuted }}>Sin contenido</div>
          }

            {email.cc?.length > 0 &&
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: T.fgMuted }}>
                <span>CC:</span>
                {email.cc.map((addr, idx) =>
            <span key={idx} className="px-1.5 py-0.5 rounded" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>{addr}</span>
            )}
              </div>
          }
          </div>
        </div>
      }
    </div>);

}

function CreateEmailModal({ onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({ lead_id: '', subject: '', body_html: '', body_text: '', to_email: '', from_email: '', cc: [], is_follow_up: false, follow_up_sequence: null, scheduled_at: '' });
  const [ccInput, setCcInput] = useState('');
  const { leads } = useLeadsSelect();

  const handleLeadChange = (leadId) => {
    const selectedLead = leads.find((l) => l.id === leadId);
    setFormData({ ...formData, lead_id: leadId, to_email: selectedLead?.contact_email || formData.to_email });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.lead_id || !formData.subject || !formData.to_email) {toast.error('Completa los campos requeridos');return;}
    onSubmit({ ...formData, scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null, follow_up_sequence: formData.is_follow_up ? parseInt(formData.follow_up_sequence) || null : null });
  };

  const addCC = () => {
    if (ccInput.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ccInput)) {setFormData({ ...formData, cc: [...formData.cc, ccInput.trim()] });setCcInput('');} else
    toast.error('Direccion invalida');
  };

  const removeCC = (index) => {setFormData({ ...formData, cc: formData.cc.filter((_, i) => i !== index) });};

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg max-w-3xl w-full my-8" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
          <h2 className="text-xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>Nuevo Email</h2>
          <button onClick={onClose} style={{ color: T.fgMuted }} aria-label="Cerrar"><XCircle className="w-5 h-5" /></button>
        </div>
        <div className="h-0.5" style={{ backgroundColor: T.cyan }} />

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Destination */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Destino</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Lead <span style={{ color: T.destructive }}>*</span></label>
                <select id="emails-select-1" aria-label="Selector" value={formData.lead_id} onChange={(e) => handleLeadChange(e.target.value)} style={inputStyle} required>
                  <option value="">Seleccionar...</option>
                  {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name} {lead.contact_email && `(${lead.contact_email})`}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="email-to" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Para <span style={{ color: T.destructive }}>*</span></label>
                <input id="email-to" type="email" value={formData.to_email} onChange={(e) => setFormData({ ...formData, to_email: e.target.value })} style={inputStyle} placeholder="destinatario@empresa.com" required />
              </div>
              <div>
                <label htmlFor="email-cc" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>CC</label>
                <div className="flex gap-2">
                  <input id="email-cc" type="email" value={ccInput} onChange={(e) => setCcInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCC())} style={inputStyle} placeholder="cc@empresa.com" />
                  <button type="button" onClick={addCC} className="px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>+</button>
                </div>
              </div>
            </div>
            {formData.cc.length > 0 &&
            <div className="flex flex-wrap gap-2 mt-2">
                {formData.cc.map((addr, idx) =>
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
                    {addr} <button type="button" onClick={() => removeCC(idx)} aria-label="Cerrar"><XCircle className="w-3 h-3" /></button>
                  </span>
              )}
              </div>
            }
          </div>

          {/* Message */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Mensaje</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-subject" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Asunto <span style={{ color: T.destructive }}>*</span></label>
                <input id="email-subject" type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} style={inputStyle} placeholder="Asunto del email" required />
              </div>
              <div>
                <label htmlFor="email-body" className="block text-xs uppercase tracking-widest mb-1" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Contenido</label>
                <textarea id="email-body" value={formData.body_text} onChange={(e) => setFormData({ ...formData, body_text: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={8} placeholder="Cuerpo del email..." />
                <p className="text-xs mt-1" style={{ color: T.fgMuted }}>Se guardara como borrador — enviar despues</p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fgMuted }}>Opciones</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_follow_up} onChange={(e) => setFormData({ ...formData, is_follow_up: e.target.checked })} />
                <span className="text-sm" style={{ color: T.fg }}>Follow-up</span>
              </label>
              {formData.is_follow_up &&
              <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: T.fgMuted }}>Secuencia:</span>
                  <input type="number" value={formData.follow_up_sequence || ''} onChange={(e) => setFormData({ ...formData, follow_up_sequence: e.target.value })} style={{ ...inputStyle, width: '5rem' }} placeholder="#" min="1" />
                </div>
              }
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
            <button type="button" onClick={onClose} disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ fontFamily: fontDisplay, backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fgMuted }}>
              Cancelar
            </button>
            <button type="submit" disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              {isLoading ? 'Guardando...' : 'Guardar Borrador'}
            </button>
          </div>
        </form>
      </div>
    </div>);

}