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
