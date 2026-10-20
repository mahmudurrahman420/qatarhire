import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class UserVerification {
  /** Verifies active users with no verification date. Returns how many rows changed. */
  static async verifyPendingActiveUsers() {
    const now = DateTime.utc().toSQL({ includeOffset: false })
    const result = await db.from('users').whereNull('email_verified_at').where('status', 'active').update({ email_verified_at: now, updated_at: now })
    return Array.isArray(result) ? Number(result[0] ?? 0) : Number(result ?? 0)
  }
}
