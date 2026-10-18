import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { column, hasOne, hasMany } from '@adonisjs/lucid/orm'
import type { HasOne, HasMany } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import AppBaseModel from '#models/app_base_model'
import CandidateProfile from '#models/candidate_profile'
import CompanyUser from '#models/company_user'
import Notification from '#models/notification'
import type { Role, EmailNotificationPref } from '#shared/enums'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(AppBaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare role: Role

  @column()
  declare status: 'active' | 'suspended'

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column.dateTime({ serializeAs: null })
  declare lastLoginAt: DateTime | null

  @column()
  declare locale: string

  @column({
    serializeAs: null,
    prepare: (v) => (v ? JSON.stringify(v) : null),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare notificationPrefs: Partial<Record<EmailNotificationPref, boolean>> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasOne(() => CandidateProfile)
  declare candidateProfile: HasOne<typeof CandidateProfile>

  @hasOne(() => CompanyUser)
  declare membership: HasOne<typeof CompanyUser>

  @hasMany(() => Notification)
  declare notifications: HasMany<typeof Notification>

  get isAdmin() {
    return this.role === 'admin'
  }
  get isEmployer() {
    return this.role === 'employer'
  }
  get isCandidate() {
    return this.role === 'candidate'
  }
  get isVerified() {
    return this.emailVerifiedAt !== null
  }

  /** Email preference defaults to opted-in. */
  wantsEmail(pref: EmailNotificationPref) {
    return this.notificationPrefs?.[pref] ?? true
  }
}
