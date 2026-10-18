import { DateTime } from 'luxon'
import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import AppBaseModel, { toBool } from '#models/app_base_model'

/** Qatar municipalities (kind = municipality) and notable districts (kind = area). */
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
  declare kind: 'municipality' | 'area'

  @column({ consume: toBool })
  declare isActive: boolean

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true, serializeAs: null })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  declare updatedAt: DateTime

  @belongsTo(() => Location, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof Location>

  @hasMany(() => Location, { foreignKey: 'parentId' })
  declare children: HasMany<typeof Location>
}
