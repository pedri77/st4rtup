/**
 * SSE stream disabled — Cloudflare HTTP/2 proxy breaks SSE connections.
 * Notifications use polling via React Query (30s interval in Layout.jsx).
 */
export function useNotificationStream() {
  // No-op — polling handles notifications
}
