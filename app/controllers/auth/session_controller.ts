import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import { loginValidator } from '#validators/auth'
import AuditLogger from '#services/audit_logger'

export function homeFor(user: User) {
  if (user.isAdmin) return '/admin'
  if (user.isEmployer) return '/employer'
  return '/candidate'
}

/** Only allow same-site relative redirects after login (no open redirects). */
function safeRedirect(target: unknown) {
  if (typeof target !== 'string') return null
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return null
  return target
}

export default class SessionController {
  async show({ inertia, request }: HttpContext) {
    return inertia.render('auth/login', { redirect: safeRedirect(request.input('redirect')) })
  }

  async store(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    const { email, password } = await request.validateUsing(loginValidator)
    let user: User
    try {
      user = await User.verifyCredentials(email, password)
    } catch {
      await AuditLogger.log('auth.login_failed', { ctx, actorId: null, meta: { email } })
      session.flashErrors({ email: 'These credentials do not match our records.' })
      session.flashExcept(['password'])
      return response.redirect().back()
    }
    if (user.status !== 'active') {
      session.flashErrors({ email: 'This account is suspended. Please contact support.' })
      return response.redirect().back()
    }
    // rotate the session id on privilege change to prevent fixation
    session.regenerate()
    await auth.use('web').login(user)
    user.lastLoginAt = DateTime.now()
    await user.save()
    await AuditLogger.log('auth.login', { ctx, actorId: user.id })
    return response.redirect().toPath(safeRedirect(request.input('redirect')) ?? homeFor(user))
  }

  async destroy({ auth, response, session }: HttpContext) {
    await auth.use('web').logout()
    session.flash('success', 'You have been signed out.')
    return response.redirect().toPath('/')
  }

  async dashboard({ auth, response }: HttpContext) {
    return response.redirect().toPath(homeFor(auth.getUserOrFail()))
  }
}
