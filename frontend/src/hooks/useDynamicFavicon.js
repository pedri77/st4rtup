import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/api'

function drawFaviconWithBadge(count) {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')

  // Base favicon (R letter)
  ctx.fillStyle = '#0cd5e8'
  ctx.beginPath()
  ctx.roundRect(0, 0, 32, 32, 6)
  ctx.fill()
  ctx.fillStyle = '#0a0e1a'
  ctx.font = 'bold 20px Rajdhani, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('R', 16, 17)

  // Badge
  if (count > 0) {
    const text = count > 99 ? '99+' : String(count)
    ctx.fillStyle = '#e53e3e'
    ctx.beginPath()
    ctx.arc(26, 6, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 9px sans-serif'
    ctx.fillText(text, 26, 7)
  }

  // Update favicon
  let link = document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = canvas.toDataURL('image/png')
}

export default function useDynamicFavicon() {
  const { data } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then(r => r.data),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

  useEffect(() => {
    const overdue = data?.actions_overdue || 0
    drawFaviconWithBadge(overdue)
  }, [data?.actions_overdue])
}
