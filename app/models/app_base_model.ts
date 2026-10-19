import { BaseModel, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'
import type { LucidModel } from '@adonisjs/lucid/types/model'

/** DB columns stay snake_case; JSON sent to the frontend uses camelCase. */
class CamelCaseSerialization extends SnakeCaseNamingStrategy {
  serializedName(_model: LucidModel, propertyName: string) {
    return propertyName
  }

  paginationMetaKeys() {
    return {
      total: 'total',
      perPage: 'perPage',
      currentPage: 'currentPage',
      lastPage: 'lastPage',
      firstPage: 'firstPage',
      firstPageUrl: 'firstPageUrl',
      lastPageUrl: 'lastPageUrl',
      nextPageUrl: 'nextPageUrl',
      previousPageUrl: 'previousPageUrl',
    }
  }
}

export default class AppBaseModel extends BaseModel {
  static namingStrategy = new CamelCaseSerialization()
}

/** MySQL (TINYINT) and SQLite return booleans as 0/1; normalise them. */
export const toBool = (v: unknown) => (v === null || v === undefined ? v : Boolean(v))

/** JSON array stored in a TEXT column (SQLite) or JSON column (MySQL). Always an array in code. */
export function jsonArray<T>() {
  return {
    prepare: (v: T[] | null | undefined) => JSON.stringify(Array.isArray(v) ? v : []),
    consume: (v: unknown): T[] => {
      if (Array.isArray(v)) return v as T[]
      if (typeof v !== 'string' || !v) return []
      try {
        const parsed = JSON.parse(v)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    },
  }
}
