import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Full jobseeker profile (personal, employment information, preferences, contact, social).
 * Additive only: existing rows keep their data, new columns are nullable or defaulted.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('candidate_profiles', (table) => {
      table.boolean('has_driving_licence').nullable()
      table.boolean('has_disability').nullable()
      table.string('employment_status', 20).nullable()
      table.string('career_level', 30).nullable()
      table.boolean('has_gcc_experience').nullable()
      table.string('notice_period', 20).nullable()
      table.string('current_salary_range', 20).nullable()
      table.string('current_salary_currency', 3).nullable()
      table.string('whatsapp', 30).nullable()
      table.string('instagram_url', 255).nullable()
      table.string('facebook_url', 255).nullable()
      // multi-selects, stored as JSON arrays
      table.text('industry_ids').nullable()
      table.text('function_ids').nullable()
      table.text('desired_employment_types').nullable()
      table.text('benefits').nullable()
      table.text('preferred_positions').nullable()
      table.text('preferred_industry_ids').nullable()
      table.text('preferred_city_ids').nullable()
    })

    this.schema.alterTable('candidate_educations', (table) => {
      table.date('start_date').nullable()
      table.date('end_date').nullable()
      table.boolean('is_custom_institute').notNullable().defaultTo(false)
    })

    this.schema.alterTable('candidate_experiences', (table) => {
      table.string('employment_type', 20).nullable()
    })
  }

  async down() {
    this.schema.alterTable('candidate_experiences', (table) => {
      table.dropColumn('employment_type')
    })
    this.schema.alterTable('candidate_educations', (table) => {
      table.dropColumns('start_date', 'end_date', 'is_custom_institute')
    })
    this.schema.alterTable('candidate_profiles', (table) => {
      table.dropColumns(
        'has_driving_licence', 'has_disability', 'employment_status', 'career_level', 'has_gcc_experience', 'notice_period',
        'current_salary_range', 'current_salary_currency', 'whatsapp', 'instagram_url', 'facebook_url', 'industry_ids', 'function_ids',
        'desired_employment_types', 'benefits', 'preferred_positions', 'preferred_industry_ids', 'preferred_city_ids'
      )
    })
  }
}
