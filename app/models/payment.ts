import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import AppBaseModel from '#models/app_base_model'

export default class Payment extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare companyId: number

  @column()
  declare subscriptionId: number | null

  @column()
  declare amountQar: number

  @column()
  declare status: 'pending' | 'succeeded' | 'failed' | 'refunded'

  @column()
  declare provider: string

  @column()
  declare providerReference: string

  @column({ serializeAs: null })
  declare idempotencyKey: string | null

  @column({
    serializeAs: null,
    prepare: (v) => (v ? JSON.stringify(v) : null),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare raw: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
