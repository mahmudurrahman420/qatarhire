import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import CandidateProfile from '#models/candidate_profile'
import Industry from '#models/industry'
import Location from '#models/location'
import { candidateRegisterValidator, employerRegisterValidator } from '#validators/auth'
import { sendSignupEmail } from '#services/email_verification'
import SignupOtp, { SignupMailUnavailable, OTP_TTL_MINUTES } from '#services/signup_otp'
import { randomBytes } from 'node:crypto'
import AuditLogger from '#services/audit_logger'
import SettingsService from '#services/settings_service'
import { createCompanyFor } from '#services/company_setup'
import { enabledSocialProviders } from '#services/social_providers'
import { DateTime } from 'luxon'
import { homeFor } from '#controllers/auth/session_controller'

const SESSION_KEY = 'pending_signup'

export default class RegisterController {
  async showCandidate({ inertia }: HttpContext) {
    return inertia.render('auth/register_candidate', { socialProviders: enabledSocialProviders() })
  }

  async storeCandidate(ctx: HttpContext) {
    const { request, response, session } = ctx
    const data = await request.validateUsing(candidateRegisterValidator)
    if (await User.findBy('email', data.email)) {
      session.flashErrors({ email: 'An account with this email already exists. Try signing in.' })
      session.flashExcept(['password', 'passwordConfirmation'])
      return response.redirect().back()
    }
    const { password, passwordConfirmation, ...rest } = data as typeof data & { passwordConfirmation?: string }
    return this.beginOtp(ctx, 'candidate', data.email, password, rest)
  }

  async showEmployer({ inertia, response, session }: HttpContext) {
    if (!(await SettingsService.get('employer_registration_open'))) {
      session.flash('error', 'Employer registration is temporarily closed. Please contact us.')
      return response.redirect().toPath('/contact')
    }
    return inertia.render('auth/register_employer', {
      socialProviders: enabledSocialProviders(),
      industries: await Industry.query().where('is_active', true).orderBy('sort_order').select('id', 'name'),
      locations: (await Location.query().where('kind', 'city').where('is_active', true).orderBy('country_code').orderBy('sort_order')).map((l) => ({ id: l.id, name: l.displayName })),
    })
  }

  async storeEmployer(ctx: HttpContext) {
    const { request, response, session } = ctx
    if (!(await SettingsService.get('employer_registration_open'))) return response.forbidden('Employer registration is closed')
    const data = await request.validateUsing(employerRegisterValidator)
    if (await User.findBy('email', data.email)) {
      session.flashErrors({ email: 'An account with this email already exists. Try signing in.' })
      session.flashExcept(['password', 'passwordConfirmation'])
      return response.redirect().back()
    }
    const { password, passwordConfirmation, ...rest } = data as typeof data & { passwordConfirmation?: string }
    return this.beginOtp(ctx, 'employer', data.email, password, rest)
  }

  private async beginOtp(ctx: HttpContext, role: 'candidate' | 'employer', email: string, password: string, payload: Record<string, unknown>) {
    const { response, session } = ctx
    try {
      const token = await SignupOtp.start(role, email, password, payload)
      session.put(SESSION_KEY, token)
      return response.redirect().toPath('/signup/verify')
    } catch (error) {
      if (!(error instanceof SignupMailUnavailable)) throw error
      session.flash('error', "We couldn't send a verification email right now. Please try again in a few minutes, or contact support@hiremegulf.com.")
      session.flashExcept(['password', 'passwordConfirmation'])
      return response.redirect().back()
    }
  }

  private registerPath(role: string) {
    return role === 'employer' ? '/employers/register' : '/register'
  }

  async showVerify({ inertia, session, response }: HttpContext) {
    const row = await SignupOtp.find(session.get(SESSION_KEY))
    if (!row) return response.redirect().toPath('/register')
    return inertia.render('auth/signup_verify', { email: row.email, resendIn: SignupOtp.resendWaitSeconds(row), minutes: OTP_TTL_MINUTES })
  }

  async resendCode({ session, response }: HttpContext) {
    const row = await SignupOtp.find(session.get(SESSION_KEY))
    if (!row) return response.redirect().toPath('/register')
    const wait = SignupOtp.resendWaitSeconds(row)
    if (wait > 0) {
      session.flash('error', `Please wait ${wait} seconds before requesting a new code.`)
      return response.redirect().toPath('/signup/verify')
    }
    try {
      await SignupOtp.resend(row)
      session.flash('success', 'A new code is on its way.')
    } catch (error) {
      if (!(error instanceof SignupMailUnavailable)) throw error
      session.flash('error', "We couldn't send a verification email right now. Please try again shortly.")
    }
    return response.redirect().toPath('/signup/verify')
  }

  async verifyCode(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const row = await SignupOtp.find(session.get(SESSION_KEY))
    if (!row) return response.redirect().toPath('/register')
    const code = String(request.input('code', '')).replace(/\s+/g, '')
    const result = await SignupOtp.check(row, code)
    if (result === 'expired' || result === 'locked') {
      await SignupOtp.consume(row)
      session.forget(SESSION_KEY)
      session.flash('error', result === 'expired' ? 'That code expired. Please sign up again to get a new one.' : 'Too many wrong codes. Please sign up again.')
      return response.redirect().toPath(this.registerPath(row.role))
    }
    if (result === 'invalid') {
      session.flashErrors({ code: 'That code is not correct. Check the email and try again.' })
      return response.redirect().toPath('/signup/verify')
    }

    if (await User.findBy('email', row.email)) {
      await SignupOtp.consume(row)
      session.forget(SESSION_KEY)
      session.flashErrors({ email: 'An account with this email already exists. Try signing in.' })
      return response.redirect().toPath('/login')
    }
    if (row.role === 'employer' && !(await SettingsService.get('employer_registration_open'))) {
      await SignupOtp.consume(row)
      session.forget(SESSION_KEY)
      session.flash('error', 'Employer registration is temporarily closed. Please contact us.')
      return response.redirect().toPath('/contact')
    }

    const data = JSON.parse(row.payload)
    const user = await db.transaction(async (trx) => {
      const u = await User.create({ fullName: data.fullName, email: row.email, password: randomBytes(24).toString('hex'), role: row.role, status: 'active', emailVerifiedAt: DateTime.now() }, { client: trx })
      // keep the password hash computed at signup (the user's real password)
      await trx.from('users').where('id', u.id).update({ password: row.password_hash })
      if (row.role === 'candidate') await CandidateProfile.create({ userId: u.id, contactEmail: u.email }, { client: trx })
      else await createCompanyFor(u, data, { name: data.fullName, email: row.email }, trx)
      return u
    })
    await SignupOtp.consume(row)
    session.forget(SESSION_KEY)
    await sendSignupEmail(user)
    await AuditLogger.log('auth.register', { ctx, actorId: user.id, subject: { type: 'user', id: user.id }, meta: { role: row.role, emailOtp: true } })
    await auth.use('web').login(user)
    return response.redirect().toPath(homeFor(user))
  }
}
