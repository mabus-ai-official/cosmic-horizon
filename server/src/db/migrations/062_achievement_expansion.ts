import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("achievement_definitions", (t) => {
    t.text("trigger_action").nullable(); // e.g. 'combat_destroy', 'trade', 'explore'
    t.text("eval_type").notNullable().defaultTo("legacy"); // legacy | stat_threshold | count_query | flag_check | mission_count | composite
    t.text("eval_config").nullable(); // JSON config for data-driven evaluation
  });
}

export async function down(knex: Knex): Promise<void> {
  // SQLite doesn't support DROP COLUMN well
}
