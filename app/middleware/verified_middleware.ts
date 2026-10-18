import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/** Requires a verified email address before using account features. */
export default class VerifiedMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()
    if (!user.isVerified) {
      return ctx.response.redirect().toPath('/verify-email')
    }
    return next()
  }
}
