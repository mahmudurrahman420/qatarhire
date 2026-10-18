import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import AppBaseModel, { toBool } from '#models/app_base_model'
import CandidateProfile from '#models/candidate_profile'

export default class CandidateCv extends AppBaseModel {
  static table = 'candidate_cvs'

  @column({ isPrimary: true })
  declare id: number

  @column({ serializeAs: null })
  declare candidateProfileId: number

  @column()
  declare label: string

  /** Random key on the private disk. Never sent to the browser. */
  @column({ serializeAs: null })
  declare storageKey: string

  @column()
  declare originalName: string

  @column()
  declare mimeType: string

  @column()
  declare sizeBytes: number

  @column({ consume: toBool })
  declare isPrimary: boolean

  @column()
  declare scanStatus: 'not_scanned' | 'clean' | 'infected' | 'error'

  @column({ serializeAs: null })
  declare parseStatus: 'none' | 'pending' | 'parsed' | 'failed'

  @column({
    serializeAs: null,
    prepare: (v) => (v ? JSON.stringify(v) : null),
    consume: (v) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare parsedData: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => CandidateProfile)
  declare candidateProfile: BelongsTo<typeof CandidateProfile>

  get isDownloadable() {
    return this.scanStatus !== 'infected'
  }
}
