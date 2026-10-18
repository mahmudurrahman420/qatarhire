import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import AppBaseModel from '#models/app_base_model'
import User from '#models/user'

/** Company-private recruitment note. Never visible to candidates. */
export default class ApplicationNote extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ serializeAs: null })
  declare applicationId: number

  @column()
  declare authorId: number | null

  @column()
  declare body: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>
}
