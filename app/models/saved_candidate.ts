import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import AppBaseModel from '#models/app_base_model'
import CandidateProfile from '#models/candidate_profile'

export default class SavedCandidate extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ serializeAs: null })
  declare companyId: number

  @column()
  declare candidateProfileId: number

  @column({ serializeAs: null })
  declare savedBy: number | null

  @column()
  declare listName: string

  @column()
  declare note: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => CandidateProfile)
  declare candidateProfile: BelongsTo<typeof CandidateProfile>
}
