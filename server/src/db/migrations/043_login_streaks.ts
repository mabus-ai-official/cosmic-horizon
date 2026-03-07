import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("players", (t) => {
    t.integer("login_streak").notNullable().defaultTo(0);
    t.string("last_login_date", 10).nullable(); // YYYY-MM-DD for streak comparison
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("players", (t) => {
    t.dropColumn("login_streak");
    t.dropColumn("last_login_date");
  });
}
