/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
| Validates environment variables at boot. Never commit real secrets;
| copy .env.example to .env and fill in values per environment.
*/
import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  APP_NAME: Env.schema.string.optional(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),
  TZ: Env.schema.string.optional(),

  /* Session */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'database', 'memory'] as const),

  /* Database: sqlite for local/test, mysql for production */
  DB_CONNECTION: Env.schema.enum(['sqlite', 'mysql'] as const),
  DB_HOST: Env.schema.string.optional({ format: 'host' }),
  DB_PORT: Env.schema.number.optional(),
  DB_USER: Env.schema.string.optional(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string.optional(),

  /* Mail: "log" writes previews to storage/mail-previews (development only) */
  MAIL_MAILER: Env.schema.enum(['smtp', 'log'] as const),
  MAIL_FROM_ADDRESS: Env.schema.string(),
  MAIL_FROM_NAME: Env.schema.string.optional(),
  SUPPORT_EMAIL: Env.schema.string.optional(),
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  SMTP_SECURE: Env.schema.boolean.optional(),

  /* Queue: sync runs jobs in-request (dev/tests); database needs `node ace queue:work` */
  QUEUE_DRIVER: Env.schema.enum(['sync', 'database'] as const),

  /* Rate limiter store */
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const),

  /* Files */
  DRIVE_DISK: Env.schema.enum(['public'] as const),
  CV_MAX_SIZE_MB: Env.schema.number.optional(),

  /* Optional ClamAV daemon for CV malware scanning */
  CLAMAV_HOST: Env.schema.string.optional(),
  CLAMAV_PORT: Env.schema.number.optional(),

  /* Initial administrator created by `node ace admin:create` defaults */
  ADMIN_EMAIL: Env.schema.string.optional(),
})
