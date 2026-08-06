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
  server: {
    port: 5173,
    open: true,
    allowedHosts: ['localhost', '.ngrok-free.dev', '.ngrok-free.app'],
    proxy: {
      '/rest': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/functions': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/realtime': {
        target: 'ws://127.0.0.1:54321',
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
