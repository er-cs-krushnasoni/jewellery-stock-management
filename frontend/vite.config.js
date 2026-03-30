// JEWELLERY-STOCK-MANAGEMENT-APP/frontend/vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const KARATCALC_ORIGIN = env.VITE_KARATCALC_ORIGIN || 'http://localhost:8080'

  return {
    plugins: [react()],
    base: '/',

    server: {
      port: 5173,
      host: true,

      // Allow devtunnel hostnames
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        '.devtunnels.ms',
        '.ngrok.io',
        '.ngrok-free.app',
      ],

      cors: {
        origin: [
          KARATCALC_ORIGIN,
          'http://localhost:8080',
          'http://localhost:5173',
        ],
        credentials: true,
      },

      headers: {
        // No caching — ensures proxy always gets fresh 200 responses
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        // Allow iframe embedding from KaratCalc origin
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy':
          `frame-ancestors 'self' ${KARATCALC_ORIGIN} http://localhost:8080`,
      },
    },

    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
  }
})