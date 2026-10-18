import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import CandidateAccessLog from '#models/candidate_access_log'

export default class AdminAuditController {
  async index({ inertia, request }: HttpContext) {
    const tab = request.input('tab') === 'access' ? 'access' : 'audit'
    const action = String(request.input('action', '')).slice(0, 80)
    const page = Math.max(1, Number(request.input('page', 1)) || 1)

    if (tab === 'access') {
      const list = await CandidateAccessLog.query().preload('company').orderBy('created_at', 'desc').paginate(page, 50)
      return inertia.render('admin/audit', {
        tab,
        filters: { action },
        rows: {
          data: list.all().map((l) => ({
            id: l.id,
            action: l.action,
            company: l.company?.name ?? null,
            candidateProfileId: l.candidateProfileId,
            userId: l.userId,
            ip: l.ip,
            createdAt: l.createdAt.toISO(),
          })),
          meta: { total: list.total, page: list.currentPage, lastPage: list.lastPage },
        },
      })
    }

    const query = AuditLog.query().preload('actor').orderBy('created_at', 'desc')
    if (action) query.where('action', 'like', `${action.replace(/[%_]/g, '')}%`)
    const list = await query.paginate(page, 50)
    return inertia.render('admin/audit', {
      tab,
      filters: { action },
      rows: {
        data: list.all().map((l) => ({
          id: l.id,
          action: l.action,
          actor: l.actor ? `${l.actor.fullName} <${l.actor.email}>` : null,
          subject: l.subjectType ? `${l.subjectType}#${l.subjectId}` : null,
          meta: l.meta,
          ip: l.ip,
          createdAt: l.createdAt.toISO(),
        })),
        meta: { total: list.total, page: list.currentPage, lastPage: list.lastPage },
      },
    })
  }
}
