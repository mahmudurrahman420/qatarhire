import type { HttpContext } from '@adonisjs/core/http'
import Application from '#models/application'
import CandidateAccessLog from '#models/candidate_access_log'
import CandidateProfile from '#models/candidate_profile'
import CandidateCv from '#models/candidate_cv'
import type Company from '#models/company'
import type User from '#models/user'
import AuditLogger from '#services/audit_logger'
import EntitlementService from '#services/entitlement_service'

/**
 * Single source of truth for what an employer may see about a candidate.
 *
 *  - Search / unsolicited profile view: candidate is `discoverable`, account active,
 *    employer's company is verified (and entitled when billing is on).
 *  - Applicant view: candidate applied (not withdrawn) to one of the company's jobs.
 *  - Contact details: applicant, OR discoverable + contact_sharing = verified_employers.
 *  - CV: CVs attached to the company's applications, OR the primary CV when the
 *    candidate opted in with cv_searchable.
 *
 * Every check runs per request, so a candidate changing their settings
 * (withdrawing consent) takes effect immediately.
 */
export default class CandidateAccess {
  static async appliedCvIds(company: Company, profileId: number) {
    const rows = await Application.query()
      .where('candidate_profile_id', profileId)
      .whereNot('status', 'withdrawn')
      .whereHas('job', (q) => q.where('company_id', company.id))
      .select('candidate_cv_id')
    return rows.map((r) => r.candidateCvId).filter((v): v is number => v !== null)
  }

  static async hasApplied(company: Company, profileId: number) {
    const row = await Application.query()
      .where('candidate_profile_id', profileId)
      .whereNot('status', 'withdrawn')
      .whereHas('job', (q) => q.where('company_id', company.id))
      .first()
    return row !== null
  }

  static async canSearch(company: Company) {
    return company.isVerified && (await EntitlementService.allows(company, 'candidate_search'))
  }

  /** Returns the access level an employer has to a profile. */
  static async evaluate(company: Company, profile: CandidateProfile) {
    await profile.load('user')
    if (profile.user.status !== 'active' || company.verificationStatus === 'suspended' || company.verificationStatus === 'rejected') {
      return { canView: false, canSeeContact: false, cvIds: [] as number[], applied: false }
    }
    const applied = await this.hasApplied(company, profile.id)
    const viaSearch = profile.isDiscoverable && (await this.canSearch(company))
    const canView = applied || viaSearch
    const canSeeContact = applied || (viaSearch && profile.contactSharing === 'verified_employers')

    const cvIds = new Set<number>(applied ? await this.appliedCvIds(company, profile.id) : [])
    if (viaSearch && profile.cvSearchable) {
      const primary = await CandidateCv.query().where('candidate_profile_id', profile.id).where('is_primary', true).first()
      if (primary) cvIds.add(primary.id)
    }
    return { canView, canSeeContact, cvIds: [...cvIds], applied }
  }

  static async logAccess(
    ctx: HttpContext,
    user: User,
    company: Company | null,
    profileId: number,
    action: 'profile_view' | 'cv_download' | 'contact_view',
    cvId: number | null = null
  ) {
    await CandidateAccessLog.create({
      candidateProfileId: profileId,
      companyId: company?.id ?? null,
      userId: user.id,
      action,
      candidateCvId: cvId,
      ip: ctx.request.ip(),
    })
    if (action !== 'profile_view') {
      await AuditLogger.log(`candidate.${action}`, { ctx, subject: { type: 'candidate_profile', id: profileId }, meta: { companyId: company?.id ?? null, cvId } })
    }
  }
}
