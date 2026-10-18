import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'

type Subject = { type: string; id: number } | null

/**
 * Records security-relevant actions. Never put passwords, tokens or full
 * CV contents in `meta`; ids and status values only.
 */
export default class AuditLogger {
  static async log(
    action: string,
    opts: { ctx?: HttpContext | null; actorId?: number | null; subject?: Subject; meta?: Record<string, unknown> } = {}
  ) {
    const { ctx, subject, meta } = opts
    const actorId = opts.actorId !== undefined ? opts.actorId : (ctx?.auth?.user?.id ?? null)
    await AuditLog.create({
      action,
      actorId,
      subjectType: subject?.type ?? null,
      subjectId: subject?.id ?? null,
      meta: meta ?? null,
      ip: ctx?.request.ip() ?? null,
      userAgent: ctx?.request.header('user-agent')?.slice(0, 255) ?? null,
    })
  }
}
