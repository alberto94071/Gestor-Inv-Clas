import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Proxy /api during local dev so the browser talks to the Vite dev server
  // (same-origin) instead of hitting the local Express backend directly,
  // which would otherwise be blocked by the production-only CORS allowlist
  // in server.js. Server-to-server proxying isn't subject to CORS.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
