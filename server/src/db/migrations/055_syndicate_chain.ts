import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `ALTER TABLE syndicates ADD COLUMN governor_address TEXT DEFAULT NULL`,
  );
  await knex.raw(
    `ALTER TABLE syndicates ADD COLUMN treasury_address TEXT DEFAULT NULL`,
  );
  await knex.raw(
    `ALTER TABLE syndicates ADD COLUMN token_address TEXT DEFAULT NULL`,
  );
  await knex.raw(
    `ALTER TABLE syndicates ADD COLUMN chain_index INTEGER DEFAULT NULL`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE syndicates DROP COLUMN chain_index`);
  await knex.raw(`ALTER TABLE syndicates DROP COLUMN token_address`);
  await knex.raw(`ALTER TABLE syndicates DROP COLUMN treasury_address`);
  await knex.raw(`ALTER TABLE syndicates DROP COLUMN governor_address`);
}
