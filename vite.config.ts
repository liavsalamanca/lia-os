import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const base = process.env.VITE_BASE ?? '/lia-os/';

/**
 * Política de seguridad del contenido. GitHub Pages no permite cabeceras propias,
 * así que va en una etiqueta meta. Solo en la versión publicada: el servidor de
 * desarrollo inyecta scripts en línea.
 */
function contentSecurityPolicy(): Plugin {
  const supabase = process.env.VITE_SUPABASE_URL ? new URL(process.env.VITE_SUPABASE_URL).origin : '';
  const realtime = supabase.replace(/^http/, 'ws');
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    // Los atributos style (barras de progreso) los exige; los scripts siguen bloqueados.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${supabase} ${realtime}`.trim(),
    "worker-src 'self'",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  return {
    name: 'lia-os-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }],
  };
}

export default defineConfig({
  base,
  plugins: [
    contentSecurityPolicy(),
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
