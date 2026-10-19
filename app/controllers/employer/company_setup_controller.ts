import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Industry from '#models/industry'
import Location from '#models/location'
import { companySetupValidator } from '#validators/auth'
import { createCompanyFor } from '#services/company_setup'
import { membershipFor } from '#services/company_context'
import AuditLogger from '#services/audit_logger'

/** Company details for an employer account that has no company yet (social sign-up). */
export default class CompanySetupController {
  async show({ inertia, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (await membershipFor(user)) return response.redirect().toPath('/employer')
    return inertia.render('employer/setup', {
      contact: { fullName: user.fullName, email: user.email },
      industries: await Industry.query().where('is_active', true).orderBy('sort_order').select('id', 'name'),
      locations: (await Location.query().where('kind', 'city').where('is_active', true).orderBy('country_code').orderBy('sort_order')).map((l) => ({ id: l.id, name: l.displayName })),
    })
  }

  async store(ctx: HttpContext) {
    const { auth, request, response, session } = ctx
    const user = auth.getUserOrFail()
    if (await membershipFor(user)) return response.redirect().toPath('/employer')
    const data = await request.validateUsing(companySetupValidator)
    const company = await db.transaction((trx) => createCompanyFor(user, data, { name: user.fullName, email: user.email }, trx))
    await AuditLogger.log('company.created', { ctx, actorId: user.id, subject: { type: 'company', id: company.id } })
    session.flash('success', 'Company added. Our team will review it shortly.')
    return response.redirect().toPath('/employer')
  }
}
