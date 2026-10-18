import { DateTime } from 'luxon'
import string from '@adonisjs/core/helpers/string'
import Job from '#models/job'
import type Company from '#models/company'
import type User from '#models/user'
import SettingsService from '#services/settings_service'
import NotificationService from '#services/notification_service'
import CompanyUser from '#models/company_user'
import type { JobStatusValue } from '#shared/enums'

export class InvalidTransition extends Error {}

/** Employer-initiated transitions. Admin moderation uses `moderate`. */
const EMPLOYER_TRANSITIONS: Partial<Record<JobStatusValue, JobStatusValue[]>> = {
  draft: ['published', 'archived'],
  rejected: ['published', 'archived'],
  pending_review: ['draft'],
  published: ['paused', 'closed'],
  paused: ['published', 'closed'],
  closed: ['published', 'archived'],
  archived: [],
}

export default class JobService {
  static async uniqueSlug(title: string, company: Company, ignoreId?: number) {
    const base = string.slug(`${title} ${company.name}`, { lower: true, strict: true }).slice(0, 190) || 'job'
    let slug = base
    let n = 2
    while (await Job.query().where('slug', slug).if(ignoreId, (q) => q.whereNot('id', ignoreId!)).first()) {
      slug = `${base}-${n++}`
    }
    return slug
  }

  /** Whether a job from this company must be reviewed before going live. */
  static async needsReview(company: Company) {
    const mode = await SettingsService.get('job_moderation')
    if (mode === 'all') return true
    if (mode === 'none') return false
    return !company.isVerified
  }

  static employerCan(from: JobStatusValue, to: JobStatusValue) {
    return EMPLOYER_TRANSITIONS[from]?.includes(to) ?? false
  }

  /**
   * Employer requests a status change. "published" becomes "pending_review"
   * when moderation applies. Re-opening an expired job requires a new deadline.
   */
  static async transition(job: Job, to: JobStatusValue, company: Company, actor: User) {
    if (company.verificationStatus === 'suspended' || company.verificationStatus === 'rejected') {
      throw new InvalidTransition('Your company account cannot publish jobs. Please contact support.')
    }
    if (!this.employerCan(job.status, to)) {
      throw new InvalidTransition(`A ${job.status.replace('_', ' ')} job cannot be moved to ${to.replace('_', ' ')}.`)
    }
    if (to === 'published') {
      if (job.isExpired) throw new InvalidTransition('The application deadline has passed. Set a new deadline before publishing.')
      // paused → published does not need re-review; anything else may
      if (job.status !== 'paused' && (await this.needsReview(company))) {
        job.status = 'pending_review'
        job.moderationNote = null
        await job.save()
        return job
      }
      job.status = 'published'
      job.publishedAt = job.publishedAt ?? DateTime.now()
      job.closedAt = null
      await job.save()
      await NotificationService.notify(actor, {
        type: 'job_published',
        title: `Your job "${job.title}" is live`,
        url: `/jobs/${job.slug}`,
        email: { template: 'notification', subject: `Your job "${job.title}" is live`, pref: 'employer_activity' },
      })
      return job
    }
    job.status = to
    if (to === 'closed') job.closedAt = DateTime.now()
    await job.save()
    return job
  }

  /** Admin decision on a pending job. */
  static async moderate(job: Job, decision: 'approve' | 'reject', note: string | null) {
    if (decision === 'approve') {
      job.status = 'published'
      job.publishedAt = job.publishedAt ?? DateTime.now()
      job.moderationNote = null
    } else {
      job.status = 'rejected'
      job.moderationNote = note
    }
    await job.save()
    const members = await CompanyUser.query().where('company_id', job.companyId)
    await NotificationService.notifyMany(
      members.map((m) => m.userId),
      decision === 'approve'
        ? {
            type: 'job_published',
            title: `Your job "${job.title}" was approved and is live`,
            url: `/jobs/${job.slug}`,
            email: { template: 'notification', subject: `Job approved: ${job.title}`, pref: 'employer_activity' },
          }
        : {
            type: 'job_rejected',
            title: `Your job "${job.title}" needs changes`,
            body: note ?? undefined,
            url: `/employer/jobs/${job.id}/edit`,
            email: { template: 'notification', subject: `Job needs changes: ${job.title}`, pref: 'employer_activity' },
          }
    )
  }
}
