import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import Application from '#models/application'
import Report from '#models/report'
import QueuedJob from '#models/queued_job'

import db from '@adonisjs/lucid/services/db'

async function countBy(table: string, col: string) {
  const rows = await db.from(table).groupBy(col).select(col).count('* as total')
  return Object.fromEntries(rows.map((r) => [r[col], Number(r.total)]))
}

export default class AdminDashboardController {
  async index({ inertia }: HttpContext) {
    const weekAgo = DateTime.now().minus({ days: 7 }).toSQL({ includeOffset: false })!
    const [users, companies, jobs, applications] = await Promise.all([
      countBy('users', 'role'),
      countBy('companies', 'verification_status'),
      countBy('jobs', 'status'),
      countBy('applications', 'status'),
    ])
    const newUsers = await User.query().where('created_at', '>=', weekAgo).count('* as total')
    const newApps = await Application.query().where('created_at', '>=', weekAgo).count('* as total')
    const openReports = await Report.query().whereIn('status', ['open', 'reviewing']).count('* as total')
    const failedJobs = await QueuedJob.query().whereNotNull('failed_at').count('* as total')
    return inertia.render('admin/dashboard', {
      users,
      companies,
      jobs,
      applications,
      week: { newUsers: Number(newUsers[0].$extras.total), newApplications: Number(newApps[0].$extras.total) },
      openReports: Number(openReports[0].$extras.total),
      failedQueueJobs: Number(failedJobs[0].$extras.total),
    })
  }
}
