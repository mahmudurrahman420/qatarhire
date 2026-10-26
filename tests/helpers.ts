import { DateTime } from 'luxon'
import { writeFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import string from '@adonisjs/core/helpers/string'
import User from '#models/user'
import Company from '#models/company'
import CompanyUser from '#models/company_user'
import CandidateProfile from '#models/candidate_profile'
import Job from '#models/job'
import Location from '#models/location'
import JobCategory from '#models/job_category'
import Skill from '#models/skill'
import SettingsService from '#services/settings_service'
import limiter from '@adonisjs/limiter/services/main'
import type { VerificationStatusValue } from '#shared/enums'

export const PASSWORD = 'TestPassword#123'
const uid = () => randomUUID().slice(0, 8)

/** Removes all non-reference data between tests. Reference tables (taxonomy) stay seeded. */
export async function resetData() {
  const tables = [
    'application_notes', 'application_status_histories', 'applications', 'saved_jobs', 'saved_candidates', 'saved_searches',
    'candidate_access_logs', 'job_skills', 'jobs', 'candidate_cvs', 'candidate_skills', 'candidate_languages', 'candidate_certifications',
    'candidate_educations', 'candidate_experiences', 'candidate_profiles', 'company_verifications', 'company_users', 'companies',
    'reports', 'audit_logs', 'notifications', 'user_tokens', 'social_accounts', 'users', 'platform_settings', 'queued_jobs', 'pending_signups',
  ]
  for (const t of tables) await db.from(t).delete()
  SettingsService.clearCache()
  await limiter.clear(['memory'])
}

export async function makeCandidate(opts: Partial<{ verified: boolean; visibility: 'private' | 'discoverable' | 'public'; contactSharing: 'on_application' | 'verified_employers'; cvSearchable: boolean; profile: Partial<CandidateProfile>; skills: string[] }> = {}) {
  const user = await User.create({
    fullName: `Cand ${uid()} Person`,
    email: `cand-${uid()}@test.example`,
    password: PASSWORD,
    role: 'candidate',
    status: 'active',
    emailVerifiedAt: opts.verified === false ? null : DateTime.now(),
  })
  const profile = await CandidateProfile.create({
    userId: user.id,
    contactEmail: user.email,
    phone: '+974 5555 0000',
    headline: 'Experienced professional',
    visibility: opts.visibility ?? 'private',
    contactSharing: opts.contactSharing ?? 'on_application',
    cvSearchable: opts.cvSearchable ?? false,
    ...opts.profile,
  })
  if (opts.skills) await profile.related('skills').sync(await Skill.resolveIds(opts.skills))
  return { user, profile }
}

export async function makeEmployer(status: VerificationStatusValue = 'verified', role: 'owner' | 'recruiter' = 'owner', existing?: Company) {
  const user = await User.create({
    fullName: `Emp ${uid()}`,
    email: `emp-${uid()}@company.example`,
    password: PASSWORD,
    role: 'employer',
    status: 'active',
    emailVerifiedAt: DateTime.now(),
  })
  const name = `Company ${uid()}`
  const company =
    existing ??
    (await Company.create({ name, slug: string.slug(name, { lower: true }), contactName: user.fullName, contactEmail: user.email, verificationStatus: status }))
  await CompanyUser.create({ companyId: company.id, userId: user.id, role })
  return { user, company }
}

export async function makeAdmin() {
  return User.create({ fullName: 'Admin', email: `admin-${uid()}@test.example`, password: PASSWORD, role: 'admin', status: 'active', emailVerifiedAt: DateTime.now() })
}

export async function refIds() {
  const doha = await Location.findByOrFail('slug', 'doha')
  const westBay = await Location.findByOrFail('slug', 'west-bay')
  const lusail = await Location.findByOrFail('slug', 'lusail')
  const it = await JobCategory.findByOrFail('slug', 'it-and-software')
  return { doha, westBay, lusail, it }
}

export async function makeJob(company: Company, overrides: Partial<Job> = {}, skills: string[] = []) {
  const { westBay, it } = await refIds()
  const title = overrides.title ?? `Engineer ${uid()}`
  const job = await Job.create({
    companyId: company.id,
    title,
    slug: `${string.slug(title, { lower: true })}-${uid()}`,
    categoryId: it.id,
    locationId: westBay.id,
    description: 'A real job description that is long enough to pass validation for this test.',
    minExperience: 2,
    employmentType: 'full_time',
    workArrangement: 'on_site',
    salaryMin: 10000,
    salaryMax: 15000,
    salaryVisible: true,
    vacancies: 1,
    deadline: DateTime.now().plus({ days: 20 }),
    applicationMethod: 'platform',
    status: 'published',
    publishedAt: DateTime.now().minus({ days: 1 }),
    ...overrides,
  })
  if (skills.length) await job.related('skills').sync(await Skill.resolveIds(skills))
  return job
}

/** Writes a small file to tmp and returns its path, for multipart uploads. */
export async function tmpFile(name: string, content: Buffer | string) {
  const dir = app.tmpPath('uploads-test')
  await mkdir(dir, { recursive: true })
  const path = `${dir}/${uid()}-${name}`
  await writeFile(path, content)
  return path
}

export const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n')

/** Signup through the email-OTP step: posts the form, swaps in a known code, submits it. */
export async function signupWithOtp(client: any, path: string, form: Record<string, string>, code = '123456') {
  const first = await client.post(path).form(form).withCsrfToken().redirects(0)
  const token = first.session().pending_signup as string | undefined
  if (!token) return { first, final: null, token: null }
  const { default: hash } = await import('@adonisjs/core/services/hash')
  await db.from('pending_signups').where('token', token).update({ code_hash: await hash.make(code) })
  const final = await client.post('/signup/verify').form({ code }).withSession({ pending_signup: token }).withCsrfToken().redirects(0)
  return { first, final, token }
}
