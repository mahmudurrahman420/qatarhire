import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('jobs', (table) => {
      table.increments('id')
      table.integer('company_id').unsigned().notNullable().references('companies.id').onDelete('CASCADE')
      table.integer('created_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('title', 160).notNullable()
      table.string('slug', 220).notNullable().unique()
      table.integer('category_id').unsigned().nullable().references('job_categories.id').onDelete('SET NULL')
      table.integer('industry_id').unsigned().nullable().references('industries.id').onDelete('SET NULL')
      table.integer('location_id').unsigned().nullable().references('locations.id').onDelete('SET NULL')
      table.text('description').notNullable()
      table.text('responsibilities').nullable()
      table.text('requirements').nullable()
      table.integer('min_experience').unsigned().notNullable().defaultTo(0)
      table.enum('education_level', ['none', 'secondary', 'diploma', 'bachelor', 'master', 'doctorate']).nullable()
      table.enum('employment_type', ['full_time', 'part_time', 'contract', 'temporary', 'internship']).notNullable()
      table.enum('work_arrangement', ['on_site', 'remote', 'hybrid']).notNullable().defaultTo('on_site')
      table.integer('salary_min').unsigned().nullable()
      table.integer('salary_max').unsigned().nullable()
      // currency of the job's country (AED, SAR, QAR, KWD, OMR, BHD); amounts are whole units per month
      table.string('salary_currency', 3).notNullable().defaultTo('QAR')
      table.boolean('salary_visible').notNullable().defaultTo(true)
      table.integer('vacancies').unsigned().notNullable().defaultTo(1)
      table.date('deadline').nullable()
      table.enum('application_method', ['platform', 'external_url', 'email']).notNullable().defaultTo('platform')
      table.string('application_url', 255).nullable()
      table.string('application_email', 254).nullable()
      table.enum('status', ['draft', 'pending_review', 'published', 'paused', 'closed', 'rejected', 'archived']).notNullable().defaultTo('draft')
      table.text('moderation_note').nullable()
      table.boolean('is_featured').notNullable().defaultTo(false)
      table.timestamp('featured_until').nullable()
      table.timestamp('published_at').nullable()
      table.timestamp('closed_at').nullable()
      table.integer('views_count').unsigned().notNullable().defaultTo(0)
      table.timestamps(true, true)

      table.index(['status', 'published_at'])
      table.index(['company_id', 'status'])
      table.index(['category_id'])
      table.index(['industry_id'])
      table.index(['location_id'])
      table.index(['employment_type'])
      table.index(['salary_min', 'salary_max'])
      table.index(['deadline'])
      table.index(['title'])
    })

    this.schema.createTable('job_skills', (table) => {
      table.integer('job_id').unsigned().notNullable().references('jobs.id').onDelete('CASCADE')
      table.integer('skill_id').unsigned().notNullable().references('skills.id').onDelete('CASCADE')
      table.primary(['job_id', 'skill_id'])
      table.index(['skill_id'])
    })

    this.schema.createTable('applications', (table) => {
      table.increments('id')
      table.integer('job_id').unsigned().notNullable().references('jobs.id').onDelete('CASCADE')
      table.integer('candidate_profile_id').unsigned().notNullable().references('candidate_profiles.id').onDelete('CASCADE')
      table.integer('candidate_cv_id').unsigned().nullable().references('candidate_cvs.id').onDelete('SET NULL')
      table.text('cover_letter').nullable()
      table.enum('status', ['submitted', 'under_review', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn']).notNullable().defaultTo('submitted')
      table.timestamp('status_changed_at').nullable()
      table.timestamps(true, true)
      table.unique(['job_id', 'candidate_profile_id'])
      table.index(['job_id', 'status'])
      table.index(['candidate_profile_id'])
    })

    this.schema.createTable('application_status_histories', (table) => {
      table.increments('id')
      table.integer('application_id').unsigned().notNullable().references('applications.id').onDelete('CASCADE')
      table.string('from_status', 20).nullable()
      table.string('to_status', 20).notNullable()
      table.integer('changed_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('note', 500).nullable()
      table.timestamp('created_at').notNullable()
      table.index(['application_id'])
    })

    this.schema.createTable('application_notes', (table) => {
      table.increments('id')
      table.integer('application_id').unsigned().notNullable().references('applications.id').onDelete('CASCADE')
      table.integer('author_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.text('body').notNullable()
      table.timestamps(true, true)
      table.index(['application_id'])
    })

    this.schema.createTable('saved_jobs', (table) => {
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.integer('job_id').unsigned().notNullable().references('jobs.id').onDelete('CASCADE')
      table.timestamp('created_at').notNullable()
      table.primary(['user_id', 'job_id'])
    })
  }

  async down() {
    for (const t of ['saved_jobs', 'application_notes', 'application_status_histories', 'applications', 'job_skills', 'jobs']) {
      this.schema.dropTable(t)
    }
  }
}
