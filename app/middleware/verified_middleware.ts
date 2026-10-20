import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { DateTime } from 'luxon'
import { emailVerificationRequired } from '#services/auth_settings'

/** Requires a verified email address before using account features (only when EMAIL_VERIFICATION_REQUIRED=true). */
export default class VerifiedMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()
    if (!user.isVerified) {
      if (emailVerificationRequired()) return ctx.response.redirect().toPath('/verify-email')
      // gate is off: heal accounts created before the switch (the startup hook does this in bulk too)
      user.emailVerifiedAt = DateTime.now()
      await user.save()
    }
    return next()
  }
}
