import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import AppBaseModel, { toBool } from '#models/app_base_model'

/** Billing scaffold. Plans are inactive until billing is enabled. */
export default class Plan extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare code: string

  @column()
  declare name: string

  @column()
  declare priceQar: number

  @column()
  declare interval: 'one_time' | 'month' | 'year'

  @column({
    prepare: (v) => JSON.stringify(v ?? {}),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare entitlements: Record<string, number | boolean>

  @column({ consume: toBool })
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
