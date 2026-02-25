// JEWELLERY-STOCK-MANAGEMENT-APP/frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',

  server: {
    port: 5173,
    host: true,

    cors: {
      origin: ['http://localhost:8080', 'http://localhost:5173'],
      credentials: true,
    },

    allowedHosts: ['localhost', '127.0.0.1'],

    headers: {
      // Disable all caching so proxy always gets fresh 200 responses
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      // Allow iframe embedding from KaratCalc
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors 'self' http://localhost:8080 http://localhost:5173",
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})