import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("player_stats", (t) => {
    t.integer("planets_bombarded").notNullable().defaultTo(0);
    t.integer("planets_conquered").notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("player_stats", (t) => {
    t.dropColumn("planets_bombarded");
    t.dropColumn("planets_conquered");
  });
}
