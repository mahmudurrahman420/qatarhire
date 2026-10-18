import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('companies', (table) => {
      table.increments('id')
      table.string('name', 160).notNullable()
      table.string('slug', 180).notNullable().unique()
      table.string('website', 255).nullable()
      table.integer('industry_id').unsigned().nullable().references('industries.id').onDelete('SET NULL')
      table.text('description').nullable()
      table.integer('location_id').unsigned().nullable().references('locations.id').onDelete('SET NULL')
      table.string('address', 255).nullable()
      table.string('contact_name', 120).notNullable()
      table.string('contact_email', 254).notNullable()
      table.string('phone', 30).nullable()
      table.string('logo_key').nullable()
      table.enum('size', ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).nullable()
      table.string('cr_number', 40).nullable()
      table.enum('verification_status', ['pending', 'verified', 'rejected', 'suspended']).notNullable().defaultTo('pending').index()
      table.timestamp('verified_at').nullable()
      table.boolean('is_featured').notNullable().defaultTo(false)
      table.timestamps(true, true)
      table.index(['name'])
      table.index(['is_featured', 'verification_status'])
    })

    this.schema.createTable('company_users', (table) => {
      table.increments('id')
      table.integer('company_id').unsigned().notNullable().references('companies.id').onDelete('CASCADE')
      table.integer('user_id').unsigned().notNullable().unique().references('users.id').onDelete('CASCADE')
      table.enum('role', ['owner', 'recruiter']).notNullable().defaultTo('recruiter')
      table.timestamps(true, true)
      table.index(['company_id'])
    })

    this.schema.createTable('company_verifications', (table) => {
      table.increments('id')
      table.integer('company_id').unsigned().notNullable().references('companies.id').onDelete('CASCADE')
      table.enum('from_status', ['pending', 'verified', 'rejected', 'suspended']).nullable()
      table.enum('to_status', ['pending', 'verified', 'rejected', 'suspended']).notNullable()
      table.integer('reviewed_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.text('note').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['company_id'])
    })
  }

  async down() {
    this.schema.dropTable('company_verifications')
    this.schema.dropTable('company_users')
    this.schema.dropTable('companies')
  }
}
