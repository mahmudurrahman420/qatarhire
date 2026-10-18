import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

const migrations = { naturalSort: true, paths: ['database/migrations'] }

const dbConfig = defineConfig({
  connection: env.get('DB_CONNECTION'),
  prettyPrintDebugQueries: true,
  connections: {
    sqlite: {
      client: 'better-sqlite3',
      connection: {
        filename: app.inTest ? app.tmpPath('test.sqlite3') : app.tmpPath('db.sqlite3'),
      },
      useNullAsDefault: true,
      migrations,
      seeders: { paths: ['database/seeders'] },
    },
    mysql: {
      client: 'mysql2',
      connection: {
        host: env.get('DB_HOST', '127.0.0.1'),
        port: env.get('DB_PORT', 3306),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
        charset: 'utf8mb4',
        timezone: 'Z',
        dateStrings: false,
      },
      pool: { min: 2, max: 10 },
      migrations,
      seeders: { paths: ['database/seeders'] },
    },
  },
})

export default dbConfig
