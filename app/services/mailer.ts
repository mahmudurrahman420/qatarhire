import env from '#start/env'
import mail from '@adonisjs/mail/services/main'
import Queue from '#services/queue'

export type MailJob = {
  to: string
  subject: string
  template: string
  data: Record<string, unknown>
}

/** All transactional email goes through the queue (QUEUE_DRIVER controls sync vs. worker). */
export default class Mailer {
  static async queue(job: MailJob) {
    await Queue.dispatch('mail:send', job)
  }

  static async deliver(job: MailJob) {
    const appName = env.get('APP_NAME', 'QatarHire')
    const appUrl = env.get('APP_URL')
    await mail.send((message) => {
      message
        .to(job.to)
        .subject(job.subject)
        .htmlView(`emails/${job.template}`, { ...job.data, appName, appUrl, subject: job.subject })
    })
  }
}

Queue.register('mail:send', (payload: MailJob) => Mailer.deliver(payload))
