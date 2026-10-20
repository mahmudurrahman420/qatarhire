/**
 * Runtime auth switches, read from process.env per call (the env file is loaded into
 * process.env at boot) so tests can toggle them.
 */
const truthy = (v: string | undefined) => ['true', '1', 'yes', 'on'].includes((v ?? '').trim().toLowerCase())

/** EMAIL_VERIFICATION_REQUIRED, default false: without it, accounts are verified at sign-up. */
export function emailVerificationRequired() {
  return truthy(process.env.EMAIL_VERIFICATION_REQUIRED)
}

/**
 * False in production while MAIL_MAILER=log: nothing actually reaches an inbox.
 * (In development/test the log mailer writes previews, so flows keep working.)
 */
export function mailDeliverable() {
  const logOnly = (process.env.MAIL_MAILER ?? 'log').trim().toLowerCase() === 'log'
  return !(logOnly && process.env.NODE_ENV === 'production')
}

export function supportEmail() {
  return process.env.SUPPORT_EMAIL?.trim() || null
}
