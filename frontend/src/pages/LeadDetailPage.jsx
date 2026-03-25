import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { leadsApi, automationTasksApi, contactsApi, visitsApi, emailsApi, callsApi } from '@/services/api'
import { ArrowLeft, Mail, Building2, User, Phone, MapPin, Globe, FileText, Tag, TrendingUp, Users, Star, Crown, Linkedin, Calendar, Clock, Video, Send, Sparkles, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#1E6FD9', purple: '#F5820B', destructive: '#EF4444',
  success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const statusStyle = {
  new: { color: T.cyan, bg: `${T.cyan}15` },
  contacted: { color: T.warning, bg: `${T.warning}15` },
  qualified: { color: T.success, bg: `${T.success}15` },
  proposal: { color: T.purple, bg: `${T.purple}15` },
  negotiation: { color: T.warning, bg: `${T.warning}15` },
  won: { color: T.success, bg: `${T.success}15` },
  lost: { color: T.destructive, bg: `${T.destructive}15` },
  dormant: { color: T.fgMuted, bg: `${T.fgMuted}15` },
}

const sourceLabels = {
  website: 'Web', referral: 'Referido', cold_outreach: 'Outbound',
  event: 'Evento', partner: 'Partner', other: 'Otro',
}

const visitResultStyle = {
  positive: { color: T.success, bg: `${T.success}15` },
  neutral: { color: T.warning, bg: `${T.warning}15` },
  negative: { color: T.destructive, bg: `${T.destructive}15` },
  pending: { color: T.fgMuted, bg: `${T.fgMuted}15` },
}

const emailStatusStyle = {
  draft: { color: T.fgMuted, bg: `${T.fgMuted}15` },
  sent: { color: T.success, bg: `${T.success}15` },
  opened: { color: T.cyan, bg: `${T.cyan}15` },
  failed: { color: T.destructive, bg: `${T.destructive}15` },
}

export default function LeadDetailPage() {
  const { id } = useParams()

  const { data: lead, isLoading, refetch } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.get(id).then(r => r.data),
    enabled: !!id,
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-lead', id],
    queryFn: () => contactsApi.getByLead(id).then(r => r.data),
    enabled: !!id,
  })

  const { data: leadVisits = [] } = useQuery({
    queryKey: ['visits-lead', id],
    queryFn: () => visitsApi.list({ lead_id: id }).then(r => r.data?.items || r.data || []),
    enabled: !!id,
  })

  const { data: leadEmails = [] } = useQuery({
    queryKey: ['emails-lead', id],
    queryFn: () => emailsApi.list({ lead_id: id }).then(r => r.data?.items || r.data || []),
    enabled: !!id,
  })

  const { data: leadCalls = [] } = useQuery({
    queryKey: ['calls-lead', id],
    queryFn: () => callsApi.list({ lead_id: id, page_size: 10 }).then(r => r.data?.items || []),
    enabled: !!id,
  })

  const triggerEM01 = useMutation({
    mutationFn: () => automationTasksApi.triggerEM01(id),
    onSuccess: () => { toast.success('Welcome Sequence iniciada! Email Day 0 enviado.', { duration: 5000 }); refetch() },
    onError: (error) => { toast.error(error.response?.data?.detail || 'Error al iniciar la secuencia', { duration: 5000 }) },
  })

  const enrichMutation = useMutation({
    mutationFn: () => leadsApi.enrich(id),
    onSuccess: (res) => {
      const data = res.data
      if (data.enriched) { toast.success(`Lead enriquecido via ${data.source}`); refetch() }
      else toast.error(data.error || 'No se encontraron datos de enriquecimiento')
    },
    onError: (error) => { toast.error(error.response?.data?.detail || 'Error al enriquecer lead') },
  })

  const verifyEmailMutation = useMutation({
    mutationFn: () => leadsApi.verifyEmail(id),
    onSuccess: (res) => {
      const v = res.data
      const label = v.result === 'deliverable' ? 'Deliverable' : v.result === 'risky' ? 'Risky' : v.result === 'undeliverable' ? 'Undeliverable' : 'Unknown'
      toast.success(`Email ${v.email}: ${label} (score ${v.score})`)
      refetch()
    },
    onError: (error) => { toast.error(error.response?.data?.detail || 'Error al verificar email') },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: T.cyan, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: T.fgMuted }}>Lead no encontrado</p>
      </div>
    )
  }

  const st = statusStyle[lead.status] || statusStyle.dormant

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="mb-6">
        <Link to="/app/leads" className="inline-flex items-center gap-2 text-sm mb-4 transition-colors" style={{ color: T.fgMuted }}>
          <ArrowLeft className="w-4 h-4" /> Volver a Leads
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: fontDisplay, color: T.fg }}>{lead.company_name}</h1>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ color: st.color, backgroundColor: st.bg }}>{lead.status}</span>
              <span className="text-sm" style={{ color: T.fgMuted }}>{sourceLabels[lead.source] || lead.source}</span>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4" style={{ color: T.cyan }} />
                <span className="font-semibold" style={{ fontFamily: fontMono, color: T.cyan }}>Score: {lead.score}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => enrichMutation.mutate()} disabled={enrichMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={lead.enriched_at
                ? { backgroundColor: `${T.success}15`, color: T.success, border: `1px solid ${T.success}40` }
                : { background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`, color: T.bg }
              }>
              {enrichMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : lead.enriched_at ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {enrichMutation.isPending ? 'Enriqueciendo...' : lead.enriched_at ? 'Re-enriquecer' : 'Enriquecer (Apollo)'}
            </button>
            {lead.contact_email && (
              <button onClick={() => verifyEmailMutation.mutate()} disabled={verifyEmailMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: `${T.warning}15`, color: T.warning, border: `1px solid ${T.warning}40` }}>
                {verifyEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {verifyEmailMutation.isPending ? 'Verificando...' : 'Verificar email'}
              </button>
            )}
            <button onClick={() => triggerEM01.mutate()} disabled={triggerEM01.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              style={{ fontFamily: fontDisplay, backgroundColor: T.cyan, color: T.bg }}>
              <Mail className="w-4 h-4" />
              {triggerEM01.isPending ? 'Enviando...' : 'Iniciar Welcome Sequence (EM-01)'}
            </button>
            <Link to={`/leads/${id}/abm`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: `${T.purple}15`, color: T.purple, border: `1px solid ${T.purple}40` }}>
              <Building2 className="w-4 h-4" /> Vista ABM
            </Link>
          </div>
        </div>
      </div>

      {/* Agent Scoring ICP */}
      {lead.enrichment_data?.agent_scoring && (
        <div className="rounded-lg p-5 mb-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
            <TrendingUp className="w-5 h-5" style={{ color: T.cyan }} /> Scoring ICP — AGENT-LEAD-001
          </h2>
          {(() => {
            const s = lead.enrichment_data.agent_scoring
            const tierColors = { A: T.success, B: T.cyan, C: '#f59e0b', D: T.destructive }
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${T.muted}` }}>
                    <p className="text-3xl font-bold" style={{ fontFamily: fontMono, color: T.cyan }}>{s.icp_score}</p>
                    <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Score ICP</p>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${T.muted}` }}>
                    <p className="text-3xl font-bold" style={{ fontFamily: fontMono, color: tierColors[s.tier] || T.fg }}>Tier {s.tier}</p>
                    <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Clasificación</p>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${T.muted}` }}>
                    <p className="text-sm font-semibold" style={{ color: s.action === 'qualify' ? T.success : s.action === 'nurture' ? '#f59e0b' : T.destructive }}>
                      {s.action === 'qualify' ? '✅ Cualificar' : s.action === 'nurture' ? '🔄 Nurturing' : '❌ Descartar'}
                    </p>
                    <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>Acción recomendada</p>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${T.muted}` }}>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {(s.frameworks || []).map(f => (
                        <span key={f} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${T.cyan}15`, color: T.cyan }}>{f}</span>
                      ))}
                    </div>
                    <p className="text-[10px] uppercase mt-1" style={{ color: T.fgMuted }}>Frameworks</p>
                  </div>
                </div>
                {s.reasoning && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: `${T.muted}` }}>
                    <p className="text-[10px] uppercase font-medium mb-1" style={{ color: T.fgMuted }}>Razonamiento del agente</p>
                    <p className="text-sm leading-relaxed" style={{ color: T.fg }}>{s.reasoning}</p>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Info */}
          <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
              <Building2 className="w-5 h-5" style={{ color: T.cyan }} /> Informacion de la Empresa
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {lead.company_cif && <div><p className="text-xs" style={{ color: T.fgMuted }}>CIF</p><p className="text-sm font-medium" style={{ color: T.fg }}>{lead.company_cif}</p></div>}
              {lead.company_sector && <div><p className="text-xs" style={{ color: T.fgMuted }}>Sector</p><p className="text-sm font-medium capitalize" style={{ color: T.fg }}>{lead.company_sector}</p></div>}
              {lead.company_size && <div><p className="text-xs" style={{ color: T.fgMuted }}>Tamano</p><p className="text-sm font-medium" style={{ color: T.fg }}>{lead.company_size}</p></div>}
              {lead.company_revenue && <div><p className="text-xs" style={{ color: T.fgMuted }}>Facturacion</p><p className="text-sm font-medium" style={{ color: T.fg }}>{lead.company_revenue}</p></div>}
              {lead.company_website && (
                <div className="col-span-2">
                  <p className="text-xs mb-1" style={{ color: T.fgMuted }}>Website</p>
                  <a href={lead.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm" style={{ color: T.cyan }}>
                    <Globe className="w-4 h-4" /> {lead.company_website}
                  </a>
                </div>
              )}
              {(lead.company_address || lead.company_city) && (
                <div className="col-span-2">
                  <p className="text-xs mb-1 flex items-center gap-1" style={{ color: T.fgMuted }}><MapPin className="w-4 h-4" /> Ubicacion</p>
                  <p className="text-sm font-medium" style={{ color: T.fg }}>
                    {lead.company_address && `${lead.company_address}, `}{lead.company_city}
                    {lead.company_province && `, ${lead.company_province}`}{lead.company_country && ` (${lead.company_country})`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
              <User className="w-5 h-5" style={{ color: T.cyan }} /> Contacto Principal
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {lead.contact_name && <div><p className="text-xs" style={{ color: T.fgMuted }}>Nombre</p><p className="text-sm font-medium" style={{ color: T.fg }}>{lead.contact_name}</p></div>}
              {lead.contact_title && <div><p className="text-xs" style={{ color: T.fgMuted }}>Cargo</p><p className="text-sm font-medium" style={{ color: T.fg }}>{lead.contact_title}</p></div>}
              {lead.contact_email && (
                <div className="col-span-2">
                  <p className="text-xs mb-1" style={{ color: T.fgMuted }}>Email</p>
                  <a href={`mailto:${lead.contact_email}`} className="flex items-center gap-2 text-sm" style={{ color: T.cyan }}><Mail className="w-4 h-4" /> {lead.contact_email}</a>
                </div>
              )}
              {lead.contact_phone && (
                <div className="col-span-2">
                  <p className="text-xs mb-1" style={{ color: T.fgMuted }}>Telefono</p>
                  <a href={`tel:${lead.contact_phone}`} className="flex items-center gap-2 text-sm" style={{ color: T.cyan }}><Phone className="w-4 h-4" /> {lead.contact_phone}</a>
                </div>
              )}
              {lead.contact_linkedin && (
                <div className="col-span-2">
                  <p className="text-xs mb-1" style={{ color: T.fgMuted }}>LinkedIn</p>
                  <a href={lead.contact_linkedin} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ color: T.cyan }}>{lead.contact_linkedin}</a>
                </div>
              )}
            </div>
          </div>

          {/* Contacts / Stakeholders */}
          {contacts.length > 0 && (
            <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
                  <Users className="w-5 h-5" style={{ color: T.cyan }} /> Contactos ({contacts.length})
                </h2>
                <Link to="/app/clients" className="text-sm" style={{ color: T.cyan }}>Ver todos</Link>
              </div>
              <div className="space-y-3">
                {contacts.map(contact => (
                  <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: T.muted }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${T.cyan}15` }}>
                      <span className="text-sm font-bold" style={{ color: T.cyan }}>{contact.full_name?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate" style={{ color: T.fg }}>{contact.full_name}</span>
                        {contact.is_primary && <Star className="w-3 h-3 flex-shrink-0" style={{ color: T.warning }} fill="currentColor" />}
                        {contact.is_budget_holder && <Crown className="w-3 h-3 flex-shrink-0" style={{ color: T.warning }} />}
                      </div>
                      <p className="text-xs" style={{ color: T.fgMuted }}>{contact.job_title || contact.role_type}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {contact.email && <a href={`mailto:${contact.email}`} className="p-1 rounded"><Mail className="w-3.5 h-3.5" style={{ color: T.fgMuted }} /></a>}
                      {contact.phone && <a href={`tel:${contact.phone}`} className="p-1 rounded"><Phone className="w-3.5 h-3.5" style={{ color: T.fgMuted }} /></a>}
                      {contact.linkedin_url && <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded"><Linkedin className="w-3.5 h-3.5" style={{ color: T.fgMuted }} /></a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visits */}
          <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
                <Calendar className="w-5 h-5" style={{ color: T.cyan }} /> Visitas ({leadVisits.length})
              </h2>
              <Link to="/app/visits" className="text-sm" style={{ color: T.cyan }}>Ver todas</Link>
            </div>
            {leadVisits.length === 0 ? (
              <p className="text-sm" style={{ color: T.fgMuted }}>Sin visitas registradas</p>
            ) : (
              <div className="space-y-2">
                {leadVisits.slice(0, 5).map(visit => {
                  const vr = visitResultStyle[visit.result] || visitResultStyle.pending
                  return (
                    <div key={visit.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: T.muted }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${T.cyan}15` }}>
                        {visit.visit_type === 'video' ? <Video className="w-4 h-4" style={{ color: T.cyan }} /> : <Building2 className="w-4 h-4" style={{ color: T.cyan }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: T.fg }}>
                          {visit.visit_type === 'presencial' ? 'Presencial' : visit.visit_type === 'video' ? 'Videollamada' : visit.visit_type}
                          {visit.location && <span style={{ color: T.fgMuted }}> — {visit.location}</span>}
                        </p>
                        <p className="text-xs flex items-center gap-1" style={{ color: T.fgMuted }}>
                          <Clock className="w-3 h-3" />
                          {new Date(visit.visit_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {visit.duration_minutes && ` · ${visit.duration_minutes} min`}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: vr.color, backgroundColor: vr.bg }}>{visit.result || 'pendiente'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Emails */}
          <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
                <Send className="w-5 h-5" style={{ color: T.cyan }} /> Emails ({leadEmails.length})
              </h2>
              <Link to="/app/emails" className="text-sm" style={{ color: T.cyan }}>Ver todos</Link>
            </div>
            {leadEmails.length === 0 ? (
              <p className="text-sm" style={{ color: T.fgMuted }}>Sin emails registrados</p>
            ) : (
              <div className="space-y-2">
                {leadEmails.slice(0, 5).map(email => {
                  const es = emailStatusStyle[email.status] || emailStatusStyle.draft
                  return (
                    <div key={email.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: T.muted }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${T.cyan}15` }}>
                        <Mail className="w-4 h-4" style={{ color: T.cyan }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: T.fg }}>{email.subject}</p>
                        <p className="text-xs" style={{ color: T.fgMuted }}>{email.to_email}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: es.color, backgroundColor: es.bg }}>
                        {email.status === 'draft' ? 'borrador' : email.status === 'sent' ? 'enviado' : email.status === 'opened' ? 'abierto' : email.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* AI Calls */}
          {leadCalls.length > 0 && (
            <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
                  <Phone className="w-5 h-5" style={{ color: T.cyan }} /> Llamadas IA ({leadCalls.length})
                </h2>
                <Link to="/app/calls" className="text-xs" style={{ color: T.cyan }}>Nueva llamada</Link>
              </div>
              <div className="space-y-2">
                {leadCalls.map(call => {
                  const callColor = call.resultado === 'demo_agendada' ? T.success : call.resultado === 'interesado' ? T.cyan : call.resultado === 'no_interesado' ? T.destructive : T.fgMuted
                  return (
                    <div key={call.id} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: callColor, backgroundColor: `${callColor}15` }}>
                          {call.resultado || call.estado}
                        </span>
                        <span className="text-xs ml-2" style={{ color: T.fgMuted }}>
                          {call.duracion_segundos ? `${Math.floor(call.duracion_segundos / 60)}m ${call.duracion_segundos % 60}s` : '—'}
                        </span>
                      </div>
                      <div className="text-right">
                        {call.score_antes != null && call.score_despues != null && (
                          <span className="text-xs font-medium" style={{ fontFamily: fontMono, color: call.score_despues > call.score_antes ? T.success : call.score_despues < call.score_antes ? T.destructive : T.fgMuted }}>
                            {call.score_antes} → {call.score_despues}
                          </span>
                        )}
                        <p className="text-xs" style={{ color: T.fgMuted }}>{new Date(call.fecha_inicio).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
                <FileText className="w-5 h-5" style={{ color: T.cyan }} /> Notas
              </h2>
              <p className="text-sm whitespace-pre-wrap" style={{ color: T.fg }}>{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Summary */}
          <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fg }}>Actividad</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                <span className="text-sm" style={{ color: T.fgMuted }}>Visitas</span>
                <span className="text-sm font-semibold" style={{ fontFamily: fontMono, color: T.fg }}>{lead.visits_count || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                <span className="text-sm" style={{ color: T.fgMuted }}>Emails</span>
                <span className="text-sm font-semibold" style={{ fontFamily: fontMono, color: T.fg }}>{lead.emails_count || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm" style={{ color: T.fgMuted }}>Acciones pendientes</span>
                <span className="text-sm font-semibold" style={{ fontFamily: fontMono, color: T.warning }}>{lead.actions_pending || 0}</span>
              </div>
            </div>
          </div>

          {/* Regulatory Frameworks */}
          {lead.regulatory_frameworks && lead.regulatory_frameworks.length > 0 && (
            <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fg }}>Frameworks Regulatorios</h3>
              <div className="flex flex-wrap gap-2">
                {lead.regulatory_frameworks.map(fw => (
                  <span key={fw} className="px-2 py-0.5 rounded text-xs font-medium" style={{ color: T.purple, backgroundColor: `${T.purple}15` }}>{fw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
                <Tag className="w-4 h-4" /> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded text-xs" style={{ color: T.fg, backgroundColor: T.muted }}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ fontFamily: fontDisplay, color: T.fg }}>Clasificacion</h3>
            <div className="space-y-2">
              {lead.is_critical_infrastructure && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: T.destructive }} />
                  <span style={{ color: T.fg }}>Infraestructura Critica</span>
                </div>
              )}
              {lead.is_public_sector && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: T.cyan }} />
                  <span style={{ color: T.fg }}>Sector Publico</span>
                </div>
              )}
              {!lead.is_critical_infrastructure && !lead.is_public_sector && (
                <p className="text-sm" style={{ color: T.fgMuted }}>Sin clasificacion especial</p>
              )}
            </div>
          </div>

          {/* Assigned To */}
          {lead.assigned_to && (
            <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ fontFamily: fontDisplay, color: T.fg }}>Asignado a</h3>
              <p className="text-sm" style={{ color: T.fg }}>{lead.assigned_to}</p>
            </div>
          )}

          {/* Apollo Enrichment Data */}
          {lead.enrichment_data && (
            <div className="rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
                <Sparkles className="w-4 h-4" style={{ color: T.purple }} /> Datos Enriquecidos
                <span className="text-xs font-normal ml-auto" style={{ color: T.fgMuted }}>{lead.enrichment_source}</span>
              </h3>
              {lead.enriched_at && (
                <p className="text-xs mb-3" style={{ color: T.fgMuted }}>
                  {new Date(lead.enriched_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}

              {lead.enrichment_data.organization && (
                <div className="space-y-2 mb-3">
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.fgMuted }}>Empresa</p>
                  {lead.enrichment_data.organization.industry && (
                    <div className="flex justify-between text-sm"><span style={{ color: T.fgMuted }}>Industria</span><span style={{ color: T.fg }}>{lead.enrichment_data.organization.industry}</span></div>
                  )}
                  {lead.enrichment_data.organization.estimated_num_employees && (
                    <div className="flex justify-between text-sm"><span style={{ color: T.fgMuted }}>Empleados</span><span style={{ fontFamily: fontMono, color: T.fg }}>{lead.enrichment_data.organization.estimated_num_employees.toLocaleString()}</span></div>
                  )}
                  {lead.enrichment_data.organization.annual_revenue && (
                    <div className="flex justify-between text-sm"><span style={{ color: T.fgMuted }}>Facturacion</span><span style={{ color: T.fg }}>{lead.enrichment_data.organization.annual_revenue}</span></div>
                  )}
                  {lead.enrichment_data.organization.founded_year && (
                    <div className="flex justify-between text-sm"><span style={{ color: T.fgMuted }}>Fundada</span><span style={{ fontFamily: fontMono, color: T.fg }}>{lead.enrichment_data.organization.founded_year}</span></div>
                  )}
                  {lead.enrichment_data.organization.technologies?.length > 0 && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: T.fgMuted }}>Tecnologias</p>
                      <div className="flex flex-wrap gap-1">
                        {lead.enrichment_data.organization.technologies.slice(0, 6).map(t => (
                          <span key={t} className="px-2 py-0.5 rounded text-xs" style={{ color: T.purple, backgroundColor: `${T.purple}15` }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {lead.enrichment_data.person && (
                <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.fgMuted }}>Contacto</p>
                  {lead.enrichment_data.person.title && (
                    <div className="flex justify-between text-sm"><span style={{ color: T.fgMuted }}>Cargo</span><span style={{ color: T.fg }}>{lead.enrichment_data.person.title}</span></div>
                  )}
                  {lead.enrichment_data.person.seniority && (
                    <div className="flex justify-between text-sm"><span style={{ color: T.fgMuted }}>Seniority</span><span className="capitalize" style={{ color: T.fg }}>{lead.enrichment_data.person.seniority}</span></div>
                  )}
                  {lead.enrichment_data.person.departments?.length > 0 && (
                    <div className="flex justify-between text-sm"><span style={{ color: T.fgMuted }}>Departamento</span><span style={{ color: T.fg }}>{lead.enrichment_data.person.departments.join(', ')}</span></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <LeadTimeline leadId={id} />

      {/* Journey Timeline */}
      <LeadJourney leadId={id} />
    </div>
  )
}

function LeadTimeline({ leadId }) {
  const { data } = useQuery({
    queryKey: ['lead-timeline', leadId],
    queryFn: () => leadsApi.timeline(leadId).then(r => r.data),
    enabled: !!leadId,
  })

  const events = data?.events || []
  if (events.length === 0) return null

  const typeConfig = {
    email: { icon: '📧', color: 'border-blue-500/30' },
    visit: { icon: '📅', color: 'border-green-500/30' },
    action: { icon: '✅', color: 'border-yellow-500/30' },
    opportunity: { icon: '💰', color: 'border-purple-500/30' },
  }

  return (
    <div className="mt-6" style={{ padding: '0 1.5rem 1.5rem' }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: '#0F172A' }}>Actividad Reciente</h3>
      <div className="space-y-2">
        {events.slice(0, 15).map((e, i) => {
          const cfg = typeConfig[e.type] || typeConfig.action
          return (
            <div key={i} className={`flex items-start gap-3 bg-white/30 border-l-2 ${cfg.color} rounded-r-lg p-3`}>
              <span className="text-sm">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{e.title}</p>
                {e.detail && <p className="text-xs text-gray-500">{e.detail}</p>}
              </div>
              <span className="text-[10px] text-gray-600 whitespace-nowrap">
                {new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LeadJourney({ leadId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['lead-journey', leadId],
    queryFn: () => leadsApi.journey(leadId).then(r => r.data),
    enabled: !!leadId,
  })

  const events = data?.events || data || []
  if (isLoading) return null
  if (!Array.isArray(events) || events.length === 0) return null

  const TYPE_COLORS = {
    email: T.purple,
    visit: T.success,
    action: T.warning,
    call: T.destructive,
    opportunity: T.cyan,
    lead_created: T.cyan,
  }

  return (
    <div className="mt-6 rounded-lg p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
      <h2 className="text-base font-semibold mb-5 flex items-center gap-2" style={{ fontFamily: fontDisplay, color: T.fg }}>
        <TrendingUp className="w-5 h-5" style={{ color: T.cyan }} /> Journey del Lead
      </h2>
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, backgroundColor: T.border }} />
        {events.map((e, i) => (
          <div key={i} style={{ position: 'relative', paddingBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              position: 'absolute', left: -20, width: 16, height: 16, borderRadius: '50%',
              backgroundColor: TYPE_COLORS[e.type] || T.fgMuted,
              border: `2px solid ${T.bg}`, zIndex: 1,
            }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: T.fgMuted, fontFamily: fontMono, margin: 0 }}>
                {new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p style={{ fontSize: 13, color: T.fg, fontWeight: 500, margin: '2px 0' }}>{e.title}</p>
              {e.detail && <p style={{ fontSize: 11, color: T.fgMuted, margin: 0 }}>{e.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
