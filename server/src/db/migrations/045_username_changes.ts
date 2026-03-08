import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("players", (t) => {
    t.integer("username_changes").notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("players", (t) => {
    t.dropColumn("username_changes");
  });
}
