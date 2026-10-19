/**
 * Enumerations shared by the server and the React frontend.
 * Pure TypeScript only: no imports, so both bundles can include this file.
 */

function labels<const T extends readonly string[]>(values: T, map: Record<T[number], string>) {
  return { values, label: (v: T[number] | null | undefined) => (v ? map[v] : ''), map }
}

export const Roles = ['candidate', 'employer', 'admin'] as const
export type Role = (typeof Roles)[number]

export const CompanyRoles = ['owner', 'recruiter'] as const
export type CompanyRole = (typeof CompanyRoles)[number]

export const EmploymentType = labels(['full_time', 'part_time', 'contract', 'temporary', 'internship'] as const, {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  temporary: 'Temporary',
  internship: 'Internship',
})
export type EmploymentTypeValue = (typeof EmploymentType.values)[number]

export const WorkArrangement = labels(['on_site', 'remote', 'hybrid'] as const, {
  on_site: 'On-site',
  remote: 'Remote',
  hybrid: 'Hybrid',
})
export type WorkArrangementValue = (typeof WorkArrangement.values)[number]

export const EducationLevel = labels(['none', 'secondary', 'diploma', 'bachelor', 'master', 'doctorate'] as const, {
  none: 'No formal requirement',
  secondary: 'Secondary school',
  diploma: 'Diploma',
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  doctorate: 'Doctorate',
})
export type EducationLevelValue = (typeof EducationLevel.values)[number]
/** Ordering used for "at least" comparisons. */
export const EducationRank: Record<EducationLevelValue, number> = {
  none: 0,
  secondary: 1,
  diploma: 2,
  bachelor: 3,
  master: 4,
  doctorate: 5,
}

export const Availability = labels(['immediately', 'within_1_month', 'within_3_months', 'not_looking'] as const, {
  immediately: 'Available immediately',
  within_1_month: 'Within 1 month',
  within_3_months: 'Within 3 months',
  not_looking: 'Not actively looking',
})
export type AvailabilityValue = (typeof Availability.values)[number]

export const WorkAuthorization = labels(
  ['gulf_resident_transferable', 'gulf_resident_family', 'gcc_national', 'requires_sponsorship', 'prefer_not_to_say'] as const,
  {
    gulf_resident_transferable: 'Gulf resident (transferable visa)',
    gulf_resident_family: 'Gulf resident (family sponsored)',
    gcc_national: 'GCC national',
    requires_sponsorship: 'Requires visa sponsorship',
    prefer_not_to_say: 'Prefer not to say',
  }
)
export type WorkAuthorizationValue = (typeof WorkAuthorization.values)[number]

export const ProfileVisibility = labels(['private', 'discoverable', 'public'] as const, {
  private: 'Private — hidden from search',
  discoverable: 'Discoverable by verified employers',
  public: 'Public — shown on the homepage and public talent search',
})

export const Gender = labels(['male', 'female'] as const, { male: 'Male', female: 'Female' })
export type GenderValue = (typeof Gender.values)[number]
export type ProfileVisibilityValue = (typeof ProfileVisibility.values)[number]

export const ContactSharing = labels(['on_application', 'verified_employers'] as const, {
  on_application: 'Only employers I apply to',
  verified_employers: 'Any verified employer who finds my profile',
})
export type ContactSharingValue = (typeof ContactSharing.values)[number]

export const LanguageProficiency = labels(['basic', 'conversational', 'professional', 'native'] as const, {
  basic: 'Basic',
  conversational: 'Conversational',
  professional: 'Professional',
  native: 'Native / bilingual',
})
export type LanguageProficiencyValue = (typeof LanguageProficiency.values)[number]

export const CompanySize = labels(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] as const, {
  '1-10': '1–10 employees',
  '11-50': '11–50 employees',
  '51-200': '51–200 employees',
  '201-500': '201–500 employees',
  '501-1000': '501–1,000 employees',
  '1000+': '1,000+ employees',
})
export type CompanySizeValue = (typeof CompanySize.values)[number]

export const VerificationStatus = labels(['pending', 'verified', 'rejected', 'suspended'] as const, {
  pending: 'Pending verification',
  verified: 'Verified',
  rejected: 'Rejected',
  suspended: 'Suspended',
})
export type VerificationStatusValue = (typeof VerificationStatus.values)[number]

export const JobStatus = labels(
  ['draft', 'pending_review', 'published', 'paused', 'closed', 'rejected', 'archived'] as const,
  {
    draft: 'Draft',
    pending_review: 'Pending review',
    published: 'Published',
    paused: 'Paused',
    closed: 'Closed',
    rejected: 'Rejected',
    archived: 'Archived',
  }
)
export type JobStatusValue = (typeof JobStatus.values)[number]

export const ApplicationMethod = labels(['platform', 'external_url', 'email'] as const, {
  platform: 'Apply on HireMeGulf',
  external_url: 'External website',
  email: 'By email',
})
export type ApplicationMethodValue = (typeof ApplicationMethod.values)[number]

export const ApplicationStatus = labels(
  ['submitted', 'under_review', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'] as const,
  {
    submitted: 'Submitted',
    under_review: 'Under review',
    shortlisted: 'Shortlisted',
    interview: 'Interview',
    offer: 'Offer',
    hired: 'Hired',
    rejected: 'Not selected',
    withdrawn: 'Withdrawn',
  }
)
export type ApplicationStatusValue = (typeof ApplicationStatus.values)[number]

/** Statuses an employer may move an application to, from a given status. */
export const ApplicationTransitions: Record<ApplicationStatusValue, ApplicationStatusValue[]> = {
  submitted: ['under_review', 'shortlisted', 'rejected'],
  under_review: ['shortlisted', 'interview', 'rejected'],
  shortlisted: ['under_review', 'interview', 'rejected'],
  interview: ['shortlisted', 'offer', 'rejected'],
  offer: ['hired', 'rejected'],
  hired: [],
  rejected: ['under_review'],
  withdrawn: [],
}
/** Statuses from which a candidate may withdraw. */
export const WithdrawableStatuses: ApplicationStatusValue[] = ['submitted', 'under_review', 'shortlisted', 'interview']

export const ReportReason = labels(
  ['scam', 'misleading', 'discriminatory', 'inappropriate', 'duplicate', 'misuse_of_data', 'other'] as const,
  {
    scam: 'Scam or fraud (e.g. asks for payment)',
    misleading: 'Misleading information',
    discriminatory: 'Discriminatory content',
    inappropriate: 'Inappropriate content',
    duplicate: 'Duplicate posting',
    misuse_of_data: 'Misuse of candidate data',
    other: 'Other',
  }
)
export type ReportReasonValue = (typeof ReportReason.values)[number]

export const ReportStatus = labels(['open', 'reviewing', 'resolved', 'dismissed'] as const, {
  open: 'Open',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
})
export type ReportStatusValue = (typeof ReportStatus.values)[number]

export const NotificationTypes = [
  'application_submitted',
  'application_received',
  'application_status_changed',
  'application_withdrawn',
  'job_published',
  'job_rejected',
  'job_expiring',
  'company_verification',
  'profile_accessed',
  'job_alert',
  'team_invite',
] as const
export type NotificationType = (typeof NotificationTypes)[number]

/** Notification types a user can opt out of by email (in-app always on). */
export const EmailNotificationPrefs = labels(
  ['application_updates', 'job_alerts', 'profile_access', 'employer_activity'] as const,
  {
    application_updates: 'Application confirmations and status changes',
    job_alerts: 'New jobs matching my saved searches',
    profile_access: 'When an employer downloads my CV',
    employer_activity: 'New applicants and job moderation results (employers)',
  }
)
export type EmailNotificationPref = (typeof EmailNotificationPrefs.values)[number]

export const SortOptionsJobs = labels(['relevance', 'newest', 'salary_high', 'deadline'] as const, {
  relevance: 'Most relevant',
  newest: 'Newest',
  salary_high: 'Highest salary',
  deadline: 'Closing soon',
})
export const SortOptionsCandidates = labels(['relevance', 'updated', 'experience'] as const, {
  relevance: 'Most relevant',
  updated: 'Recently updated',
  experience: 'Most experienced',
})
