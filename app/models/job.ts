import { DateTime } from 'luxon'
import { column, belongsTo, hasMany, manyToMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import AppBaseModel, { toBool } from '#models/app_base_model'
import Company from '#models/company'
import JobCategory from '#models/job_category'
import Industry from '#models/industry'
import Location from '#models/location'
import Skill from '#models/skill'
import Application from '#models/application'
import { qatarToday } from '#services/dates'
import type {
  ApplicationMethodValue,
  EducationLevelValue,
  EmploymentTypeValue,
  JobStatusValue,
  WorkArrangementValue,
} from '#shared/enums'

export default class Job extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare companyId: number

  @column({ serializeAs: null })
  declare createdBy: number | null

  @column()
  declare title: string

  @column()
  declare slug: string

  @column()
  declare categoryId: number | null

  @column()
  declare industryId: number | null

  @column()
  declare locationId: number | null

  @column()
  declare description: string

  @column()
  declare responsibilities: string | null

  @column()
  declare requirements: string | null

  @column()
  declare minExperience: number

  @column()
  declare educationLevel: EducationLevelValue | null

  @column()
  declare employmentType: EmploymentTypeValue

  @column()
  declare workArrangement: WorkArrangementValue

  @column()
  declare salaryMin: number | null

  @column()
  declare salaryMax: number | null

  @column({ consume: toBool })
  declare salaryVisible: boolean

  @column()
  declare vacancies: number

  @column.date()
  declare deadline: DateTime | null

  @column()
  declare applicationMethod: ApplicationMethodValue

  @column()
  declare applicationUrl: string | null

  @column()
  declare applicationEmail: string | null

  @column()
  declare status: JobStatusValue

  @column()
  declare moderationNote: string | null

  @column({ consume: toBool })
  declare isFeatured: boolean

  @column.dateTime()
  declare featuredUntil: DateTime | null

  @column.dateTime()
  declare publishedAt: DateTime | null

  @column.dateTime()
  declare closedAt: DateTime | null

  @column({ serializeAs: null })
  declare viewsCount: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>

  @belongsTo(() => JobCategory, { foreignKey: 'categoryId' })
  declare category: BelongsTo<typeof JobCategory>

  @belongsTo(() => Industry)
  declare industry: BelongsTo<typeof Industry>

  @belongsTo(() => Location)
  declare location: BelongsTo<typeof Location>

  @manyToMany(() => Skill, { pivotTable: 'job_skills', pivotTimestamps: false })
  declare skills: ManyToMany<typeof Skill>

  @hasMany(() => Application)
  declare applications: HasMany<typeof Application>

  /**
   * Jobs visible to the public: published, not past deadline,
   * and owned by a company that is not suspended or rejected.
   */
  static live = scope((query: ModelQueryBuilderContract<typeof Job>) => {
    query
      .where('jobs.status', 'published')
      .where((q) => q.whereNull('jobs.deadline').orWhere('jobs.deadline', '>=', qatarToday()))
      .whereHas('company', (c) => c.whereIn('verification_status', ['pending', 'verified']))
  })

  get isExpired() {
    return this.deadline !== null && this.deadline.toISODate()! < qatarToday()
  }

  /** Accepting applications right now. */
  get isOpen() {
    return this.status === 'published' && !this.isExpired
  }

  /** Salary as shown publicly (null when hidden or absent). */
  get publicSalary() {
    if (!this.salaryVisible || (this.salaryMin === null && this.salaryMax === null)) return null
    return { min: this.salaryMin, max: this.salaryMax, currency: 'QAR', period: 'month' as const }
  }

  serializeExtras() {
    return { isExpired: this.isExpired, isOpen: this.isOpen }
  }
}
