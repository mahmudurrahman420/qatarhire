import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import AppBaseModel, { toBool } from '#models/app_base_model'

export default class SavedSearch extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ serializeAs: null })
  declare userId: number

  @column()
  declare kind: 'candidates' | 'jobs'

  @column()
  declare name: string

  @column({
    prepare: (v) => JSON.stringify(v ?? {}),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare filters: Record<string, unknown>

  @column({ consume: toBool })
  declare alertsEnabled: boolean

  @column.dateTime()
  declare lastAlertedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
