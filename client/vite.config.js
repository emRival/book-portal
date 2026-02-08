import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['book.idnbogor.id'],
    host: true, // Listen on all addresses
    port: 5173
  },
  server: {
    allowedHosts: ['book.idnbogor.id'],
    host: true
  }
})
