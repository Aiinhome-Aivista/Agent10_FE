import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
    '/api': {
    // target: 'http://127.0.0.1:8002',
    target:'http://187.127.163.17:3037',
    changeOrigin: true
      }
    }
  }
})
