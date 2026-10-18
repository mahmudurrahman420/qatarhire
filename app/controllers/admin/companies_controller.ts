import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'
import Company from '#models/company'
import CompanyUser from '#models/company_user'
import CompanyVerification from '#models/company_verification'
import Report from '#models/report'
import AuditLogger from '#services/audit_logger'
import NotificationService from '#services/notification_service'
import { likeTerm } from '#services/search_helpers'
import { VerificationStatus } from '#shared/enums'

const decisionValidator = vine.compile(
  vine.object({
    status: vine.enum(['verified', 'rejected', 'suspended', 'pending'] as const),
    note: vine.string().trim().maxLength(1000).optional().requiredWhen('status', 'in', ['rejected', 'suspended']),
  })
)

export default class AdminCompaniesController {
  async index({ inertia, request }: HttpContext) {
    const status = String(request.input('status', 'pending'))
    const q = String(request.input('q', '')).trim().slice(0, 100)
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const query = Company.query().preload('industry').withCount('jobs').orderBy('created_at', 'asc')
    if ((VerificationStatus.values as readonly string[]).includes(status)) query.where('verification_status', status)
    if (q) query.whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [likeTerm(q.toLowerCase())])
    const list = await query.paginate(page, 30)
    return inertia.render('admin/companies/index', {
      filters: { status, q },
      companies: {
        data: list.all().map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          industry: c.industry?.name ?? null,
          verificationStatus: c.verificationStatus,
          isFeatured: c.isFeatured,
          jobs: Number(c.$extras.jobs_count),
          createdAt: c.createdAt.toISO(),
        })),
        meta: { total: list.total, page: list.currentPage, lastPage: list.lastPage },
      },
    })
  }

  async show({ inertia, params }: HttpContext) {
    const company = await Company.query()
      .where('id', params.id)
      .preload('industry')
      .preload('location')
      .preload('members', (m) => m.preload('user'))
      .preload('verifications', (v) => v.preload('reviewer'))
      .firstOrFail()
    const reports = await Report.query().where('subject_type', 'company').where('subject_id', company.id).orderBy('created_at', 'desc')
    return inertia.render('admin/companies/show', {
      company: {
        ...company.serialize(),
        contactName: company.contactName,
        contactEmail: company.contactEmail,
        phone: company.phone,
        crNumber: company.crNumber,
        industry: company.industry?.name ?? null,
        location: company.location?.name ?? null,
      },
      members: company.members.map((m) => ({ id: m.user.id, fullName: m.user.fullName, email: m.user.email, role: m.role, emailVerified: m.user.isVerified })),
      history: company.verifications.map((v) => ({
        fromStatus: v.fromStatus,
        toStatus: v.toStatus,
        note: v.note,
        reviewer: v.reviewer?.fullName ?? null,
        createdAt: v.createdAt.toISO(),
      })),
      reports: reports.map((r) => r.serialize()),
    })
  }

  /** Verification decisions are always explicit administrator actions. */
  async decide(ctx: HttpContext) {
    const { params, request, auth, response, session } = ctx
    const company = await Company.findOrFail(params.id)
    const { status, note } = await request.validateUsing(decisionValidator)
    const from = company.verificationStatus
    if (from === status) {
      session.flash('error', 'Company already has that status.')
      return response.redirect().back()
    }
    company.verificationStatus = status
    company.verifiedAt = status === 'verified' ? DateTime.now() : company.verifiedAt
    await company.save()
    await CompanyVerification.create({ companyId: company.id, fromStatus: from, toStatus: status, reviewedBy: auth.getUserOrFail().id, note: note ?? null })
    await AuditLogger.log('admin.company_verification', { ctx, subject: { type: 'company', id: company.id }, meta: { from, to: status } })

    const members = await CompanyUser.query().where('company_id', company.id)
    const titles: Record<string, string> = {
      verified: `${company.name} is now verified`,
      rejected: `Verification for ${company.name} was not approved`,
      suspended: `${company.name} has been suspended`,
      pending: `${company.name} is back under review`,
    }
    await NotificationService.notifyMany(members.map((m) => m.userId), {
      type: 'company_verification',
      title: titles[status],
      body: note ?? (status === 'verified' ? 'You can now search candidates and your jobs publish without review (unless all jobs are moderated).' : undefined),
      url: '/employer/company',
      email: { template: 'notification', subject: titles[status] },
    })
    session.flash('success', `Company marked as ${status}.`)
    return response.redirect().back()
  }

  async toggleFeatured(ctx: HttpContext) {
    const company = await Company.findOrFail(ctx.params.id)
    company.isFeatured = !company.isFeatured
    await company.save()
    await AuditLogger.log('admin.company_featured', { ctx, subject: { type: 'company', id: company.id }, meta: { featured: company.isFeatured } })
    return ctx.response.redirect().back()
  }
}
