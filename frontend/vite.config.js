import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// https://vite.dev/config/
const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    
    // Optimization
    optimizeDeps: {
      include: ['pdfjs-dist', 'react', 'react-dom', 'zustand', 'idb'],
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: !isProduction, // Source maps only in dev
      minify: isProduction ? 'esbuild' : false,
      target: 'es2015',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'pdf-vendor': ['pdfjs-dist'],
            'state-vendor': ['zustand', 'idb'],
          },
          // Asset file naming
          assetFileNames: (assetInfo) => {
            let extType = assetInfo.name.split('.').at(-1);
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
    },
    
    // Server configuration
    server: {
      port: 5173,
      strictPort: false,
      headers: {
        // Add CSP headers to allow Adobe services, PDF.js, and backend API (both production and local)
        'Content-Security-Policy': [
          "default-src 'self' https://documentservices.adobe.com https://dc-api.adobe.io https://*.adobe.io https://*.adobe.com https://cloud-newspaper-api.onrender.com http://localhost:8080;",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://documentservices.adobe.com https://dc-api.adobe.io https://unpkg.com https://cdnjs.cloudflare.com;",
          "connect-src 'self' https://documentservices.adobe.com https://dc-api.adobe.io https://*.adobe.io https://*.adobe.com https://cloud-newspaper-api.onrender.com http://localhost:8080 https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com;",
          "img-src 'self' data: https://documentservices.adobe.com https://dc-api.adobe.io https://*.adobe.io https://*.adobe.com;",
          "style-src 'self' 'unsafe-inline' https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com;",
          "font-src 'self' https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com;",
          "frame-src 'self' https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com;",
          "worker-src 'self' blob: https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com https://cdnjs.cloudflare.com;"
        ].join('; ')
      }
    },
    
    // Preview server (for testing production build)
    preview: {
      port: 4173,
      strictPort: false,
    },
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    },
  };
});
