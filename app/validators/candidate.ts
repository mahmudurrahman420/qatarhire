import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import { Availability, ContactSharing, EducationLevel, Gender, LanguageProficiency, ProfileVisibility, WorkAuthorization } from '#shared/enums'
import { Currencies } from '#shared/gulf'
import { AboutJobMax, AboutMeMax, Benefit, CareerLevel, DesiredEmploymentType, EmploymentStatus, LanguageLimit, NoticePeriod, QualificationValues, SalaryRangePattern } from '#shared/profile_options'
import { containsContactInfo, htmlToText } from '#shared/rich_text'

const url = () => vine.string().trim().url({ require_protocol: true, protocols: ['http', 'https'] }).maxLength(255)
const optionalUrl = () => url().optional()

export const profileValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(120),
    headline: vine.string().trim().maxLength(160).optional(),
    desiredPosition: vine.string().trim().maxLength(120).optional(),
    gender: vine.enum(Gender.values).optional(),
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
    expectedSalaryCurrency: vine.enum(Currencies).optional(),
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

/* ------------------------------------------------------------------ full profile form */

const NO_CONTACT = 'Emails, phone numbers and links are not allowed'

/** Rich text: limit visible characters and reject contact details (emails, phones, links). */
const richText = vine.createRule((value, opts: { max: number }, field) => {
  if (typeof value !== 'string') return
  const text = htmlToText(value)
  if (text.length > opts.max) field.report(`Use ${opts.max} characters or fewer (currently ${text.length})`, 'richTextMax', field)
  else if (containsContactInfo(text)) field.report(NO_CONTACT, 'noContact', field)
})

/** URL must point at one of the given hosts (e.g. linkedin.com). */
const hostIn = vine.createRule((value, hosts: string[], field) => {
  if (typeof value !== 'string') return
  try {
    const h = new URL(value).hostname.toLowerCase().replace(/^www\./, '')
    if (!hosts.some((x) => h === x || h.endsWith(`.${x}`))) field.report(`Enter a ${hosts[0]} link`, 'hostIn', field)
  } catch {
    field.report('Enter a valid link', 'hostIn', field)
  }
})

const distinctIds = vine.createRule((value, _o, field) => {
  if (Array.isArray(value) && new Set(value.map((v) => (typeof v === 'object' && v ? (v as { languageId?: number }).languageId : v))).size !== value.length) {
    field.report('Each item can be chosen only once', 'distinct', field)
  }
})

const phone = () => vine.string().trim().regex(/^\+\d{1,4}[\s\d()-]{5,24}$/)
const isoDate = () => vine.date({ formats: ['YYYY-MM-DD'] })
const idList = (max: number) => vine.array(vine.number().positive().withoutDecimals()).maxLength(max)

export const fullProfileValidator = vine.compile(
  vine.object({
    // personal
    fullName: vine.string().trim().minLength(2).maxLength(120),
    gender: vine.enum(Gender.values).optional(),
    currentLocationId: vine.number().positive().optional(),
    currentLocationText: vine.string().trim().maxLength(120).optional(),
    workAuthorization: vine.enum(WorkAuthorization.values).optional(),
    hasDrivingLicence: vine.boolean().optional(),
    hasDisability: vine.boolean().optional(),
    openToRelocation: vine.boolean().optional(),

    languages: vine
      .array(vine.object({ languageId: vine.number().positive(), proficiency: vine.enum(LanguageProficiency.values) }))
      .maxLength(LanguageLimit)
      .use(distinctIds()),

    educations: vine
      .array(
        vine.object({
          id: vine.number().positive().optional(),
          qualification: vine.string().trim().in(QualificationValues),
          major: vine.string().trim().maxLength(160).optional(),
          institution: vine.string().trim().minLength(2).maxLength(160),
          isCustomInstitute: vine.boolean().optional(),
          startDate: isoDate().optional(),
          endDate: isoDate().afterOrEqual((field) => (field.parent.startDate as string) ?? '1900-01-01').optional(),
        })
      )
      .maxLength(10),

    // employment information
    employmentStatus: vine.enum(EmploymentStatus.values).optional(),
    headline: vine.string().trim().minLength(2).maxLength(160),
    desiredPosition: vine.string().trim().maxLength(120).optional(),
    currentJobTitle: vine.string().trim().maxLength(120).optional(),
    industryIds: idList(5).minLength(1),
    functionIds: idList(5).minLength(1),
    careerLevel: vine.enum(CareerLevel.values).optional(),
    yearsExperience: vine.number().min(0).max(60).withoutDecimals().optional(),
    skills: vine.array(vine.string().trim().minLength(1).maxLength(80)).maxLength(40),
    hasGccExperience: vine.boolean().optional(),
    noticePeriod: vine.enum(NoticePeriod.values).optional(),
    desiredEmploymentTypes: vine.array(vine.enum(DesiredEmploymentType.values)).maxLength(6),
    currentSalaryRange: vine.string().trim().regex(SalaryRangePattern).optional(),
    currentSalaryCurrency: vine.enum(Currencies).optional(),
    expectedSalary: vine.number().min(0).max(1_000_000).withoutDecimals().optional(),
    expectedSalaryCurrency: vine.enum(Currencies).optional(),
    benefits: vine.array(vine.enum(Benefit.values)).maxLength(Benefit.values.length),

    experiences: vine
      .array(
        vine.object({
          id: vine.number().positive().optional(),
          isCurrent: vine.boolean().optional(),
          jobTitle: vine.string().trim().minLength(2).maxLength(120),
          companyName: vine.string().trim().minLength(1).maxLength(160),
          employmentType: vine.enum(DesiredEmploymentType.values).optional(),
          location: vine.string().trim().maxLength(120).optional(),
          startDate: isoDate().beforeOrEqual('today'),
          endDate: isoDate().afterOrEqual((field) => (field.parent.startDate as string) ?? '1900-01-01').optional().requiredWhen('isCurrent', '!=', true),
          description: vine.string().trim().maxLength(10_000).use(richText({ max: AboutJobMax })).optional(),
        })
      )
      .maxLength(15),

    // preferences
    preferredPositions: vine.array(vine.string().trim().minLength(1).maxLength(80)).maxLength(10),
    preferredIndustryIds: idList(5),
    preferredLocationId: vine.number().positive().optional(),
    preferredCityIds: idList(10),

    // contact & social
    phone: phone(),
    whatsapp: phone().optional(),
    portfolioUrl: optionalUrl(),
    linkedinUrl: url().use(hostIn(['linkedin.com'])).optional(),
    instagramUrl: url().use(hostIn(['instagram.com'])).optional(),
    facebookUrl: url().use(hostIn(['facebook.com', 'fb.com'])).optional(),

    // about me
    summary: vine.string().trim().maxLength(12_000).use(richText({ max: AboutMeMax })).optional(),
  })
)

fullProfileValidator.messagesProvider = new SimpleMessagesProvider({
  'headline.required': 'Add a professional headline',
  'industryIds.minLength': 'Choose at least one industry',
  'industryIds.required': 'Choose at least one industry',
  'functionIds.minLength': 'Choose at least one function',
  'functionIds.required': 'Choose at least one function',
  'phone.required': 'Add a phone number',
  'phone.regex': 'Enter a phone number with country code, e.g. +974 6699 4850',
  'whatsapp.regex': 'Enter a WhatsApp number with country code',
  'languages.maxLength': 'You can add up to 5 languages',
  'experiences.*.endDate.requiredWhen': 'Add an end date, or tick "I am currently working here"',
  'experiences.*.startDate.beforeOrEqual': 'Start date can’t be in the future',
  'educations.*.endDate.afterOrEqual': 'End date must be after the start date',
  'experiences.*.endDate.afterOrEqual': 'End date must be after the start date',
  'educations.*.institution.required': 'Add the institute',
  'educations.*.institution.minLength': 'Add the institute',
  'experiences.*.jobTitle.required': 'Add the job title',
  'experiences.*.companyName.required': 'Add the company',
  'experiences.*.startDate.required': 'Add the start date',
})
