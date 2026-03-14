import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("ships", (t) => {
    t.boolean("withdrawn_to_wallet").defaultTo(false);
    t.timestamp("withdrawn_at").nullable();
  });
  await knex.schema.alterTable("ship_upgrades", (t) => {
    t.boolean("withdrawn_to_wallet").defaultTo(false);
    t.timestamp("withdrawn_at").nullable();
  });
  await knex.schema.alterTable("players", (t) => {
    t.boolean("character_withdrawn").defaultTo(false);
    t.timestamp("character_withdrawn_at").nullable();
  });
  await knex.schema.alterTable("planets", (t) => {
    t.boolean("withdrawn_to_wallet").defaultTo(false);
    t.timestamp("withdrawn_at").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("ships", (t) => {
    t.dropColumn("withdrawn_to_wallet");
    t.dropColumn("withdrawn_at");
  });
  await knex.schema.alterTable("ship_upgrades", (t) => {
    t.dropColumn("withdrawn_to_wallet");
    t.dropColumn("withdrawn_at");
  });
  await knex.schema.alterTable("players", (t) => {
    t.dropColumn("character_withdrawn");
    t.dropColumn("character_withdrawn_at");
  });
  await knex.schema.alterTable("planets", (t) => {
    t.dropColumn("withdrawn_to_wallet");
    t.dropColumn("withdrawn_at");
  });
}
