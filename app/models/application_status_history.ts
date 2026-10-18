import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import AppBaseModel from '#models/app_base_model'

export default class ApplicationStatusHistory extends AppBaseModel {
  static table = 'application_status_histories'

  @column({ isPrimary: true })
  declare id: number

  @column({ serializeAs: null })
  declare applicationId: number

  @column()
  declare fromStatus: string | null

  @column()
  declare toStatus: string

  @column({ serializeAs: null })
  declare changedBy: number | null

  @column()
  declare note: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
