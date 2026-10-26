import type { MailTransportContract, NodeMailerMessage } from '@adonisjs/mail/types'
import EmailSettings from '#services/email_settings'
import { sendViaZeptoMail } from '#services/mail/zeptomail'

type Addr = string | { address: string; name?: string }
const norm = (a: Addr) => (typeof a === 'string' ? { address: a } : { address: a.address, name: a.name || undefined })

/** Adonis mail transport that posts to ZeptoMail's HTTP API; config is read at send time. */
export class ZeptoMailTransport implements MailTransportContract {
  async send(message: NodeMailerMessage) {
    const cfg = await EmailSettings.zepto()
    if (!cfg) throw new Error('ZeptoMail is not configured')
    const toList = (Array.isArray(message.to) ? message.to : message.to ? [message.to] : []) as Addr[]
    const res = await sendViaZeptoMail({
      token: cfg.token,
      from: { address: cfg.fromAddress, name: cfg.fromName },
      to: toList.map(norm),
      subject: String(message.subject ?? ''),
      html: typeof message.html === 'string' ? message.html : undefined,
      text: typeof message.text === 'string' ? message.text : undefined,
    })
    const id = res?.request_id ?? res?.data?.[0]?.additional_info?.[0] ?? ''
    return { envelope: { from: cfg.fromAddress, to: toList.map((a) => norm(a).address) }, messageId: String(id) } as any
  }
}
