import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('candidate_profiles', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().unique().references('users.id').onDelete('CASCADE')
      table.string('headline', 160).nullable()
      table.string('desired_position', 120).nullable()
      table.enum('gender', ['male', 'female']).nullable()
      table.string('current_job_title', 120).nullable()
      table.text('summary').nullable()
      table.string('photo_key').nullable()
      table.string('phone', 30).nullable()
      table.string('contact_email', 254).nullable()
      table.string('current_location_text', 120).nullable()
      table.integer('current_location_id').unsigned().nullable().references('locations.id').onDelete('SET NULL')
      table.integer('preferred_location_id').unsigned().nullable().references('locations.id').onDelete('SET NULL')
      table.integer('industry_id').unsigned().nullable().references('industries.id').onDelete('SET NULL')
      table.integer('years_experience').unsigned().nullable()
      table.enum('education_level', ['none', 'secondary', 'diploma', 'bachelor', 'master', 'doctorate']).nullable()
      table.integer('expected_salary').unsigned().nullable()
      table.string('expected_salary_currency', 3).nullable()
      table.enum('availability', ['immediately', 'within_1_month', 'within_3_months', 'not_looking']).nullable()
      table.integer('notice_period_days').unsigned().nullable()
      table.string('linkedin_url', 255).nullable()
      table.string('portfolio_url', 255).nullable()
      table.enum('work_authorization', ['gulf_resident_transferable', 'gulf_resident_family', 'gcc_national', 'requires_sponsorship', 'prefer_not_to_say']).nullable()
      table.boolean('open_to_relocation').notNullable().defaultTo(false)
      table.enum('visibility', ['private', 'discoverable', 'public']).notNullable().defaultTo('private')
      table.enum('contact_sharing', ['on_application', 'verified_employers']).notNullable().defaultTo('on_application')
      table.boolean('cv_searchable').notNullable().defaultTo(false)
      table.integer('completeness').unsigned().notNullable().defaultTo(0)
      table.timestamp('profile_updated_at').nullable()
      table.timestamps(true, true)

      table.index(['visibility', 'profile_updated_at'])
      table.index(['industry_id'])
      table.index(['years_experience'])
      table.index(['expected_salary'])
      table.index(['preferred_location_id'])
      table.index(['current_location_id'])
      table.index(['availability'])
      table.index(['gender'])
      table.index(['education_level'])
    })

    this.schema.createTable('candidate_experiences', (table) => {
      table.increments('id')
      table.integer('candidate_profile_id').unsigned().notNullable().references('candidate_profiles.id').onDelete('CASCADE')
      table.string('job_title', 120).notNullable()
      table.string('company_name', 160).notNullable()
      table.string('location', 120).nullable()
      table.date('start_date').notNullable()
      table.date('end_date').nullable()
      table.boolean('is_current').notNullable().defaultTo(false)
      table.text('description').nullable()
      table.timestamps(true, true)
      table.index(['candidate_profile_id'])
      table.index(['job_title'])
    })

    this.schema.createTable('candidate_educations', (table) => {
      table.increments('id')
      table.integer('candidate_profile_id').unsigned().notNullable().references('candidate_profiles.id').onDelete('CASCADE')
      table.string('institution', 160).notNullable()
      table.string('qualification', 160).notNullable()
      table.string('field_of_study', 160).nullable()
      table.integer('start_year').unsigned().nullable()
      table.integer('end_year').unsigned().nullable()
      table.timestamps(true, true)
      table.index(['candidate_profile_id'])
    })

    this.schema.createTable('candidate_certifications', (table) => {
      table.increments('id')
      table.integer('candidate_profile_id').unsigned().notNullable().references('candidate_profiles.id').onDelete('CASCADE')
      table.string('name', 160).notNullable()
      table.string('issuer', 160).nullable()
      table.integer('year').unsigned().nullable()
      table.timestamps(true, true)
      table.index(['candidate_profile_id'])
      table.index(['name'])
    })

    this.schema.createTable('candidate_skills', (table) => {
      table.integer('candidate_profile_id').unsigned().notNullable().references('candidate_profiles.id').onDelete('CASCADE')
      table.integer('skill_id').unsigned().notNullable().references('skills.id').onDelete('CASCADE')
      table.primary(['candidate_profile_id', 'skill_id'])
      table.index(['skill_id'])
    })

    this.schema.createTable('candidate_languages', (table) => {
      table.integer('candidate_profile_id').unsigned().notNullable().references('candidate_profiles.id').onDelete('CASCADE')
      table.integer('language_id').unsigned().notNullable().references('languages.id').onDelete('CASCADE')
      table.enum('proficiency', ['basic', 'conversational', 'professional', 'native']).notNullable().defaultTo('professional')
      table.primary(['candidate_profile_id', 'language_id'])
      table.index(['language_id'])
    })

    this.schema.createTable('candidate_cvs', (table) => {
      table.increments('id')
      table.integer('candidate_profile_id').unsigned().notNullable().references('candidate_profiles.id').onDelete('CASCADE')
      table.string('label', 80).notNullable()
      table.string('storage_key').notNullable().unique()
      table.string('original_name', 200).notNullable()
      table.string('mime_type', 120).notNullable()
      table.integer('size_bytes').unsigned().notNullable()
      table.boolean('is_primary').notNullable().defaultTo(false)
      table.enum('scan_status', ['not_scanned', 'clean', 'infected', 'error']).notNullable().defaultTo('not_scanned')
      table.enum('parse_status', ['none', 'pending', 'parsed', 'failed']).notNullable().defaultTo('none')
      table.json('parsed_data').nullable()
      table.timestamps(true, true)
      table.index(['candidate_profile_id', 'is_primary'])
    })
  }

  async down() {
    for (const t of ['candidate_cvs', 'candidate_languages', 'candidate_skills', 'candidate_certifications', 'candidate_educations', 'candidate_experiences', 'candidate_profiles']) {
      this.schema.dropTable(t)
    }
  }
}
