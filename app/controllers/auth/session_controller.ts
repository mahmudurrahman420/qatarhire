import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import { loginValidator } from '#validators/auth'
import AuditLogger from '#services/audit_logger'
import { enabledSocialProviders } from '#services/social_providers'

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
    return inertia.render('auth/login', {
      redirect: safeRedirect(request.input('redirect')),
      portal: 'user',
      socialProviders: enabledSocialProviders(),
    })
  }

  /** GET /admin/login: the same sign-in form, admin accounts only, password only (no social sign-in). */
  async showAdmin({ inertia, auth, response, session }: HttpContext) {
    if (await auth.use('web').check()) {
      const user = auth.use('web').user!
      if (user.isAdmin) return response.redirect().toPath('/admin')
      session.flash('error', "This account doesn't have administrator access.")
      return response.redirect().toPath(homeFor(user))
    }
    return inertia.render('auth/login', { redirect: '/admin', portal: 'admin', socialProviders: [] })
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
    if (request.input('portal') === 'admin' && !user.isAdmin) {
      await AuditLogger.log('auth.admin_login_denied', { ctx, actorId: null, meta: { userId: user.id } })
      session.flashErrors({ email: "This account doesn't have administrator access." })
      session.flashExcept(['password'])
      return response.redirect().back()
    }
    // rotate the session id on privilege change to prevent fixation
    session.regenerate()
    await auth.use('web').login(user)
    user.lastLoginAt = DateTime.now()
    await user.save()
    await AuditLogger.log('auth.login', { ctx, actorId: user.id })
    let target = safeRedirect(request.input('redirect'))
    // never bounce a non-admin into the admin area after sign-in
    if (target && /^\/admin(\/|$|\?)/.test(target) && !user.isAdmin) target = null
    return response.redirect().toPath(target ?? homeFor(user))
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
