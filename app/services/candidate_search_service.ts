import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import CandidateProfile from '#models/candidate_profile'
import Skill from '#models/skill'
import Language from '#models/language'
import {
  Availability,
  EducationLevel,
  EducationRank,
  SortOptionsCandidates,
  WorkAuthorization,
} from '#shared/enums'
import { Currencies, countryBySlug } from '#shared/gulf'
import { keywordTerms, likeTerm, locationIdsForSlug, toArray, toInt } from '#services/search_helpers'

export type CandidateFilters = {
  q: string
  title: string
  skills: string[]
  skillMode: 'all' | 'any'
  industry: string
  expMin: number | null
  expMax: number | null
  education: string
  certification: string
  languages: string[]
  location: string
  preferred: string
  salaryMin: number | null
  salaryMax: number | null
  currency: string
  gender: string
  availability: string[]
  noticeMax: number | null
  authorization: string[]
  updated: number | null
  completeness: number | null
  hasCv: boolean
  sort: string
  page: number
}

export function parseCandidateFilters(input: Record<string, unknown>): CandidateFilters {
  const pick = (v: unknown, allowed: readonly string[]) => (allowed.includes(String(v)) ? String(v) : '')
  return {
    q: String(input.q ?? '').trim().slice(0, 120),
    title: String(input.title ?? '').trim().slice(0, 120),
    skills: toArray(input.skills).slice(0, 15),
    skillMode: input.skillMode === 'any' ? 'any' : 'all',
    industry: String(input.industry ?? '').slice(0, 140),
    expMin: toInt(input.expMin),
    expMax: toInt(input.expMax),
    education: pick(input.education, EducationLevel.values),
    certification: String(input.certification ?? '').trim().slice(0, 120),
    languages: toArray(input.languages).slice(0, 10),
    location: String(input.location ?? '').slice(0, 140),
    preferred: String(input.preferred ?? '').slice(0, 140),
    salaryMin: toInt(input.salaryMin),
    salaryMax: toInt(input.salaryMax),
    currency: Currencies.includes(String(input.currency) as never) ? String(input.currency) : '',
    gender: input.gender === 'male' || input.gender === 'female' ? input.gender : '',
    availability: toArray(input.availability).filter((v) => (Availability.values as readonly string[]).includes(v)),
    noticeMax: toInt(input.noticeMax),
    authorization: toArray(input.authorization).filter((v) => (WorkAuthorization.values as readonly string[]).includes(v)),
    updated: toInt(input.updated),
    completeness: toInt(input.completeness),
    hasCv: input.hasCv === '1' || input.hasCv === 'true' || input.hasCv === true,
    sort: pick(input.sort, SortOptionsCandidates.values) || 'relevance',
    page: Math.max(1, toInt(input.page) ?? 1),
  }
}

/**
 * Candidate search. Returns active, email-verified candidates who opted in:
 *  - scope 'employer': discoverable + public profiles (caller checked the company may search)
 *  - scope 'public':   public profiles only (homepage and /talent, no sign-in)
 */
export default class CandidateSearchService {
  static baseQuery(scope: 'employer' | 'public' = 'employer') {
    return CandidateProfile.query()
      .whereIn('candidate_profiles.visibility', scope === 'public' ? ['public'] : ['discoverable', 'public'])
      .whereHas('user', (u) => u.where('status', 'active').whereNotNull('email_verified_at'))
  }

  static async search(
    f: CandidateFilters,
    perPage = 20,
    scope: 'employer' | 'public' = 'employer',
    extra?: (q: ReturnType<typeof CandidateSearchService.baseQuery>) => void
  ) {
    const query = this.baseQuery(scope)
    extra?.(query)
    const terms = keywordTerms(f.q)

    for (const term of terms) {
      const like = likeTerm(term)
      query.where((w) => {
        w.whereRaw('LOWER(COALESCE(candidate_profiles.headline, \'\')) LIKE ? ESCAPE \'!\'', [like])
          .orWhereRaw('LOWER(COALESCE(candidate_profiles.current_job_title, \'\')) LIKE ? ESCAPE \'!\'', [like])
          .orWhereRaw('LOWER(COALESCE(candidate_profiles.summary, \'\')) LIKE ? ESCAPE \'!\'', [like])
          .orWhereHas('skills', (s) => s.whereRaw('LOWER(skills.name) LIKE ? ESCAPE \'!\'', [like]))
          .orWhereHas('experiences', (e) => e.whereRaw('LOWER(job_title) LIKE ? ESCAPE \'!\'', [like]))
          .orWhereHas('certifications', (c) => c.whereRaw('LOWER(name) LIKE ? ESCAPE \'!\'', [like]))
      })
    }

    if (f.title) {
      const like = likeTerm(f.title.toLowerCase())
      query.where((w) => {
        w.whereRaw('LOWER(COALESCE(candidate_profiles.current_job_title, \'\')) LIKE ? ESCAPE \'!\'', [like])
          .orWhereRaw('LOWER(COALESCE(candidate_profiles.headline, \'\')) LIKE ? ESCAPE \'!\'', [like])
          .orWhereHas('experiences', (e) => e.whereRaw('LOWER(job_title) LIKE ? ESCAPE \'!\'', [like]))
      })
    }

    if (f.skills.length) {
      const skillRows = await Skill.query().whereIn('slug', f.skills).select('id')
      const ids = skillRows.map((s) => s.id)
      // "has all": an unknown skill can't be satisfied, so it must not be silently dropped
      if (!ids.length || (f.skillMode === 'all' && ids.length < new Set(f.skills).size)) {
        query.whereRaw('1 = 0')
      } else if (f.skillMode === 'any') {
        query.whereHas('skills', (s) => s.whereIn('skills.id', ids))
      } else {
        for (const id of ids) query.whereHas('skills', (s) => s.where('skills.id', id))
      }
    }

    if (f.languages.length) {
      const langs = await Language.query().whereIn('code', f.languages).select('id')
      if (!langs.length) query.whereRaw('1 = 0')
      for (const l of langs) query.whereHas('languages', (q) => q.where('languages.id', l.id))
    }

    if (f.industry) query.whereHas('industry', (i) => i.where('slug', f.industry))
    if (f.expMin !== null) query.where('candidate_profiles.years_experience', '>=', f.expMin)
    if (f.expMax !== null) query.where('candidate_profiles.years_experience', '<=', f.expMax)
    if (f.education) {
      const atLeast = EducationLevel.values.filter((v) => EducationRank[v] >= EducationRank[f.education as keyof typeof EducationRank])
      query.whereIn('candidate_profiles.education_level', atLeast)
    }
    if (f.certification) {
      const like = likeTerm(f.certification.toLowerCase())
      query.whereHas('certifications', (c) => c.whereRaw('LOWER(name) LIKE ? ESCAPE \'!\'', [like]))
    }
    const cur = await locationIdsForSlug(f.location)
    if (cur) query.whereIn('candidate_profiles.current_location_id', cur.length ? cur : [-1])
    const pref = await locationIdsForSlug(f.preferred)
    if (pref) query.whereIn('candidate_profiles.preferred_location_id', pref.length ? pref : [-1])
    if (f.salaryMin !== null || f.salaryMax !== null) {
      // salaries are only comparable within one currency
      const currency = f.currency || countryBySlug(f.preferred || f.location)?.currency || 'AED'
      query.where('candidate_profiles.expected_salary_currency', currency)
      if (f.salaryMin !== null) query.where('candidate_profiles.expected_salary', '>=', f.salaryMin)
      if (f.salaryMax !== null) query.where('candidate_profiles.expected_salary', '<=', f.salaryMax)
    }
    if (f.gender) query.where('candidate_profiles.gender', f.gender)
    if (f.availability.length) query.whereIn('candidate_profiles.availability', f.availability)
    if (f.noticeMax !== null) query.where('candidate_profiles.notice_period_days', '<=', f.noticeMax)
    if (f.authorization.length) query.whereIn('candidate_profiles.work_authorization', f.authorization)
    if (f.updated) query.where('candidate_profiles.profile_updated_at', '>=', DateTime.now().minus({ days: f.updated }).toSQL({ includeOffset: false })!)
    if (f.completeness !== null) query.where('candidate_profiles.completeness', '>=', f.completeness)
    if (f.hasCv) {
      query.where('candidate_profiles.cv_searchable', true).whereHas('cvs', (c) => c.where('is_primary', true))
    }

    if (terms.length && f.sort === 'relevance') {
      const parts: string[] = []
      const bindings: string[] = []
      for (const term of terms) {
        const like = likeTerm(term)
        parts.push(`(CASE WHEN LOWER(COALESCE(candidate_profiles.headline, '')) LIKE ? ESCAPE '!' THEN 4 ELSE 0 END)`)
        parts.push(`(CASE WHEN LOWER(COALESCE(candidate_profiles.current_job_title, '')) LIKE ? ESCAPE '!' THEN 4 ELSE 0 END)`)
        parts.push(`(CASE WHEN EXISTS (SELECT 1 FROM candidate_skills cs JOIN skills s ON s.id = cs.skill_id WHERE cs.candidate_profile_id = candidate_profiles.id AND LOWER(s.name) LIKE ? ESCAPE '!') THEN 3 ELSE 0 END)`)
        parts.push(`(CASE WHEN LOWER(COALESCE(candidate_profiles.summary, '')) LIKE ? ESCAPE '!' THEN 1 ELSE 0 END)`)
        bindings.push(like, like, like, like)
      }
      query.select('candidate_profiles.*').select(db.raw(`(${parts.join(' + ')}) AS relevance`, bindings))
      query.orderBy('relevance', 'desc').orderBy('candidate_profiles.completeness', 'desc')
    } else if (f.sort === 'experience') {
      query.orderByRaw('COALESCE(candidate_profiles.years_experience, 0) DESC')
    } else if (f.sort === 'relevance') {
      query.orderBy('candidate_profiles.completeness', 'desc')
    }
    query.orderBy('candidate_profiles.profile_updated_at', 'desc').orderBy('candidate_profiles.id', 'desc')

    query
      .preload('user')
      .preload('industry')
      .preload('currentLocation', (l) => l.preload('parent'))
      .preload('preferredLocation')
      .preload('skills')
      .preload('educations')
      .preload('cvs', (c) => c.where('is_primary', true))
    return query.paginate(f.page, perPage)
  }
}
