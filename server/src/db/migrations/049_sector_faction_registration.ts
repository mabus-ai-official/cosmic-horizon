import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `ALTER TABLE sectors ADD COLUMN registered_faction_id TEXT DEFAULT NULL`,
  );
  await knex.raw(
    `ALTER TABLE sectors ADD COLUMN registered_faction_at TEXT DEFAULT NULL`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE sectors DROP COLUMN registered_faction_id`);
  await knex.raw(`ALTER TABLE sectors DROP COLUMN registered_faction_at`);
}
