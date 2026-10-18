import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import adonisjs from '@adonisjs/vite/client'
import inertia from '@adonisjs/inertia/client'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    inertia({ ssr: { enabled: false } }),
    react(),
    tailwindcss(),
    adonisjs({ entrypoints: ['inertia/app/app.tsx'], reload: ['resources/views/**/*.edge'] }),
  ],
  resolve: {
    alias: {
      '~/': fileURLToPath(new URL('./inertia/', import.meta.url)),
      '#shared/': fileURLToPath(new URL('./shared/', import.meta.url)),
    },
  },
})
