import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/xlsx/')) {
            return 'vendor-xlsx'
          }

          if (
            /\/node_modules\/(recharts|react-smooth|victory-vendor|d3-)/.test(
              id,
            )
          ) {
            return 'vendor-charts'
          }

          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react'
          }

          if (id.includes('/node_modules/react-router')) {
            return 'vendor-router'
          }

          if (id.includes('/node_modules/@tanstack/react-query/')) {
            return 'vendor-query'
          }

          if (id.includes('/node_modules/axios/')) {
            return 'vendor-http'
          }

          if (id.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons'
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
