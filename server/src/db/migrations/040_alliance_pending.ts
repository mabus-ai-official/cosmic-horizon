import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("alliances", (t) => {
    t.string("status", 16).notNullable().defaultTo("active"); // 'pending' | 'active'
    t.string("initiated_by", 36).nullable(); // player who sent the request
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("alliances", (t) => {
    t.dropColumn("status");
    t.dropColumn("initiated_by");
  });
}
