import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['lucide-react', 'clsx', 'react-hot-toast'],
          charts: ['recharts'],
          papaparse: ['papaparse'],
          supabase: ['@supabase/supabase-js'],
          reactflow: ['reactflow'],
          datefns: ['date-fns'],
          analytics: ['posthog-js'],
          http: ['axios'],
          growthbook: ['@growthbook/growthbook-react'],
          sanitize: ['dompurify'],
          helmet: ['react-helmet-async'],
          headlessui: ['@headlessui/react'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./src/test/setup.js'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
