import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('industries', (table) => {
      table.increments('id')
      table.string('name', 120).notNullable().unique()
      table.string('slug', 140).notNullable().unique()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamps(true, true)
    })

    this.schema.createTable('job_categories', (table) => {
      table.increments('id')
      table.string('name', 120).notNullable().unique()
      table.string('slug', 140).notNullable().unique()
      table.string('icon', 40).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamps(true, true)
    })

    this.schema.createTable('locations', (table) => {
      table.increments('id')
      table.string('name', 120).notNullable()
      table.string('slug', 140).notNullable().unique()
      table.integer('parent_id').unsigned().nullable().references('locations.id').onDelete('SET NULL')
      table.enum('kind', ['municipality', 'area']).notNullable().defaultTo('municipality')
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamps(true, true)
    })

    this.schema.createTable('skills', (table) => {
      table.increments('id')
      table.string('name', 80).notNullable().unique()
      table.string('slug', 100).notNullable().unique()
      table.boolean('is_approved').notNullable().defaultTo(true)
      table.timestamps(true, true)
    })

    this.schema.createTable('languages', (table) => {
      table.increments('id')
      table.string('name', 60).notNullable().unique()
      table.string('code', 8).notNullable().unique()
      table.timestamps(true, true)
    })
  }

  async down() {
    for (const t of ['languages', 'skills', 'locations', 'job_categories', 'industries']) {
      this.schema.dropTable(t)
    }
  }
}
