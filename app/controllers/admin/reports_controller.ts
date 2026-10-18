import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import Report from '#models/report'
import Job from '#models/job'
import Company from '#models/company'
import AuditLogger from '#services/audit_logger'
import { ReportStatus } from '#shared/enums'

const resolveValidator = vine.compile(
  vine.object({ status: vine.enum(ReportStatus.values), resolutionNote: vine.string().trim().maxLength(2000).optional() })
)

export default class AdminReportsController {
  async index({ inertia, request }: HttpContext) {
    const status = String(request.input('status', 'open'))
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const query = Report.query().preload('reporter').orderBy('created_at', 'desc')
    if ((ReportStatus.values as readonly string[]).includes(status)) query.where('status', status)
    const list = await query.paginate(page, 30)

    const jobIds = list.all().filter((r) => r.subjectType === 'job').map((r) => r.subjectId)
    const companyIds = list.all().filter((r) => r.subjectType === 'company').map((r) => r.subjectId)
    const jobs = new Map((await Job.query().whereIn('id', jobIds.length ? jobIds : [0])).map((j) => [j.id, j]))
    const companies = new Map((await Company.query().whereIn('id', companyIds.length ? companyIds : [0])).map((c) => [c.id, c]))

    return inertia.render('admin/reports', {
      filters: { status },
      reports: {
        data: list.all().map((r) => ({
          ...r.serialize(),
          reporter: r.reporter ? { fullName: r.reporter.fullName, email: r.reporter.email } : r.reporterEmail ? { fullName: null, email: r.reporterEmail } : null,
          subject:
            r.subjectType === 'job'
              ? { label: jobs.get(r.subjectId)?.title ?? 'Deleted job', url: `/admin/jobs/${r.subjectId}` }
              : r.subjectType === 'company'
                ? { label: companies.get(r.subjectId)?.name ?? 'Deleted company', url: `/admin/companies/${r.subjectId}` }
                : { label: `Candidate #${r.subjectId}`, url: null },
        })),
        meta: { total: list.total, page: list.currentPage, lastPage: list.lastPage },
      },
    })
  }

  async update(ctx: HttpContext) {
    const { params, request, auth, response, session } = ctx
    const report = await Report.findOrFail(params.id)
    const data = await request.validateUsing(resolveValidator)
    report.status = data.status
    report.resolutionNote = data.resolutionNote ?? report.resolutionNote
    if (['resolved', 'dismissed'].includes(data.status)) report.resolvedBy = auth.getUserOrFail().id
    await report.save()
    await AuditLogger.log('admin.report_updated', { ctx, subject: { type: 'report', id: report.id }, meta: { status: data.status } })
    session.flash('success', 'Report updated.')
    return response.redirect().back()
  }
}
