import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import AppBaseModel from '#models/app_base_model'
import Plan from '#models/plan'

/** Status is only ever set from verified provider webhooks, never from the browser. */
export default class Subscription extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare companyId: number

  @column()
  declare planId: number

  @column()
  declare status: 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired'

  @column()
  declare provider: string | null

  @column({ serializeAs: null })
  declare providerReference: string | null

  @column.dateTime()
  declare currentPeriodEnd: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>
}
