import type { HttpContext } from '@adonisjs/core/http'
import Company from '#models/company'
import Job from '#models/job'
import Taxonomy from '#services/taxonomy'
import { companyBrief, jobCard } from '#services/presenters'
import { likeTerm } from '#services/search_helpers'
import { excerpt, notFoundPage } from '#services/http_helpers'

export default class CompaniesController {
  async index({ inertia, request }: HttpContext) {
    const q = String(request.input('q', '')).trim().slice(0, 100)
    const industry = String(request.input('industry', '')).slice(0, 140)
    const page = Math.max(1, Number(request.input('page', 1)) || 1)

    const query = Company.query()
      .whereIn('verification_status', ['pending', 'verified'])
      .preload('industry')
      .preload('location')
      .withCount('jobs', (j) => j.withScopes((s) => s.live()))
    if (q) query.whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [likeTerm(q.toLowerCase())])
    if (industry) query.whereHas('industry', (i) => i.where('slug', industry))
    // Pending companies only appear once they have a live (moderated) job.
    query.where((w) => w.where('verification_status', 'verified').orWhereHas('jobs', (j) => j.withScopes((s) => s.live())))
    query.orderBy('is_featured', 'desc').orderBy('verification_status', 'desc').orderBy('name')

    const list = await query.paginate(page, 24)
    const taxonomy = await Taxonomy.all()
    return inertia.render('public/companies/index', {
      filters: { q, industry, page },
      companies: {
        data: list.all().map((c) => ({
          ...companyBrief(c),
          industry: c.industry?.name ?? null,
          location: c.location?.name ?? null,
          openJobs: Number(c.$extras.jobs_count),
          isFeatured: c.isFeatured,
        })),
        meta: { total: list.total, page: list.currentPage, lastPage: list.lastPage },
      },
      industries: taxonomy.industries,
      meta: { title: 'Employers hiring in the Gulf', description: 'Browse companies hiring in the UAE, Saudi Arabia, Qatar, Kuwait, Oman and Bahrain. See verified employers and their open vacancies.' },
    })
  }

  async show(ctx: HttpContext) {
    const { inertia, params } = ctx
    const company = await Company.query()
      .where('slug', params.slug)
      .whereIn('verification_status', ['pending', 'verified'])
      .preload('industry')
      .preload('location')
      .first()
    if (!company) return notFoundPage(ctx)
    const jobs = await Job.query()
      .withScopes((s) => s.live())
      .where('company_id', company.id)
      .preload('company')
      .preload('location')
      .preload('category')
      .orderBy('published_at', 'desc')
    if (!company.isVerified && jobs.length === 0) return notFoundPage(ctx)
    return inertia.render('public/companies/show', {
      company: {
        ...companyBrief(company),
        description: company.description,
        website: company.website,
        size: company.size,
        industry: company.industry?.name ?? null,
        location: company.location?.name ?? null,
        verificationStatus: company.verificationStatus,
        memberSince: company.createdAt.toISODate(),
      },
      jobs: jobs.map(jobCard),
      meta: { title: `${company.name} jobs`, description: excerpt(company.description) || `Open jobs at ${company.name}.` },
    })
  }
}
