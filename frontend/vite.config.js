import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// https://vite.dev/config/
const rootDir = fileURLToPath(new URL('.', import.meta.url))
const pdfLegacyPath = resolve(rootDir, 'node_modules/pdfjs-dist/legacy/build/pdf.js')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'pdfjs-dist': pdfLegacyPath,
    },
  },
  optimizeDeps: {
    include: [pdfLegacyPath],
  },
  server: {
    headers: {
      // Add CSP headers to allow Adobe services
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://documentservices.adobe.com https://dc-api.adobe.io https://unpkg.com",
        "connect-src 'self' https://documentservices.adobe.com https://dc-api.adobe.io https://localhost:8080 http://localhost:8080",
        "img-src 'self' data: https://documentservices.adobe.com https://dc-api.adobe.io",
        "style-src 'self' 'unsafe-inline' https://documentservices.adobe.com",
        "font-src 'self' https://documentservices.adobe.com",
        "frame-src 'self' https://documentservices.adobe.com",
        "worker-src 'self' blob: https://documentservices.adobe.com"
      ].join('; ')
    }
  }
})
