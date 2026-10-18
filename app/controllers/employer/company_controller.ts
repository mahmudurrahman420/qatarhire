import type { HttpContext } from '@adonisjs/core/http'
import Taxonomy from '#services/taxonomy'
import UploadService, { UploadRejected } from '#services/upload_service'
import AuditLogger from '#services/audit_logger'
import CompanyVerification from '#models/company_verification'
import { companyValidator, logoValidator } from '#validators/employer'

export default class CompanyController {
  async edit({ inertia, company }: HttpContext) {
    await company.load('verifications', (q) => q.limit(5))
    const taxonomy = await Taxonomy.all()
    return inertia.render('employer/company', {
      company: {
        ...company.serialize(),
        contactName: company.contactName,
        contactEmail: company.contactEmail,
        phone: company.phone,
        crNumber: company.crNumber,
      },
      verificationHistory: company.verifications.map((v) => ({ toStatus: v.toStatus, note: v.note, createdAt: v.createdAt.toISO() })),
      industries: taxonomy.industries,
      locations: taxonomy.locations,
    })
  }

  async update(ctx: HttpContext) {
    const { request, company, response, session } = ctx
    const data = await request.validateUsing(companyValidator)
    const nameChanged = data.name !== company.name || (data.crNumber ?? null) !== company.crNumber
    company.merge({
      name: data.name,
      website: data.website ?? null,
      industryId: data.industryId ?? null,
      locationId: data.locationId ?? null,
      description: data.description ?? null,
      address: data.address ?? null,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      phone: data.phone ?? null,
      size: data.size ?? null,
      crNumber: data.crNumber ?? null,
    })
    // Changing legal identity of a rejected company re-enters the review queue.
    if (nameChanged && company.verificationStatus === 'rejected') {
      await CompanyVerification.create({ companyId: company.id, fromStatus: 'rejected', toStatus: 'pending', note: 'Resubmitted with updated details' })
      company.verificationStatus = 'pending'
    }
    await company.save()
    await AuditLogger.log('company.updated', { ctx, subject: { type: 'company', id: company.id } })
    session.flash('success', 'Company profile saved.')
    return response.redirect().back()
  }

  async uploadLogo({ request, company, response, session }: HttpContext) {
    const { logo } = await request.validateUsing(logoValidator)
    try {
      const key = await UploadService.storeImage(logo, 'logos')
      await UploadService.deletePublic(company.logoKey)
      company.logoKey = key
      await company.save()
      session.flash('success', 'Logo updated.')
    } catch (e) {
      if (e instanceof UploadRejected) session.flashErrors({ logo: e.message })
      else throw e
    }
    return response.redirect().back()
  }
}
