import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Report from '#models/report'
import Job from '#models/job'
import Company from '#models/company'
import { ReportReason } from '#shared/enums'

const reportValidator = vine.compile(
  vine.object({
    subjectType: vine.enum(['job', 'company']),
    subjectId: vine.number().positive(),
    reason: vine.enum(ReportReason.values),
    details: vine.string().trim().maxLength(2000).optional(),
    email: vine.string().trim().email().optional(),
  })
)

export default class ReportsController {
  async store({ request, auth, response, session }: HttpContext) {
    const data = await request.validateUsing(reportValidator)
    const exists = data.subjectType === 'job' ? await Job.find(data.subjectId) : await Company.find(data.subjectId)
    if (!exists) return response.notFound()
    if (!auth.user && !data.email) {
      session.flashErrors({ email: 'Please provide an email so we can follow up.' })
      return response.redirect().back()
    }
    await Report.create({
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      reporterId: auth.user?.id ?? null,
      reporterEmail: auth.user ? null : (data.email ?? null),
      reason: data.reason,
      details: data.details ?? null,
      status: 'open',
    })
    session.flash('success', 'Thank you. Our team will review this report.')
    return response.redirect().back()
  }
}
