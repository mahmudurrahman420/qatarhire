import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import AppBaseModel from '#models/app_base_model'
import Company from '#models/company'

/** Who viewed / downloaded a candidate's profile, CV or contact details. */
export default class CandidateAccessLog extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare candidateProfileId: number

  @column()
  declare companyId: number | null

  @column({ serializeAs: null })
  declare userId: number | null

  @column()
  declare action: 'profile_view' | 'cv_download' | 'contact_view'

  @column()
  declare candidateCvId: number | null

  @column({ serializeAs: null })
  declare ip: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>
}
