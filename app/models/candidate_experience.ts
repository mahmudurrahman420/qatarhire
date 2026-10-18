import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import AppBaseModel, { toBool } from '#models/app_base_model'

export default class CandidateExperience extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ serializeAs: null })
  declare candidateProfileId: number

  @column()
  declare jobTitle: string

  @column()
  declare companyName: string

  @column()
  declare location: string | null

  @column.date()
  declare startDate: DateTime

  @column.date()
  declare endDate: DateTime | null

  @column({ consume: toBool })
  declare isCurrent: boolean

  @column()
  declare description: string | null

  @column.dateTime({ autoCreate: true, serializeAs: null })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  declare updatedAt: DateTime
}
