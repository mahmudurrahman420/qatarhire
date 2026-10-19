import string from '@adonisjs/core/helpers/string'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type User from '#models/user'
import Company from '#models/company'
import CompanyUser from '#models/company_user'
import CompanyVerification from '#models/company_verification'

export type CompanyInput = {
  companyName: string
  website?: string | null
  industryId?: number | null
  locationId?: number | null
  phone?: string | null
  crNumber?: string | null
}

/** Creates a pending company owned by `user`. Never auto-verified: an administrator must review it. */
export async function createCompanyFor(user: User, data: CompanyInput, contact: { name: string; email: string }, trx: TransactionClientContract) {
  let slug = string.slug(data.companyName, { lower: true, strict: true }).slice(0, 170) || 'company'
  for (let n = 2; await Company.query({ client: trx }).where('slug', slug).first(); n++) slug = `${slug.replace(/-\d+$/, '')}-${n}`
  const company = await Company.create(
    {
      name: data.companyName,
      slug,
      website: data.website ?? null,
      industryId: data.industryId ?? null,
      locationId: data.locationId ?? null,
      contactName: contact.name,
      contactEmail: contact.email,
      phone: data.phone ?? null,
      crNumber: data.crNumber ?? null,
      verificationStatus: 'pending',
    },
    { client: trx }
  )
  await CompanyUser.create({ companyId: company.id, userId: user.id, role: 'owner' }, { client: trx })
  await CompanyVerification.create({ companyId: company.id, fromStatus: null, toStatus: 'pending', note: 'Company registered' }, { client: trx })
  return company
}
