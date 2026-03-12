import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("players", (t) => {
    t.bigInteger("arcade_tokens").notNullable().defaultTo(0);
  });

  await knex.schema.alterTable("upgrade_types", (t) => {
    t.integer("token_price").nullable();
  });

  await knex.schema.alterTable("arcade_sessions", (t) => {
    t.integer("tokens_awarded").notNullable().defaultTo(0);
  });

  // Set token_price on existing upgrades (10% of credit price)
  await knex.raw(
    "UPDATE upgrade_types SET token_price = CAST(price * 0.1 AS INTEGER) WHERE price IS NOT NULL",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("arcade_sessions", (t) => {
    t.dropColumn("tokens_awarded");
  });

  await knex.schema.alterTable("upgrade_types", (t) => {
    t.dropColumn("token_price");
  });

  await knex.schema.alterTable("players", (t) => {
    t.dropColumn("arcade_tokens");
  });
}
