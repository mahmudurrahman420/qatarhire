import { DateTime } from 'luxon'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import AppBaseModel from '#models/app_base_model'
import Company from '#models/company'
import User from '#models/user'
import type { CompanyRole } from '#shared/enums'

/** Membership of an employer user in exactly one company. */
export default class CompanyUser extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare companyId: number

  @column()
  declare userId: number

  @column()
  declare role: CompanyRole

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isOwner() {
    return this.role === 'owner'
  }
}
