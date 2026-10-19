import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import CandidateProfile from '#models/candidate_profile'
import SocialAccount from '#models/social_account'
import SettingsService from '#services/settings_service'
import type { SocialProvider } from '#services/social_providers'

/** Where the visitor pressed the button: decides the role of a brand-new account. Never "admin". */
export const SOCIAL_INTENTS = ['login', 'candidate', 'employer'] as const
export type SocialIntent = (typeof SOCIAL_INTENTS)[number]

export type SocialProfile = { id: string; email: string | null; name: string | null; emailVerified: boolean }

export type SocialLoginResult =
  | { ok: true; user: User; created: boolean; linked: boolean }
  | { ok: false; reason: 'no_email' | 'unverified_email' | 'admin' | 'suspended' | 'no_account' | 'employer_closed' }

// same normalisation as the sign-up forms, so "John.Doe@Gmail.com" finds the existing account
const emailNormalizer = vine.compile(vine.object({ email: vine.string().trim().email().normalizeEmail().maxLength(254) }))

async function normalise(email: string | null) {
  if (!email) return null
  try {
    return (await emailNormalizer.validate({ email })).email
  } catch {
    return null
  }
}

function randomPassword() {
  return randomBytes(32).toString('base64url')
}

export default class SocialLogin {
  static async resolve(provider: SocialProvider, profile: SocialProfile, intent: SocialIntent): Promise<SocialLoginResult> {
    const now = DateTime.now()

    // 1. this provider account is already linked
    const linked = await SocialAccount.query().where('provider', provider).where('provider_user_id', profile.id).preload('user').first()
    if (linked) {
      const user = linked.user
      if (user.isAdmin) return { ok: false, reason: 'admin' }
      if (user.status !== 'active') return { ok: false, reason: 'suspended' }
      linked.lastUsedAt = now
      await linked.save()
      return { ok: true, user, created: false, linked: false }
    }

    const email = await normalise(profile.email)
    if (!email) return { ok: false, reason: 'no_email' }
    // linking by email is only safe when the provider vouches for the address
    if (!profile.emailVerified) return { ok: false, reason: 'unverified_email' }

    // 2. an account with this email exists: link the provider and sign in
    const existing = await User.findBy('email', email)
    if (existing) {
      if (existing.isAdmin) return { ok: false, reason: 'admin' }
      if (existing.status !== 'active') return { ok: false, reason: 'suspended' }
      await db.transaction(async (trx) => {
        existing.useTransaction(trx)
        if (!existing.emailVerifiedAt) {
          // An unverified account may have been pre-registered by someone else with this
          // address. The real owner just proved control of it, so lock out that password.
          existing.emailVerifiedAt = now
          existing.password = randomPassword()
        }
        await existing.save()
        await SocialAccount.create({ userId: existing.id, provider, providerUserId: profile.id, email, lastUsedAt: now }, { client: trx })
      })
      return { ok: true, user: existing, created: false, linked: true }
    }

    // 3. new account, role from the page the visitor started on
    if (intent === 'login') return { ok: false, reason: 'no_account' }
    if (intent === 'employer' && !(await SettingsService.get('employer_registration_open'))) return { ok: false, reason: 'employer_closed' }
    const role = intent === 'employer' ? 'employer' : 'candidate'
    const local = email.split('@')[0]
    const fullName = (profile.name ?? '').trim().slice(0, 120) || (local.length >= 2 ? local : 'New member')

    const user = await db.transaction(async (trx) => {
      const u = await User.create(
        { fullName, email, password: randomPassword(), role, status: 'active', emailVerifiedAt: now, lastLoginAt: now },
        { client: trx }
      )
      if (role === 'candidate') await CandidateProfile.create({ userId: u.id, contactEmail: email }, { client: trx })
      await SocialAccount.create({ userId: u.id, provider, providerUserId: profile.id, email, lastUsedAt: now }, { client: trx })
      return u
    })
    return { ok: true, user, created: true, linked: true }
  }
}
