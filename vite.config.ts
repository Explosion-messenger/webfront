import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
      },
      '/avatars': {
        target: 'http://localhost:8000',
      },
      '/admin': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      '/files/download': {
        target: 'http://localhost:8000',
      },
    },
  },
})
