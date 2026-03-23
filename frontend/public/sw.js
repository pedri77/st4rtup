// Riskitera Sales — Service Worker for PWA
const CACHE_NAME = 'riskitera-v2';
const API_CACHE_NAME = 'riskitera-api-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/favicon.svg',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  const keepCaches = [CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => !keepCaches.includes(n)).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch — different strategies per request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip POST requests and external URLs
  if (event.request.method !== 'GET' || url.hostname !== self.location.hostname) {
    return;
  }

  // API calls (GET only) — network-first, fall back to cache for offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || new Response(
          JSON.stringify({ error: 'offline', message: 'No hay conexion' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )))
    );
    return;
  }

  // Static assets — network-first for HTML (SPA routes), cache-first for assets
  if (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?|ico)$/)) {
    // True static assets — cache-first
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // SPA routes — network-first, fallback to cached index.html
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match('/').then((cached) => cached || caches.match('/dashboard')))
      .then((response) => response || new Response('Offline', { status: 503 }))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'Riskitera Sales', body: 'Nueva notificacion' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(clients.openWindow(url));
});
