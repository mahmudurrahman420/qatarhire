import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { homeFor } from '#controllers/auth/session_controller'
import { isSocialProviderEnabled, type SocialProvider } from '#services/social_providers'
import SocialLogin, { SOCIAL_INTENTS, type SocialIntent } from '#services/social_login'
import { membershipFor } from '#services/company_context'
import AuditLogger from '#services/audit_logger'

const LABEL: Record<SocialProvider, string> = { google: 'Google', linkedin: 'LinkedIn', facebook: 'Facebook' }
const START_PAGE: Record<SocialIntent, string> = { login: '/login', candidate: '/register', employer: '/employers/register' }
const INTENT_KEY = 'social_intent'

export default class SocialController {
  /** GET /auth/:provider/redirect?intent=login|candidate|employer */
  async redirect({ ally, params, request, session, response }: HttpContext) {
    const provider = params.provider as string
    if (!isSocialProviderEnabled(provider)) return response.notFound('Not found')
    const raw = request.input('intent')
    const intent: SocialIntent = (SOCIAL_INTENTS as readonly string[]).includes(raw) ? raw : 'login'
    session.put(INTENT_KEY, intent)
    return ally.use(provider).redirect()
  }

  /** GET /auth/:provider/callback */
  async callback(ctx: HttpContext) {
    const { ally, params, session, response, auth } = ctx
    const provider = params.provider as string
    if (!isSocialProviderEnabled(provider)) return response.notFound('Not found')
    const intent = (session.pull(INTENT_KEY, 'login') as SocialIntent) ?? 'login'
    const back = START_PAGE[intent] ?? '/login'
    const label = LABEL[provider]
    const fail = (message: string) => {
      session.flash('error', message)
      return response.redirect().toPath(back)
    }

    const driver = ally.use(provider)
    if (driver.accessDenied()) return fail(`${label} sign-in was cancelled.`)
    if (driver.stateMisMatch()) return fail(`${label} sign-in expired. Please try again.`)
    if (driver.hasError()) return fail(`${label} sign-in failed. Please try again.`)

    let social: Awaited<ReturnType<typeof driver.user>>
    try {
      social = await driver.user()
    } catch {
      return fail(`We couldn't reach ${label}. Please try again.`)
    }

    const result = await SocialLogin.resolve(
      provider,
      {
        id: String(social.id),
        email: social.email,
        name: social.name,
        // Facebook only ever returns confirmed addresses but does not say so explicitly
        emailVerified: social.emailVerificationState === 'verified' || (provider === 'facebook' && social.emailVerificationState === 'unsupported'),
      },
      intent
    )

    if (!result.ok) {
      await AuditLogger.log('auth.social_failed', { ctx, actorId: null, meta: { provider, reason: result.reason } })
      switch (result.reason) {
        case 'no_account':
          session.flash('error', `No account uses that ${label} email yet. Choose how you want to join, then continue with ${label} again.`)
          return response.redirect().toPath('/register')
        case 'admin':
          return fail('Administrators must sign in with email and password.')
        case 'suspended':
          return fail('This account is suspended. Please contact support.')
        case 'employer_closed':
          return fail('Employer registration is temporarily closed. Please contact us.')
        case 'no_email':
          return fail(`${label} didn't share an email address. Please allow email access or sign up with email.`)
        default:
          return fail(`Your ${label} email address isn't verified. Verify it with ${label} or sign up with email.`)
      }
    }

    const user = result.user
    session.regenerate()
    await auth.use('web').login(user)
    user.lastLoginAt = DateTime.now()
    await user.save()
    await AuditLogger.log(result.created ? 'auth.register' : 'auth.login', {
      ctx,
      actorId: user.id,
      subject: { type: 'user', id: user.id },
      meta: { via: provider, role: user.role, linked: result.linked },
    })

    if (user.isEmployer && !(await membershipFor(user))) {
      session.flash('success', 'Welcome! Add your company details to start hiring.')
      return response.redirect().toPath('/employer/setup')
    }
    if (result.created) session.flash('success', 'Welcome to HireMeGulf! Your account is ready.')
    return response.redirect().toPath(homeFor(user))
  }
}
