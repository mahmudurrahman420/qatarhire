import vine from '@vinejs/vine'
import { Availability, ContactSharing, EducationLevel, LanguageProficiency, ProfileVisibility, WorkAuthorization } from '#shared/enums'

const optionalUrl = () => vine.string().trim().url({ require_protocol: true, protocols: ['http', 'https'] }).maxLength(255).optional()

export const profileValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(120),
    headline: vine.string().trim().maxLength(160).optional(),
    currentJobTitle: vine.string().trim().maxLength(120).optional(),
    summary: vine.string().trim().maxLength(4000).optional(),
    phone: vine.string().trim().regex(/^[+\d\s()-]{6,30}$/).optional(),
    contactEmail: vine.string().trim().email().maxLength(254).optional(),
    currentLocationId: vine.number().positive().optional(),
    currentLocationText: vine.string().trim().maxLength(120).optional(),
    preferredLocationId: vine.number().positive().optional(),
    industryId: vine.number().positive().optional(),
    yearsExperience: vine.number().min(0).max(60).withoutDecimals().optional(),
    educationLevel: vine.enum(EducationLevel.values).optional(),
    expectedSalary: vine.number().min(0).max(1_000_000).withoutDecimals().optional(),
    availability: vine.enum(Availability.values).optional(),
    noticePeriodDays: vine.number().min(0).max(365).withoutDecimals().optional(),
    linkedinUrl: optionalUrl(),
    portfolioUrl: optionalUrl(),
    workAuthorization: vine.enum(WorkAuthorization.values).optional(),
    openToRelocation: vine.boolean().optional(),
  })
)

export const experienceValidator = vine.compile(
  vine.object({
    jobTitle: vine.string().trim().minLength(2).maxLength(120),
    companyName: vine.string().trim().minLength(1).maxLength(160),
    location: vine.string().trim().maxLength(120).optional(),
    startDate: vine.date({ formats: ['YYYY-MM-DD', 'YYYY-MM'] }).beforeOrEqual('today'),
    isCurrent: vine.boolean().optional(),
    endDate: vine.date({ formats: ['YYYY-MM-DD', 'YYYY-MM'] }).afterOrEqual((field) => (field.parent.startDate as string) ?? '1900-01-01').optional().requiredWhen('isCurrent', '!=', true),
    description: vine.string().trim().maxLength(3000).optional(),
  })
)

const year = () => vine.number().min(1950).max(new Date().getFullYear() + 8).withoutDecimals()

export const educationValidator = vine.compile(
  vine.object({
    institution: vine.string().trim().minLength(2).maxLength(160),
    qualification: vine.string().trim().minLength(2).maxLength(160),
    fieldOfStudy: vine.string().trim().maxLength(160).optional(),
    startYear: year().optional(),
    endYear: year().optional(),
  })
)

export const certificationValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(160),
    issuer: vine.string().trim().maxLength(160).optional(),
    year: year().optional(),
  })
)

export const skillsValidator = vine.compile(
  vine.object({ skills: vine.array(vine.string().trim().minLength(1).maxLength(80)).maxLength(40) })
)

export const languagesValidator = vine.compile(
  vine.object({
    languages: vine
      .array(vine.object({ languageId: vine.number().positive(), proficiency: vine.enum(LanguageProficiency.values) }))
      .maxLength(10),
  })
)

export const privacyValidator = vine.compile(
  vine.object({
    visibility: vine.enum(ProfileVisibility.values),
    contactSharing: vine.enum(ContactSharing.values),
    cvSearchable: vine.boolean(),
  })
)

export const cvUploadValidator = vine.compile(
  vine.object({
    cv: vine.file({ size: '10mb', extnames: ['pdf', 'docx', 'PDF', 'DOCX'] }),
    label: vine.string().trim().maxLength(80).optional(),
  })
)

export const applyValidator = vine.compile(
  vine.object({
    cvId: vine.number().positive().optional(),
    coverLetter: vine.string().trim().maxLength(5000).optional(),
  })
)

export const deleteAccountValidator = vine.compile(
  vine.object({ password: vine.string().maxLength(128), confirm: vine.string().in(['DELETE']) })
)
