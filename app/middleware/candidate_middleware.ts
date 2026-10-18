import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import CandidateProfile from '#models/candidate_profile'

/** Ensures the candidate has a profile row and exposes it as ctx.profile. */
export default class CandidateMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()
    ctx.profile = await CandidateProfile.firstOrCreate({ userId: user.id }, { userId: user.id, contactEmail: user.email })
    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    profile: CandidateProfile
  }
}
