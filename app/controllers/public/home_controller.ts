import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import Job from '#models/job'
import Company from '#models/company'
import Taxonomy from '#services/taxonomy'
import { jobCard, companyBrief } from '#services/presenters'
import { qatarToday } from '#services/dates'

export default class HomeController {
  async index({ inertia }: HttpContext) {
    const [latest, featuredCompanies, taxonomy] = await Promise.all([
      Job.query()
        .withScopes((s) => s.live())
        .preload('company')
        .preload('location')
        .preload('category')
        .orderBy('is_featured', 'desc')
        .orderBy('published_at', 'desc')
        .limit(8),
      Company.query()
        .where('verification_status', 'verified')
        .orderBy('is_featured', 'desc')
        .withCount('jobs', (q) => q.withScopes((s) => s.live()))
        .orderBy('name')
        .limit(8),
      Taxonomy.all(),
    ])

    // live job counts per category for the "browse by category" grid
    const counts = await db
      .from('jobs')
      .join('companies', 'companies.id', 'jobs.company_id')
      .where('jobs.status', 'published')
      .whereIn('companies.verification_status', ['pending', 'verified'])
      .where((q) => q.whereNull('jobs.deadline').orWhere('jobs.deadline', '>=', qatarToday()))
      .groupBy('jobs.category_id')
      .select('jobs.category_id')
      .count('* as total')
    const countByCategory = new Map(counts.map((r) => [r.category_id, Number(r.total)]))

    const popularTitles = await db
      .from('jobs')
      .where('status', 'published')
      .groupBy('title')
      .select('title')
      .count('* as total')
      .orderBy('total', 'desc')
      .limit(10)

    const totalLive = await Job.query().withScopes((s) => s.live()).count('* as total')

    return inertia.render('public/home', {
      latestJobs: latest.map(jobCard),
      featuredCompanies: featuredCompanies
        .filter((c) => c.isFeatured || Number(c.$extras.jobs_count) > 0)
        .map((c) => ({ ...companyBrief(c), openJobs: Number(c.$extras.jobs_count) })),
      categories: taxonomy.categories.map((c) => ({ ...c, jobs: countByCategory.get(c.id) ?? 0 })),
      industries: taxonomy.industries,
      locations: taxonomy.locations.map((l) => ({ name: l.name, slug: l.slug })),
      popularTitles: popularTitles.map((r) => r.title as string),
      stats: { liveJobs: Number(totalLive[0].$extras.total) },
      meta: { description: 'Find jobs in Qatar from reviewed employers. Search vacancies in Doha, Lusail, Al Rayyan and across Qatar with salaries in QAR, and let verified employers find your profile.' },
      canonical: env.get('APP_URL'),
    })
  }
}
