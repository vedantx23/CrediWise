import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Node.js Express backend (auth, cards, expenses, analytics)
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Python Flask AI backend (audit, persona, boardroom, etc.)
      '/ai-api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-api/, '/api'),
      },
    },
  },
})
