import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'
import Job from '#models/job'
import Report from '#models/report'
import JobService from '#services/job_service'
import AuditLogger from '#services/audit_logger'
import { jobDetail } from '#services/presenters'
import { likeTerm } from '#services/search_helpers'
import { JobStatus } from '#shared/enums'

const moderateValidator = vine.compile(
  vine.object({
    decision: vine.enum(['approve', 'reject'] as const),
    note: vine.string().trim().maxLength(1000).optional().requiredWhen('decision', '=', 'reject'),
  })
)

export default class AdminJobsController {
  async index({ inertia, request }: HttpContext) {
    const status = String(request.input('status', 'pending_review'))
    const q = String(request.input('q', '')).trim().slice(0, 100)
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const query = Job.query().preload('company').withCount('applications').orderBy('updated_at', 'asc')
    if ((JobStatus.values as readonly string[]).includes(status)) query.where('status', status)
    if (q) query.whereRaw("LOWER(title) LIKE ? ESCAPE '!'", [likeTerm(q.toLowerCase())])
    const list = await query.paginate(page, 30)
    return inertia.render('admin/jobs/index', {
      filters: { status, q },
      jobs: {
        data: list.all().map((j) => ({
          id: j.id,
          title: j.title,
          slug: j.slug,
          status: j.status,
          isFeatured: j.isFeatured,
          isExpired: j.isExpired,
          company: { id: j.company.id, name: j.company.name, verificationStatus: j.company.verificationStatus },
          applicants: Number(j.$extras.applications_count),
          updatedAt: j.updatedAt.toISO(),
        })),
        meta: { total: list.total, page: list.currentPage, lastPage: list.lastPage },
      },
    })
  }

  async show({ inertia, params }: HttpContext) {
    const job = await Job.query()
      .where('id', params.id)
      .preload('company')
      .preload('location')
      .preload('category')
      .preload('industry')
      .preload('skills')
      .firstOrFail()
    const reports = await Report.query().where('subject_type', 'job').where('subject_id', job.id).orderBy('created_at', 'desc')
    return inertia.render('admin/jobs/show', {
      job: { ...jobDetail(job), moderationNote: job.moderationNote },
      company: { id: job.company.id, name: job.company.name, verificationStatus: job.company.verificationStatus },
      reports: reports.map((r) => r.serialize()),
    })
  }

  async moderate(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const job = await Job.findOrFail(params.id)
    const { decision, note } = await request.validateUsing(moderateValidator)
    if (job.status !== 'pending_review' && decision === 'approve') {
      session.flash('error', 'Only jobs pending review can be approved.')
      return response.redirect().back()
    }
    await JobService.moderate(job, decision, note ?? null)
    await AuditLogger.log(`admin.job_${decision}d`, { ctx, subject: { type: 'job', id: job.id }, meta: { note } })
    session.flash('success', decision === 'approve' ? 'Job approved and published.' : 'Job rejected; the employer has been notified.')
    return response.redirect().toPath('/admin/jobs')
  }

  /** Take down a live job (e.g. after a report). */
  async takedown(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const job = await Job.findOrFail(params.id)
    const note = String(request.input('note', '')).slice(0, 1000) || 'Removed by moderators'
    await JobService.moderate(job, 'reject', note)
    await AuditLogger.log('admin.job_taken_down', { ctx, subject: { type: 'job', id: job.id }, meta: { note } })
    session.flash('success', 'Job taken down.')
    return response.redirect().back()
  }

  async toggleFeatured(ctx: HttpContext) {
    const job = await Job.findOrFail(ctx.params.id)
    job.isFeatured = !job.isFeatured
    job.featuredUntil = job.isFeatured ? DateTime.now().plus({ days: 30 }) : null
    await job.save()
    await AuditLogger.log('admin.job_featured', { ctx, subject: { type: 'job', id: job.id }, meta: { featured: job.isFeatured } })
    return ctx.response.redirect().back()
  }
}
