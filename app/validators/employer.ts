import vine from '@vinejs/vine'
import { ApplicationStatus, CompanySize, EducationLevel, EmploymentType, WorkArrangement } from '#shared/enums'

export const companyValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(160),
    website: vine.string().trim().url({ require_protocol: true, protocols: ['http', 'https'] }).maxLength(255).optional(),
    industryId: vine.number().positive().optional(),
    locationId: vine.number().positive().optional(),
    description: vine.string().trim().maxLength(5000).optional(),
    address: vine.string().trim().maxLength(255).optional(),
    contactName: vine.string().trim().minLength(2).maxLength(120),
    contactEmail: vine.string().trim().email().maxLength(254),
    phone: vine.string().trim().regex(/^[+\d\s()-]{6,30}$/).optional(),
    size: vine.enum(CompanySize.values).optional(),
    crNumber: vine.string().trim().maxLength(40).optional(),
  })
)

export const logoValidator = vine.compile(
  vine.object({ logo: vine.file({ size: '2mb', extnames: ['jpg', 'jpeg', 'png', 'webp'] }) })
)

export const inviteValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(120),
    email: vine.string().trim().email().normalizeEmail().maxLength(254),
  })
)

export const jobValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(160),
    categoryId: vine.number().positive(),
    industryId: vine.number().positive().optional(),
    locationId: vine.number().positive(),
    description: vine.string().trim().minLength(50).maxLength(15000),
    responsibilities: vine.string().trim().maxLength(10000).optional(),
    requirements: vine.string().trim().maxLength(10000).optional(),
    skills: vine.array(vine.string().trim().minLength(1).maxLength(80)).maxLength(20).optional(),
    minExperience: vine.number().min(0).max(40).withoutDecimals(),
    educationLevel: vine.enum(EducationLevel.values).optional(),
    employmentType: vine.enum(EmploymentType.values),
    workArrangement: vine.enum(WorkArrangement.values),
    salaryMin: vine.number().min(0).max(1_000_000).withoutDecimals().optional(),
    salaryMax: vine
      .number()
      .min(0)
      .max(1_000_000)
      .withoutDecimals()
      .optional()
      .use(
        vine.createRule((value, _o, field) => {
          const min = field.parent.salaryMin
          if (typeof value === 'number' && typeof min === 'number' && value < min) {
            field.report('Maximum salary must be greater than or equal to the minimum.', 'salaryRange', field)
          }
        })()
      ),
    salaryVisible: vine.boolean().optional(),
    vacancies: vine.number().min(1).max(500).withoutDecimals(),
    deadline: vine.date({ formats: ['YYYY-MM-DD'] }).afterOrEqual('today').beforeOrEqual(() => {
      const d = new Date()
      d.setDate(d.getDate() + 180)
      return d.toISOString().slice(0, 10)
    }).optional(),
    applicationMethod: vine.enum(['platform', 'external_url', 'email'] as const),
    applicationUrl: vine
      .string()
      .trim()
      .url({ require_protocol: true, protocols: ['https', 'http'] })
      .maxLength(255)
      .optional()
      .requiredWhen('applicationMethod', '=', 'external_url'),
    applicationEmail: vine.string().trim().email().maxLength(254).optional().requiredWhen('applicationMethod', '=', 'email'),
    intent: vine.enum(['draft', 'publish'] as const),
  })
)

export const jobStatusValidator = vine.compile(
  vine.object({ status: vine.enum(['draft', 'published', 'paused', 'closed', 'archived'] as const) })
)

export const applicationStatusValidator = vine.compile(
  vine.object({
    status: vine.enum(ApplicationStatus.values),
    note: vine.string().trim().maxLength(500).optional(),
  })
)

export const noteValidator = vine.compile(vine.object({ body: vine.string().trim().minLength(1).maxLength(3000) }))

export const saveCandidateValidator = vine.compile(
  vine.object({
    listName: vine.string().trim().minLength(1).maxLength(80).optional(),
    note: vine.string().trim().maxLength(1000).optional(),
  })
)

export const savedSearchValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(100),
    query: vine.string().maxLength(2000),
    alertsEnabled: vine.boolean().optional(),
  })
)
