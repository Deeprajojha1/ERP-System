import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
  },
  server:
    command === 'serve'
      ? {
          proxy: {
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true,
              secure: false,
            },
            '/uploads': {
              target: 'http://localhost:3000',
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : undefined,
}))
