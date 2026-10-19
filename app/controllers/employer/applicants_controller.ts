import type { HttpContext } from '@adonisjs/core/http'
import Job from '#models/job'
import Application from '#models/application'
import ApplicationNote from '#models/application_note'
import ApplicationService, { ApplicationError } from '#services/application_service'
import CandidateAccess from '#services/candidate_access'
import { candidateCard, candidateDetail } from '#services/presenters'
import { applicationStatusValidator, noteValidator } from '#validators/employer'
import { ApplicationStatus, ApplicationTransitions } from '#shared/enums'
import { likeTerm } from '#services/search_helpers'

export default class ApplicantsController {
  /** Applicants for one of the company's jobs, with status/keyword filters. */
  async index({ inertia, params, company, request }: HttpContext) {
    const job = await Job.query().where('id', Number(params.id) || 0).where('company_id', company.id).firstOrFail()
    const status = String(request.input('status', ''))
    const q = String(request.input('q', '')).trim().slice(0, 80)

    const query = Application.query()
      .where('job_id', job.id)
      .preload('candidateProfile', (p) =>
        p.preload('user').preload('skills').preload('industry').preload('educations').preload('cvs').preload('currentLocation', (l) => l.preload('parent')).preload('preferredLocation')
      )
      .orderBy('created_at', 'desc')
    if ((ApplicationStatus.values as readonly string[]).includes(status)) query.where('status', status)
    else query.whereNot('status', 'withdrawn')
    if (q) {
      const like = likeTerm(q.toLowerCase())
      query.whereHas('candidateProfile', (p) =>
        p
          .whereRaw("LOWER(COALESCE(headline, '')) LIKE ? ESCAPE '!'", [like])
          .orWhereRaw("LOWER(COALESCE(current_job_title, '')) LIKE ? ESCAPE '!'", [like])
          .orWhereHas('user', (u) => u.whereRaw("LOWER(full_name) LIKE ? ESCAPE '!'", [like]))
          .orWhereHas('skills', (s) => s.whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [like]))
      )
    }
    const apps = await query
    const counts = await Application.query().where('job_id', job.id).groupBy('status').select('status').count('* as total')

    return inertia.render('employer/applicants/index', {
      job: { id: job.id, title: job.title, slug: job.slug, status: job.status },
      filters: { status, q },
      counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.$extras.total)])),
      applications: apps.map((a) => ({
        id: a.id,
        status: a.status,
        createdAt: a.createdAt.toISO(),
        hasCv: a.candidateCvId !== null,
        // applicants consented to share their full name with this employer
        candidate: { ...candidateCard(a.candidateProfile), name: a.candidateProfile.user.fullName },
      })),
    })
  }

  async show(ctx: HttpContext) {
    const { inertia, params, company, auth, bouncer } = ctx
    const application = await Application.query()
      .where('id', Number(params.id) || 0)
      .whereHas('job', (j) => j.where('company_id', company.id))
      .preload('job')
      .preload('history')
      .preload('notes', (n) => n.preload('author'))
      .firstOrFail()
    await bouncer.with('ApplicationPolicy').authorize('manage', application)

    const profile = application.candidateProfile ?? (await application.related('candidateProfile').query().firstOrFail())
    await profile.load((l) =>
      l
        .load('user')
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
    const access = await CandidateAccess.evaluate(company, profile)
    if (access.canView) await CandidateAccess.logAccess(ctx, auth.getUserOrFail(), company, profile.id, 'profile_view')

    if (application.status === 'submitted') {
      await ApplicationService.changeStatus(application, 'under_review', auth.getUserOrFail(), 'Opened by recruiter')
    }

    return inertia.render('employer/applicants/show', {
      application: {
        id: application.id,
        status: application.status,
        coverLetter: application.coverLetter,
        createdAt: application.createdAt.toISO(),
        cvId: application.candidateCvId,
        allowedTransitions: ApplicationTransitions[application.status],
        history: application.history.map((h) => ({ fromStatus: h.fromStatus, toStatus: h.toStatus, note: h.note, createdAt: h.createdAt.toISO() })),
        notes: application.notes.map((n) => ({ id: n.id, body: n.body, author: n.author?.fullName ?? 'Former team member', createdAt: n.createdAt.toISO() })),
      },
      job: { id: application.job.id, title: application.job.title },
      candidate: access.canView ? await candidateDetail(profile, access, { forEmployer: true }) : null,
    })
  }

  async updateStatus(ctx: HttpContext) {
    const { request, params, company, auth, response, session, bouncer } = ctx
    const application = await Application.query()
      .where('id', Number(params.id) || 0)
      .whereHas('job', (j) => j.where('company_id', company.id))
      .preload('job')
      .firstOrFail()
    await bouncer.with('ApplicationPolicy').authorize('manage', application)
    const { status, note } = await request.validateUsing(applicationStatusValidator)
    try {
      await ApplicationService.changeStatus(application, status, auth.getUserOrFail(), note ?? null)
      session.flash('success', `Moved to "${ApplicationStatus.label(status)}".`)
    } catch (e) {
      if (e instanceof ApplicationError) session.flash('error', e.message)
      else throw e
    }
    return response.redirect().back()
  }

  async storeNote({ request, params, company, auth, response, bouncer }: HttpContext) {
    const application = await Application.query()
      .where('id', Number(params.id) || 0)
      .whereHas('job', (j) => j.where('company_id', company.id))
      .preload('job')
      .firstOrFail()
    await bouncer.with('ApplicationPolicy').authorize('manage', application)
    const { body } = await request.validateUsing(noteValidator)
    await ApplicationNote.create({ applicationId: application.id, authorId: auth.getUserOrFail().id, body })
    return response.redirect().back()
  }
}
