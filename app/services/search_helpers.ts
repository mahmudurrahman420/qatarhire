import Location from '#models/location'

/**
 * Escapes LIKE wildcards in user input. Uses "!" as the escape character
 * because it behaves identically on MySQL and SQLite; every LIKE in the
 * search services is written as `LIKE ? ESCAPE '!'`.
 */
export function likeTerm(term: string) {
  return `%${term.replace(/[!%_]/g, (c) => `!${c}`)}%`
}

/** Splits a keyword query into up to 6 meaningful terms. */
export function keywordTerms(q: string | undefined | null) {
  if (!q) return []
  return q
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 6)
}

/** A municipality slug matches itself and its child areas. */
export async function locationIdsForSlug(slug: string | undefined | null) {
  if (!slug) return null
  const loc = await Location.findBy('slug', slug)
  if (!loc) return []
  const children = await Location.query().where('parent_id', loc.id).select('id')
  return [loc.id, ...children.map((c) => c.id)]
}

export function toArray(v: unknown): string[] {
  if (v === undefined || v === null || v === '') return []
  return (Array.isArray(v) ? v : String(v).split(',')).map(String).filter(Boolean)
}

export function toInt(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number.parseInt(String(v), 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}
