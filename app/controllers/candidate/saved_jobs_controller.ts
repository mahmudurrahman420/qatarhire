import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import Job from '#models/job'
import SavedSearch from '#models/saved_search'
import { jobCard } from '#services/presenters'
import { parseJobFilters } from '#services/job_search_service'

const alertValidator = vine.compile(vine.object({ name: vine.string().trim().minLength(2).maxLength(100), query: vine.string().maxLength(1000) }))

export default class SavedJobsController {
  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const jobs = await Job.query()
      .whereIn('id', db.from('saved_jobs').where('user_id', user.id).select('job_id'))
      .preload('company')
      .preload('location')
      .orderBy('published_at', 'desc')
    const alerts = await SavedSearch.query().where('user_id', user.id).where('kind', 'jobs').orderBy('created_at', 'desc')
    return inertia.render('candidate/saved', { jobs: jobs.map(jobCard), alerts: alerts.map((a) => a.serialize()) })
  }

  /** Toggle save. Accepts any visible job; expired saved jobs show as closed. */
  async toggle({ params, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const job = await Job.query().where('slug', params.slug).firstOrFail()
    const existing = await db.from('saved_jobs').where({ user_id: user.id, job_id: job.id }).first()
    if (existing) await db.from('saved_jobs').where({ user_id: user.id, job_id: job.id }).delete()
    else await db.table('saved_jobs').insert({ user_id: user.id, job_id: job.id, created_at: DateTime.now().toSQL({ includeOffset: false }) })
    return response.redirect().back()
  }

  async storeAlert({ request, auth, response, session }: HttpContext) {
    const { name, query } = await request.validateUsing(alertValidator)
    const user = auth.getUserOrFail()
    const params = Object.fromEntries(new URLSearchParams(query))
    const { page, sort, ...filters } = parseJobFilters(params)
    void page
    void sort
    const count = await SavedSearch.query().where('user_id', user.id).where('kind', 'jobs').count('* as total')
    if (Number(count[0].$extras.total) >= 10) {
      session.flash('error', 'You can keep up to 10 job alerts.')
      return response.redirect().back()
    }
    await SavedSearch.create({ userId: user.id, kind: 'jobs', name, filters, alertsEnabled: true, lastAlertedAt: DateTime.now() })
    session.flash('success', 'Job alert created. We will email you when new matching jobs are posted.')
    return response.redirect().back()
  }

  async destroyAlert({ params, auth, response }: HttpContext) {
    await SavedSearch.query().where('id', params.id).where('user_id', auth.getUserOrFail().id).delete()
    return response.redirect().back()
  }
}
