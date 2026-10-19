import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import string from '@adonisjs/core/helpers/string'
import db from '@adonisjs/lucid/services/db'
import Industry from '#models/industry'
import JobCategory from '#models/job_category'
import Location from '#models/location'
import Skill from '#models/skill'
import Taxonomy from '#services/taxonomy'
import AuditLogger from '#services/audit_logger'

const TYPES = {
  industries: { model: Industry, usage: [['jobs', 'industry_id'], ['companies', 'industry_id'], ['candidate_profiles', 'industry_id']] },
  categories: { model: JobCategory, usage: [['jobs', 'category_id']] },
  locations: { model: Location, usage: [['jobs', 'location_id'], ['companies', 'location_id'], ['candidate_profiles', 'current_location_id'], ['candidate_profiles', 'preferred_location_id']] },
  skills: { model: Skill, usage: [['job_skills', 'skill_id'], ['candidate_skills', 'skill_id']] },
} as const
type TypeKey = keyof typeof TYPES

const itemValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    parentId: vine.number().positive().optional(),
    active: vine.boolean().optional(),
  })
)

export default class AdminTaxonomyController {
  private resolve(type: string) {
    if (!(type in TYPES)) return null
    return TYPES[type as TypeKey]
  }

  async index({ inertia, params, request, response }: HttpContext) {
    const cfg = this.resolve(params.type)
    if (!cfg) return response.notFound()
    const pendingOnly = request.input('pending') === '1'
    const query = (cfg.model as typeof Industry).query().orderBy('name')
    if (params.type === 'skills' && pendingOnly) query.where('is_approved', false)
    const rows = await query.limit(1000)
    // locations can be added under a country (city) or a city (district)
    const parents = params.type === 'locations' ? await Location.query().whereIn('kind', ['country', 'city']).orderBy('country_code').orderBy('kind').orderBy('name') : []
    return inertia.render('admin/taxonomy', {
      type: params.type,
      pendingOnly,
      items: rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        active: r.isActive ?? r.isApproved ?? true,
        parentId: r.parentId ?? null,
        kind: r.kind ?? null,
        label: r.displayName ?? r.name,
      })),
      parents: parents.map((m) => ({ id: m.id, name: m.displayName, kind: m.kind })),
    })
  }

  async store(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const cfg = this.resolve(params.type)
    if (!cfg) return response.notFound()
    const data = await request.validateUsing(itemValidator)
    const slug = string.slug(data.name, { lower: true, strict: true }) || data.name.toLowerCase()
    if (await (cfg.model as any).findBy('slug', slug)) {
      session.flashErrors({ name: 'An item with this name already exists.' })
      return response.redirect().back()
    }
    const attrs: Record<string, unknown> = { name: data.name, slug }
    if (params.type === 'skills') attrs.isApproved = true
    else attrs.isActive = true
    if (params.type === 'locations') {
      const parent = data.parentId ? await Location.find(data.parentId) : null
      if (!parent || parent.kind === 'area') {
        session.flashErrors({ parentId: 'Choose the country or city this location belongs to.' })
        return response.redirect().back()
      }
      attrs.parentId = parent.id
      attrs.kind = parent.kind === 'country' ? 'city' : 'area'
      attrs.countryCode = parent.countryCode
      attrs.displayName = `${data.name}, ${parent.displayName}`
      if (await Location.findBy('slug', slug)) attrs.slug = `${slug}-${parent.slug}`
    }
    const row = await (cfg.model as any).create(attrs)
    Taxonomy.clear()
    await AuditLogger.log('admin.taxonomy_created', { ctx, subject: { type: params.type, id: row.id } })
    return response.redirect().back()
  }

  async update(ctx: HttpContext) {
    const { params, request, response, session } = ctx
    const cfg = this.resolve(params.type)
    if (!cfg) return response.notFound()
    const row = await (cfg.model as any).findOrFail(params.id)
    const data = await request.validateUsing(itemValidator)
    if (params.type === 'locations' && row.kind === 'country' && row.name !== data.name) {
      session.flash('error', 'Countries are fixed. Rename cities and districts instead.')
      return response.redirect().back()
    }
    row.name = data.name
    if (params.type === 'locations' && row.parentId) {
      const parent = await Location.findOrFail(row.parentId)
      row.displayName = `${data.name}, ${parent.displayName}`
      for (const child of await Location.query().where('parent_id', row.id)) {
        child.displayName = `${child.name}, ${row.displayName}`
        await child.save()
      }
    }
    if (data.active !== undefined) {
      if (params.type === 'skills') row.isApproved = data.active
      else row.isActive = data.active
    }
    await row.save()
    Taxonomy.clear()
    await AuditLogger.log('admin.taxonomy_updated', { ctx, subject: { type: params.type, id: row.id } })
    return response.redirect().back()
  }

  /** Deleting is only allowed when nothing references the item; otherwise deactivate it. */
  async destroy(ctx: HttpContext) {
    const { params, response, session } = ctx
    const cfg = this.resolve(params.type)
    if (!cfg) return response.notFound()
    const row = await (cfg.model as any).findOrFail(params.id)
    for (const [table, column] of cfg.usage) {
      const used = await db.from(table).where(column, row.id).first()
      if (used) {
        session.flash('error', `"${row.name}" is in use. Deactivate it instead of deleting.`)
        return response.redirect().back()
      }
    }
    if (params.type === 'locations' && (await Location.query().where('parent_id', row.id).first())) {
      session.flash('error', 'Remove the cities or districts inside this location first.')
      return response.redirect().back()
    }
    await row.delete()
    Taxonomy.clear()
    await AuditLogger.log('admin.taxonomy_deleted', { ctx, subject: { type: params.type, id: row.id }, meta: { name: row.name } })
    return response.redirect().back()
  }
}
