import { BaseSchema } from '@adonisjs/lucid/schema'

/** Links a user to the social providers (Google, LinkedIn, Facebook) they signed in with. New table only. */
export default class extends BaseSchema {
  protected tableName = 'social_accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('provider', 20).notNullable()
      table.string('provider_user_id', 191).notNullable()
      table.string('email', 254).nullable()
      table.timestamp('last_used_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['provider', 'provider_user_id'])
      table.unique(['user_id', 'provider'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
