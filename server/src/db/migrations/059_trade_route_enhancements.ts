import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add name column to trade_routes for user-defined route labels
  await knex.schema.alterTable("trade_routes", (t) => {
    t.string("name", 40).nullable();
  });

  // Deposit confirmations — prevents double-crediting the same on-chain tx
  await knex.schema.createTable("deposit_confirmations", (t) => {
    t.uuid("id").primary().defaultTo(knex.fn.uuid());
    t.uuid("player_id").notNullable().references("id").inTable("players");
    t.string("tx_hash", 66).notNullable().unique();
    t.string("token_address", 42).notNullable();
    t.string("resource", 32).notNullable();
    t.text("amount").notNullable(); // stored as string for bigint precision
    t.timestamp("confirmed_at").notNullable().defaultTo(knex.fn.now());
    t.index("player_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("deposit_confirmations");
  await knex.schema.alterTable("trade_routes", (t) => {
    t.dropColumn("name");
  });
}
