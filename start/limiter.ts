/*
| Rate limiters for authentication and sensitive endpoints.
*/
import limiter from '@adonisjs/limiter/services/main'

const keyFor = (ctx: { auth?: { user?: { id: number } }; request: { ip(): string } }) =>
  ctx.auth?.user ? `user_${ctx.auth.user.id}` : `ip_${ctx.request.ip()}`

/** Login: 10 attempts / 15 min per IP, then 15 min block. */
export const loginThrottle = limiter.define('login', (ctx) =>
  limiter.allowRequests(10).every('15 minutes').blockFor('15 minutes').usingKey(`login_${ctx.request.ip()}`)
)

/** Social sign-in redirects + callbacks: 30 / 15 min per IP. */
export const socialAuthThrottle = limiter.define('social_auth', (ctx) =>
  limiter.allowRequests(30).every('15 minutes').usingKey(`social_${ctx.request.ip()}`)
)

/** Registration, password reset and verification emails. */
export const authEmailThrottle = limiter.define('auth_email', (ctx) =>
  limiter.allowRequests(5).every('15 minutes').usingKey(`authmail_${ctx.request.ip()}`)
)

/** Job applications: 30 per hour per user. */
export const applyThrottle = limiter.define('apply', (ctx) =>
  limiter.allowRequests(30).every('1 hour').usingKey(`apply_${keyFor(ctx)}`)
)

/** CV downloads: 120 per hour per user (anti-scraping). */
export const cvDownloadThrottle = limiter.define('cv_download', (ctx) =>
  limiter.allowRequests(120).every('1 hour').usingKey(`cv_${keyFor(ctx)}`)
)

/** Candidate search + profile views: 300 per hour per user (anti-scraping). */
export const candidateSearchThrottle = limiter.define('candidate_search', (ctx) =>
  limiter.allowRequests(300).every('1 hour').usingKey(`csearch_${keyFor(ctx)}`)
)

/** Public forms (reports, contact). */
export const publicFormThrottle = limiter.define('public_form', (ctx) =>
  limiter.allowRequests(10).every('1 hour').usingKey(`form_${keyFor(ctx)}`)
)
