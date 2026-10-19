import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import env from '#start/env'
import Mailer from '#services/mailer'
import { CareerTips } from '#services/career_tips'
import { notFoundPage } from '#services/http_helpers'

const interestValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    email: vine.string().trim().email().normalizeEmail(),
    topic: vine.string().trim().minLength(2).maxLength(200),
    website: vine.string().maxLength(0).optional(),
  })
)

export default class ContentController {
  async tips({ inertia }: HttpContext) {
    return inertia.render('public/content/tips', {
      tips: CareerTips.map(({ body, ...t }) => t),
      meta: { title: 'Career tips', description: 'Practical advice for finding work in the Gulf: CVs, interviews, salary packages and staying safe.' },
    })
  }

  async tip(ctx: HttpContext) {
    const tip = CareerTips.find((t) => t.slug === ctx.params.slug)
    if (!tip) return notFoundPage(ctx)
    return ctx.inertia.render('public/content/tip', {
      tip,
      more: CareerTips.filter((t) => t.slug !== tip.slug).map(({ body, ...t }) => t),
      meta: { title: tip.title, description: tip.summary },
    })
  }

  async courses({ inertia }: HttpContext) {
    return inertia.render('public/content/courses', { meta: { title: 'Courses & training' } })
  }

  /** Register interest in a course topic; delivered to the support inbox. */
  async courseInterest({ request, response, session }: HttpContext) {
    const data = await request.validateUsing(interestValidator)
    await Mailer.queue({
      to: env.get('SUPPORT_EMAIL', env.get('MAIL_FROM_ADDRESS')),
      subject: `[Courses] interest from ${data.name}`,
      template: 'contact',
      data: { fromName: data.name, fromEmail: data.email, topic: 'courses', message: `Interested in: ${data.topic}` },
    })
    session.flash('success', "Thanks — we'll email you when courses on this topic open.")
    return response.redirect().back()
  }

  async arabic({ inertia }: HttpContext) {
    return inertia.render('public/content/arabic', { meta: { title: 'العربية' } })
  }
}
