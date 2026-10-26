import encryption from '@adonisjs/core/services/encryption'
import PlatformSetting from '#models/platform_setting'

/**
 * ZeptoMail (HTTPS email API) configuration. The token comes from env ZEPTOMAIL_TOKEN, else from
 * the platform_settings table (encrypted with APP_KEY), set at /admin/settings/email.
 * Stored in the existing platform_settings key/value table: no schema change.
 */
const KEYS = { token: 'zeptomail_token_enc', from: 'mail_from_address', name: 'mail_from_name' } as const

export type ZeptoConfig = { token: string; fromAddress: string; fromName: string; source: 'env' | 'database' }

async function read(key: string): Promise<string | null> {
  const row = await PlatformSetting.find(key)
  return typeof row?.value === 'string' && row.value ? row.value : null
}

export default class EmailSettings {
  static async fromAddress() {
    return (await read(KEYS.from)) || process.env.ZEPTOMAIL_FROM_ADDRESS?.trim() || 'noreply@hiremegulf.com'
  }

  static async fromName() {
    return (await read(KEYS.name)) || process.env.ZEPTOMAIL_FROM_NAME?.trim() || 'HireMeGulf'
  }

  static async token(): Promise<{ token: string; source: 'env' | 'database' } | null> {
    const fromEnv = process.env.ZEPTOMAIL_TOKEN?.trim()
    if (fromEnv) return { token: fromEnv, source: 'env' }
    const enc = await read(KEYS.token)
    if (!enc) return null
    const plain = encryption.decrypt<string>(enc)
    return plain ? { token: plain, source: 'database' } : null
  }

  /** Null when ZeptoMail isn't configured (mail then stays log-only). */
  static async zepto(): Promise<ZeptoConfig | null> {
    const t = await this.token()
    if (!t) return null
    return { ...t, fromAddress: await this.fromAddress(), fromName: await this.fromName() }
  }

  static async configured() {
    return (await this.token()) !== null
  }

  /** Safe summary for the admin page: never the token itself. */
  static async status() {
    const t = await this.token()
    return {
      configured: !!t,
      source: t?.source ?? null,
      last4: t ? t.token.slice(-4) : null,
      fromAddress: await this.fromAddress(),
      fromName: await this.fromName(),
    }
  }

  static async save(values: { token?: string | null; fromAddress?: string; fromName?: string }) {
    if (values.token) await PlatformSetting.updateOrCreate({ key: KEYS.token }, { key: KEYS.token, value: encryption.encrypt(values.token.trim()) })
    if (values.fromAddress) await PlatformSetting.updateOrCreate({ key: KEYS.from }, { key: KEYS.from, value: values.fromAddress.trim() })
    if (values.fromName) await PlatformSetting.updateOrCreate({ key: KEYS.name }, { key: KEYS.name, value: values.fromName.trim() })
  }

  static async clearToken() {
    await PlatformSetting.query().where('key', KEYS.token).delete()
  }
}
