import { DateTime } from 'luxon'
import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import AppBaseModel from '#models/app_base_model'
import Job from '#models/job'
import CandidateProfile from '#models/candidate_profile'
import CandidateCv from '#models/candidate_cv'
import ApplicationStatusHistory from '#models/application_status_history'
import ApplicationNote from '#models/application_note'
import type { ApplicationStatusValue } from '#shared/enums'

export default class Application extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare jobId: number

  @column()
  declare candidateProfileId: number

  @column()
  declare candidateCvId: number | null

  @column()
  declare coverLetter: string | null

  @column()
  declare status: ApplicationStatusValue

  @column.dateTime()
  declare statusChangedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Job)
  declare job: BelongsTo<typeof Job>

  @belongsTo(() => CandidateProfile)
  declare candidateProfile: BelongsTo<typeof CandidateProfile>

  @belongsTo(() => CandidateCv)
  declare cv: BelongsTo<typeof CandidateCv>

  @hasMany(() => ApplicationStatusHistory, { onQuery: (q) => q.orderBy('created_at', 'asc').orderBy('id', 'asc') })
  declare history: HasMany<typeof ApplicationStatusHistory>

  @hasMany(() => ApplicationNote, { onQuery: (q) => q.orderBy('created_at', 'desc') })
  declare notes: HasMany<typeof ApplicationNote>
}
