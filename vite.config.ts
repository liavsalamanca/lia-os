import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const base = process.env.VITE_BASE ?? '/lia-os/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'LIA OS — Your Life, Your System',
        short_name: 'LIA OS',
        description: 'Tu espacio para organizar todo lo que importa.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#faf6ef',
        theme_color: '#5c1a2e',
        lang: 'es',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Sin esto el worker nuevo queda en espera detrás del de la versión 1.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'supabase/functions/_shared/**/*.test.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
});
