import { randomBytes, randomInt } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import env from '#start/env'
import Mailer from '#services/mailer'
import { mailDeliverable } from '#services/auth_settings'

export const OTP_TTL_MINUTES = 10
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_SECONDS = 60
const TABLE = 'pending_signups'

export type PendingRow = {
  id: number; token: string; role: 'candidate' | 'employer'; email: string; password_hash: string
  payload: string; code_hash: string; attempts: number; expires_at: string; last_sent_at: string; created_at: string
}

export class SignupMailUnavailable extends Error {}

const sql = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')
const parse = (s: string) => new Date(s.includes('T') || s.endsWith('Z') ? s : s.replace(' ', 'T') + 'Z')
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

/** In production a real mail transport must exist; dev/test may use the log mailer. */
async function canSendMail() {
  return mailDeliverable()
}

async function sendCode(email: string, name: string, code: string) {
  const appName = env.get('APP_NAME', 'HireMeGulf')
  try {
    await Mailer.deliver({
      to: email,
      subject: `${code} is your ${appName} verification code`,
      template: 'signup_code',
      data: { name, code, minutes: OTP_TTL_MINUTES },
    })
  } catch (error) {
    const { default: logger } = await import('@adonisjs/core/services/logger')
    logger.error({ err: error }, 'signup code email failed')
    throw new SignupMailUnavailable('send failed')
  }
}

export default class SignupOtp {
  static async start(role: 'candidate' | 'employer', email: string, password: string, payload: Record<string, unknown>) {
    if (!(await canSendMail())) throw new SignupMailUnavailable('not configured')
    const code = newCode()
    const now = new Date()
    const token = randomBytes(24).toString('hex')
    await db.from(TABLE).where('email', email).delete()
    await db.from(TABLE).where('expires_at', '<', sql(new Date(now.getTime() - 86_400_000))).delete()
    await db.table(TABLE).insert({
      token, role, email,
      password_hash: await hash.make(password),
      payload: JSON.stringify(payload),
      code_hash: await hash.make(code),
      attempts: 0,
      expires_at: sql(new Date(now.getTime() + OTP_TTL_MINUTES * 60_000)),
      last_sent_at: sql(now),
      created_at: sql(now),
    })
    try {
      await sendCode(email, String(payload.fullName ?? ''), code)
    } catch (e) {
      await db.from(TABLE).where('token', token).delete()
      throw e
    }
    return token
  }

  static async find(token: string | undefined | null): Promise<PendingRow | null> {
    if (!token) return null
    return ((await db.from(TABLE).where('token', token).first()) as PendingRow) ?? null
  }

  static resendWaitSeconds(row: PendingRow) {
    const left = OTP_RESEND_SECONDS - Math.floor((Date.now() - parse(row.last_sent_at).getTime()) / 1000)
    return Math.max(0, left)
  }

  static async resend(row: PendingRow) {
    if (!(await canSendMail())) throw new SignupMailUnavailable('not configured')
    const code = newCode()
    const now = new Date()
    await db.from(TABLE).where('id', row.id).update({
      code_hash: await hash.make(code), attempts: 0,
      expires_at: sql(new Date(now.getTime() + OTP_TTL_MINUTES * 60_000)), last_sent_at: sql(now),
    })
    await sendCode(row.email, String(JSON.parse(row.payload).fullName ?? ''), code)
  }

  /** 'ok' | 'invalid' | 'expired' | 'locked' */
  static async check(row: PendingRow, code: string) {
    if (parse(row.expires_at).getTime() < Date.now()) return 'expired' as const
    if (row.attempts >= OTP_MAX_ATTEMPTS) return 'locked' as const
    if (/^\d{6}$/.test(code) && (await hash.verify(row.code_hash, code))) return 'ok' as const
    await db.from(TABLE).where('id', row.id).increment('attempts', 1)
    return row.attempts + 1 >= OTP_MAX_ATTEMPTS ? ('locked' as const) : ('invalid' as const)
  }

  static async consume(row: PendingRow) {
    await db.from(TABLE).where('id', row.id).delete()
  }
}
