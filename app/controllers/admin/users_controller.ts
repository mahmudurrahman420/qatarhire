import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import AuditLogger from '#services/audit_logger'
import { likeTerm } from '#services/search_helpers'
import { Roles } from '#shared/enums'

export default class AdminUsersController {
  async index({ inertia, request }: HttpContext) {
    const q = String(request.input('q', '')).trim().slice(0, 100)
    const role = String(request.input('role', ''))
    const page = Math.max(1, Number(request.input('page', 1)) || 1)
    const query = User.query().preload('membership', (m) => m.preload('company')).orderBy('created_at', 'desc')
    if (q) {
      const like = likeTerm(q.toLowerCase())
      query.where((w) => w.whereRaw("LOWER(email) LIKE ? ESCAPE '!'", [like]).orWhereRaw("LOWER(full_name) LIKE ? ESCAPE '!'", [like]))
    }
    if ((Roles as readonly string[]).includes(role)) query.where('role', role)
    const list = await query.paginate(page, 30)
    return inertia.render('admin/users', {
      filters: { q, role },
      users: {
        data: list.all().map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          status: u.status,
          emailVerified: u.isVerified,
          company: u.membership?.company ? { id: u.membership.company.id, name: u.membership.company.name } : null,
          createdAt: u.createdAt.toISO(),
        })),
        meta: { total: list.total, page: list.currentPage, lastPage: list.lastPage },
      },
    })
  }

  async setStatus(ctx: HttpContext) {
    const { params, request, auth, response, session } = ctx
    const user = await User.findOrFail(params.id)
    const status = request.input('status') === 'suspended' ? 'suspended' : 'active'
    if (user.id === auth.getUserOrFail().id) {
      session.flash('error', 'You cannot change your own status.')
      return response.redirect().back()
    }
    user.status = status
    await user.save()
    // revoke server-side sessions when the database session store is used
    if (status === 'suspended') await db.from('sessions').where('user_id', String(user.id)).delete().catch(() => {})
    await AuditLogger.log(`admin.user_${status === 'suspended' ? 'suspended' : 'reactivated'}`, { ctx, subject: { type: 'user', id: user.id } })
    session.flash('success', `${user.email} is now ${status}.`)
    return response.redirect().back()
  }
}
