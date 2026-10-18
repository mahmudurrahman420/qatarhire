import type { HttpContext } from '@adonisjs/core/http'

/** Renders the branded 404 page with a 404 status (for Inertia page routes). */
export function notFoundPage(ctx: HttpContext) {
  ctx.response.status(404)
  return ctx.inertia.render('errors/not_found', { meta: { title: 'Page not found', noindex: true } })
}

/** Plain-text excerpt for meta descriptions. */
export function excerpt(text: string | null | undefined, max = 155) {
  if (!text) return ''
  const t = text.replace(/\s+/g, ' ').replace(/^[-•*]\s*/, '').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}
