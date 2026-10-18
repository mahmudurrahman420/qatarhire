import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * FULLTEXT indexes are MySQL-specific. On SQLite (development/tests) the
 * search services fall back to LIKE matching, so this migration is a no-op.
 */
export default class extends BaseSchema {
  private get isMysql() {
    return this.db.dialect.name === 'mysql'
  }

  async up() {
    if (!this.isMysql) return
    this.defer(async (db) => {
      await db.rawQuery('ALTER TABLE jobs ADD FULLTEXT INDEX jobs_fulltext (title, description, requirements)')
      await db.rawQuery('ALTER TABLE candidate_profiles ADD FULLTEXT INDEX candidate_profiles_fulltext (headline, current_job_title, summary)')
    })
  }

  async down() {
    if (!this.isMysql) return
    this.defer(async (db) => {
      await db.rawQuery('ALTER TABLE jobs DROP INDEX jobs_fulltext')
      await db.rawQuery('ALTER TABLE candidate_profiles DROP INDEX candidate_profiles_fulltext')
    })
  }
}
