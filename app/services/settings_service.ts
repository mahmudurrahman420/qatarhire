import PlatformSetting from '#models/platform_setting'

/** Platform-wide settings editable by administrators. */
export const SettingDefaults = {
  /** 'all': every new/edited job is reviewed; 'unverified_only': only jobs from unverified companies; 'none': publish immediately. */
  job_moderation: 'unverified_only' as 'all' | 'unverified_only' | 'none',
  /** Billing stays off until a payment provider is integrated and configured. */
  billing_enabled: false,
  employer_registration_open: true,
  max_cvs_per_candidate: 3,
  default_job_duration_days: 30,
  notify_candidate_on_cv_download: true,
  site_notice: '',
}
export type Settings = typeof SettingDefaults
export type SettingKey = keyof Settings

let cache: { at: number; values: Settings } | null = null
const TTL_MS = 30_000

export default class SettingsService {
  static async all(): Promise<Settings> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.values
    const rows = await PlatformSetting.all()
    const values = { ...SettingDefaults } as Record<string, unknown>
    for (const row of rows) {
      if (row.key in SettingDefaults) values[row.key] = row.value
    }
    cache = { at: Date.now(), values: values as Settings }
    return cache.values
  }

  static async get<K extends SettingKey>(key: K): Promise<Settings[K]> {
    return (await this.all())[key]
  }

  static async set(values: Partial<Settings>) {
    for (const [key, value] of Object.entries(values)) {
      if (!(key in SettingDefaults)) continue
      await PlatformSetting.updateOrCreate({ key }, { key, value })
    }
    cache = null
  }

  static clearCache() {
    cache = null
  }
}
