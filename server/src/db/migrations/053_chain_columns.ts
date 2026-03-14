import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add chain identity columns to players
  await knex.raw(
    `ALTER TABLE players ADD COLUMN member_contract_address TEXT DEFAULT NULL`,
  );
  await knex.raw(
    `ALTER TABLE players ADD COLUMN character_nft_id INTEGER DEFAULT NULL`,
  );

  // Add chain token ID to ships
  await knex.raw(
    `ALTER TABLE ships ADD COLUMN chain_token_id INTEGER DEFAULT NULL`,
  );

  // Indexer state tracking table
  await knex.schema.createTable("indexer_state", (t) => {
    t.increments("id").primary();
    t.string("contract_name").notNullable().unique();
    t.integer("last_synced_block").notNullable().defaultTo(0);
    t.timestamp("updated_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("indexer_state");
  await knex.raw(`ALTER TABLE ships DROP COLUMN chain_token_id`);
  await knex.raw(`ALTER TABLE players DROP COLUMN character_nft_id`);
  await knex.raw(`ALTER TABLE players DROP COLUMN member_contract_address`);
}
