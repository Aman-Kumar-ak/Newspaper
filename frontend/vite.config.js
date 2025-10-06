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
        "default-src 'self' https://documentservices.adobe.com https://dc-api.adobe.io https://*.adobe.io https://*.adobe.com;",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://documentservices.adobe.com https://dc-api.adobe.io https://unpkg.com;",
            // Allow Adobe services, local dev, backend, and Google OAuth/userinfo/revoke endpoints
            "connect-src 'self' https://documentservices.adobe.com https://dc-api.adobe.io https://*.adobe.io https://*.adobe.com https://localhost:8080 http://localhost:8080 https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com;",
        "img-src 'self' data: https://documentservices.adobe.com https://dc-api.adobe.io https://*.adobe.io https://*.adobe.com;",
        "style-src 'self' 'unsafe-inline' https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com;",
        "font-src 'self' https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com;",
        "frame-src 'self' https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com;",
        "worker-src 'self' blob: https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com;"
      ].join('; ')
    }
  }
})
