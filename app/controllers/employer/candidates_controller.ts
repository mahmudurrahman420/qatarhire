import type { HttpContext } from '@adonisjs/core/http'
import CandidateProfile from '#models/candidate_profile'
import SavedCandidate from '#models/saved_candidate'
import SavedSearch from '#models/saved_search'
import Taxonomy from '#services/taxonomy'
import CandidateAccess from '#services/candidate_access'
import CandidateSearchService, { parseCandidateFilters } from '#services/candidate_search_service'
import { candidateCard, candidateDetail } from '#services/presenters'
import { saveCandidateValidator, savedSearchValidator } from '#validators/employer'

export default class CandidatesController {
  async index({ inertia, request, company, auth }: HttpContext) {
    const allowed = await CandidateAccess.canSearch(company)
    const filters = parseCandidateFilters(request.qs())
    const taxonomy = await Taxonomy.all()
    const savedSearches = await SavedSearch.query().where('user_id', auth.getUserOrFail().id).where('kind', 'candidates').orderBy('created_at', 'desc')

    if (!allowed) {
      return inertia.render('employer/candidates/index', {
        allowed: false,
        companyStatus: company.verificationStatus,
        filters,
        results: null,
        savedIds: [],
        savedSearches: [],
        taxonomy,
      })
    }

    const results = await CandidateSearchService.search(filters)
    const saved = await SavedCandidate.query().where('company_id', company.id).select('candidate_profile_id')
    return inertia.render('employer/candidates/index', {
      allowed: true,
      companyStatus: company.verificationStatus,
      filters,
      results: {
        data: results.all().map(candidateCard),
        meta: { total: results.total, page: results.currentPage, lastPage: results.lastPage, perPage: results.perPage },
      },
      savedIds: [...new Set(saved.map((s) => s.candidateProfileId))],
      savedSearches: savedSearches.map((s) => s.serialize()),
      taxonomy,
    })
  }

  async show(ctx: HttpContext) {
    const { inertia, params, company, auth, response } = ctx
    const profile = await CandidateProfile.find(Number(params.id) || 0)
    if (!profile) return response.notFound()
    const access = await CandidateAccess.evaluate(company, profile)
    // 404 rather than 403: do not reveal that a private profile exists
    if (!access.canView) return response.notFound()

    await profile.load((l) =>
      l
        .load('skills')
        .load('industry')
        .load('educations')
        .load('experiences')
        .load('certifications')
        .load('languages')
        .load('cvs')
        .load('currentLocation', (q) => q.preload('parent'))
        .load('preferredLocation')
    )
    await CandidateAccess.logAccess(ctx, auth.getUserOrFail(), company, profile.id, 'profile_view')
    if (access.canSeeContact) await CandidateAccess.logAccess(ctx, auth.getUserOrFail(), company, profile.id, 'contact_view')

    const saved = await SavedCandidate.query().where('company_id', company.id).where('candidate_profile_id', profile.id)
    return inertia.render('employer/candidates/show', {
      candidate: candidateDetail(profile, access),
      applied: access.applied,
      saved: saved.map((s) => ({ id: s.id, listName: s.listName, note: s.note })),
    })
  }

  async save({ request, params, company, auth, response, session }: HttpContext) {
    const profile = await CandidateProfile.find(Number(params.id) || 0)
    if (!profile) return response.notFound()
    const access = await CandidateAccess.evaluate(company, profile)
    if (!access.canView) return response.notFound()
    const data = await request.validateUsing(saveCandidateValidator)
    const listName = data.listName || 'Shortlist'
    await SavedCandidate.updateOrCreate(
      { companyId: company.id, candidateProfileId: profile.id, listName },
      { companyId: company.id, candidateProfileId: profile.id, listName, note: data.note ?? null, savedBy: auth.getUserOrFail().id }
    )
    session.flash('success', `Saved to "${listName}".`)
    return response.redirect().back()
  }

  /** One-click shortlist toggle used by talent cards. */
  async toggleSave({ params, company, auth, response }: HttpContext) {
    const profile = await CandidateProfile.find(Number(params.id) || 0)
    if (!profile) return response.notFound()
    const access = await CandidateAccess.evaluate(company, profile)
    if (!access.canView) return response.notFound()
    const existing = await SavedCandidate.query().where('company_id', company.id).where('candidate_profile_id', profile.id)
    if (existing.length) {
      await SavedCandidate.query().where('company_id', company.id).where('candidate_profile_id', profile.id).delete()
    } else {
      await SavedCandidate.create({ companyId: company.id, candidateProfileId: profile.id, listName: 'Shortlist', savedBy: auth.getUserOrFail().id })
    }
    return response.redirect().back()
  }

  async unsave({ params, company, response }: HttpContext) {
    await SavedCandidate.query().where('id', Number(params.savedId) || 0).where('company_id', company.id).delete()
    return response.redirect().back()
  }

  /** Saved candidate lists. Candidates who have since gone private are hidden but kept. */
  async saved({ inertia, company, request }: HttpContext) {
    const list = String(request.input('list', ''))
    const query = SavedCandidate.query()
      .where('company_id', company.id)
      .preload('candidateProfile', (p) =>
        p.preload('user').preload('skills').preload('industry').preload('educations').preload('cvs').preload('currentLocation', (l) => l.preload('parent')).preload('preferredLocation')
      )
      .orderBy('updated_at', 'desc')
    if (list) query.where('list_name', list)
    const rows = await query
    const lists = await SavedCandidate.query().where('company_id', company.id).groupBy('list_name').select('list_name').count('* as total')

    const visible = []
    let hidden = 0
    for (const row of rows) {
      const access = await CandidateAccess.evaluate(company, row.candidateProfile)
      if (!access.canView) {
        hidden++
        continue
      }
      visible.push({ id: row.id, listName: row.listName, note: row.note, candidate: candidateCard(row.candidateProfile) })
    }
    return inertia.render('employer/candidates/saved', {
      list,
      lists: lists.map((l) => ({ name: l.listName, count: Number(l.$extras.total) })),
      items: visible,
      hiddenCount: hidden,
    })
  }

  async storeSearch({ request, auth, response, session }: HttpContext) {
    const data = await request.validateUsing(savedSearchValidator)
    const user = auth.getUserOrFail()
    const { page, ...filters } = parseCandidateFilters(Object.fromEntries(new URLSearchParams(data.query)))
    void page
    const count = await SavedSearch.query().where('user_id', user.id).where('kind', 'candidates').count('* as total')
    if (Number(count[0].$extras.total) >= 25) {
      session.flash('error', 'You can keep up to 25 saved searches.')
      return response.redirect().back()
    }
    await SavedSearch.create({ userId: user.id, kind: 'candidates', name: data.name, filters, alertsEnabled: data.alertsEnabled ?? false })
    session.flash('success', 'Search saved.')
    return response.redirect().back()
  }

  async destroySearch({ params, auth, response }: HttpContext) {
    await SavedSearch.query().where('id', Number(params.id) || 0).where('user_id', auth.getUserOrFail().id).delete()
    return response.redirect().back()
  }
}
