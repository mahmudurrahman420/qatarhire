import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Application from '#models/application'
import Job from '#models/job'
import SavedSearch from '#models/saved_search'
import { computeCompleteness } from '#services/profile_completeness'
import { jobCard } from '#services/presenters'

export default class DashboardController {
  async index({ inertia, profile, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await profile.load((l) => l.load('experiences').load('educations').load('skills').load('languages').load('cvs'))
    const { score, missing } = computeCompleteness(profile)

    const statusCounts = await Application.query()
      .where('candidate_profile_id', profile.id)
      .groupBy('status')
      .select('status')
      .count('* as total')
    const recent = await Application.query()
      .where('candidate_profile_id', profile.id)
      .preload('job', (j) => j.preload('company').preload('location'))
      .orderBy('updated_at', 'desc')
      .limit(5)

    // simple recommendations: live jobs in the candidate's industry or matching their skills
    const skillIds = profile.skills.map((s) => s.id)
    const recommended = await Job.query()
      .withScopes((s) => s.live())
      .where((q) => {
        if (profile.industryId) q.where('industry_id', profile.industryId)
        if (skillIds.length) q.orWhereHas('skills', (s) => s.whereIn('skills.id', skillIds))
        if (!profile.industryId && !skillIds.length) q.whereRaw('1 = 1')
      })
      .whereNotIn('id', db.from('applications').where('candidate_profile_id', profile.id).select('job_id'))
      .preload('company')
      .preload('location')
      .orderBy('published_at', 'desc')
      .limit(6)

    const savedCount = await db.from('saved_jobs').where('user_id', user.id).count('* as total')
    const alerts = await SavedSearch.query().where('user_id', user.id).where('kind', 'jobs').count('* as total')

    return inertia.render('candidate/dashboard', {
      completeness: { score, missing: missing.slice(0, 4) },
      visibility: profile.visibility,
      hasCv: profile.cvs.length > 0,
      counts: Object.fromEntries(statusCounts.map((r) => [r.status, Number(r.$extras.total)])),
      recentApplications: recent.map((a) => ({ id: a.id, status: a.status, updatedAt: a.updatedAt.toISO(), job: jobCard(a.job) })),
      recommended: recommended.map(jobCard),
      savedCount: Number(savedCount[0].total),
      alertCount: Number(alerts[0].$extras.total),
    })
  }
}
