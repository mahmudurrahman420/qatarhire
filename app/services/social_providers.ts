export const SOCIAL_PROVIDERS = ['google', 'linkedin', 'facebook'] as const
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]

const ENV_KEYS = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  facebook: ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
} as const

/** Read at request time (the env file is loaded into process.env at boot) so tests can toggle providers. */
function value(key: string) {
  return (process.env[key] ?? '').trim()
}

export function isSocialProviderEnabled(p: string): p is SocialProvider {
  if (!(SOCIAL_PROVIDERS as readonly string[]).includes(p)) return false
  const [id, secret] = ENV_KEYS[p as SocialProvider]
  return value(id) !== '' && value(secret) !== ''
}

export function enabledSocialProviders(): SocialProvider[] {
  return SOCIAL_PROVIDERS.filter((p) => isSocialProviderEnabled(p))
}
