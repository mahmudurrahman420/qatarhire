import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import env from '#start/env'
import Mailer from '#services/mailer'

const PAGES = ['about', 'faq', 'terms', 'privacy', 'cookies', 'safety', 'employers', 'accessibility', 'help'] as const
const TITLES: Record<string, string> = { about: 'About us', faq: 'Questions and answers', terms: 'Terms of service', privacy: 'Privacy policy', cookies: 'Cookies', safety: 'Job seeker and employer safety', employers: 'Hire in the Gulf', accessibility: 'Accessibility', help: 'Help Centre' }

const contactValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    email: vine.string().trim().email().normalizeEmail(),
    topic: vine.enum(['general', 'employer', 'candidate', 'privacy', 'report']),
    message: vine.string().trim().minLength(10).maxLength(4000),
    // honeypot: must stay empty
    website: vine.string().maxLength(0).optional(),
  })
)

export default class PagesController {
  async show({ inertia, params, response }: HttpContext) {
    const page = String(params.page)
    if (!(PAGES as readonly string[]).includes(page)) return response.notFound()
    return inertia.render(`public/pages/${page === 'help' ? 'faq' : page}`, { supportEmail: env.get('SUPPORT_EMAIL', env.get('MAIL_FROM_ADDRESS')), meta: { title: TITLES[page] } })
  }

  async contact({ inertia }: HttpContext) {
    return inertia.render('public/pages/contact', { supportEmail: env.get('SUPPORT_EMAIL', env.get('MAIL_FROM_ADDRESS')), meta: { title: 'Contact us' } })
  }

  async sendContact({ request, response, session }: HttpContext) {
    const data = await request.validateUsing(contactValidator)
    await Mailer.queue({
      to: env.get('SUPPORT_EMAIL', env.get('MAIL_FROM_ADDRESS')),
      subject: `[Contact:${data.topic}] message from ${data.name}`,
      template: 'contact',
      data: { fromName: data.name, fromEmail: data.email, topic: data.topic, message: data.message },
    })
    session.flash('success', 'Thanks — your message has been sent. We usually reply within two working days.')
    return response.redirect().back()
  }
}
