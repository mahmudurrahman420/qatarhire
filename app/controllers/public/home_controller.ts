import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import Job from '#models/job'
import SavedCandidate from '#models/saved_candidate'
import Taxonomy from '#services/taxonomy'
import CandidateSearchService, { parseCandidateFilters } from '#services/candidate_search_service'
import { jobCard, candidateCard } from '#services/presenters'
import { locationIdsForSlug } from '#services/search_helpers'
import { membershipFor } from '#services/company_context'
import { countryBySlug } from '#shared/gulf'

export const HOME_PAGE_SIZE = 6

/** Homepage "Discover jobseekers" tabs map onto the public candidate search. */
export function feedFilters(input: Record<string, unknown>) {
  const tab = ['available', 'recent'].includes(String(input.tab)) ? String(input.tab) : 'all'
  const sort = input.sort === 'experience' ? 'experience' : 'updated'
  const country = countryBySlug(String(input.country ?? '')) ? String(input.country) : ''
  const f = parseCandidateFilters({
    sort,
    page: input.page,
    availability: tab === 'available' ? 'immediately' : undefined,
    updated: tab === 'recent' ? 30 : undefined,
  })
  return { f, tab, sort, country }
}

/** Public cards for the feed, filtered by the selected country (current or preferred location). */
export async function feedPage(input: Record<string, unknown>) {
  const { f, tab, sort, country } = feedFilters(input)
  const ids = await locationIdsForSlug(country)
  const page = await CandidateSearchService.search(f, HOME_PAGE_SIZE, 'public', (q) => {
    if (ids) q.where((w) => w.whereIn('candidate_profiles.current_location_id', ids).orWhereIn('candidate_profiles.preferred_location_id', ids))
  })
  return {
    tab,
    sort,
    country,
    data: page.all().map(candidateCard),
    meta: { total: page.total, page: page.currentPage, lastPage: page.lastPage },
  }
}

export default class HomeController {
  async index({ inertia, request, auth }: HttpContext) {
    const qs = request.qs()
    const country = countryBySlug(String(qs.country ?? ''))
    const countryIds = await locationIdsForSlug(country?.slug)

    const [feed, latest, taxonomy] = await Promise.all([
      feedPage(qs),
      Job.query()
        .withScopes((s) => s.live())
        .if(countryIds, (q) => q.whereIn('jobs.location_id', countryIds!))
        .preload('company')
        .preload('location')
        .orderBy('published_at', 'desc')
        .limit(4),
      Taxonomy.all(),
    ])

    // employers see which cards they've already saved
    let savedIds: number[] = []
    const membership = auth.user ? await membershipFor(auth.user) : null
    if (membership) {
      const rows = await SavedCandidate.query().where('company_id', membership.companyId).select('candidate_profile_id')
      savedIds = [...new Set(rows.map((r) => r.candidateProfileId))]
    }

    return inertia.render('public/home', {
      country: country?.slug ?? '',
      feed,
      savedIds,
      latestJobs: latest.map(jobCard),
      industries: taxonomy.industries,
      locations: taxonomy.locations.map((c) => ({ name: c.name, slug: c.slug, cities: c.cities.map((ci) => ({ name: ci.name, slug: ci.slug })) })),
      meta: {
        title: country ? `Jobseekers and jobs in ${country.fullName}` : undefined,
        description: 'Create your professional profile and get discovered by recruiters across the UAE, Saudi Arabia, Qatar, Kuwait, Oman and Bahrain. Browse jobs from reviewed employers.',
      },
      canonical: country ? `${env.get('APP_URL')}/?country=${country.slug}` : env.get('APP_URL'),
    })
  }

  /** JSON page of public profiles for "Load more profiles". */
  async feed({ request, response }: HttpContext) {
    response.header('Cache-Control', 'no-store')
    return feedPage(request.qs())
  }
}
