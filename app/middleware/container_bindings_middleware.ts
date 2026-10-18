import { Logger } from '@adonisjs/core/logger'
import { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Binds HttpContext and the request-scoped logger to the container.
 *
 * Also strips cross-site Referer headers: `response.redirect().back()` in
 * AdonisJS 6 trusts the Referer, which allows open redirects (fixed upstream
 * in AdonisJS 7). With this guard, "back" can only return to this site.
 */
export default class ContainerBindingsMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    ctx.containerResolver.bindValue(HttpContext, ctx)
    ctx.containerResolver.bindValue(Logger, ctx.logger)

    const referrer = ctx.request.header('referer')
    if (referrer) {
      try {
        const ref = new URL(referrer)
        if (ref.host !== ctx.request.host()) {
          delete ctx.request.request.headers.referer
          delete ctx.request.request.headers.referrer
        }
      } catch {
        delete ctx.request.request.headers.referer
      }
    }
    return next()
  }
}
