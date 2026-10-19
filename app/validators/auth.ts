import vine from '@vinejs/vine'

const password = vine.string().minLength(10).maxLength(128)

export const candidateRegisterValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(120),
    email: vine.string().trim().email().normalizeEmail().maxLength(254),
    password: password.clone().confirmed({ confirmationField: 'passwordConfirmation' }),
    acceptTerms: vine.accepted(),
  })
)

export const employerRegisterValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(120),
    email: vine.string().trim().email().normalizeEmail().maxLength(254),
    password: password.clone().confirmed({ confirmationField: 'passwordConfirmation' }),
    companyName: vine.string().trim().minLength(2).maxLength(160),
    website: vine.string().trim().url({ require_protocol: true }).maxLength(255).optional(),
    industryId: vine.number().positive().optional(),
    locationId: vine.number().positive().optional(),
    phone: vine.string().trim().maxLength(30).regex(/^[+\d\s()-]{6,30}$/).optional(),
    crNumber: vine.string().trim().maxLength(40).optional(),
    acceptTerms: vine.accepted(),
  })
)

export const companySetupValidator = vine.compile(
  vine.object({
    companyName: vine.string().trim().minLength(2).maxLength(160),
    website: vine.string().trim().url({ require_protocol: true }).maxLength(255).optional(),
    industryId: vine.number().positive().optional(),
    locationId: vine.number().positive().optional(),
    phone: vine.string().trim().maxLength(30).regex(/^[+\d\s()-]{6,30}$/).optional(),
    crNumber: vine.string().trim().maxLength(40).optional(),
    acceptTerms: vine.accepted(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string().maxLength(128),
  })
)

export const forgotPasswordValidator = vine.compile(
  vine.object({ email: vine.string().trim().email().normalizeEmail() })
)

export const resetPasswordValidator = vine.compile(
  vine.object({ password: password.clone().confirmed({ confirmationField: 'passwordConfirmation' }) })
)

export const acceptInviteValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(120),
    password: password.clone().confirmed({ confirmationField: 'passwordConfirmation' }),
  })
)

export const accountValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(120),
    prefs: vine
      .object({
        application_updates: vine.boolean().optional(),
        job_alerts: vine.boolean().optional(),
        profile_access: vine.boolean().optional(),
        employer_activity: vine.boolean().optional(),
      })
      .optional(),
  })
)

export const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string().maxLength(128),
    password: password.clone().confirmed({ confirmationField: 'passwordConfirmation' }),
  })
)
