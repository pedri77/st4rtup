import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function useWebPush() {
  const [permission, setPermission] = useState(Notification?.permission || 'default')
  const [subscription, setSubscription] = useState(null)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    setPermission(Notification.permission)
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Tu navegador no soporta notificaciones push')
      return false
    }

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === 'granted') {
      toast.success('Notificaciones push activadas')
      return true
    }
    toast.error('Permiso de notificaciones denegado')
    return false
  }

  const sendLocalNotification = (title, options = {}) => {
    if (permission !== 'granted') return
    try {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      })
    } catch (e) {
      // Fallback for mobile — use service worker
      navigator.serviceWorker?.ready?.then(reg => {
        reg.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          ...options,
        })
      })
    }
  }

  return { permission, requestPermission, sendLocalNotification }
}
