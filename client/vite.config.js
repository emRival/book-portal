import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy = {
  target: process.env.VITE_API_TARGET || 'http://backend:3055',
  changeOrigin: true,
  secure: false,
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
  },
  preview: {
    allowedHosts: true,
    host: true, // Listen on all addresses
    port: 5173,
    proxy: {
      '/auth': apiProxy,
      '/books': apiProxy,
      '/uploads': apiProxy,
    }
  },
  server: {
    allowedHosts: true,
    host: true,
    proxy: {
      '/auth': apiProxy,
      '/books': apiProxy,
      '/uploads': apiProxy,
    }
  }
})
