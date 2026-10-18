import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import AppBaseModel from '#models/app_base_model'

export default class CandidateEducation extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ serializeAs: null })
  declare candidateProfileId: number

  @column()
  declare institution: string

  @column()
  declare qualification: string

  @column()
  declare fieldOfStudy: string | null

  @column()
  declare startYear: number | null

  @column()
  declare endYear: number | null

  @column.dateTime({ autoCreate: true, serializeAs: null })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  declare updatedAt: DateTime
}
