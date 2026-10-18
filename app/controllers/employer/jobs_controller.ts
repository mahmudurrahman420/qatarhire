import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Job from '#models/job'
import Skill from '#models/skill'
import Taxonomy from '#services/taxonomy'
import JobService, { InvalidTransition } from '#services/job_service'
import AuditLogger from '#services/audit_logger'
import SettingsService from '#services/settings_service'
import { jobValidator, jobStatusValidator } from '#validators/employer'
import { jobDetail } from '#services/presenters'
import { JobStatus } from '#shared/enums'

type JobInput = Awaited<ReturnType<typeof jobValidator.validate>>

const TRACKED_FIELDS = ['title', 'description', 'requirements', 'responsibilities', 'salaryMin', 'salaryMax', 'deadline', 'locationId', 'employmentType', 'applicationMethod'] as const

export default class EmployerJobsController {
  async index({ inertia, company, request }: HttpContext) {
    const status = String(request.input('status', ''))
    const query = Job.query()
      .where('company_id', company.id)
      .preload('location')
      .withCount('applications', (a) => a.whereNot('status', 'withdrawn'))
      .withCount('applications', (a) => a.where('status', 'submitted').as('new_count'))
      .orderBy('updated_at', 'desc')
    if ((JobStatus.values as readonly string[]).includes(status)) query.where('status', status)
    else query.whereNot('status', 'archived')
    const jobs = await query
    return inertia.render('employer/jobs/index', {
      status,
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        slug: j.slug,
        status: j.status,
        isExpired: j.isExpired,
        location: j.location?.name ?? null,
        deadline: j.deadline?.toISODate() ?? null,
        publishedAt: j.publishedAt?.toISO() ?? null,
        updatedAt: j.updatedAt.toISO(),
        applicants: Number(j.$extras.applications_count),
        newApplicants: Number(j.$extras.new_count),
        views: j.viewsCount,
        moderationNote: j.moderationNote,
      })),
    })
  }

  async create({ inertia, company }: HttpContext) {
    return inertia.render('employer/jobs/form', {
      job: null,
      taxonomy: await Taxonomy.all(),
      moderation: { willReview: await JobService.needsReview(company), companyStatus: company.verificationStatus },
      defaultDeadline: DateTime.now().plus({ days: await SettingsService.get('default_job_duration_days') }).toISODate(),
    })
  }

  async store(ctx: HttpContext) {
    const { request, company, auth, response, session } = ctx
    const data = await request.validateUsing(jobValidator)
    const user = auth.getUserOrFail()

    // guard against double submission of the same form
    const recent = await Job.query()
      .where('company_id', company.id)
      .where('title', data.title)
      .where('created_at', '>=', DateTime.now().minus({ minutes: 2 }).toSQL({ includeOffset: false })!)
      .first()
    if (recent) return response.redirect().toPath(`/employer/jobs/${recent.id}/edit`)

    // resolve lookups before opening the transaction so it holds a single connection
    const slug = await JobService.uniqueSlug(data.title, company)
    const skillIds = await Skill.resolveIds(data.skills ?? [])
    const job = await db.transaction(async (trx) => {
      const j = new Job()
      j.useTransaction(trx)
      j.fill({ ...this.attrs(data), companyId: company.id, createdBy: user.id, status: 'draft', slug })
      await j.save()
      await j.related('skills').sync(skillIds)
      return j
    })
    await AuditLogger.log('job.created', { ctx, subject: { type: 'job', id: job.id } })

    if (data.intent === 'publish') return this.applyTransition(ctx, job, 'published')
    session.flash('success', 'Draft saved.')
    return response.redirect().toPath(`/employer/jobs/${job.id}/edit`)
  }

  async edit({ inertia, params, company, bouncer }: HttpContext) {
    const job = await this.findOwned(params.id, company.id)
    await bouncer.with('JobPolicy').authorize('manage', job)
    await job.load('skills')
    return inertia.render('employer/jobs/form', {
      job: {
        ...job.serialize(),
        deadline: job.deadline?.toISODate() ?? null,
        skills: job.skills.map((s) => s.name),
      },
      taxonomy: await Taxonomy.all(),
      moderation: { willReview: await JobService.needsReview(company), companyStatus: company.verificationStatus },
      defaultDeadline: null,
    })
  }

  async update(ctx: HttpContext) {
    const { request, params, company, response, session, bouncer } = ctx
    const job = await this.findOwned(params.id, company.id)
    await bouncer.with('JobPolicy').authorize('manage', job)
    if (job.status === 'archived') {
      session.flash('error', 'Archived jobs cannot be edited. Duplicate it instead.')
      return response.redirect().back()
    }
    const data = await request.validateUsing(jobValidator)
    const attrs = this.attrs(data)
    const before = Object.fromEntries(TRACKED_FIELDS.map((f) => [f, String(job[f] instanceof DateTime ? (job[f] as DateTime).toISODate() : job[f])]))
    if (job.title !== data.title) job.slug = await JobService.uniqueSlug(data.title, company, job.id)
    job.merge(attrs)
    const changed = TRACKED_FIELDS.filter((f) => before[f] !== String(job[f] instanceof DateTime ? (job[f] as DateTime).toISODate() : job[f]))

    // edits to a live job go back through moderation when moderation applies
    if (job.status === 'published' && changed.length && (await JobService.needsReview(company))) {
      job.status = 'pending_review'
      session.flash('success', 'Changes saved and sent for review. The job is hidden until approved.')
    } else {
      session.flash('success', 'Job saved.')
    }
    await job.save()
    await job.related('skills').sync(await Skill.resolveIds(data.skills ?? []))
    await AuditLogger.log('job.updated', { ctx, subject: { type: 'job', id: job.id }, meta: { changed } })

    if (data.intent === 'publish' && ['draft', 'rejected', 'closed'].includes(job.status)) {
      return this.applyTransition(ctx, job, 'published')
    }
    return response.redirect().toPath(`/employer/jobs/${job.id}/edit`)
  }

  async preview({ inertia, params, company }: HttpContext) {
    const job = await this.findOwned(params.id, company.id)
    await job.load((l) => l.load('company').load('location').load('category').load('industry').load('skills'))
    return inertia.render('employer/jobs/preview', { job: jobDetail(job) })
  }

  async status(ctx: HttpContext) {
    const { request, params, company, bouncer } = ctx
    const job = await this.findOwned(params.id, company.id)
    await bouncer.with('JobPolicy').authorize('manage', job)
    const { status } = await request.validateUsing(jobStatusValidator)
    return this.applyTransition(ctx, job, status)
  }

  async duplicate(ctx: HttpContext) {
    const { params, company, auth, response, session } = ctx
    const source = await this.findOwned(params.id, company.id)
    await source.load('skills')
    const copy = await Job.create({
      companyId: company.id,
      createdBy: auth.getUserOrFail().id,
      title: source.title,
      slug: await JobService.uniqueSlug(source.title, company),
      categoryId: source.categoryId,
      industryId: source.industryId,
      locationId: source.locationId,
      description: source.description,
      responsibilities: source.responsibilities,
      requirements: source.requirements,
      minExperience: source.minExperience,
      educationLevel: source.educationLevel,
      employmentType: source.employmentType,
      workArrangement: source.workArrangement,
      salaryMin: source.salaryMin,
      salaryMax: source.salaryMax,
      salaryVisible: source.salaryVisible,
      vacancies: source.vacancies,
      deadline: null,
      applicationMethod: source.applicationMethod,
      applicationUrl: source.applicationUrl,
      applicationEmail: source.applicationEmail,
      status: 'draft',
    })
    await copy.related('skills').sync(source.skills.map((s) => s.id))
    await AuditLogger.log('job.duplicated', { ctx, subject: { type: 'job', id: copy.id }, meta: { from: source.id } })
    session.flash('success', 'Copy created as a draft. Set a deadline and publish when ready.')
    return response.redirect().toPath(`/employer/jobs/${copy.id}/edit`)
  }

  private async applyTransition(ctx: HttpContext, job: Job, to: Parameters<typeof JobService.transition>[1]) {
    const { company, auth, response, session } = ctx
    const from = job.status
    try {
      await JobService.transition(job, to, company, auth.getUserOrFail())
    } catch (e) {
      if (e instanceof InvalidTransition) {
        session.flash('error', e.message)
        return response.redirect().toPath(`/employer/jobs/${job.id}/edit`)
      }
      throw e
    }
    await AuditLogger.log('job.status_changed', { ctx, subject: { type: 'job', id: job.id }, meta: { from, to: job.status } })
    const messages: Record<string, string> = {
      pending_review: 'Submitted for review. We will notify you when it is approved.',
      published: 'Your job is live.',
      paused: 'Job paused — it is hidden and not accepting applications.',
      closed: 'Job closed to new applications.',
      archived: 'Job archived.',
      draft: 'Moved back to draft.',
    }
    session.flash('success', messages[job.status] ?? 'Job updated.')
    return response.redirect().toPath(job.status === 'archived' ? '/employer/jobs' : `/employer/jobs/${job.id}/edit`)
  }

  private attrs(data: JobInput) {
    return {
      title: data.title,
      categoryId: data.categoryId,
      industryId: data.industryId ?? null,
      locationId: data.locationId,
      description: data.description,
      responsibilities: data.responsibilities ?? null,
      requirements: data.requirements ?? null,
      minExperience: data.minExperience,
      educationLevel: data.educationLevel ?? null,
      employmentType: data.employmentType,
      workArrangement: data.workArrangement,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      salaryVisible: data.salaryVisible ?? true,
      vacancies: data.vacancies,
      deadline: data.deadline ? DateTime.fromJSDate(data.deadline) : null,
      applicationMethod: data.applicationMethod,
      applicationUrl: data.applicationMethod === 'external_url' ? (data.applicationUrl ?? null) : null,
      applicationEmail: data.applicationMethod === 'email' ? (data.applicationEmail ?? null) : null,
    }
  }

  /** Company-scoped lookup: another company's job id yields 404 (IDOR protection). */
  private async findOwned(id: unknown, companyId: number) {
    return Job.query().where('id', Number(id) || 0).where('company_id', companyId).firstOrFail()
  }
}
