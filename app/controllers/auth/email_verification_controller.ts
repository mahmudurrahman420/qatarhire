import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import UserToken from '#models/user_token'
import EmailVerification from '#services/email_verification'
import AuditLogger from '#services/audit_logger'
import { homeFor } from '#controllers/auth/session_controller'

export default class EmailVerificationController {
  async notice({ inertia, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.isVerified) return response.redirect().toPath(homeFor(user))
    return inertia.render('auth/verify_email', { email: user.email })
  }

  async resend({ auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    if (!user.isVerified) await EmailVerification.send(user)
    session.flash('success', 'We sent a new verification link to your email.')
    return response.redirect().back()
  }

  async verify(ctx: HttpContext) {
    const { params, response, session, auth } = ctx
    const token = await UserToken.findValid(String(params.token), 'verify_email')
    if (!token) {
      session.flash('error', 'This verification link is invalid or has expired. Request a new one below.')
      return response.redirect().toPath(auth.user ? '/verify-email' : '/login')
    }
    token.usedAt = DateTime.now()
    await token.save()
    const user = token.user
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = DateTime.now()
      await user.save()
      await AuditLogger.log('auth.email_verified', { ctx, actorId: user.id })
    }
    session.flash('success', 'Your email is verified. Welcome to QatarHire!')
    if (!auth.user) {
      await auth.use('web').login(user)
    }
    return response.redirect().toPath(homeFor(user))
  }
}
