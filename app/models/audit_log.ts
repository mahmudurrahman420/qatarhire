import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import AppBaseModel from '#models/app_base_model'
import User from '#models/user'

export default class AuditLog extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare actorId: number | null

  @column()
  declare action: string

  @column()
  declare subjectType: string | null

  @column()
  declare subjectId: number | null

  @column({
    prepare: (v) => (v ? JSON.stringify(v) : null),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare meta: Record<string, unknown> | null

  @column()
  declare ip: string | null

  @column()
  declare userAgent: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'actorId' })
  declare actor: BelongsTo<typeof User>
}
