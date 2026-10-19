import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import Job from '#models/job'
import Location from '#models/location'
import { countryByCode } from '#shared/gulf'
import CandidateProfile from '#models/candidate_profile'
import Application from '#models/application'
import db from '@adonisjs/lucid/services/db'
import Taxonomy from '#services/taxonomy'
import JobSearchService, { parseJobFilters } from '#services/job_search_service'
import { jobCard, jobDetail, companyBrief } from '#services/presenters'
import { membershipFor } from '#services/company_context'
import { excerpt, notFoundPage } from '#services/http_helpers'

export default class JobsController {
  async index({ inertia, request, auth }: HttpContext) {
    const filters = parseJobFilters(request.qs())
    const results = await JobSearchService.search(filters)
    const savedIds = auth.user?.isCandidate
      ? (await db.from('saved_jobs').where('user_id', auth.user.id).select('job_id')).map((r) => r.job_id as number)
      : []
    const taxonomy = await Taxonomy.all()
    const place = filters.location ? await Location.findBy('slug', filters.location) : null
    const placeName = place ? place.displayName : 'the Gulf'
    return inertia.render('public/jobs/index', {
      placeName,
      filters,
      results: {
        data: results.all().map(jobCard),
        meta: { total: results.total, page: results.currentPage, lastPage: results.lastPage, perPage: results.perPage },
      },
      savedIds,
      taxonomy: { categories: taxonomy.categories, industries: taxonomy.industries, locations: taxonomy.locations },
      meta: {
        title: `${filters.q ? `${filters.q} jobs` : 'Jobs'} in ${placeName}`,
        description: `${results.total} open jobs in ${placeName}${filters.q ? ` matching "${filters.q}"` : ''}. Filter by country, city, salary, job type and experience.`,
        // filtered variations should not compete with the main listing in search engines
        noindex: results.currentPage > 1 || Object.keys(request.qs()).some((k) => !['q', 'page'].includes(k)),
      },
      canonical: `${env.get('APP_URL')}/jobs`,
    })
  }

  async show(ctx: HttpContext) {
    const { inertia, params, auth } = ctx
    const job = await Job.query()
      .where('slug', params.slug)
      .preload('company', (c) => c.preload('industry'))
      .preload('location')
      .preload('category')
      .preload('industry')
      .preload('skills')
      .first()
    if (!job) return notFoundPage(ctx)

    // Unpublished jobs are visible only to their own company (preview) and admins.
    const user = auth.user
    const membership = user ? await membershipFor(user) : null
    const isOwner = membership?.companyId === job.companyId
    const companyBlocked = ['rejected', 'suspended'].includes(job.company.verificationStatus)
    const publiclyVisible = ['published', 'closed', 'paused'].includes(job.status) && !companyBlocked
    if (!publiclyVisible && !isOwner && !user?.isAdmin) return notFoundPage(ctx)

    if (job.status === 'published' && !isOwner) {
      await Job.query().where('id', job.id).increment('views_count', 1)
    }

    let candidateState: { applied: boolean; status: string | null; saved: boolean } | null = null
    if (user?.isCandidate) {
      const profile = await CandidateProfile.findBy('user_id', user.id)
      const application = profile ? await Application.query().where('job_id', job.id).where('candidate_profile_id', profile.id).first() : null
      const saved = await db.from('saved_jobs').where({ user_id: user.id, job_id: job.id }).first()
      candidateState = { applied: Boolean(application), status: application?.status ?? null, saved: Boolean(saved) }
    }

    const related = await Job.query()
      .withScopes((s) => s.live())
      .whereNot('id', job.id)
      .where((q) => {
        if (job.categoryId) q.where('category_id', job.categoryId)
        else q.where('company_id', job.companyId)
      })
      .preload('company')
      .preload('location')
      .orderBy('published_at', 'desc')
      .limit(4)

    const company = job.company
    return inertia.render('public/jobs/show', {
      job: jobDetail(job),
      company: {
        ...companyBrief(company),
        description: company.description,
        website: company.website,
        size: company.size,
        industry: company.industry?.name ?? null,
        verificationStatus: company.verificationStatus,
      },
      related: related.map(jobCard),
      candidateState,
      isOwnerPreview: isOwner && job.status !== 'published',
      structuredData: job.isOpen ? jobPostingSchema(job) : null,
      canonical: `${env.get('APP_URL')}/jobs/${job.slug}`,
      meta: {
        title: `${job.title} at ${company.name}`,
        description: excerpt(`${job.location?.displayName ?? 'Gulf'}. ${job.description}`),
        noindex: !job.isOpen,
      },
    })
  }
}

/** schema.org JobPosting for search engines (only for open jobs). */
function jobPostingSchema(job: Job) {
  const appUrl = env.get('APP_URL')
  const typeMap: Record<string, string> = { full_time: 'FULL_TIME', part_time: 'PART_TIME', contract: 'CONTRACTOR', temporary: 'TEMPORARY', internship: 'INTERN' }
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    'title': job.title,
    'description': [job.description, job.responsibilities, job.requirements].filter(Boolean).join('\n\n'),
    'datePosted': job.publishedAt?.toISODate(),
    'employmentType': typeMap[job.employmentType],
    'hiringOrganization': {
      '@type': 'Organization',
      'name': job.company.name,
      ...(job.company.website ? { sameAs: job.company.website } : {}),
      ...(job.company.logoUrl ? { logo: `${appUrl}${job.company.logoUrl}` } : {}),
    },
    'jobLocation': {
      '@type': 'Place',
      'address': { '@type': 'PostalAddress', 'addressLocality': job.location?.name, 'addressCountry': (job.location?.countryCode ?? 'ae').toUpperCase() },
    },
    'identifier': { '@type': 'PropertyValue', 'name': job.company.name, 'value': String(job.id) },
    'directApply': job.applicationMethod === 'platform',
  }
  const country = countryByCode(job.location?.countryCode)
  if (job.deadline) schema.validThrough = `${job.deadline.toISODate()}T23:59:59${country?.offset ?? '+03:00'}`
  if (job.workArrangement === 'remote') {
    schema.jobLocationType = 'TELECOMMUTE'
    schema.applicantLocationRequirements = { '@type': 'Country', 'name': country?.fullName ?? 'United Arab Emirates' }
  }
  const salary = job.publicSalary
  if (salary) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      'currency': salary.currency,
      'value': { '@type': 'QuantitativeValue', 'minValue': salary.min ?? salary.max, 'maxValue': salary.max ?? salary.min, 'unitText': 'MONTH' },
    }
  }
  return schema
}
