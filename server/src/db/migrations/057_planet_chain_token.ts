import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("planets", (t) => {
    t.integer("chain_token_id").nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("planets", (t) => {
    t.dropColumn("chain_token_id");
  });
}
