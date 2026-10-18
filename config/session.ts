import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, stores } from '@adonisjs/session'

const sessionConfig = defineConfig({
  enabled: true,
  cookieName: 'qh_session',
  clearWithBrowser: false,
  age: '12h',
  cookie: {
    path: '/',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },
  store: env.get('SESSION_DRIVER'),
  stores: {
    cookie: stores.cookie(),
    // Server-side sessions (recommended in production): allows revoking a
    // suspended user's sessions immediately.
    database: stores.database({ tableName: 'sessions' }),
  },
})

export default sessionConfig
