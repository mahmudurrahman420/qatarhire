import { DateTime } from 'luxon'
import { column, belongsTo, hasMany, manyToMany, beforeSave } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import AppBaseModel, { toBool, jsonArray } from '#models/app_base_model'
import User from '#models/user'
import Location from '#models/location'
import Industry from '#models/industry'
import Skill from '#models/skill'
import Language from '#models/language'
import CandidateExperience from '#models/candidate_experience'
import CandidateEducation from '#models/candidate_education'
import CandidateCertification from '#models/candidate_certification'
import CandidateCv from '#models/candidate_cv'
import Application from '#models/application'
import type {
  AvailabilityValue,
  ContactSharingValue,
  GenderValue,
  EducationLevelValue,
  ProfileVisibilityValue,
  WorkAuthorizationValue,
} from '#shared/enums'

export default class CandidateProfile extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare headline: string | null

  @column()
  declare desiredPosition: string | null

  @column()
  declare gender: GenderValue | null

  @column()
  declare currentJobTitle: string | null

  @column()
  declare summary: string | null

  @column({ serializeAs: null })
  declare photoKey: string | null

  // Contact details are never serialised automatically; controllers expose
  // them explicitly only after a consent check (see CandidateAccessService).
  @column({ serializeAs: null })
  declare phone: string | null

  @column({ serializeAs: null })
  declare contactEmail: string | null

  @column()
  declare currentLocationText: string | null

  @column()
  declare currentLocationId: number | null

  @column()
  declare preferredLocationId: number | null

  @column()
  declare industryId: number | null

  @column()
  declare yearsExperience: number | null

  @column()
  declare educationLevel: EducationLevelValue | null

  @column()
  declare expectedSalary: number | null

  @column()
  declare expectedSalaryCurrency: string | null

  @column()
  declare availability: AvailabilityValue | null

  @column()
  declare noticePeriodDays: number | null

  @column()
  declare linkedinUrl: string | null

  @column()
  declare portfolioUrl: string | null

  @column()
  declare workAuthorization: WorkAuthorizationValue | null

  @column({ consume: toBool })
  declare openToRelocation: boolean

  // --- full profile (migration 0021) ------------------------------------------
  @column({ consume: toBool })
  declare hasDrivingLicence: boolean | null

  // Sensitive: never serialised automatically; presenters expose it to employers only.
  @column({ consume: toBool, serializeAs: null })
  declare hasDisability: boolean | null

  @column()
  declare employmentStatus: 'employed' | 'unemployed' | null

  @column()
  declare careerLevel: string | null

  @column({ consume: toBool })
  declare hasGccExperience: boolean | null

  @column()
  declare noticePeriod: string | null

  @column({ serializeAs: null })
  declare currentSalaryRange: string | null

  @column({ serializeAs: null })
  declare currentSalaryCurrency: string | null

  @column({ serializeAs: null })
  declare whatsapp: string | null

  @column({ serializeAs: null })
  declare instagramUrl: string | null

  @column({ serializeAs: null })
  declare facebookUrl: string | null

  @column(jsonArray<number>())
  declare industryIds: number[]

  @column(jsonArray<number>())
  declare functionIds: number[]

  @column(jsonArray<string>())
  declare desiredEmploymentTypes: string[]

  @column(jsonArray<string>())
  declare benefits: string[]

  @column(jsonArray<string>())
  declare preferredPositions: string[]

  @column(jsonArray<number>())
  declare preferredIndustryIds: number[]

  @column(jsonArray<number>())
  declare preferredCityIds: number[]

  @column()
  declare visibility: ProfileVisibilityValue

  @column()
  declare contactSharing: ContactSharingValue

  @column({ consume: toBool })
  declare cvSearchable: boolean

  @column()
  declare completeness: number

  @column.dateTime()
  declare profileUpdatedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Location, { foreignKey: 'currentLocationId' })
  declare currentLocation: BelongsTo<typeof Location>

  @belongsTo(() => Location, { foreignKey: 'preferredLocationId' })
  declare preferredLocation: BelongsTo<typeof Location>

  @belongsTo(() => Industry)
  declare industry: BelongsTo<typeof Industry>

  @hasMany(() => CandidateExperience, { onQuery: (q) => q.orderBy('is_current', 'desc').orderBy('start_date', 'desc') })
  declare experiences: HasMany<typeof CandidateExperience>

  @hasMany(() => CandidateEducation, { onQuery: (q) => q.orderBy('end_year', 'desc') })
  declare educations: HasMany<typeof CandidateEducation>

  @hasMany(() => CandidateCertification)
  declare certifications: HasMany<typeof CandidateCertification>

  @hasMany(() => CandidateCv, { onQuery: (q) => q.orderBy('is_primary', 'desc').orderBy('created_at', 'desc') })
  declare cvs: HasMany<typeof CandidateCv>

  @hasMany(() => Application)
  declare applications: HasMany<typeof Application>

  @manyToMany(() => Skill, { pivotTable: 'candidate_skills', pivotTimestamps: false })
  declare skills: ManyToMany<typeof Skill>

  @manyToMany(() => Language, { pivotTable: 'candidate_languages', pivotColumns: ['proficiency'], pivotTimestamps: false })
  declare languages: ManyToMany<typeof Language>

  /** Bookkeeping fields that should not count as the candidate updating their profile. */
  static NON_CONTENT_FIELDS = ['completeness', 'visibility', 'contactSharing', 'cvSearchable', 'profileUpdatedAt', 'updatedAt']

  @beforeSave()
  static touchProfile(profile: CandidateProfile) {
    if (profile.$isNew && profile.profileUpdatedAt) return
    const changed = Object.keys(profile.$dirty).filter((k) => !CandidateProfile.NON_CONTENT_FIELDS.includes(k))
    if (changed.length) profile.profileUpdatedAt = DateTime.now()
  }

  /** Visible to verified employers in candidate search (public profiles included). */
  get isDiscoverable() {
    return this.visibility === 'discoverable' || this.visibility === 'public'
  }

  /** Visible to everyone, signed in or not. */
  get isPublic() {
    return this.visibility === 'public'
  }

  /** Fields hidden from serialize(); only the owner (edit page, data export) gets all of them. */
  get privateFields() {
    return {
      phone: this.phone,
      contactEmail: this.contactEmail,
      whatsapp: this.whatsapp,
      hasDisability: this.hasDisability,
      currentSalaryRange: this.currentSalaryRange,
      currentSalaryCurrency: this.currentSalaryCurrency,
      instagramUrl: this.instagramUrl,
      facebookUrl: this.facebookUrl,
    }
  }

  get photoUrl() {
    return this.photoKey ? `/uploads/${this.photoKey}` : null
  }
}
