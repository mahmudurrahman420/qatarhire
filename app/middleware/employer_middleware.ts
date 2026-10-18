import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type Company from '#models/company'
import type CompanyUser from '#models/company_user'
import { membershipFor } from '#services/company_context'

/**
 * Resolves the employer's company for every /employer request and exposes it
 * as ctx.company / ctx.membership. All employer queries are scoped by this id.
 * Optionally requires the owner role.
 */
export default class EmployerMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { ownerOnly?: boolean } = {}) {
    const user = ctx.auth.getUserOrFail()
    const membership = await membershipFor(user)
    if (!membership) {
      return ctx.response.forbidden('No company is linked to this account.')
    }
    if (options.ownerOnly && membership.role !== 'owner') {
      ctx.session.flash('error', 'Only the company owner can manage this.')
      return ctx.response.redirect().toPath('/employer')
    }
    ctx.membership = membership
    ctx.company = membership.company
    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    company: Company
    membership: CompanyUser
  }
}
