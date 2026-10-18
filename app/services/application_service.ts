import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Application from '#models/application'
import ApplicationStatusHistory from '#models/application_status_history'
import CompanyUser from '#models/company_user'
import type Job from '#models/job'
import type CandidateProfile from '#models/candidate_profile'
import type CandidateCv from '#models/candidate_cv'
import type User from '#models/user'
import NotificationService from '#services/notification_service'
import { ApplicationStatus, ApplicationTransitions, WithdrawableStatuses, type ApplicationStatusValue } from '#shared/enums'

export class ApplicationError extends Error {}

export default class ApplicationService {
  static async apply(job: Job, profile: CandidateProfile, cv: CandidateCv | null, coverLetter: string | null) {
    if (!job.isOpen) throw new ApplicationError('This job is no longer accepting applications.')
    if (job.applicationMethod !== 'platform') throw new ApplicationError('This employer accepts applications outside QatarHire.')

    const existing = await Application.query().where('job_id', job.id).where('candidate_profile_id', profile.id).first()
    if (existing) throw new ApplicationError('You have already applied for this job.')

    let application: Application
    try {
      application = await db.transaction(async (trx) => {
        const app = new Application()
        app.useTransaction(trx)
        app.fill({
          jobId: job.id,
          candidateProfileId: profile.id,
          candidateCvId: cv?.id ?? null,
          coverLetter,
          status: 'submitted',
          statusChangedAt: DateTime.now(),
        })
        await app.save()
        await ApplicationStatusHistory.create({ applicationId: app.id, fromStatus: null, toStatus: 'submitted', changedBy: profile.userId }, { client: trx })
        return app
      })
    } catch (error) {
      // unique (job_id, candidate_profile_id) guards against double submits/races
      if (String((error as Error).message).match(/unique|duplicate/i)) {
        throw new ApplicationError('You have already applied for this job.')
      }
      throw error
    }

    await profile.load('user')
    await NotificationService.notify(profile.user, {
      type: 'application_submitted',
      title: `Application sent: ${job.title}`,
      body: `Your application to ${job.company?.name ?? 'the employer'} was submitted.`,
      url: '/candidate/applications',
      email: { template: 'notification', subject: `Application received — ${job.title}`, pref: 'application_updates' },
    })
    const members = await CompanyUser.query().where('company_id', job.companyId)
    await NotificationService.notifyMany(
      members.map((m) => m.userId),
      {
        type: 'application_received',
        title: `New applicant for ${job.title}`,
        url: `/employer/jobs/${job.id}/applicants`,
        email: { template: 'notification', subject: `New applicant — ${job.title}`, pref: 'employer_activity' },
      }
    )
    return application
  }

  static async changeStatus(application: Application, to: ApplicationStatusValue, actor: User, note: string | null = null) {
    const from = application.status
    if (!ApplicationTransitions[from].includes(to)) {
      throw new ApplicationError(`Cannot move an application from "${ApplicationStatus.label(from)}" to "${ApplicationStatus.label(to)}".`)
    }
    await db.transaction(async (trx) => {
      application.useTransaction(trx)
      application.status = to
      application.statusChangedAt = DateTime.now()
      await application.save()
      await ApplicationStatusHistory.create({ applicationId: application.id, fromStatus: from, toStatus: to, changedBy: actor.id, note }, { client: trx })
    })

    await application.load('job')
    await application.load('candidateProfile')
    // Candidates are told about meaningful progress, not internal shuffles.
    if (['shortlisted', 'interview', 'offer', 'hired', 'rejected'].includes(to)) {
      await NotificationService.notify(application.candidateProfile.userId, {
        type: 'application_status_changed',
        title: `${application.job.title}: ${ApplicationStatus.label(to)}`,
        body: `Your application status changed to "${ApplicationStatus.label(to)}".`,
        url: '/candidate/applications',
        email: { template: 'notification', subject: `Update on your application — ${application.job.title}`, pref: 'application_updates' },
      })
    }
    return application
  }

  static async withdraw(application: Application, actor: User) {
    if (!WithdrawableStatuses.includes(application.status)) {
      throw new ApplicationError('This application can no longer be withdrawn.')
    }
    const from = application.status
    await db.transaction(async (trx) => {
      application.useTransaction(trx)
      application.status = 'withdrawn'
      application.statusChangedAt = DateTime.now()
      await application.save()
      await ApplicationStatusHistory.create({ applicationId: application.id, fromStatus: from, toStatus: 'withdrawn', changedBy: actor.id }, { client: trx })
    })
    await application.load('job')
    const members = await CompanyUser.query().where('company_id', application.job.companyId)
    await NotificationService.notifyMany(members.map((m) => m.userId), {
      type: 'application_withdrawn',
      title: `An applicant withdrew from ${application.job.title}`,
      url: `/employer/jobs/${application.jobId}/applicants`,
    })
  }
}
