import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('saved_candidates', (table) => {
      table.increments('id')
      table.integer('company_id').unsigned().notNullable().references('companies.id').onDelete('CASCADE')
      table.integer('candidate_profile_id').unsigned().notNullable().references('candidate_profiles.id').onDelete('CASCADE')
      table.integer('saved_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('list_name', 80).notNullable().defaultTo('Shortlist')
      table.text('note').nullable()
      table.timestamps(true, true)
      table.unique(['company_id', 'candidate_profile_id', 'list_name'])
    })

    this.schema.createTable('saved_searches', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.enum('kind', ['candidates', 'jobs']).notNullable()
      table.string('name', 100).notNullable()
      table.json('filters').notNullable()
      table.boolean('alerts_enabled').notNullable().defaultTo(false)
      table.timestamp('last_alerted_at').nullable()
      table.timestamps(true, true)
      table.index(['user_id', 'kind'])
    })

    this.schema.createTable('candidate_access_logs', (table) => {
      table.increments('id')
      table.integer('candidate_profile_id').unsigned().notNullable().references('candidate_profiles.id').onDelete('CASCADE')
      table.integer('company_id').unsigned().nullable().references('companies.id').onDelete('SET NULL')
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.enum('action', ['profile_view', 'cv_download', 'contact_view']).notNullable()
      table.integer('candidate_cv_id').unsigned().nullable()
      table.string('ip', 64).nullable()
      table.timestamp('created_at').notNullable()
      table.index(['candidate_profile_id', 'created_at'])
      table.index(['company_id', 'created_at'])
    })

    this.schema.createTable('reports', (table) => {
      table.increments('id')
      table.enum('subject_type', ['job', 'company', 'candidate']).notNullable()
      table.integer('subject_id').unsigned().notNullable()
      table.integer('reporter_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('reporter_email', 254).nullable()
      table.enum('reason', ['scam', 'misleading', 'discriminatory', 'inappropriate', 'duplicate', 'misuse_of_data', 'other']).notNullable()
      table.text('details').nullable()
      table.enum('status', ['open', 'reviewing', 'resolved', 'dismissed']).notNullable().defaultTo('open')
      table.integer('resolved_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.text('resolution_note').nullable()
      table.timestamps(true, true)
      table.index(['status', 'created_at'])
      table.index(['subject_type', 'subject_id'])
    })

    this.schema.createTable('audit_logs', (table) => {
      table.bigIncrements('id')
      table.integer('actor_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('action', 80).notNullable()
      table.string('subject_type', 40).nullable()
      table.integer('subject_id').unsigned().nullable()
      table.json('meta').nullable()
      table.string('ip', 64).nullable()
      table.string('user_agent', 255).nullable()
      table.timestamp('created_at').notNullable()
      table.index(['action', 'created_at'])
      table.index(['subject_type', 'subject_id'])
      table.index(['actor_id'])
    })

    this.schema.createTable('notifications', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.string('type', 60).notNullable()
      table.string('title', 200).notNullable()
      table.string('body', 500).nullable()
      table.string('url', 255).nullable()
      table.timestamp('read_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['user_id', 'read_at'])
    })

    this.schema.createTable('platform_settings', (table) => {
      table.string('key', 80).primary()
      table.json('value').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('queued_jobs', (table) => {
      table.bigIncrements('id')
      table.string('queue', 40).notNullable().defaultTo('default')
      table.string('name', 80).notNullable()
      table.text('payload').notNullable()
      table.integer('attempts').unsigned().notNullable().defaultTo(0)
      table.timestamp('available_at').notNullable()
      table.timestamp('reserved_at').nullable()
      table.text('last_error').nullable()
      table.timestamp('failed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['queue', 'failed_at', 'available_at'])
    })

    // Billing scaffold — inactive until a payment provider is configured.
    this.schema.createTable('plans', (table) => {
      table.increments('id')
      table.string('code', 40).notNullable().unique()
      table.string('name', 80).notNullable()
      table.integer('price_qar').unsigned().notNullable()
      table.enum('interval', ['one_time', 'month', 'year']).notNullable()
      table.json('entitlements').notNullable()
      table.boolean('is_active').notNullable().defaultTo(false)
      table.timestamps(true, true)
    })

    this.schema.createTable('subscriptions', (table) => {
      table.increments('id')
      table.integer('company_id').unsigned().notNullable().references('companies.id').onDelete('CASCADE')
      table.integer('plan_id').unsigned().notNullable().references('plans.id')
      table.enum('status', ['pending', 'active', 'past_due', 'cancelled', 'expired']).notNullable().defaultTo('pending')
      table.string('provider', 40).nullable()
      table.string('provider_reference', 120).nullable()
      table.timestamp('current_period_end').nullable()
      table.timestamps(true, true)
      table.index(['company_id', 'status'])
    })

    this.schema.createTable('payments', (table) => {
      table.increments('id')
      table.integer('company_id').unsigned().notNullable().references('companies.id').onDelete('CASCADE')
      table.integer('subscription_id').unsigned().nullable().references('subscriptions.id').onDelete('SET NULL')
      table.integer('amount_qar').unsigned().notNullable()
      table.enum('status', ['pending', 'succeeded', 'failed', 'refunded']).notNullable().defaultTo('pending')
      table.string('provider', 40).notNullable()
      table.string('provider_reference', 120).notNullable()
      table.string('idempotency_key', 120).nullable().unique()
      table.json('raw').nullable()
      table.timestamps(true, true)
      table.unique(['provider', 'provider_reference'])
    })
  }

  async down() {
    for (const t of ['payments', 'subscriptions', 'plans', 'queued_jobs', 'platform_settings', 'notifications', 'audit_logs', 'reports', 'candidate_access_logs', 'saved_searches', 'saved_candidates']) {
      this.schema.dropTable(t)
    }
  }
}
