import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `ALTER TABLE players ADD COLUMN wallet_provider_user_id TEXT DEFAULT NULL`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE players DROP COLUMN wallet_provider_user_id`);
}
