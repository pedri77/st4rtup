import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Shield, FileText, Loader2, CheckCircle, User, Mail, Building2,
  Lock, Eye, ArrowRight, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { dealRoomDocsApi } from '@/services/api'

const T = {
  bg: '#F8FAFC', card: '#FFFFFF', muted: '#F1F5F9',
  border: '#E2E8F0', fg: '#0F172A', fgMuted: '#64748B',
  cyan: '#3B82F6', purple: '#6366F1',
  destructive: '#EF4444', success: '#10B981', warning: '#F59E0B',
}
const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const STAGES = { IDENTIFY: 'identify', NDA_GATE: 'nda_gate', ACTIVE: 'active' }

function isCorporateEmail(email) {
  const freeProviders = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com',
  ]
  const domain = email.split('@')[1]?.toLowerCase()
  return domain && !freeProviders.includes(domain)
}

export default function DealRoomPublicPage() {
  const { token } = useParams()
  const storageKey = `rs_deal_visitor_${token}`

  const [stage, setStage] = useState(STAGES.IDENTIFY)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [emailWarning, setEmailWarning] = useState('')
  const [ndaChecked, setNdaChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ndaResult, setNdaResult] = useState(null)
  const [docs, setDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)

  // Restore visitor info from session storage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.name && parsed.email && parsed.ndaSigned) {
          setName(parsed.name)
          setEmail(parsed.email)
          setCompany(parsed.company || '')
          setStage(STAGES.ACTIVE)
        } else if (parsed.name && parsed.email) {
          setName(parsed.name)
          setEmail(parsed.email)
          setCompany(parsed.company || '')
          setStage(STAGES.NDA_GATE)
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey])

  const saveVisitor = useCallback((data) => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(data))
    } catch {
      // ignore
    }
  }, [storageKey])

  const handleIdentify = (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    if (!isCorporateEmail(email)) {
      setEmailWarning('Se recomienda usar un email corporativo')
    } else {
      setEmailWarning('')
    }

    saveVisitor({ name, email, company, ndaSigned: false })
    setStage(STAGES.NDA_GATE)
  }

  const handleNdaRequest = async () => {
    setLoading(true)
    try {
      const res = await dealRoomDocsApi.requestNda(token, {
        member_email: email,
        member_name: name,
        company_name: company,
      })
      setNdaResult(res.data)
      if (res.data.provider === 'checkbox') {
        // Checkbox mode - user needs to check the box
      } else if (res.data.sign_url) {
        window.open(res.data.sign_url, '_blank')
        toast.success('NDA abierto para firma')
      } else {
        toast.success('NDA enviado a tu email para firma')
      }
    } catch {
      toast.error('Error solicitando NDA')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckboxConfirm = async () => {
    if (!ndaChecked) return
    setLoading(true)
    try {
      await dealRoomDocsApi.confirmNda(token, {
        member_email: email,
        member_name: name,
      })
      saveVisitor({ name, email, company, ndaSigned: true })
      setStage(STAGES.ACTIVE)
      toast.success('NDA confirmado')
    } catch {
      toast.error('Error confirmando NDA')
    } finally {
      setLoading(false)
    }
  }

  // Load documents when entering ACTIVE stage
  useEffect(() => {
    if (stage === STAGES.ACTIVE && token) {
      setDocsLoading(true)
      dealRoomDocsApi.list(token)
        .then(res => setDocs(res.data?.items || []))
        .catch(() => {})
        .finally(() => setDocsLoading(false))
    }
  }, [stage, token])

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="py-6 px-4 text-center" style={{ borderBottom: `1px solid ${T.border}` }}>
        <h1 className="text-2xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>
          St4rtup Deal Room
        </h1>
        <p className="text-xs mt-1" style={{ color: T.fgMuted, fontFamily: fontMono }}>
          Sala segura de documentos
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {/* ─── IDENTIFY Stage ─── */}
        {stage === STAGES.IDENTIFY && (
          <div className="w-full max-w-md">
            <div className="rounded-2xl p-8" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="text-center mb-6">
                <User className="w-10 h-10 mx-auto mb-3" style={{ color: T.cyan }} />
                <h2 className="text-xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>Identificate</h2>
                <p className="text-sm mt-1" style={{ color: T.fgMuted }}>
                  Introduce tus datos para acceder a los documentos compartidos
                </p>
              </div>

              <form onSubmit={handleIdentify} className="space-y-4">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: T.fgMuted, fontFamily: fontMono }}>NOMBRE COMPLETO</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4" style={{ color: T.fgMuted }} />
                    <input
                      type="text"
                      required
                      placeholder="Tu nombre"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: T.fgMuted, fontFamily: fontMono }}>EMAIL CORPORATIVO</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4" style={{ color: T.fgMuted }} />
                    <input
                      type="email"
                      required
                      placeholder="tu@empresa.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailWarning('') }}
                      className="w-full pl-10 pr-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
                    />
                  </div>
                  {emailWarning && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: T.warning }}>
                      <AlertTriangle className="w-3 h-3" /> {emailWarning}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: T.fgMuted, fontFamily: fontMono }}>EMPRESA (OPCIONAL)</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 w-4 h-4" style={{ color: T.fgMuted }} />
                    <input
                      type="text"
                      placeholder="Nombre de tu empresa"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: T.muted, border: `1px solid ${T.border}`, color: T.fg }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
                  style={{ backgroundColor: T.cyan, color: T.bg }}
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ─── NDA_GATE Stage ─── */}
        {stage === STAGES.NDA_GATE && (
          <div className="w-full max-w-md">
            <div className="rounded-2xl p-8" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="text-center mb-6">
                <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: T.purple }} />
                <h2 className="text-xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>
                  Acuerdo de Confidencialidad
                </h2>
                <p className="text-sm mt-1" style={{ color: T.fgMuted }}>
                  Antes de acceder a los documentos, necesitamos que aceptes el NDA
                </p>
              </div>

              <div className="rounded-lg p-3 mb-4 text-xs" style={{ backgroundColor: T.muted, color: T.fgMuted }}>
                <p className="mb-1"><strong style={{ color: T.fg }}>{name}</strong></p>
                <p>{email}</p>
                {company && <p>{company}</p>}
              </div>

              {/* NDA checkbox consent */}
              <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'hsla(265,60%,58%,0.05)', border: `1px solid hsla(265,60%,58%,0.15)` }}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ndaChecked}
                    onChange={e => setNdaChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded"
                    style={{ accentColor: T.purple }}
                  />
                  <span className="text-xs leading-relaxed" style={{ color: T.fg }}>
                    Acepto que la informacion compartida en este Deal Room es confidencial
                    y me comprometo a no divulgarla, reproducirla ni utilizarla fuera del
                    contexto de esta evaluacion comercial con St4rtup
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCheckboxConfirm}
                  disabled={!ndaChecked || loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: T.purple, color: '#fff' }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Aceptar y acceder
                </button>

                {(!ndaResult || ndaResult?.provider === 'checkbox') && (
                  <button
                    onClick={handleNdaRequest}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: 'transparent', border: `1px solid ${T.border}`, color: T.fgMuted }}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Firmar NDA digitalmente (Signaturit / DocuSign)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── ACTIVE Stage ─── */}
        {stage === STAGES.ACTIVE && (
          <div className="w-full max-w-3xl">
            <div className="rounded-2xl p-6" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              {/* Visitor badge */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
                    <Lock className="w-5 h-5" style={{ color: T.success }} />
                    Documentos compartidos
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: T.fgMuted }}>
                    Acceso verificado para {name} ({email})
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'hsla(142,71%,45%,0.1)', color: T.success }}>
                  <CheckCircle className="w-3 h-3" /> NDA firmado
                </span>
              </div>

              {/* Documents */}
              {docsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.cyan }} />
                </div>
              ) : docs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: T.fgMuted }} />
                  <p className="text-sm" style={{ color: T.fgMuted }}>
                    No hay documentos disponibles en este Deal Room
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id} className="rounded-lg p-4 flex items-center gap-3 transition-colors"
                      style={{ backgroundColor: T.muted, border: `1px solid ${T.border}` }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.cyan}
                      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                      <FileText className="w-5 h-5 flex-shrink-0" style={{ color: T.cyan }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: T.fg }}>{doc.name}</p>
                        <p className="text-xs" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                          {doc.page_count ? `${doc.page_count} pag.` : ''} {doc.size_bytes ? `-- ${formatSize(doc.size_bytes)}` : ''}
                        </p>
                      </div>
                      <button
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
                        style={{ backgroundColor: 'hsla(185,72%,48%,0.1)', color: T.cyan }}
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center text-xs mt-4" style={{ color: T.fgMuted, fontFamily: fontMono }}>
              Powered by St4rtup -- Los documentos estan protegidos con watermark digital
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
