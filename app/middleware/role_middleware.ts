import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Role } from '#shared/enums'

/**
 * Restricts a route group to the given roles. Enforced server-side;
 * hiding links in the UI is never relied upon.
 */
export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { roles: Role[] }) {
    const user = ctx.auth.getUserOrFail()
    if (!options.roles.includes(user.role)) {
      return ctx.response.forbidden(ctx.request.accepts(['html', 'json']) === 'json' ? { error: 'Forbidden' } : 'Forbidden')
    }
    return next()
  }
}
