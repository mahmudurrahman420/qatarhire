import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/** Signs out suspended users on their next request. */
export default class AccountStatusMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (user && user.status !== 'active') {
      await ctx.auth.use('web').logout()
      ctx.session.flash('error', 'Your account has been suspended. Please contact support.')
      return ctx.response.redirect().toPath('/login')
    }
    return next()
  }
}
