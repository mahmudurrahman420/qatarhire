import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'
import Notification from '#models/notification'
import { accountValidator, changePasswordValidator } from '#validators/auth'
import AuditLogger from '#services/audit_logger'
import { EmailNotificationPrefs } from '#shared/enums'

export default class AccountController {
  async show({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const prefs = Object.fromEntries(EmailNotificationPrefs.values.map((p) => [p, user.wantsEmail(p)]))
    return inertia.render('account/settings', { prefs })
  }

  async update({ request, auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(accountValidator)
    user.fullName = data.fullName
    if (data.prefs) user.notificationPrefs = { ...(user.notificationPrefs ?? {}), ...data.prefs }
    await user.save()
    session.flash('success', 'Account settings saved.')
    return response.redirect().back()
  }

  async changePassword(ctx: HttpContext) {
    const { request, auth, response, session } = ctx
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(changePasswordValidator)
    if (!(await hash.verify(user.password, data.currentPassword))) {
      session.flashErrors({ currentPassword: 'Your current password is incorrect.' })
      return response.redirect().back()
    }
    user.password = data.password
    await user.save()
    await AuditLogger.log('auth.password_changed', { ctx })
    session.flash('success', 'Password updated.')
    return response.redirect().back()
  }

  async notifications({ inertia, auth, request }: HttpContext) {
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const list = await Notification.query().where('user_id', auth.getUserOrFail().id).orderBy('created_at', 'desc').paginate(page, 25)
    list.baseUrl('/notifications')
    return inertia.render('account/notifications', { notifications: list.serialize() })
  }

  async markRead({ auth, params, response }: HttpContext) {
    const n = await Notification.query().where('user_id', auth.getUserOrFail().id).where('id', params.id).firstOrFail()
    n.readAt = n.readAt ?? DateTime.now()
    await n.save()
    return n.url ? response.redirect().toPath(n.url) : response.redirect().back()
  }

  async markAllRead({ auth, response }: HttpContext) {
    await Notification.query().where('user_id', auth.getUserOrFail().id).whereNull('read_at').update({ read_at: DateTime.now().toSQL({ includeOffset: false }) })
    return response.redirect().back()
  }
}
