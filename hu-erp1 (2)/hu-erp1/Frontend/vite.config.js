import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server:
    command === 'serve'
      ? {
          proxy: {
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : undefined,
}))
