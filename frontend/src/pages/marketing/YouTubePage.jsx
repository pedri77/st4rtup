import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Youtube, ArrowLeft, Users, Eye, Film, Clock, ThumbsUp, UserPlus, Search, ExternalLink, MessageSquare } from 'lucide-react'
import { youtubeApi } from '@/services/api'
import { useThemeColors } from '@/utils/theme'


const fontDisplay = "'Rajdhani', sans-serif"
const fontMono = "'IBM Plex Mono', monospace"

function fmt(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function fmtDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function YouTubePage() {
  const T = useThemeColors()
  const [videoSearch, setVideoSearch] = useState('')

  const { data: channelData, isLoading: channelLoading } = useQuery({
    queryKey: ['youtube', 'channel'],
    queryFn: () => youtubeApi.channel().then(r => r.data),
  })

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['youtube', 'analytics', 30],
    queryFn: () => youtubeApi.analytics({ days: 30 }).then(r => r.data),
  })

  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ['youtube', 'videos'],
    queryFn: () => youtubeApi.videos().then(r => r.data),
  })

  const channel = channelData?.channel || channelData || {}
  const analytics = analyticsData?.analytics || analyticsData || {}
  const videos = videosData?.videos || videosData || []

  const filteredVideos = Array.isArray(videos)
    ? videos.filter(v => !videoSearch || (v.title || '').toLowerCase().includes(videoSearch.toLowerCase()))
    : []

  const channelKpis = [
    { label: 'Suscriptores', value: fmt(channel.subscriber_count ?? channel.subscribers), icon: Users, color: T.destructive },
    { label: 'Visualizaciones totales', value: fmt(channel.view_count ?? channel.total_views ?? channel.views), icon: Eye, color: T.cyan },
    { label: 'Videos totales', value: fmt(channel.video_count ?? channel.total_videos), icon: Film, color: T.purple },
  ]

  const analyticsKpis = [
    { label: 'Views (30d)', value: fmt(analytics.views), icon: Eye, color: T.cyan },
    { label: 'Watch Time (h)', value: analytics.watch_time_hours != null ? fmt(Math.round(analytics.watch_time_hours)) : analytics.watch_time_minutes != null ? fmt(Math.round(analytics.watch_time_minutes / 60)) : '—', icon: Clock, color: T.warning },
    { label: 'Avg Duration', value: fmtDuration(analytics.average_view_duration ?? analytics.avg_view_duration), icon: Clock, color: T.purple },
    { label: 'Likes (30d)', value: fmt(analytics.likes), icon: ThumbsUp, color: T.success },
    { label: 'Suscriptores ganados', value: fmt(analytics.subscribers_gained), icon: UserPlus, color: T.destructive },
  ]

  return (
    <div className="-m-4 md:-m-8 p-4 md:p-8 min-h-screen space-y-6" style={{ backgroundColor: T.bg }}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Back link */}
      <Link to="/app/marketing" className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80" style={{ color: T.fgMuted }}>
        <ArrowLeft className="w-4 h-4" /> Marketing Hub
      </Link>

      {/* Title */}
      <h1 style={{ fontFamily: fontDisplay, color: T.fg }} className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <Youtube className="w-7 h-7" style={{ color: T.destructive }} />
        YouTube Analytics
      </h1>

      {/* Channel Info Card */}
      {channelLoading ? (
        <div className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <div className="h-16 rounded" style={{ backgroundColor: T.muted }} />
        </div>
      ) : channel && (channel.title || channel.name) ? (
        <div className="rounded-xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-4">
            {(channel.thumbnail || channel.thumbnail_url) && (
              <img
                src={channel.thumbnail || channel.thumbnail_url}
                alt={channel.title || channel.name}
                className="w-16 h-16 rounded-full object-cover"
                style={{ border: `2px solid ${T.destructive}` }}
              />
            )}
            <div>
              <h2 className="text-xl font-bold" style={{ color: T.fg, fontFamily: fontDisplay }}>
                {channel.title || channel.name}
              </h2>
              {channel.description && (
                <p className="text-xs mt-1 line-clamp-2" style={{ color: T.fgMuted }}>{channel.description}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Channel KPI Strip */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ fontFamily: fontMono, color: T.fgMuted }}>
          Canal
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {channelKpis.map(kpi => (
            <div key={kpi.label} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2.5">
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                <span className="text-xs uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>{kpi.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics 30 days */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-3" style={{ fontFamily: fontMono, color: T.fgMuted }}>
          Analytics — Ultimos 30 dias
        </p>
        {analyticsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="h-10 rounded" style={{ backgroundColor: T.muted }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {analyticsKpis.map(kpi => (
              <div key={kpi.label} className="rounded-xl p-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2">
                  <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                  <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: fontMono, color: T.fgMuted }}>{kpi.label}</span>
                </div>
                <p className="mt-2 text-xl font-bold" style={{ fontFamily: fontDisplay, color: T.fg }}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Videos Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: fontMono, color: T.fgMuted }}>
            Videos recientes
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T.fgMuted }} />
            <input
              type="text"
              value={videoSearch}
              onChange={e => setVideoSearch(e.target.value)}
              placeholder="Buscar videos..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
              style={{
                backgroundColor: T.card,
                border: `1px solid ${T.border}`,
                color: T.fg,
                fontFamily: fontMono,
                width: 220,
              }}
            />
          </div>
        </div>

        {videosLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="aspect-video" style={{ backgroundColor: T.muted }} />
                <div className="p-4 space-y-2">
                  <div className="h-4 rounded" style={{ backgroundColor: T.muted }} />
                  <div className="h-3 w-2/3 rounded" style={{ backgroundColor: T.muted }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <p className="text-center py-12" style={{ color: T.fgMuted }}>
            {videoSearch ? 'Sin resultados para la busqueda.' : 'No hay videos disponibles.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredVideos.map(video => {
              const videoId = video.video_id || video.id
              const ytUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '#'
              return (
                <a
                  key={videoId || video.title}
                  href={ytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl overflow-hidden transition-all"
                  style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${T.destructive}40` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border }}
                >
                  {/* Thumbnail */}
                  {(video.thumbnail || video.thumbnail_url) && (
                    <div className="aspect-video overflow-hidden relative">
                      <img
                        src={video.thumbnail || video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-4 h-4" style={{ color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
                      </div>
                    </div>
                  )}

                  {/* Video Info */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold line-clamp-2 mb-2" style={{ color: T.fg, fontFamily: fontDisplay }}>
                      {video.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ fontFamily: fontMono, color: T.fgMuted }}>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {fmt(video.view_count ?? video.views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {fmt(video.like_count ?? video.likes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {fmt(video.comment_count ?? video.comments)}
                      </span>
                    </div>
                    {(video.published_at || video.published) && (
                      <p className="text-[10px] mt-2" style={{ color: T.fgMuted, fontFamily: fontMono }}>
                        {new Date(video.published_at || video.published).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
