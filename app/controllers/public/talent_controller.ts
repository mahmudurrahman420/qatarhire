import type { HttpContext } from '@adonisjs/core/http'
import CandidateProfile from '#models/candidate_profile'
import SavedCandidate from '#models/saved_candidate'
import Taxonomy from '#services/taxonomy'
import CandidateAccess from '#services/candidate_access'
import CandidateSearchService, { parseCandidateFilters } from '#services/candidate_search_service'
import { candidateCard, candidateDetail, publicCvUrl } from '#services/presenters'
import { membershipFor } from '#services/company_context'
import { notFoundPage } from '#services/http_helpers'

/**
 * Public talent directory ("Find Talent"): candidates who chose a public profile.
 * Verified employers get the fuller employer search at /employer/candidates.
 */
export default class TalentController {
  async index({ inertia, request, auth }: HttpContext) {
    const filters = parseCandidateFilters(request.qs())
    const results = await CandidateSearchService.search(filters, 20, 'public')
    const membership = auth.user ? await membershipFor(auth.user) : null
    const saved = membership ? await SavedCandidate.query().where('company_id', membership.companyId).select('candidate_profile_id') : []
    return inertia.render('public/talent/index', {
      filters,
      results: {
        data: results.all().map(candidateCard),
        meta: { total: results.total, page: results.currentPage, lastPage: results.lastPage },
      },
      savedIds: [...new Set(saved.map((s) => s.candidateProfileId))],
      canUseEmployerSearch: Boolean(membership?.company.isVerified),
      taxonomy: await Taxonomy.all(),
      meta: { title: 'Find talent in the Gulf', description: 'Browse public profiles of jobseekers across the UAE, Saudi Arabia, Qatar, Kuwait, Oman and Bahrain.' },
    })
  }

  async show(ctx: HttpContext) {
    const { inertia, params, auth } = ctx
    const profile = await CandidateProfile.find(Number(params.id) || 0)
    if (!profile) return notFoundPage(ctx)

    const user = auth.user
    const membership = user ? await membershipFor(user) : null
    // employers keep their richer access (applied / discoverable); everyone else needs a public profile
    const access = membership
      ? await CandidateAccess.evaluate(membership.company, profile)
      : { canView: await CandidateAccess.isPubliclyVisible(profile), canSeeContact: false, cvIds: [] as number[], applied: false }
    const isOwner = user?.id === profile.userId
    if (!access.canView && !isOwner && !user?.isAdmin) return notFoundPage(ctx)

    await profile.load((l) =>
      l.load('user').load('skills').load('industry').load('educations').load('experiences').load('certifications').load('languages').load('cvs')
        .load('currentLocation').load('preferredLocation')
    )
    if (membership && access.canView) await CandidateAccess.logAccess(ctx, user!, membership.company, profile.id, 'profile_view')

    const detail = candidateDetail(profile, access)
    const cvUrl = publicCvUrl(profile)
    const saved = membership ? await SavedCandidate.query().where('company_id', membership.companyId).where('candidate_profile_id', profile.id) : []
    return inertia.render('public/talent/show', {
      candidate: { ...detail, publicCvUrl: cvUrl, cvs: detail.cvs.length ? detail.cvs : [] },
      isOwner,
      isEmployer: Boolean(membership),
      saved: saved.map((s) => ({ id: s.id, listName: s.listName })),
      meta: { title: `${detail.fullName} — ${detail.desiredPosition ?? 'Jobseeker'}`, description: detail.headline ?? undefined, noindex: !profile.isPublic },
    })
  }
}
