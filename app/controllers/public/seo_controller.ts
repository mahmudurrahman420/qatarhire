import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import Job from '#models/job'
import Company from '#models/company'

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)
}

export default class SeoController {
  async robots({ response }: HttpContext) {
    const base = env.get('APP_URL')
    response.header('Content-Type', 'text/plain')
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /candidate',
      'Disallow: /employer',
      'Disallow: /admin',
      'Disallow: /files',
      'Disallow: /account',
      'Disallow: /notifications',
      `Sitemap: ${base}/sitemap.xml`,
      '',
    ].join('\n')
  }

  /** Only live jobs are listed; expired jobs drop out automatically. */
  async sitemap({ response }: HttpContext) {
    const base = env.get('APP_URL')
    const jobs = await Job.query().withScopes((s) => s.live()).select('slug', 'updated_at').orderBy('published_at', 'desc').limit(45000)
    const companies = await Company.query().where('verification_status', 'verified').select('slug', 'updated_at').limit(5000)
    const staticPaths = ['/', '/jobs', '/companies', '/about', '/faq', '/contact', '/safety', '/employers', '/terms', '/privacy']
    const urls = [
      ...staticPaths.map((p) => `<url><loc>${base}${p}</loc></url>`),
      ...jobs.map((j) => `<url><loc>${xmlEscape(`${base}/jobs/${j.slug}`)}</loc><lastmod>${j.updatedAt.toISODate()}</lastmod></url>`),
      ...companies.map((c) => `<url><loc>${xmlEscape(`${base}/companies/${c.slug}`)}</loc><lastmod>${c.updatedAt.toISODate()}</lastmod></url>`),
    ]
    response.header('Content-Type', 'application/xml')
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`
  }
}
