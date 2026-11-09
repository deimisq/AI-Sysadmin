import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const file = id.replace(/\\/g, '/');
          // Keep shared form code out of the workspace entry, so opening a
          // settings page never imports the terminal app or mounts its root.
          if (file.includes('/src/components/ui/') || file.endsWith('/src/lib/api.ts') ||
              file.endsWith('/src/lib/utils.ts') || file.endsWith('/src/stores/workspaceStore.ts')) return 'settings-shared';
          if (file.endsWith('/src/components/ai/LocalAiSettings.tsx')) return 'ai-settings';
        },
      },
      input: {
        main: path.resolve(__dirname, 'index.html'),
        preferences: path.resolve(__dirname, 'preferences.html'),
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  }
})
