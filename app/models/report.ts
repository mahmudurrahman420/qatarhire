import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import AppBaseModel from '#models/app_base_model'
import User from '#models/user'
import type { ReportReasonValue, ReportStatusValue } from '#shared/enums'

export default class Report extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare subjectType: 'job' | 'company' | 'candidate'

  @column()
  declare subjectId: number

  @column()
  declare reporterId: number | null

  @column()
  declare reporterEmail: string | null

  @column()
  declare reason: ReportReasonValue

  @column()
  declare details: string | null

  @column()
  declare status: ReportStatusValue

  @column()
  declare resolvedBy: number | null

  @column()
  declare resolutionNote: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'reporterId' })
  declare reporter: BelongsTo<typeof User>
}
