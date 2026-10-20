import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import env from '#start/env'
import User from '#models/user'
import UserToken from '#models/user_token'
import Mailer from '#services/mailer'
import { mailDeliverable, supportEmail } from '#services/auth_settings'
import AuditLogger from '#services/audit_logger'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/auth'

export default class PasswordResetController {
  async showForgot({ inertia }: HttpContext) {
    return inertia.render('auth/forgot_password', { mailEnabled: mailDeliverable(), supportEmail: supportEmail() })
  }

  /** Always responds identically so the form cannot be used to discover accounts. */
  async sendLink(ctx: HttpContext) {
    const { request, response, session } = ctx
    const { email } = await request.validateUsing(forgotPasswordValidator)
    if (!mailDeliverable()) {
      // Email delivery isn't set up (MAIL_MAILER=log): don't claim a link was sent.
      const support = supportEmail()
      session.flash('error', `We can't send reset emails right now. Please contact support${support ? ` at ${support}` : ''} and we'll help you get back in.`)
      return response.redirect().back()
    }
    const user = await User.findBy('email', email)
    if (user && user.status === 'active') {
      const token = await UserToken.issue(user, 'password_reset', 60)
      await Mailer.queue({
        to: user.email,
        subject: 'Reset your password',
        template: 'password_reset',
        data: { name: user.fullName, url: `${env.get('APP_URL')}/reset-password/${token}` },
      })
      await AuditLogger.log('auth.password_reset_requested', { ctx, actorId: user.id })
    }
    session.flash('success', 'If an account exists for that email, a reset link is on its way. It expires in 60 minutes.')
    return response.redirect().back()
  }

  async showReset({ inertia, params, response, session }: HttpContext) {
    const token = await UserToken.findValid(String(params.token), 'password_reset')
    if (!token) {
      session.flash('error', 'This reset link is invalid or has expired.')
      return response.redirect().toPath('/forgot-password')
    }
    return inertia.render('auth/reset_password', { token: params.token })
  }

  async reset(ctx: HttpContext) {
    const { request, params, response, session } = ctx
    const { password } = await request.validateUsing(resetPasswordValidator)
    const token = await UserToken.findValid(String(params.token), 'password_reset')
    if (!token) {
      session.flash('error', 'This reset link is invalid or has expired.')
      return response.redirect().toPath('/forgot-password')
    }
    token.user.password = password
    await token.user.save()
    token.usedAt = DateTime.now()
    await token.save()
    await AuditLogger.log('auth.password_reset', { ctx, actorId: token.userId })
    session.flash('success', 'Your password has been reset. Please sign in.')
    return response.redirect().toPath('/login')
  }
}
