import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import SettingsService from '#services/settings_service'
import AuditLogger from '#services/audit_logger'
import QueuedJob from '#models/queued_job'
import { DateTime } from 'luxon'

const settingsValidator = vine.compile(
  vine.object({
    job_moderation: vine.enum(['all', 'unverified_only', 'none'] as const),
    employer_registration_open: vine.boolean(),
    max_cvs_per_candidate: vine.number().min(1).max(10).withoutDecimals(),
    default_job_duration_days: vine.number().min(7).max(180).withoutDecimals(),
    notify_candidate_on_cv_download: vine.boolean(),
    site_notice: vine.string().trim().maxLength(300).optional(),
  })
)

export default class AdminSettingsController {
  async show({ inertia }: HttpContext) {
    const failed = await QueuedJob.query().whereNotNull('failed_at').orderBy('failed_at', 'desc').limit(20)
    const pending = await QueuedJob.query().whereNull('failed_at').count('* as total')
    return inertia.render('admin/settings', {
      settings: await SettingsService.all(),
      queue: {
        pending: Number(pending[0].$extras.total),
        failed: failed.map((j) => ({ id: j.id, name: j.name, attempts: j.attempts, failedAt: j.failedAt?.toISO(), error: j.lastError?.split('\n')[0] ?? null })),
      },
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, session } = ctx
    const data = await request.validateUsing(settingsValidator)
    const before = await SettingsService.all()
    await SettingsService.set({ ...data, site_notice: data.site_notice ?? '' })
    await AuditLogger.log('admin.settings_updated', { ctx, meta: { before, after: data } })
    session.flash('success', 'Settings saved.')
    return response.redirect().back()
  }

  /** Re-queue a permanently failed background job (e.g. after fixing SMTP). */
  async retryJob(ctx: HttpContext) {
    const job = await QueuedJob.findOrFail(ctx.params.id)
    job.merge({ failedAt: null, attempts: 0, reservedAt: null, availableAt: DateTime.now() })
    await job.save()
    await AuditLogger.log('admin.queue_retry', { ctx, subject: { type: 'queued_job', id: job.id } })
    return ctx.response.redirect().back()
  }
}
