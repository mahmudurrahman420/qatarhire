import { BaseSchema } from '@adonisjs/lucid/schema'

/** Signups waiting for email OTP confirmation. New table only: touches no existing data. */
export default class extends BaseSchema {
  protected tableName = 'pending_signups'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('token', 64).notNullable().unique()
      table.string('role', 20).notNullable()
      table.string('email', 254).notNullable().index()
      table.string('password_hash', 255).notNullable()
      table.text('payload').notNullable()
      table.string('code_hash', 255).notNullable()
      table.integer('attempts').notNullable().defaultTo(0)
      table.timestamp('expires_at').notNullable()
      table.timestamp('last_sent_at').notNullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
