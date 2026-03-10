import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add story columns to mission_templates
  await knex.schema.alterTable("mission_templates", (t) => {
    t.integer("act").nullable().defaultTo(null);
    t.integer("story_order").nullable().defaultTo(null);
    t.text("lore_text").nullable().defaultTo(null);
    t.text("recap_text").nullable().defaultTo(null);
  });

  // Add story columns to players
  await knex.schema.alterTable("players", (t) => {
    t.text("act_cooldown_until").nullable().defaultTo(null);
    t.float("story_difficulty_modifier").notNullable().defaultTo(1.0);
  });

  // Lore codex entries table
  await knex.schema.createTable("lore_codex_entries", (t) => {
    t.string("id", 36).primary();
    t.integer("act").notNullable();
    t.integer("story_order").notNullable();
    t.text("title").notNullable();
    t.text("content").notNullable();
    t.string("unlock_mission_id", 36)
      .nullable()
      .references("id")
      .inTable("mission_templates");
    t.text("chapter").nullable();
  });

  // Player codex unlocks table
  await knex.schema.createTable("player_codex_unlocks", (t) => {
    t.string("id", 36).primary();
    t.string("player_id", 36)
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("codex_entry_id", 36)
      .notNullable()
      .references("id")
      .inTable("lore_codex_entries");
    t.text("unlocked_at").notNullable();
    t.unique(["player_id", "codex_entry_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("player_codex_unlocks");
  await knex.schema.dropTableIfExists("lore_codex_entries");

  // SQLite doesn't support DROP COLUMN well, so just ignore in down
  // In practice, rollbacks on SQLite would need table recreation
}
