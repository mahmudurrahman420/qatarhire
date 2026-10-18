import { mkdir, writeFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { JSONTransport } from '@adonisjs/mail/transports/json'
import type { MailTransportContract, NodeMailerMessage } from '@adonisjs/mail/types'

/**
 * Development-only transport. Instead of sending, it writes each email as
 * an HTML file to storage/mail-previews and logs the path, so verification
 * and password-reset links can be opened locally without an SMTP server.
 */
export class LogTransport implements MailTransportContract {
  #json = new JSONTransport()

  async send(message: NodeMailerMessage) {
    const response = await this.#json.send(message)
    const dir = app.makePath('storage/mail-previews')
    await mkdir(dir, { recursive: true })
    const to = Array.isArray(message.to) ? message.to.map((r) => (typeof r === 'string' ? r : r.address)).join(',') : ''
    const file = `${dir}/${Date.now()}-${String(message.subject ?? 'mail').replace(/[^a-z0-9]+/gi, '-').slice(0, 50)}.html`
    const html = `<!-- to: ${to} | subject: ${message.subject} -->\n${message.html ?? `<pre>${message.text ?? ''}</pre>`}`
    if (!app.inTest) {
      await writeFile(file, html)
      logger.info({ to, subject: message.subject, file }, 'mail written to preview file (MAIL_MAILER=log)')
    }
    return response
  }
}
