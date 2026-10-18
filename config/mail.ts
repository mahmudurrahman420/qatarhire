import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'
import { LogTransport } from '#services/mail/log_transport'

const mailConfig = defineConfig({
  default: env.get('MAIL_MAILER'),
  from: { address: env.get('MAIL_FROM_ADDRESS'), name: env.get('MAIL_FROM_NAME', 'QatarHire') },
  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST', ''),
      port: env.get('SMTP_PORT', 587),
      secure: env.get('SMTP_SECURE', false),
      auth: env.get('SMTP_USERNAME')
        ? { type: 'login', user: env.get('SMTP_USERNAME')!, pass: env.get('SMTP_PASSWORD', '') }
        : undefined,
    }),
    log: () => new LogTransport(),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
