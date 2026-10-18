import { DateTime } from 'luxon'
import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import AppBaseModel, { toBool } from '#models/app_base_model'
import Industry from '#models/industry'
import Location from '#models/location'
import CompanyUser from '#models/company_user'
import CompanyVerification from '#models/company_verification'
import Job from '#models/job'
import type { CompanySizeValue, VerificationStatusValue } from '#shared/enums'

export default class Company extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare website: string | null

  @column()
  declare industryId: number | null

  @column()
  declare description: string | null

  @column()
  declare locationId: number | null

  @column()
  declare address: string | null

  @column({ serializeAs: null })
  declare contactName: string

  @column({ serializeAs: null })
  declare contactEmail: string

  @column({ serializeAs: null })
  declare phone: string | null

  @column({ serializeAs: null })
  declare logoKey: string | null

  @column()
  declare size: CompanySizeValue | null

  @column({ serializeAs: null })
  declare crNumber: string | null

  @column()
  declare verificationStatus: VerificationStatusValue

  @column.dateTime()
  declare verifiedAt: DateTime | null

  @column({ consume: toBool })
  declare isFeatured: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Industry)
  declare industry: BelongsTo<typeof Industry>

  @belongsTo(() => Location)
  declare location: BelongsTo<typeof Location>

  @hasMany(() => CompanyUser)
  declare members: HasMany<typeof CompanyUser>

  @hasMany(() => CompanyVerification, { onQuery: (q) => q.orderBy('created_at', 'desc') })
  declare verifications: HasMany<typeof CompanyVerification>

  @hasMany(() => Job)
  declare jobs: HasMany<typeof Job>

  get isVerified() {
    return this.verificationStatus === 'verified'
  }

  /** Public URL for the logo, or null. */
  get logoUrl() {
    return this.logoKey ? `/uploads/${this.logoKey}` : null
  }

  serializeExtras() {
    return { logoUrl: this.logoUrl }
  }
}
