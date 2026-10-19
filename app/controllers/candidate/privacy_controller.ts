import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import CandidateAccessLog from '#models/candidate_access_log'
import CandidateCv from '#models/candidate_cv'
import Application from '#models/application'
import Notification from '#models/notification'
import SavedSearch from '#models/saved_search'
import UploadService from '#services/upload_service'
import AuditLogger from '#services/audit_logger'
import { privacyValidator, deleteAccountValidator } from '#validators/candidate'

export default class PrivacyController {
  async show({ inertia, profile }: HttpContext) {
    const logs = await CandidateAccessLog.query()
      .where('candidate_profile_id', profile.id)
      .preload('company')
      .orderBy('created_at', 'desc')
      .limit(50)
    return inertia.render('candidate/privacy', {
      settings: { visibility: profile.visibility, contactSharing: profile.contactSharing, cvSearchable: profile.cvSearchable },
      accessLog: logs.map((l) => ({
        id: l.id,
        action: l.action,
        company: l.company ? { id: l.company.id, name: l.company.name, slug: l.company.slug } : null,
        createdAt: l.createdAt.toISO(),
      })),
    })
  }

  async update(ctx: HttpContext) {
    const { request, profile, response, session } = ctx
    const data = await request.validateUsing(privacyValidator)
    const before = { visibility: profile.visibility, contactSharing: profile.contactSharing, cvSearchable: profile.cvSearchable }
    profile.merge(data)
    await profile.save()
    await AuditLogger.log('candidate.privacy_changed', { ctx, subject: { type: 'candidate_profile', id: profile.id }, meta: { before, after: data } })
    session.flash('success', 'Privacy settings saved. Changes apply immediately.')
    return response.redirect().back()
  }

  /** Machine-readable export of everything we hold about the candidate. */
  async export(ctx: HttpContext) {
    const { profile, auth, response } = ctx
    const user = auth.getUserOrFail()
    await profile.load((l) =>
      l.load('experiences').load('educations').load('certifications').load('skills').load('languages').load('cvs')
    )
    const applications = await Application.query().where('candidate_profile_id', profile.id).preload('job', (j) => j.preload('company')).preload('history')
    const accessLog = await CandidateAccessLog.query().where('candidate_profile_id', profile.id).preload('company')
    const savedJobs = await db.from('saved_jobs').where('user_id', user.id)
    const searches = await SavedSearch.query().where('user_id', user.id)
    const notifications = await Notification.query().where('user_id', user.id)

    const payload = {
      exportedAt: new Date().toISOString(),
      account: { fullName: user.fullName, email: user.email, createdAt: user.createdAt.toISO(), emailVerifiedAt: user.emailVerifiedAt?.toISO() },
      profile: { ...profile.serialize(), ...profile.privateFields },
      applications: applications.map((a) => ({
        job: a.job.title,
        company: a.job.company.name,
        status: a.status,
        coverLetter: a.coverLetter,
        appliedAt: a.createdAt.toISO(),
        history: a.history.map((h) => ({ from: h.fromStatus, to: h.toStatus, at: h.createdAt.toISO() })),
      })),
      profileAccessLog: accessLog.map((l) => ({ action: l.action, company: l.company?.name ?? null, at: l.createdAt.toISO() })),
      savedJobIds: savedJobs.map((s) => s.job_id),
      savedSearches: searches.map((s) => s.serialize()),
      notifications: notifications.map((n) => n.serialize()),
      note: 'CV files are not embedded; download them individually from your CV page.',
    }
    await AuditLogger.log('candidate.data_export', { ctx })
    response.header('Content-Type', 'application/json')
    response.header('Content-Disposition', `attachment; filename="hiremegulf-data-${user.id}.json"`)
    return JSON.stringify(payload, null, 2)
  }

  /** Permanently deletes the account, profile, applications and CV files. */
  async destroy(ctx: HttpContext) {
    const { request, profile, auth, response, session } = ctx
    const user = auth.getUserOrFail()
    const { password } = await request.validateUsing(deleteAccountValidator)
    if (!(await hash.verify(user.password, password))) {
      session.flashErrors({ password: 'Incorrect password.' })
      return response.redirect().back()
    }
    const cvs = await CandidateCv.query().where('candidate_profile_id', profile.id)
    const photoKey = profile.photoKey
    const userId = user.id
    await auth.use('web').logout()
    await user.delete() // cascades to profile, applications, CV rows, tokens, notifications
    for (const cv of cvs) await UploadService.deletePrivate(cv.storageKey)
    await UploadService.deletePublic(photoKey)
    await AuditLogger.log('account.deleted', { ctx, actorId: null, subject: { type: 'user', id: userId } })
    session.flash('success', 'Your account and data have been deleted.')
    return response.redirect().toPath('/')
  }
}
