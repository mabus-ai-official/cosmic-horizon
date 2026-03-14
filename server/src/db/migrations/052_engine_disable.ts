import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `ALTER TABLE ships ADD COLUMN engines_disabled_until TEXT DEFAULT NULL`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE ships DROP COLUMN engines_disabled_until`);
}
