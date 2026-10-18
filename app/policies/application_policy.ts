import { BasePolicy } from '@adonisjs/bouncer'
import type { AuthorizerResponse } from '@adonisjs/bouncer/types'
import type User from '#models/user'
import type Application from '#models/application'
import CandidateProfile from '#models/candidate_profile'
import { membershipFor } from '#services/company_context'

export default class ApplicationPolicy {
  /** Employer side: application must belong to a job of the user's company. Requires `job` preloaded. */
  async manage(user: User, application: Application): Promise<AuthorizerResponse> {
    const membership = await membershipFor(user)
    return membership !== null && application.job?.companyId === membership.companyId
  }

  /** Candidate side: only the applicant. */
  async own(user: User, application: Application): Promise<AuthorizerResponse> {
    const profile = await CandidateProfile.findBy('user_id', user.id)
    return profile !== null && application.candidateProfileId === profile.id
  }
}
// BasePolicy import kept for consistency with other policies
void BasePolicy
