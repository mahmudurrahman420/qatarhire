import { DateTime } from 'luxon'
import SettingsService from '#services/settings_service'
import Subscription from '#models/subscription'
import type Company from '#models/company'

export type Feature = 'candidate_search' | 'featured_jobs' | 'job_posting'

/**
 * Billing hook. While billing is disabled every feature is allowed.
 * When enabled, a company needs an active (provider-confirmed) subscription
 * whose plan grants the feature.
 */
export default class EntitlementService {
  static async allows(company: Company, feature: Feature) {
    if (!(await SettingsService.get('billing_enabled'))) return true
    const sub = await Subscription.query()
      .where('company_id', company.id)
      .where('status', 'active')
      .where((q) => q.whereNull('current_period_end').orWhere('current_period_end', '>', DateTime.now().toSQL({ includeOffset: false })!))
      .preload('plan')
      .first()
    return Boolean(sub?.plan?.entitlements?.[feature])
  }
}
