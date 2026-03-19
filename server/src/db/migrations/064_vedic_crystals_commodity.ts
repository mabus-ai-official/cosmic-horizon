import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add vedic cargo column to ships
  await knex.raw(
    `ALTER TABLE ships ADD COLUMN vedic_cargo INTEGER NOT NULL DEFAULT 0`,
  );

  // Add vedic commodity columns to outposts (follows cyr/food/tech pattern)
  await knex.raw(
    `ALTER TABLE outposts ADD COLUMN vedic_stock INTEGER NOT NULL DEFAULT 0`,
  );
  await knex.raw(
    `ALTER TABLE outposts ADD COLUMN vedic_capacity INTEGER NOT NULL DEFAULT 10000`,
  );
  await knex.raw(
    `ALTER TABLE outposts ADD COLUMN vedic_mode TEXT NOT NULL DEFAULT 'none'`,
  );
}

export async function down(knex: Knex): Promise<void> {
  // SQLite doesn't support DROP COLUMN in older versions, but modern SQLite does
  await knex.raw(`ALTER TABLE ships DROP COLUMN vedic_cargo`);
  await knex.raw(`ALTER TABLE outposts DROP COLUMN vedic_stock`);
  await knex.raw(`ALTER TABLE outposts DROP COLUMN vedic_capacity`);
  await knex.raw(`ALTER TABLE outposts DROP COLUMN vedic_mode`);
}
