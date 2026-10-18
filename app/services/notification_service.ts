import Notification from '#models/notification'
import User from '#models/user'
import Mailer from '#services/mailer'
import type { EmailNotificationPref, NotificationType } from '#shared/enums'

type NotifyInput = {
  type: NotificationType
  title: string
  body?: string
  url?: string
  /** When set, also email the user (subject to their preference). */
  email?: { template: string; subject: string; data?: Record<string, unknown>; pref?: EmailNotificationPref }
}

export default class NotificationService {
  static async notify(userOrId: User | number, input: NotifyInput) {
    const user = typeof userOrId === 'number' ? await User.find(userOrId) : userOrId
    if (!user) return
    await Notification.create({
      userId: user.id,
      type: input.type,
      title: input.title.slice(0, 200),
      body: input.body?.slice(0, 500) ?? null,
      url: input.url ?? null,
    })
    if (input.email && (!input.email.pref || user.wantsEmail(input.email.pref)) && user.status === 'active') {
      await Mailer.queue({
        to: user.email,
        subject: input.email.subject,
        template: input.email.template,
        data: { name: user.fullName, title: input.title, body: input.body, url: input.url, ...input.email.data },
      })
    }
  }

  static async notifyMany(userIds: number[], input: NotifyInput) {
    for (const id of new Set(userIds)) await this.notify(id, input)
  }
}
