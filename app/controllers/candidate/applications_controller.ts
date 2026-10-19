import type { HttpContext } from '@adonisjs/core/http'
import Job from '#models/job'
import Application from '#models/application'
import CandidateCv from '#models/candidate_cv'
import ApplicationService, { ApplicationError } from '#services/application_service'
import { jobCard, cvBrief } from '#services/presenters'
import { applyValidator } from '#validators/candidate'
import { WithdrawableStatuses } from '#shared/enums'

export default class ApplicationsController {
  async index({ inertia, profile }: HttpContext) {
    const apps = await Application.query()
      .where('candidate_profile_id', profile.id)
      .preload('job', (j) => j.preload('company').preload('location'))
      .preload('history')
      .preload('cv')
      .orderBy('created_at', 'desc')
    return inertia.render('candidate/applications', {
      applications: apps.map((a) => ({
        id: a.id,
        status: a.status,
        createdAt: a.createdAt.toISO(),
        statusChangedAt: a.statusChangedAt?.toISO() ?? null,
        canWithdraw: WithdrawableStatuses.includes(a.status),
        job: jobCard(a.job),
        cv: a.cv ? { label: a.cv.label, originalName: a.cv.originalName } : null,
        // candidates see the status timeline but never private employer notes
        history: a.history.map((h) => ({ toStatus: h.toStatus, createdAt: h.createdAt.toISO() })),
      })),
    })
  }

  async create({ inertia, params, profile, response, session }: HttpContext) {
    const job = await Job.query().where('slug', params.slug).preload('company').preload('location').first()
    if (!job) return response.notFound()
    if (!job.isOpen || job.applicationMethod !== 'platform') {
      session.flash('error', 'This job is not accepting applications on HireMeGulf.')
      return response.redirect().toPath(`/jobs/${job.slug}`)
    }
    const existing = await Application.query().where('job_id', job.id).where('candidate_profile_id', profile.id).first()
    if (existing) {
      session.flash('error', 'You have already applied for this job.')
      return response.redirect().toPath('/candidate/applications')
    }
    const cvs = await CandidateCv.query().where('candidate_profile_id', profile.id).orderBy('is_primary', 'desc').orderBy('created_at', 'desc')
    return inertia.render('candidate/apply', {
      job: jobCard(job),
      cvs: cvs.filter((c) => c.isDownloadable).map(cvBrief),
      completeness: profile.completeness,
    })
  }

  async store({ request, params, profile, response, session }: HttpContext) {
    const job = await Job.query().where('slug', params.slug).preload('company').first()
    if (!job) return response.notFound()
    const data = await request.validateUsing(applyValidator)
    const cv = data.cvId ? await CandidateCv.query().where('id', data.cvId).where('candidate_profile_id', profile.id).first() : null
    if (data.cvId && !cv) {
      session.flashErrors({ cvId: 'Please choose one of your CVs.' })
      return response.redirect().back()
    }
    try {
      await ApplicationService.apply(job, profile, cv, data.coverLetter ?? null)
    } catch (e) {
      if (e instanceof ApplicationError) {
        session.flash('error', e.message)
        return response.redirect().toPath(`/jobs/${job.slug}`)
      }
      throw e
    }
    session.flash('success', `Application sent to ${job.company.name}. You can track it here.`)
    return response.redirect().toPath('/candidate/applications')
  }

  async withdraw({ params, profile, auth, response, session, bouncer }: HttpContext) {
    const application = await Application.query().where('id', params.id).where('candidate_profile_id', profile.id).first()
    if (!application) return response.notFound()
    await bouncer.with('ApplicationPolicy').authorize('own', application)
    try {
      await ApplicationService.withdraw(application, auth.getUserOrFail())
      session.flash('success', 'Application withdrawn.')
    } catch (e) {
      if (e instanceof ApplicationError) session.flash('error', e.message)
      else throw e
    }
    return response.redirect().back()
  }
}
