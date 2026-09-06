import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defaultExclude, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    devtools({
      removeDevtoolsOnBuild: true,
    }),
    react(),
    tailwindcss(),
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
