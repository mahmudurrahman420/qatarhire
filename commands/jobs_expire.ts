import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

/**
 * Daily maintenance (schedule with cron, e.g. 02:00 Qatar time):
 *  - closes published jobs whose deadline has passed
 *  - reminds employers about jobs expiring in 3 days
 *  - unfeatures jobs whose featured period ended
 *  - prunes expired tokens and old rate-limit rows
 */
export default class JobsExpire extends BaseCommand {
  static commandName = 'jobs:expire'
  static description = 'Close expired jobs and send expiry reminders'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { default: Job } = await import('#models/job')
    const { default: CompanyUser } = await import('#models/company_user')
    const { default: UserToken } = await import('#models/user_token')
    const { default: NotificationService } = await import('#services/notification_service')
    const { qatarToday } = await import('#services/dates')
    await import('#start/queue')

    const today = qatarToday()
    const expired = await Job.query().where('status', 'published').whereNotNull('deadline').where('deadline', '<', today)
    for (const job of expired) {
      job.status = 'closed'
      job.closedAt = DateTime.now()
      await job.save()
    }

    const inThree = DateTime.fromISO(today).plus({ days: 3 }).toISODate()!
    const expiring = await Job.query().where('status', 'published').where('deadline', inThree)
    for (const job of expiring) {
      const members = await CompanyUser.query().where('company_id', job.companyId)
      await NotificationService.notifyMany(members.map((m) => m.userId), {
        type: 'job_expiring',
        title: `"${job.title}" closes in 3 days`,
        body: 'Extend the deadline if you still need applicants.',
        url: `/employer/jobs/${job.id}/edit`,
        email: { template: 'notification', subject: `Your job "${job.title}" closes in 3 days`, pref: 'employer_activity' },
      })
    }

    const unfeatured = await Job.query().where('is_featured', true).whereNotNull('featured_until').where('featured_until', '<', DateTime.now().toSQL({ includeOffset: false })!).update({ is_featured: false })
    const tokens = await UserToken.query().where('expires_at', '<', DateTime.now().minus({ days: 1 }).toSQL({ includeOffset: false })!).delete()

    this.logger.info(`closed ${expired.length} expired job(s); ${expiring.length} reminder(s); unfeatured ${Number(unfeatured)}; pruned ${Number(tokens)} token(s)`)
  }
}
