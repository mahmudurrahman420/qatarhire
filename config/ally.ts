import env from '#start/env'
import { defineConfig, services } from '@adonisjs/ally'

/**
 * Social sign-in. Every provider is configured lazily, but only the ones whose
 * client id AND secret are present in the environment are offered to users
 * (see #services/social_providers). Callback URLs follow
 * `${APP_URL}/auth/<provider>/callback`.
 */
const base = env.get('APP_URL').replace(/\/+$/, '')
const callback = (p: string) => `${base}/auth/${p}/callback`

const allyConfig = defineConfig({
  google: services.google({
    clientId: env.get('GOOGLE_CLIENT_ID') ?? '',
    clientSecret: env.get('GOOGLE_CLIENT_SECRET') ?? '',
    callbackUrl: callback('google'),
    scopes: ['openid', 'userinfo.email', 'userinfo.profile'],
    prompt: 'select_account',
  }),
  linkedin: services.linkedinOpenidConnect({
    clientId: env.get('LINKEDIN_CLIENT_ID') ?? '',
    clientSecret: env.get('LINKEDIN_CLIENT_SECRET') ?? '',
    callbackUrl: callback('linkedin'),
    scopes: ['openid', 'profile', 'email'],
  }),
  facebook: services.facebook({
    clientId: env.get('FACEBOOK_CLIENT_ID') ?? '',
    clientSecret: env.get('FACEBOOK_CLIENT_SECRET') ?? '',
    callbackUrl: callback('facebook'),
    authorizeUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    accessTokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/v21.0/me',
    scopes: ['email', 'public_profile'],
    userFields: ['id', 'name', 'email', 'picture'],
  }),
})

export default allyConfig

declare module '@adonisjs/ally/types' {
  interface SocialProviders extends InferSocialProviders<typeof allyConfig> {}
}
