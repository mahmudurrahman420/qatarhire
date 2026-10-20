import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * When EMAIL_VERIFICATION_REQUIRED is not true, marks every active (non-suspended) user
 * whose email is still unverified as verified. Idempotent: only touches rows where
 * email_verified_at IS NULL, so running it on every start is safe. Run by the entrypoint.
 */
export default class UsersAutoVerify extends BaseCommand {
  static commandName = 'users:auto-verify'
  static description = 'Verify unverified active users when EMAIL_VERIFICATION_REQUIRED is off'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { emailVerificationRequired } = await import('#services/auth_settings')
    if (emailVerificationRequired()) {
      this.logger.info('EMAIL_VERIFICATION_REQUIRED=true: leaving unverified users unchanged')
      return
    }
    const { default: UserVerification } = await import('#services/user_verification')
    const count = await UserVerification.verifyPendingActiveUsers()
    this.logger.info(`auto-verified ${count} user(s)`)
  }
}
