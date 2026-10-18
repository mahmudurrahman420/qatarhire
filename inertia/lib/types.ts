import type { Role, VerificationStatusValue, CompanyRole } from '#shared/enums'

export type AuthUser = {
  id: number
  fullName: string
  email: string
  role: Role
  emailVerified: boolean
  unreadNotifications: number
  company: {
    id: number
    name: string
    slug: string
    verificationStatus: VerificationStatusValue
    logoUrl: string | null
    memberRole: CompanyRole
  } | null
}

export type SharedProps = {
  appName: string
  auth: AuthUser | null
  flash: { success: string | null; error: string | null }
  siteNotice: string | null
  errors: Record<string, string>
  locale: { code: string; dir: 'ltr' | 'rtl' }
}

export type Paginated<T> = {
  data: T[]
  meta: { total: number; page: number; lastPage: number; perPage?: number }
}

export type Salary = { min: number | null; max: number | null; currency: 'QAR'; period: 'month' } | null

export type JobCard = {
  id: number
  title: string
  slug: string
  company: { id: number; name: string; slug: string; logoUrl: string | null; verified: boolean } | null
  location: string | null
  category: string | null
  employmentType: string
  workArrangement: string
  salary: Salary
  minExperience: number
  publishedAt: string | null
  deadline: string | null
  isFeatured: boolean
  isOpen: boolean
  skills: string[]
}

export type CandidateCard = {
  id: number
  name: string
  headline: string | null
  currentJobTitle: string | null
  skills: string[]
  yearsExperience: number | null
  industry: string | null
  location: string | null
  preferredLocation: string | null
  education: string | null
  availability: string | null
  profileUpdatedAt: string
  hasCv: boolean
  completeness: number
}

export type CvBrief = {
  id: number
  label: string
  originalName: string
  sizeBytes: number
  isPrimary: boolean
  scanStatus: string
  createdAt: string
  downloadUrl: string
}

export type Taxonomy = {
  industries: { id: number; name: string; slug: string }[]
  categories: { id: number; name: string; slug: string; icon: string | null }[]
  locations: { id: number; name: string; slug: string; areas: { id: number; name: string; slug: string }[] }[]
  skills: { id: number; name: string; slug: string }[]
  languages: { id: number; name: string; code: string }[]
}
