import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    devtools({
      removeDevtoolsOnBuild: true,
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'D&D Campaign Manager',
        short_name: 'D&D Keeper',
        description: 'Manage D&D 5.5e campaigns, characters, sessions, and encounters.',
        theme_color: '#0b0b0f',
        background_color: '#0b0b0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell only. Supabase is cross-origin and never cached
        // here — offline data comes from the persisted React Query cache instead.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Main bundle is a single ~2.5 MB chunk (no code splitting); raise the
        // default 2 MiB precache cap so the shell is fully available offline.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(rest|auth|storage|functions|realtime)\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  server: {
    port: 5173,
    strictPort: true,
    open: false,
    allowedHosts: ['localhost', '.ngrok-free.dev', '.ngrok-free.app', '.trycloudflare.com'],
    proxy: {
      '/rest': {
        target: 'https://aekpodxyvkjcsjgzwlca.supabase.co',
        changeOrigin: true,
      },
      '/auth': {
        target: 'https://aekpodxyvkjcsjgzwlca.supabase.co',
        changeOrigin: true,
      },
      '/storage': {
        target: 'https://aekpodxyvkjcsjgzwlca.supabase.co',
        changeOrigin: true,
      },
      '/functions': {
        target: 'https://aekpodxyvkjcsjgzwlca.supabase.co',
        changeOrigin: true,
      },
      '/realtime': {
        target: 'https://aekpodxyvkjcsjgzwlca.supabase.co',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
    exclude: [...defaultExclude, '**/.claude/worktrees/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**'],
      exclude: ['src/lib/query-client.ts', 'src/lib/i18n.ts'],
    },
  },
});
