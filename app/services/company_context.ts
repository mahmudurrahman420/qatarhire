import type User from '#models/user'
import CompanyUser from '#models/company_user'

/** Loads the employer user's company membership (cached on the user instance). */
export async function membershipFor(user: User) {
  if (!user.isEmployer) return null
  if (user.$preloaded.membership !== undefined) return user.membership
  const membership = await CompanyUser.query().where('user_id', user.id).preload('company').first()
  user.$setRelated('membership', membership as any)
  return membership
}
