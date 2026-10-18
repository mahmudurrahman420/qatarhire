import Industry from '#models/industry'
import JobCategory from '#models/job_category'
import Location from '#models/location'
import Skill from '#models/skill'
import Language from '#models/language'

let cache: { at: number; data: Awaited<ReturnType<typeof load>> } | null = null

async function load() {
  const [industries, categories, locations, skills, languages] = await Promise.all([
    Industry.query().where('is_active', true).orderBy('sort_order').orderBy('name'),
    JobCategory.query().where('is_active', true).orderBy('sort_order').orderBy('name'),
    Location.query().where('is_active', true).orderBy('kind', 'desc').orderBy('sort_order'),
    Skill.query().where('is_approved', true).orderBy('name'),
    Language.query().orderBy('name'),
  ])
  const municipalities = locations.filter((l) => l.kind === 'municipality')
  return {
    industries: industries.map((i) => ({ id: i.id, name: i.name, slug: i.slug })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon })),
    locations: municipalities.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      areas: locations.filter((a) => a.parentId === m.id).map((a) => ({ id: a.id, name: a.name, slug: a.slug })),
    })),
    skills: skills.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
    languages: languages.map((l) => ({ id: l.id, name: l.name, code: l.code })),
  }
}

/** Cached lookup lists for filters and forms (refreshed every minute or on admin edits). */
export default class Taxonomy {
  static async all() {
    if (cache && Date.now() - cache.at < 60_000) return cache.data
    cache = { at: Date.now(), data: await load() }
    return cache.data
  }
  static clear() {
    cache = null
  }
}
