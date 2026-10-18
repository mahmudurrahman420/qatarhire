import { DateTime } from 'luxon'
import { column } from '@adonisjs/lucid/orm'
import AppBaseModel, { toBool } from '#models/app_base_model'
import string from '@adonisjs/core/helpers/string'

/** Slug that keeps programming-language symbols distinct: C#, C++ and C are different skills. */
export function skillSlug(name: string) {
  const expanded = name
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/#/g, ' sharp ')
    .replace(/^\./, 'dot ')
    .replace(/\.(?=\w)/g, ' dot ')
  return string.slug(expanded, { lower: true, strict: true }) || name.toLowerCase()
}

export default class Skill extends AppBaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column({ consume: toBool, serializeAs: null })
  declare isApproved: boolean

  @column.dateTime({ autoCreate: true, serializeAs: null })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  declare updatedAt: DateTime

  /**
   * Resolves free-text skill names to Skill rows, creating unknown ones as
   * unapproved (admins can review/merge them). Returns ids, de-duplicated.
   */
  static async resolveIds(names: string[]) {
    const ids = new Set<number>()
    for (const raw of names) {
      const name = raw.trim().replace(/\s+/g, ' ').slice(0, 80)
      if (!name) continue
      const slug = skillSlug(name)
      const skill = await this.firstOrCreate({ slug }, { name, slug, isApproved: false })
      ids.add(skill.id)
    }
    return [...ids]
  }
}
