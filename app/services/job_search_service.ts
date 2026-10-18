import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Job from '#models/job'
import { EmploymentType, WorkArrangement, EducationLevel, EducationRank, SortOptionsJobs } from '#shared/enums'
import { keywordTerms, likeTerm, locationIdsForSlug, toArray, toInt } from '#services/search_helpers'

export type JobFilters = {
  q: string
  location: string
  category: string
  industry: string
  company: string
  type: string[]
  arrangement: string[]
  education: string
  experience: number | null
  salary: number | null
  posted: number | null
  sort: string
  page: number
}

export function parseJobFilters(input: Record<string, unknown>): JobFilters {
  const pick = (v: unknown, allowed: readonly string[]) => (allowed.includes(String(v)) ? String(v) : '')
  return {
    q: String(input.q ?? '').trim().slice(0, 120),
    location: String(input.location ?? '').slice(0, 140),
    category: String(input.category ?? '').slice(0, 140),
    industry: String(input.industry ?? '').slice(0, 140),
    company: String(input.company ?? '').slice(0, 180),
    type: toArray(input.type).filter((t) => (EmploymentType.values as readonly string[]).includes(t)),
    arrangement: toArray(input.arrangement).filter((t) => (WorkArrangement.values as readonly string[]).includes(t)),
    education: pick(input.education, EducationLevel.values),
    experience: toInt(input.experience),
    salary: toInt(input.salary),
    posted: toInt(input.posted),
    sort: pick(input.sort, SortOptionsJobs.values) || 'relevance',
    page: Math.max(1, toInt(input.page) ?? 1),
  }
}

/**
 * Public job search over live jobs. Keyword terms are AND-ed; each term may
 * match the title, description, requirements, company name or a skill.
 * Relevance is a portable weighted score (title > skills > company > body).
 * Swap this class for a search-engine-backed implementation without touching controllers.
 */
export default class JobSearchService {
  static async search(f: JobFilters, perPage = 20) {
    const query = Job.query().withScopes((s) => s.live())
    const terms = keywordTerms(f.q)

    for (const term of terms) {
      const like = likeTerm(term)
      query.where((w) => {
        w.whereRaw('LOWER(jobs.title) LIKE ? ESCAPE \'!\'', [like])
          .orWhereRaw('LOWER(jobs.description) LIKE ? ESCAPE \'!\'', [like])
          .orWhereRaw('LOWER(COALESCE(jobs.requirements, \'\')) LIKE ? ESCAPE \'!\'', [like])
          .orWhereHas('company', (c) => c.whereRaw('LOWER(companies.name) LIKE ? ESCAPE \'!\'', [like]))
          .orWhereHas('skills', (s) => s.whereRaw('LOWER(skills.name) LIKE ? ESCAPE \'!\'', [like]))
      })
    }

    const locIds = await locationIdsForSlug(f.location)
    if (locIds) query.whereIn('jobs.location_id', locIds.length ? locIds : [-1])
    if (f.category) query.whereHas('category', (c) => c.where('slug', f.category))
    if (f.industry) query.whereHas('industry', (c) => c.where('slug', f.industry))
    if (f.company) query.whereHas('company', (c) => c.where('slug', f.company))
    if (f.type.length) query.whereIn('jobs.employment_type', f.type)
    if (f.arrangement.length) query.whereIn('jobs.work_arrangement', f.arrangement)
    if (f.education) {
      // jobs whose requirement is at or below the candidate's level (or unspecified)
      const allowed = EducationLevel.values.filter((v) => EducationRank[v] <= EducationRank[f.education as keyof typeof EducationRank])
      query.where((q) => q.whereNull('jobs.education_level').orWhereIn('jobs.education_level', allowed))
    }
    if (f.experience !== null) query.where('jobs.min_experience', '<=', f.experience)
    if (f.salary !== null) {
      // salary filters use stored values even when hidden from display; values are never revealed
      query.whereRaw('COALESCE(jobs.salary_max, jobs.salary_min) >= ?', [f.salary])
    }
    if (f.posted) query.where('jobs.published_at', '>=', DateTime.now().minus({ days: f.posted }).toSQL({ includeOffset: false })!)

    // relevance score
    if (terms.length && f.sort === 'relevance') {
      const parts: string[] = []
      const bindings: string[] = []
      for (const term of terms) {
        const like = likeTerm(term)
        parts.push(`(CASE WHEN LOWER(jobs.title) LIKE ? ESCAPE '!' THEN 5 ELSE 0 END)`)
        parts.push(`(CASE WHEN EXISTS (SELECT 1 FROM job_skills js JOIN skills s ON s.id = js.skill_id WHERE js.job_id = jobs.id AND LOWER(s.name) LIKE ? ESCAPE '!') THEN 3 ELSE 0 END)`)
        parts.push(`(CASE WHEN LOWER(jobs.description) LIKE ? ESCAPE '!' THEN 1 ELSE 0 END)`)
        bindings.push(like, like, like)
      }
      query.select('jobs.*').select(db.raw(`(${parts.join(' + ')}) AS relevance`, bindings))
      query.orderBy('relevance', 'desc').orderBy('jobs.is_featured', 'desc').orderBy('jobs.published_at', 'desc')
    } else if (f.sort === 'salary_high') {
      query.orderByRaw('COALESCE(jobs.salary_max, jobs.salary_min, 0) DESC').orderBy('jobs.published_at', 'desc')
    } else if (f.sort === 'deadline') {
      query.orderByRaw('CASE WHEN jobs.deadline IS NULL THEN 1 ELSE 0 END').orderBy('jobs.deadline', 'asc')
    } else {
      // newest; featured jobs float to the top for the default listing
      if (f.sort === 'relevance') query.orderBy('jobs.is_featured', 'desc')
      query.orderBy('jobs.published_at', 'desc')
    }
    query.orderBy('jobs.id', 'desc')

    query.preload('company').preload('location').preload('category').preload('skills', (s) => s.limit(6))
    return query.paginate(f.page, perPage)
  }
}
