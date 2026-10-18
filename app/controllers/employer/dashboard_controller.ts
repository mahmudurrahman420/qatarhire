import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Job from '#models/job'
import Application from '#models/application'
import SettingsService from '#services/settings_service'

export default class EmployerDashboardController {
  async index({ inertia, company }: HttpContext) {
    const jobCounts = await Job.query().where('company_id', company.id).groupBy('status').select('status').count('* as total')
    const appCounts = await Application.query()
      .whereHas('job', (j) => j.where('company_id', company.id))
      .groupBy('status')
      .select('status')
      .count('* as total')

    const since = DateTime.now().minus({ days: 29 }).startOf('day')
    const daily = await db
      .from('applications')
      .join('jobs', 'jobs.id', 'applications.job_id')
      .where('jobs.company_id', company.id)
      .where('applications.created_at', '>=', since.toSQL({ includeOffset: false })!)
      .select('applications.created_at')
    const perDay: Record<string, number> = {}
    for (let i = 0; i < 30; i++) perDay[since.plus({ days: i }).toISODate()!] = 0
    for (const row of daily) {
      const d = DateTime.fromJSDate(new Date(row.created_at)).toISODate()!
      if (d in perDay) perDay[d]++
    }

    const topJobs = await Job.query()
      .where('company_id', company.id)
      .whereIn('status', ['published', 'paused'])
      .withCount('applications', (a) => a.whereNot('status', 'withdrawn'))
      .orderBy('updated_at', 'desc')
      .limit(6)

    const recent = await Application.query()
      .whereHas('job', (j) => j.where('company_id', company.id))
      .preload('job')
      .preload('candidateProfile', (p) => p.preload('user'))
      .orderBy('created_at', 'desc')
      .limit(8)

    return inertia.render('employer/dashboard', {
      company: { name: company.name, verificationStatus: company.verificationStatus },
      moderation: await SettingsService.get('job_moderation'),
      jobCounts: Object.fromEntries(jobCounts.map((r) => [r.status, Number(r.$extras.total)])),
      applicationCounts: Object.fromEntries(appCounts.map((r) => [r.status, Number(r.$extras.total)])),
      applicationsPerDay: Object.entries(perDay).map(([date, count]) => ({ date, count })),
      topJobs: topJobs.map((j) => ({ id: j.id, title: j.title, status: j.status, views: j.viewsCount, applicants: Number(j.$extras.applications_count) })),
      recentApplications: recent.map((a) => ({
        id: a.id,
        status: a.status,
        createdAt: a.createdAt.toISO(),
        jobTitle: a.job.title,
        candidateName: a.candidateProfile.user.fullName,
        headline: a.candidateProfile.headline,
      })),
    })
  }

  async billing({ inertia }: HttpContext) {
    return inertia.render('employer/billing', { billingEnabled: await SettingsService.get('billing_enabled') })
  }
}
