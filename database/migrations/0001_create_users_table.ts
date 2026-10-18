import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('users', (table) => {
      table.increments('id').notNullable()
      table.string('full_name', 120).notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.enum('role', ['candidate', 'employer', 'admin']).notNullable().index()
      table.enum('status', ['active', 'suspended']).notNullable().defaultTo('active')
      table.timestamp('email_verified_at').nullable()
      table.timestamp('last_login_at').nullable()
      table.string('locale', 8).notNullable().defaultTo('en')
      table.json('notification_prefs').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('user_tokens', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.enum('type', ['verify_email', 'password_reset', 'company_invite']).notNullable()
      table.string('token_hash', 64).notNullable().unique()
      table.json('meta').nullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('used_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['user_id', 'type'])
    })
  }

  async down() {
    this.schema.dropTable('user_tokens')
    this.schema.dropTable('users')
  }
}
