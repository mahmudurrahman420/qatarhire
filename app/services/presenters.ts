import type Job from '#models/job'
import type Company from '#models/company'
import type CandidateProfile from '#models/candidate_profile'
import type CandidateCv from '#models/candidate_cv'
import { EducationLevel } from '#shared/enums'
import Taxonomy from '#services/taxonomy'
import { Benefit, CareerLevel, DesiredEmploymentType, NoticePeriod, salaryRangeLabel } from '#shared/profile_options'
import { toSafeHtml } from '#shared/rich_text'

/**
 * Presenters decide exactly which fields leave the server for each view.
 * Pages never receive raw models for sensitive records.
 */

export function companyBrief(c: Company) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logoUrl,
    verified: c.isVerified,
  }
}

export function jobCard(j: Job) {
  return {
    id: j.id,
    title: j.title,
    slug: j.slug,
    company: j.company ? companyBrief(j.company) : null,
    location: j.location ? j.location.shortName : null,
    countryCode: j.location?.countryCode ?? null,
    category: j.category ? j.category.name : null,
    employmentType: j.employmentType,
    workArrangement: j.workArrangement,
    salary: j.publicSalary,
    minExperience: j.minExperience,
    publishedAt: j.publishedAt?.toISO() ?? null,
    deadline: j.deadline?.toISODate() ?? null,
    isFeatured: j.isFeatured,
    isOpen: j.isOpen,
    skills: j.skills ? j.skills.map((s) => s.name) : [],
  }
}

export function jobDetail(j: Job) {
  return {
    ...jobCard(j),
    description: j.description,
    responsibilities: j.responsibilities,
    requirements: j.requirements,
    educationLevel: j.educationLevel,
    vacancies: j.vacancies,
    industry: j.industry ? j.industry.name : null,
    applicationMethod: j.applicationMethod,
    applicationUrl: j.applicationMethod === 'external_url' ? j.applicationUrl : null,
    applicationEmail: j.applicationMethod === 'email' ? j.applicationEmail : null,
    status: j.status,
    isExpired: j.isExpired,
    updatedAt: j.updatedAt.toISO(),
  }
}

/** First name + last initial: enough for recruiters, not a full identity. */
export function displayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function generalLocation(p: CandidateProfile) {
  const loc = p.currentLocation
  if (!loc) return p.currentLocationText ? p.currentLocationText.split(',').slice(-2).join(',').trim() : null
  return loc.shortName
}

function educationSummary(p: CandidateProfile) {
  const latest = p.educations?.[0]
  if (latest) return `${latest.qualification}${latest.fieldOfStudy ? `, ${latest.fieldOfStudy}` : ''}`
  return p.educationLevel ? EducationLevel.label(p.educationLevel) : null
}

/** The CV anyone may download: only for public profiles that opted in to CV downloads. */
export function publicCvUrl(p: CandidateProfile) {
  if (!p.isPublic || !p.cvSearchable) return null
  const primary = (p.cvs ?? []).find((c) => c.isPrimary && c.isDownloadable)
  return primary ? `/files/cvs/${primary.id}` : null
}

/**
 * Card shown in search results and on the homepage. Never includes contact details.
 * Public profiles show the full name and photo the candidate chose to publish;
 * employer-only (discoverable) profiles show first name + initial and no photo.
 */
export function candidateCard(p: CandidateProfile) {
  const isPublic = p.isPublic
  return {
    id: p.id,
    isPublic,
    name: isPublic ? p.user.fullName : displayName(p.user.fullName),
    photoUrl: isPublic ? p.photoUrl : null,
    headline: p.headline,
    desiredPosition: p.desiredPosition || p.currentJobTitle || p.headline,
    currentJobTitle: p.currentJobTitle,
    gender: p.gender,
    skills: (p.skills ?? []).map((s) => s.name).slice(0, 8),
    yearsExperience: p.yearsExperience,
    industry: p.industry?.name ?? null,
    location: generalLocation(p),
    preferredLocation: p.preferredLocation?.shortName ?? null,
    education: educationSummary(p),
    availability: p.availability,
    profileUpdatedAt: p.profileUpdatedAt?.toISO() ?? p.updatedAt.toISO(),
    hasCv: p.cvSearchable && (p.cvs ?? []).some((c) => c.isPrimary),
    publicCvUrl: publicCvUrl(p),
    completeness: p.completeness,
  }
}

export function cvBrief(cv: CandidateCv) {
  return {
    id: cv.id,
    label: cv.label,
    originalName: cv.originalName,
    sizeBytes: cv.sizeBytes,
    isPrimary: cv.isPrimary,
    scanStatus: cv.scanStatus,
    createdAt: cv.createdAt.toISO(),
    downloadUrl: `/files/cvs/${cv.id}`,
  }
}

/**
 * Full profile for the profile page. Contact details, social links and CVs only when
 * consent allows; current salary and disability only for employers.
 */
export async function candidateDetail(p: CandidateProfile, access: { canSeeContact: boolean; cvIds: number[] }, opts: { forEmployer?: boolean } = {}) {
  const tax = await Taxonomy.all()
  const industryName = new Map(tax.industries.map((i) => [i.id, i.name]))
  const categoryName = new Map(tax.categories.map((c) => [c.id, c.name]))
  const cityName = new Map(tax.locations.flatMap((c) => c.cities.map((city) => [city.id, city.name] as const)))
  const names = (ids: number[], map: Map<number, string>) => ids.map((id) => map.get(id)).filter((v): v is string => Boolean(v))
  const industryIds = p.industryIds?.length ? p.industryIds : p.industryId ? [p.industryId] : []
  const employer = Boolean(opts.forEmployer)
  return {
    ...candidateCard(p),
    fullName: access.canSeeContact || p.isPublic ? p.user.fullName : displayName(p.user.fullName),
    summary: p.summary,
    summaryHtml: toSafeHtml(p.summary),
    expectedSalary: p.expectedSalary,
    expectedSalaryCurrency: p.expectedSalaryCurrency,
    noticePeriodDays: p.noticePeriodDays,
    noticePeriod: p.noticePeriod ? NoticePeriod.label(p.noticePeriod) : null,
    workAuthorization: p.workAuthorization,
    openToRelocation: p.openToRelocation,
    educationLevel: p.educationLevel,
    employmentStatus: p.employmentStatus ? (p.employmentStatus === 'employed' ? 'Currently employed' : 'Currently not employed') : null,
    careerLevel: p.careerLevel ? CareerLevel.label(p.careerLevel) : null,
    hasGccExperience: p.hasGccExperience,
    hasDrivingLicence: p.hasDrivingLicence,
    industries: names(industryIds, industryName),
    functions: names(p.functionIds ?? [], categoryName),
    desiredEmploymentTypes: (p.desiredEmploymentTypes ?? []).map((t) => DesiredEmploymentType.label(t)),
    benefits: (p.benefits ?? []).map((b) => Benefit.label(b)),
    preferredPositions: p.preferredPositions ?? [],
    preferredIndustries: names(p.preferredIndustryIds ?? [], industryName),
    preferredCities: names(p.preferredCityIds ?? [], cityName),
    currentSalary: employer ? salaryRangeLabel(p.currentSalaryRange, p.currentSalaryCurrency) : null,
    hasDisability: employer ? p.hasDisability : null,
    linkedinUrl: access.canSeeContact ? p.linkedinUrl : null,
    portfolioUrl: access.canSeeContact ? p.portfolioUrl : null,
    experiences: (p.experiences ?? []).map((e) => ({
      ...e.serialize(),
      employmentType: e.employmentType ? DesiredEmploymentType.label(e.employmentType) : null,
      descriptionHtml: toSafeHtml(e.description),
    })),
    educations: (p.educations ?? []).map((e) => ({ ...e.serialize(), startDate: e.startDate?.toISODate() ?? null, endDate: e.endDate?.toISODate() ?? null })),
    certifications: (p.certifications ?? []).map((c) => c.serialize()),
    languages: (p.languages ?? []).map((l) => ({ name: l.name, proficiency: l.$extras.pivot_proficiency })),
    contact: access.canSeeContact
      ? { email: p.contactEmail || p.user.email, phone: p.phone, whatsapp: p.whatsapp, instagramUrl: p.instagramUrl, facebookUrl: p.facebookUrl }
      : null,
    cvs: (p.cvs ?? []).filter((cv) => access.cvIds.includes(cv.id) && cv.isDownloadable).map(cvBrief),
  }
}
