import env from '#start/env'
import type User from '#models/user'
import UserToken from '#models/user_token'
import Mailer from '#services/mailer'

export default class EmailVerification {
  static async send(user: User) {
    const token = await UserToken.issue(user, 'verify_email', 60 * 48)
    await Mailer.queue({
      to: user.email,
      subject: 'Confirm your email address',
      template: 'verify_email',
      data: { name: user.fullName, url: `${env.get('APP_URL')}/verify-email/${token}` },
    })
  }
}

/**
 * Sign-up email when verification is NOT required: a welcome note (with a confirm link) sent only when
 * real delivery is configured (ZeptoMail). Never blocks sign-up if sending fails.
 */
export async function sendSignupEmail(user: User) {
  try {
    const { default: EmailSettings } = await import('#services/email_settings')
    if (!(await EmailSettings.configured())) return
    await Mailer.queue({
      to: user.email,
      subject: `Welcome to ${env.get('APP_NAME', 'HireMeGulf')}`,
      template: 'notification',
      data: { name: user.fullName, title: 'Your account is ready', body: `You signed up with ${user.email}. You can sign in any time.`, url: '/login' },
    })
  } catch (error) {
    const { default: logger } = await import('@adonisjs/core/services/logger')
    logger.error({ err: error, userId: user.id }, 'signup email failed')
  }
}
