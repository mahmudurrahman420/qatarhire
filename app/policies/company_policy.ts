import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import type User from '#models/user'
import type Company from '#models/company'
import { membershipFor } from '#services/company_context'

export default class CompanyPolicy extends BasePolicy {
  async view(user: User, company: Company): Promise<AuthorizerResponse> {
    const m = await membershipFor(user)
    return m !== null && m.companyId === company.id
  }

  /** Company settings, team and billing: owners only. */
  async administer(user: User, company: Company): Promise<AuthorizerResponse> {
    const m = await membershipFor(user)
    return m !== null && m.companyId === company.id && m.role === 'owner'
  }
}
