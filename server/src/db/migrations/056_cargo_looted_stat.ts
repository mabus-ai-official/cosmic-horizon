import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("player_stats", (t) => {
    t.integer("cargo_looted").notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("player_stats", (t) => {
    t.dropColumn("cargo_looted");
  });
}
