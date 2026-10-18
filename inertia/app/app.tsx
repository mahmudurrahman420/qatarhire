
import '../css/app.css'
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'

const appName = import.meta.env.VITE_APP_NAME || 'QatarHire'

createInertiaApp({
  progress: { color: '#8A1538', delay: 150 },
  title: (title) => (title ? `${title} | ${appName}` : `${appName} — Jobs in Qatar`),
  resolve: (name) => resolvePageComponent(`../pages/${name}.tsx`, import.meta.glob('../pages/**/*.tsx')),
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})
