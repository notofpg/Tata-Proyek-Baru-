import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // ✅ Generate manifest.webmanifest automatically
      outDir: 'dist',
      registerType: 'prompt',
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: ['**/node_modules/**/*', 'dist/**/*'],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB to accommodate single bundle
        navigateFallback: '/index.html',
        // ✅ Aggressive cleanup to allow reinstalls
        cleanupOutdatedCaches: true,
        // ✅ Let user decide when to update
        clientsClaim: false,
        skipWaiting: false,
        // ✅ Runtime cache for API calls only
        runtimeCaching: [
          {
            urlPattern: /^https:\/\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-v1',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        importScripts: ['/sw-custom.js']
      },
      includeAssets: [
        'icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
        'apple-touch-icon.png',
        'favicon.png',
        'sw-custom.js'
      ],
      // ✅ Proper manifest with version cache busting
      manifest: {
        name: 'Tata Hidup Mu',
        short_name: 'Tata',
        description: 'Offline-first, privacy-focused productivity app with notes, tasks, calendar, and finance tracking.',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        start_url: '/?utm_source=pwa',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        screenshots: [
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ],
        shortcuts: [
          {
            name: 'Tugas Hari Ini',
            short_name: 'Tugas',
            description: 'Buka daftar tugas hari ini',
            url: '/?screen=tasks&utm_source=pwa',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Catatan Baru',
            short_name: 'Catatan',
            description: 'Buka atau tulis catatan',
            url: '/?screen=note-editor&utm_source=pwa',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Catatan Keuangan',
            short_name: 'Keuangan',
            description: 'Kelola kas dan cicilan',
            url: '/?screen=finance&utm_source=pwa',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
          },
          {
            name: 'Kalender & Agenda',
            short_name: 'Kalender',
            description: 'Cek jadwal dan acara',
            url: '/?screen=calendar&utm_source=pwa',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
          }
        ]
      },
      devOptions: {
        enabled: false,
        suppressWarnings: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  define: {
    'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || ''),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});
