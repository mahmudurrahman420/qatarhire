import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

/**
 * Creates (or promotes) an administrator account.
 *   node ace admin:create --email=admin@example.com --name="Site Admin"
 * The password is prompted interactively (or read from ADMIN_PASSWORD for automation).
 */
export default class AdminCreate extends BaseCommand {
  static commandName = 'admin:create'
  static description = 'Create an administrator account'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Admin email address' })
  declare email: string

  @flags.string({ description: 'Full name' })
  declare name: string

  async run() {
    const { default: User } = await import('#models/user')
    const email = (this.email || (await this.prompt.ask('Admin email'))).trim().toLowerCase()
    const name = this.name || (await this.prompt.ask('Full name', { default: 'Administrator' }))
    const password = process.env.ADMIN_PASSWORD || (await this.prompt.secure('Password (min 10 characters)'))
    if (!password || password.length < 10) {
      this.logger.error('Password must be at least 10 characters')
      this.exitCode = 1
      return
    }
    const existing = await User.findBy('email', email)
    if (existing && existing.role !== 'admin') {
      this.logger.error(`${email} already exists as a ${existing.role}. Use a different email for the admin account.`)
      this.exitCode = 1
      return
    }
    const user = existing ?? new User()
    user.merge({ email, fullName: name, password, role: 'admin', status: 'active', emailVerifiedAt: DateTime.now() })
    await user.save()
    this.logger.success(`Administrator ${email} is ready`)
  }
}
