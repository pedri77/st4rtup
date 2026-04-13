import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Globe, Share2, CreditCard, Loader2, Plus, Star,
  TrendingUp, Eye, MousePointer, Users, ExternalLink, X
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import Breadcrumbs from '@/components/Breadcrumbs'
import toast from 'react-hot-toast'
import { mediaApi } from '@/services/api'
import { useThemeColors, LIGHT as T } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

const MEDIA_COLORS = {
  owned: { text: T.success, bg: 'hsla(142,71%,45%,0.1)', border: 'hsla(142,71%,45%,0.3)' },
  earned: { text: T.destructive, bg: 'hsla(0,72%,51%,0.1)', border: 'hsla(0,72%,51%,0.3)' },
  paid: { text: T.warning, bg: 'hsla(38,92%,50%,0.1)', border: 'hsla(38,92%,50%,0.3)' },
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
      <p className="text-xl font-bold" style={{ color, fontFamily: fontMono }}>{value}</p>
      <p className="text-[10px] uppercase" style={{ color: T.fgMuted }}>{label}</p>
      {sub && <p className="text-[10px]" style={{ color: T.fgMuted }}>{sub}</p>}
    </div>
  )
}

export default function MediaTrifectaPage() {
  const T = useThemeColors()
  const queryClient = useQueryClient()
  const [showAddAd, setShowAddAd] = useState(false)
  const [showAddMention, setShowAddMention] = useState(false)
  const [adForm, setAdForm] = useState({ name: '', platform: 'linkedin_ads', budget_total: 0, targeting: '', placement: '', ad_format: '', buying_model: 'CPC', unit_cost: 0 })
  const [mentionForm, setMentionForm] = useState({ type: 'review', platform: 'g2', title: '', rating: 5, sentiment: 'positive' })

  const { data: trifecta, isLoading } = useQuery({
    queryKey: ['media-trifecta'],
    queryFn: () => mediaApi.trifecta().then(r => r.data),
  })

  const { data: paidData } = useQuery({
    queryKey: ['media-paid'],
    queryFn: () => mediaApi.paidCampaigns().then(r => r.data),
  })

  const { data: earnedData } = useQuery({
    queryKey: ['media-earned'],
    queryFn: () => mediaApi.earnedMentions().then(r => r.data),
  })

  const createAdMutation = useMutation({
    mutationFn: (d) => mediaApi.createAdCampaign(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); toast.success('Campaña creada'); setShowAddAd(false) },
  })

  const createMentionMutation = useMutation({
    mutationFn: (d) => mediaApi.createMention(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['media'] }); toast.success('Mención registrada'); setShowAddMention(false) },
  })

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: T.cyan }} /></div>

  const t = trifecta || { owned: {}, earned: {}, paid: {} }

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>Media Trifecta</h1>
      </div>

      {/* Trifecta Overview — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* OWNED */}
        <div className="rounded-xl p-5" style={{ backgroundColor: MEDIA_COLORS.owned.bg, border: `1px solid ${MEDIA_COLORS.owned.border}` }}>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: MEDIA_COLORS.owned.text, fontFamily: fontDisplay }}>
            <Globe className="w-5 h-5" /> Owned Media
          </h3>
          <p className="text-xs mb-3" style={{ color: T.fgMuted }}>Website, blog, redes sociales propias</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Assets</span><span style={{ color: T.fg, fontFamily: fontMono }}>{t.owned.assets}</span></div>
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Campañas</span><span style={{ color: T.fg, fontFamily: fontMono }}>{t.owned.campaigns}</span></div>
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Visitas</span><span style={{ color: T.fg, fontFamily: fontMono }}>{t.owned.visits?.toLocaleString('es-ES')}</span></div>
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Conversiones</span><span style={{ color: T.fg, fontFamily: fontMono }}>{t.owned.conversions}</span></div>
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Leads organicos</span><span style={{ color: T.success, fontFamily: fontMono, fontWeight: 'bold' }}>{t.owned.leads}</span></div>
          </div>
          <Link to="/app/marketing" className="text-xs hover:underline mt-3 inline-block" style={{ color: T.success }}>Gestionar →</Link>
        </div>

        {/* EARNED */}
        <div className="rounded-xl p-5" style={{ backgroundColor: MEDIA_COLORS.earned.bg, border: `1px solid ${MEDIA_COLORS.earned.border}` }}>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: MEDIA_COLORS.earned.text, fontFamily: fontDisplay }}>
            <Share2 className="w-5 h-5" /> Earned Media
          </h3>
          <p className="text-xs mb-3" style={{ color: T.fgMuted }}>Menciones, reviews, PR, backlinks</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Menciones</span><span style={{ color: T.fg, fontFamily: fontMono }}>{t.earned.mentions}</span></div>
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Alcance</span><span style={{ color: T.fg, fontFamily: fontMono }}>{t.earned.reach?.toLocaleString('es-ES')}</span></div>
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Rating medio</span><span style={{ color: T.fg, fontFamily: fontMono }}>{t.earned.avg_rating}/5 ⭐</span></div>
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Leads referral</span><span style={{ color: T.destructive, fontFamily: fontMono, fontWeight: 'bold' }}>{t.earned.leads}</span></div>
          </div>
          <button onClick={() => setShowAddMention(true)} className="text-xs hover:underline mt-3" style={{ color: T.destructive }}>+ Añadir mención</button>
        </div>

        {/* PAID */}
        <div className="rounded-xl p-5" style={{ backgroundColor: MEDIA_COLORS.paid.bg, border: `1px solid ${MEDIA_COLORS.paid.border}` }}>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2" style={{ color: MEDIA_COLORS.paid.text, fontFamily: fontDisplay }}>
            <CreditCard className="w-5 h-5" /> Paid Media
          </h3>
          <p className="text-xs mb-3" style={{ color: T.fgMuted }}>LinkedIn Ads, Google Ads, social ads</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Gasto total</span><span style={{ color: T.fg, fontFamily: fontMono }}>€{t.paid.spend?.toLocaleString('es-ES')}</span></div>
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Impressiones</span><span style={{ color: T.fg, fontFamily: fontMono }}>{t.paid.impressions?.toLocaleString('es-ES')}</span></div>
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>CPL</span><span style={{ color: T.fg, fontFamily: fontMono }}>€{t.paid.cpl}</span></div>
            <div className="flex justify-between"><span style={{ color: T.fgMuted }}>Leads paid</span><span style={{ color: T.warning, fontFamily: fontMono, fontWeight: 'bold' }}>{t.paid.leads}</span></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowAddAd(true)} className="text-xs hover:underline" style={{ color: T.warning }}>+ Nueva campaña</button>
            {t.paid.spend === 0 && <button onClick={() => mediaApi.seedPaidCampaigns().then(() => { queryClient.invalidateQueries(); toast.success('5 campañas B2B cargadas') })} className="text-xs hover:underline" style={{ color: T.fgMuted }}>Cargar campañas B2B</button>}
          </div>
        </div>
      </div>

      {/* Ad Campaigns list */}
      {paidData?.campaigns?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg, fontFamily: fontDisplay }}>Campañas Publicitarias</h3>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
            <table className="w-full text-sm">
              <thead><tr className="text-xs" style={{ borderBottom: `1px solid ${T.border}`, color: T.fgMuted }}>
                <th className="text-left p-3">Campaña</th><th className="p-3">Plataforma</th><th className="p-3">Modelo</th>
                <th className="text-left p-3">Segmentación</th><th className="text-right p-3">Budget</th>
                <th className="text-right p-3">Spend</th><th className="text-right p-3">Leads</th><th className="text-right p-3">CPL</th>
              </tr></thead>
              <tbody>{paidData.campaigns.map((c, i) => (
                <tr key={i} style={{ borderBottom: `1px solid hsla(220,15%,20%,0.5)` }}>
                  <td className="p-3">
                    <p className="text-sm" style={{ color: T.fg }}>{c.name}</p>
                    {c.ad_format && <p className="text-[10px]" style={{ color: T.fgMuted }}>{c.ad_format} · {c.placement}</p>}
                  </td>
                  <td className="p-3 text-center"><span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: T.muted, color: '#94A3B8' }}>{c.platform}</span></td>
                  <td className="p-3 text-center"><span className="text-[10px]" style={{ color: T.cyan, fontFamily: fontMono }}>{c.buying_model || 'CPC'} €{c.unit_cost || 0}</span></td>
                  <td className="p-3 text-xs max-w-48 truncate" style={{ color: T.fgMuted }}>{c.targeting}</td>
                  <td className="p-3 text-right" style={{ color: T.fgMuted, fontFamily: fontMono }}>€{c.budget_total}</td>
                  <td className="p-3 text-right" style={{ color: T.warning, fontFamily: fontMono }}>€{c.spend_total}</td>
                  <td className="p-3 text-right" style={{ color: T.cyan, fontFamily: fontMono }}>{c.leads_generated}</td>
                  <td className="p-3 text-right" style={{ color: '#94A3B8', fontFamily: fontMono }}>€{c.cpl}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Earned Mentions list */}
      {earnedData?.mentions?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: T.fg, fontFamily: fontDisplay }}>Menciones y Reviews</h3>
          <div className="space-y-2">
            {earnedData.mentions.map((m, i) => (
              <div key={i} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: 'hsla(220,25%,10%,0.5)', border: `1px solid ${T.border}` }}>
                <span className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: m.sentiment === 'positive' ? 'hsla(142,71%,45%,0.1)' : m.sentiment === 'negative' ? 'hsla(0,72%,51%,0.1)' : T.muted,
                    color: m.sentiment === 'positive' ? T.success : m.sentiment === 'negative' ? T.destructive : T.fgMuted,
                  }}>
                  {m.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: T.fg }}>{m.title || m.platform}</p>
                  <p className="text-xs" style={{ color: T.fgMuted }}>{m.platform} {m.rating ? `· ${m.rating}/5 ⭐` : ''} {m.author ? `· ${m.author}` : ''}</p>
                </div>
                {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: T.cyan }}><ExternalLink className="w-4 h-4" /></a>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Ad Modal */}
      {showAddAd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddAd(false)}>
          <div className="rounded-xl p-6 w-full max-w-md" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h3 className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>Nueva campaña</h3><button aria-label="Cerrar" onClick={() => setShowAddAd(false)}><X className="w-5 h-5" style={{ color: T.fgMuted }} /></button></div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <input type="text" value={adForm.name} onChange={e => setAdForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre de la campaña" className="input text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select id="mediatrifecta-select-1" aria-label="Selector" value={adForm.platform} onChange={e => setAdForm(f => ({ ...f, platform: e.target.value }))} className="input text-sm">
                  <option value="linkedin_ads">LinkedIn Ads</option><option value="google_ads">Google Ads</option>
                  <option value="youtube_ads">YouTube Ads</option><option value="meta_ads">Meta Ads</option>
                </select>
                <select id="mediatrifecta-select-2" aria-label="Selector" value={adForm.buying_model} onChange={e => setAdForm(f => ({ ...f, buying_model: e.target.value }))} className="input text-sm">
                  <option value="CPC">CPC</option><option value="CPM">CPM</option>
                  <option value="CPL">CPL</option><option value="CPV">CPV</option><option value="CPA">CPA</option><option value="FIJO">Fijo</option>
                </select>
              </div>
              <input type="text" value={adForm.targeting} onChange={e => setAdForm(f => ({ ...f, targeting: e.target.value }))} placeholder="Segmentación: CEOs España, >50 empleados..." className="input text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={adForm.placement} onChange={e => setAdForm(f => ({ ...f, placement: e.target.value }))} placeholder="Ubicación: Feed, Search..." className="input text-sm" />
                <input type="text" value={adForm.ad_format} onChange={e => setAdForm(f => ({ ...f, ad_format: e.target.value }))} placeholder="Formato: Video, Carousel..." className="input text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={adForm.unit_cost} onChange={e => setAdForm(f => ({ ...f, unit_cost: parseFloat(e.target.value) || 0 }))} placeholder={`Coste ${adForm.buying_model} (€)`} className="input text-sm" />
                <input type="number" value={adForm.budget_total} onChange={e => setAdForm(f => ({ ...f, budget_total: parseFloat(e.target.value) || 0 }))} placeholder="Budget total (€)" className="input text-sm" />
              </div>
              <button onClick={() => createAdMutation.mutate(adForm)} disabled={!adForm.name} className="btn-primary w-full text-sm">Crear campaña</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Mention Modal */}
      {showAddMention && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddMention(false)}>
          <div className="rounded-xl p-6 w-full max-w-md" style={{ backgroundColor: T.bg, border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4"><h3 className="text-lg font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>Registrar mención</h3><button aria-label="Cerrar" onClick={() => setShowAddMention(false)}><X className="w-5 h-5" style={{ color: T.fgMuted }} /></button></div>
            <div className="space-y-3">
              <select id="mediatrifecta-select-3" aria-label="Selector" value={mentionForm.type} onChange={e => setMentionForm(f => ({ ...f, type: e.target.value }))} className="input text-sm">
                <option value="review">Review</option><option value="press">Nota de prensa</option>
                <option value="social_mention">Mención social</option><option value="backlink">Backlink</option><option value="award">Premio</option>
              </select>
              <select id="mediatrifecta-select-4" aria-label="Selector" value={mentionForm.platform} onChange={e => setMentionForm(f => ({ ...f, platform: e.target.value }))} className="input text-sm">
                <option value="g2">G2</option><option value="capterra">Capterra</option><option value="gartner">Gartner</option>
                <option value="linkedin">LinkedIn</option><option value="twitter">Twitter/X</option><option value="media">Medio de comunicación</option>
              </select>
              <input type="text" value={mentionForm.title} onChange={e => setMentionForm(f => ({ ...f, title: e.target.value }))} placeholder="Título / descripción" className="input text-sm" />
              <div className="flex gap-2">
                <select id="mediatrifecta-select-5" aria-label="Selector" value={mentionForm.sentiment} onChange={e => setMentionForm(f => ({ ...f, sentiment: e.target.value }))} className="input text-sm">
                  <option value="positive">Positivo</option><option value="neutral">Neutral</option><option value="negative">Negativo</option>
                </select>
                <input type="number" value={mentionForm.rating} onChange={e => setMentionForm(f => ({ ...f, rating: parseFloat(e.target.value) }))} placeholder="Rating (1-5)" min={1} max={5} step={0.5} className="input text-sm w-24" />
              </div>
              <button onClick={() => createMentionMutation.mutate(mentionForm)} disabled={!mentionForm.title} className="btn-primary w-full text-sm">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
