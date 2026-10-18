import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import AppBaseModel from '#models/app_base_model'

export default class QueuedJob extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare queue: string

  @column()
  declare name: string

  @column()
  declare payload: string

  @column()
  declare attempts: number

  @column.dateTime()
  declare availableAt: DateTime

  @column.dateTime()
  declare reservedAt: DateTime | null

  @column()
  declare lastError: string | null

  @column.dateTime()
  declare failedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
