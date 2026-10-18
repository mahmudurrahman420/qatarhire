import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

/**
 * Sends job alerts for candidates' saved searches (schedule hourly or daily).
 * Each alert only includes jobs published since it last ran.
 */
export default class AlertsSend extends BaseCommand {
  static commandName = 'alerts:send'
  static description = 'Email candidates new jobs matching their saved searches'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { default: SavedSearch } = await import('#models/saved_search')
    const { default: User } = await import('#models/user')
    const { default: JobSearchService, parseJobFilters } = await import('#services/job_search_service')
    const { default: NotificationService } = await import('#services/notification_service')
    await import('#start/queue')

    const alerts = await SavedSearch.query().where('kind', 'jobs').where('alerts_enabled', true)
    let sent = 0
    for (const alert of alerts) {
      const user = await User.find(alert.userId)
      if (!user || user.status !== 'active' || !user.isVerified) continue
      const since = alert.lastAlertedAt ?? alert.createdAt
      const filters = parseJobFilters({ ...(alert.filters as Record<string, unknown>), sort: 'newest' })
      const results = await JobSearchService.search(filters, 50)
      const fresh = results.all().filter((j) => j.publishedAt && j.publishedAt > since)
      alert.lastAlertedAt = DateTime.now()
      await alert.save()
      if (!fresh.length) continue
      const pairs: [string, string][] = Object.entries(alert.filters).flatMap(([k, v]): [string, string][] => (Array.isArray(v) ? v.map((x): [string, string] => [k, String(x)]) : v ? [[k, String(v)]] : []))
      const qs = new URLSearchParams(pairs)
      await NotificationService.notify(user, {
        type: 'job_alert',
        title: `${fresh.length} new job${fresh.length > 1 ? 's' : ''} for "${alert.name}"`,
        body: fresh.slice(0, 5).map((j) => `${j.title} — ${j.company.name}`).join('\n'),
        url: `/jobs?${qs.toString()}`,
        email: { template: 'job_alert', subject: `New jobs for "${alert.name}"`, pref: 'job_alerts', data: { jobs: fresh.slice(0, 10).map((j) => ({ title: j.title, company: j.company.name, slug: j.slug })) } },
      })
      sent++
    }
    this.logger.info(`sent ${sent} alert(s) from ${alerts.length} saved search(es)`)
  }
}
