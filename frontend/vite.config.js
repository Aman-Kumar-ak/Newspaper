import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// https://vite.dev/config/
const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
            dest: 'assets',
            rename: 'pdf.worker.min.js', // Copy and rename to .js for compatibility
          }
        ]
      })
    ],
    
    // Optimization
    optimizeDeps: {
      include: ['pdfjs-dist', 'react', 'react-dom', 'zustand', 'idb'],
      exclude: ['pdfjs-dist/build/pdf.worker.min.js'],
    },
    
    // Worker configuration
    worker: {
      format: 'es',
      plugins: () => [react()]
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: !isProduction, // Source maps only in dev
      minify: isProduction ? 'esbuild' : false,
      target: 'es2015',
      cssCodeSplit: true,
      rollupOptions: {
        input: {
          main: resolve(rootDir, 'index.html'),
        },
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
      // Copy public files including service worker
      copyPublicDir: true,
    },
    
    // Server configuration
    server: {
      port: 5173,
      strictPort: false,
      // Remove CSP in development to avoid issues with PDF.js worker
      headers: isProduction ? {
        // Only apply CSP in production
        'Content-Security-Policy': [
          "default-src 'self' https://documentservices.adobe.com https://dc-api.adobe.io https://*.adobe.io https://*.adobe.com https://cloud-newspaper-api.onrender.com;",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://documentservices.adobe.com https://dc-api.adobe.io https://cdn.jsdelivr.net;",
          "connect-src 'self' https://documentservices.adobe.com https://dc-api.adobe.io https://*.adobe.io https://*.adobe.com https://cloud-newspaper-api.onrender.com https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com https://cdn.jsdelivr.net;",
          "img-src 'self' data: blob: https://documentservices.adobe.com https://dc-api.adobe.io https://*.adobe.io https://*.adobe.com;",
          "style-src 'self' 'unsafe-inline' https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com;",
          "font-src 'self' https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com;",
          "frame-src 'self' https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com;",
          "worker-src 'self' blob: https://documentservices.adobe.com https://*.adobe.io https://*.adobe.com https://cdn.jsdelivr.net;"
        ].join('; ')
      } : {}
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
