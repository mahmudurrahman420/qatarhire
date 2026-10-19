import { defineConfig } from '@adonisjs/core/app'

export default defineConfig({
  commands: [() => import('@adonisjs/core/commands'), () => import('@adonisjs/lucid/commands'), () => import('@adonisjs/session/commands'), () => import('@adonisjs/bouncer/commands'), () => import('@adonisjs/mail/commands')],

  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    {
      file: () => import('@adonisjs/core/providers/repl_provider'),
      environment: ['repl', 'test'],
    },
    () => import('@adonisjs/core/providers/vinejs_provider'),
    () => import('@adonisjs/core/providers/edge_provider'),
    () => import('@adonisjs/session/session_provider'),
    () => import('@adonisjs/shield/shield_provider'),
    () => import('@adonisjs/static/static_provider'),
    () => import('@adonisjs/cors/cors_provider'),
    () => import('@adonisjs/vite/vite_provider'),
    () => import('@adonisjs/auth/auth_provider'),
    () => import('@adonisjs/bouncer/bouncer_provider'),
    () => import('@adonisjs/lucid/database_provider'),
    () => import('@adonisjs/inertia/inertia_provider'),
    () => import('@adonisjs/mail/mail_provider'),
    () => import('@adonisjs/limiter/limiter_provider'),
    () => import('@adonisjs/drive/drive_provider'),
    () => import('@adonisjs/ally/ally_provider'),
  ],

  preloads: [
    () => import('#start/luxon'),
    () => import('#start/routes'),
    () => import('#start/kernel'),
    () => import('#start/limiter'),
    () => import('#start/queue'),
  ],

  tests: {
    suites: [
      { files: ['tests/unit/**/*.spec(.ts|.js)'], name: 'unit', timeout: 2000 },
      { files: ['tests/functional/**/*.spec(.ts|.js)'], name: 'functional', timeout: 30000 },
    ],
    forceExit: false,
  },

  metaFiles: [
    { pattern: 'resources/views/**/*.edge', reloadServer: false },
    { pattern: 'public/**', reloadServer: false },
  ],

  assetsBundler: false,
  hooks: {
    onBuildStarting: [() => import('@adonisjs/vite/build_hook')]
  }
})
