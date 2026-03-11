import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `ALTER TABLE ships ADD COLUMN has_planetary_scanner BOOLEAN NOT NULL DEFAULT 0`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE ships DROP COLUMN has_planetary_scanner`);
}
