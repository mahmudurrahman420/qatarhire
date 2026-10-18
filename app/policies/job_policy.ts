import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import type User from '#models/user'
import type Job from '#models/job'
import { membershipFor } from '#services/company_context'

export default class JobPolicy extends BasePolicy {
  /** Employer users may manage only their own company's jobs. */
  async manage(user: User, job: Job): Promise<AuthorizerResponse> {
    const membership = await membershipFor(user)
    return membership !== null && membership.companyId === job.companyId
  }
}
