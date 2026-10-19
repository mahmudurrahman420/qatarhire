import { DateTime } from 'luxon'
import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import AppBaseModel, { toBool } from '#models/app_base_model'

/** Gulf countries (kind = country), their cities and notable districts (kind = area). */
export default class Location extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare parentId: number | null

  @column()
  declare kind: 'country' | 'city' | 'area'

  @column()
  declare countryCode: string

  @column()
  declare displayName: string

  @column({ consume: toBool })
  declare isActive: boolean

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true, serializeAs: null })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  declare updatedAt: DateTime

  /** "City, Country" — the last two parts of the display name (or the country alone). */
  get shortName() {
    const parts = this.displayName.split(', ')
    return parts.slice(-2).join(', ')
  }

  @belongsTo(() => Location, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof Location>

  @hasMany(() => Location, { foreignKey: 'parentId' })
  declare children: HasMany<typeof Location>
}
