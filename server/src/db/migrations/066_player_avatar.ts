import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE players ADD COLUMN avatar_url TEXT DEFAULT NULL`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE players DROP COLUMN avatar_url`);
}
