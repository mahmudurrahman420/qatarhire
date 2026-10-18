import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  /**
   * Content Security Policy is enforced in production only; the Vite dev
   * server injects inline scripts for hot reload.
   */
  csp: {
    enabled: app.inProduction,
    directives: {
      defaultSrc: [`'self'`],
      scriptSrc: [`'self'`, '@nonce'],
      styleSrc: [`'self'`, `'unsafe-inline'`, 'https://fonts.googleapis.com'],
      fontSrc: [`'self'`, 'https://fonts.gstatic.com', 'data:'],
      imgSrc: [`'self'`, 'data:', 'blob:'],
      connectSrc: [`'self'`],
      frameAncestors: [`'none'`],
      formAction: [`'self'`],
      objectSrc: [`'none'`],
      baseUri: [`'self'`],
    },
    reportOnly: false,
  },

  csrf: {
    enabled: true,
    // Payment-provider webhooks would be listed here (they are signature-verified instead).
    exceptRoutes: [],
    // Inertia's HTTP client reads the XSRF-TOKEN cookie automatically.
    enableXsrfCookie: true,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  xFrame: { enabled: true, action: 'DENY' },
  hsts: { enabled: true, maxAge: '180 days' },
  contentTypeSniffing: { enabled: true },
})

export default shieldConfig
