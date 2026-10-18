import { DateTime } from 'luxon'
import { createHash, randomBytes } from 'node:crypto'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import AppBaseModel from '#models/app_base_model'
import User from '#models/user'

export type TokenType = 'verify_email' | 'password_reset' | 'company_invite'

/**
 * Single-use tokens for email verification, password reset and team invites.
 * Only a SHA-256 hash is stored; the plain token exists only in the emailed link.
 */
export default class UserToken extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare type: TokenType

  @column({ serializeAs: null })
  declare tokenHash: string

  @column({
    prepare: (v) => (v ? JSON.stringify(v) : null),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare meta: Record<string, unknown> | null

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare usedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  static hash(plain: string) {
    return createHash('sha256').update(plain).digest('hex')
  }

  /** Creates a token, invalidating earlier unused tokens of the same type. Returns the plain value. */
  static async issue(user: User, type: TokenType, ttlMinutes: number, meta: Record<string, unknown> | null = null) {
    await this.query().where('user_id', user.id).where('type', type).whereNull('used_at').delete()
    const plain = randomBytes(32).toString('base64url')
    await this.create({
      userId: user.id,
      type,
      tokenHash: this.hash(plain),
      meta,
      expiresAt: DateTime.now().plus({ minutes: ttlMinutes }),
    })
    return plain
  }

  /** Finds a valid (unused, unexpired) token. */
  static async findValid(plain: string, type: TokenType) {
    return this.query()
      .where('token_hash', this.hash(plain))
      .where('type', type)
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL({ includeOffset: false })!)
      .preload('user')
      .first()
  }
}
