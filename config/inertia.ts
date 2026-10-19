import env from '#start/env'
import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import type { HttpContext } from '@adonisjs/core/http'
import Notification from '#models/notification'
import { membershipFor } from '#services/company_context'
import SettingsService from '#services/settings_service'

async function sharedAuth(ctx: HttpContext) {
  const user = ctx.auth?.user
  if (!user) return null
  const membership = await membershipFor(user)
  const unread = await Notification.query().where('user_id', user.id).whereNull('read_at').count('* as total')
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    emailVerified: user.isVerified,
    unreadNotifications: Number(unread[0].$extras.total),
    company: membership
      ? {
          id: membership.company.id,
          name: membership.company.name,
          slug: membership.company.slug,
          verificationStatus: membership.company.verificationStatus,
          logoUrl: membership.company.logoUrl,
          memberRole: membership.role,
        }
      : null,
  }
}

const inertiaConfig = defineConfig({
  rootView: 'inertia_layout',

  sharedData: {
    appName: () => env.get('APP_NAME', 'HireMeGulf'),
    auth: (ctx) => ctx.inertia.always(() => sharedAuth(ctx)),
    flash: (ctx) =>
      ctx.inertia.always(() => ({
        success: (ctx.session?.flashMessages.get('success') as string | undefined) ?? null,
        error: (ctx.session?.flashMessages.get('error') as string | undefined) ?? null,
      })),
    siteNotice: async () => (await SettingsService.get('site_notice')) || null,
    locale: (ctx) => ({ code: 'en', dir: 'ltr' as const, ...(ctx.auth?.user ? {} : {}) }),
  },

  ssr: {
    enabled: false,
    entrypoint: 'inertia/app/ssr.tsx',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {}
}
