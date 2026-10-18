import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import string from '@adonisjs/core/helpers/string'
import User from '#models/user'
import Company from '#models/company'
import CompanyUser from '#models/company_user'
import CandidateProfile from '#models/candidate_profile'
import CompanyVerification from '#models/company_verification'
import Industry from '#models/industry'
import Location from '#models/location'
import { candidateRegisterValidator, employerRegisterValidator } from '#validators/auth'
import EmailVerification from '#services/email_verification'
import AuditLogger from '#services/audit_logger'
import SettingsService from '#services/settings_service'

export default class RegisterController {
  async showCandidate({ inertia }: HttpContext) {
    return inertia.render('auth/register_candidate')
  }

  async storeCandidate(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    const data = await request.validateUsing(candidateRegisterValidator)
    if (await User.findBy('email', data.email)) {
      session.flashErrors({ email: 'An account with this email already exists. Try signing in.' })
      session.flashExcept(['password', 'passwordConfirmation'])
      return response.redirect().back()
    }
    const user = await db.transaction(async (trx) => {
      const u = await User.create({ fullName: data.fullName, email: data.email, password: data.password, role: 'candidate', status: 'active' }, { client: trx })
      await CandidateProfile.create({ userId: u.id, contactEmail: u.email }, { client: trx })
      return u
    })
    await EmailVerification.send(user)
    await AuditLogger.log('auth.register', { ctx, actorId: user.id, subject: { type: 'user', id: user.id }, meta: { role: 'candidate' } })
    await auth.use('web').login(user)
    return response.redirect().toPath('/verify-email')
  }

  async showEmployer({ inertia, response, session }: HttpContext) {
    if (!(await SettingsService.get('employer_registration_open'))) {
      session.flash('error', 'Employer registration is temporarily closed. Please contact us.')
      return response.redirect().toPath('/contact')
    }
    return inertia.render('auth/register_employer', {
      industries: await Industry.query().where('is_active', true).orderBy('sort_order').select('id', 'name'),
      locations: await Location.query().where('kind', 'municipality').where('is_active', true).orderBy('sort_order').select('id', 'name'),
    })
  }

  async storeEmployer(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    if (!(await SettingsService.get('employer_registration_open'))) return response.forbidden('Employer registration is closed')
    const data = await request.validateUsing(employerRegisterValidator)
    if (await User.findBy('email', data.email)) {
      session.flashErrors({ email: 'An account with this email already exists. Try signing in.' })
      session.flashExcept(['password', 'passwordConfirmation'])
      return response.redirect().back()
    }
    const user = await db.transaction(async (trx) => {
      const u = await User.create({ fullName: data.fullName, email: data.email, password: data.password, role: 'employer', status: 'active' }, { client: trx })
      let slug = string.slug(data.companyName, { lower: true, strict: true }).slice(0, 170) || 'company'
      for (let n = 2; await Company.query({ client: trx }).where('slug', slug).first(); n++) slug = `${slug.replace(/-\d+$/, '')}-${n}`
      const company = await Company.create(
        {
          name: data.companyName,
          slug,
          website: data.website ?? null,
          industryId: data.industryId ?? null,
          locationId: data.locationId ?? null,
          contactName: data.fullName,
          contactEmail: data.email,
          phone: data.phone ?? null,
          crNumber: data.crNumber ?? null,
          // Never auto-verified: an administrator must review the company.
          verificationStatus: 'pending',
        },
        { client: trx }
      )
      await CompanyUser.create({ companyId: company.id, userId: u.id, role: 'owner' }, { client: trx })
      await CompanyVerification.create({ companyId: company.id, fromStatus: null, toStatus: 'pending', note: 'Company registered' }, { client: trx })
      return u
    })
    await EmailVerification.send(user)
    await AuditLogger.log('auth.register', { ctx, actorId: user.id, subject: { type: 'user', id: user.id }, meta: { role: 'employer' } })
    await auth.use('web').login(user)
    return response.redirect().toPath('/verify-email')
  }
}
