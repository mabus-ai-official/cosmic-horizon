import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add new columns to mission_templates
  await knex.schema.alterTable("mission_templates", (t) => {
    t.integer("chapter").nullable(); // 8 lore chapters
    t.text("faction_questline").nullable(); // e.g. 'mycorrhizal_network'
    t.integer("questline_order").nullable();
    t.boolean("has_phases").notNullable().defaultTo(false);
    t.boolean("has_choices").notNullable().defaultTo(false);
    t.text("required_flags").nullable(); // JSON array of flag keys
    t.text("required_faction_tier").nullable(); // e.g. 'Accepted'
  });

  // Add phase tracking to player_missions
  await knex.schema.alterTable("player_missions", (t) => {
    t.integer("current_phase").notNullable().defaultTo(1);
    t.text("phase_progress").nullable(); // JSON per-phase progress
  });

  // Mission phases table — ordered objectives within a single mission
  await knex.schema.createTable("mission_phases", (t) => {
    t.string("id", 36).primary();
    t.string("template_id", 36)
      .notNullable()
      .references("id")
      .inTable("mission_templates");
    t.integer("phase_order").notNullable();
    t.text("title").notNullable();
    t.text("description").notNullable();
    t.text("objective_type").notNullable();
    t.text("objectives").notNullable(); // JSON
    t.text("lore_text").nullable();
    t.text("narration_key").nullable();
    t.boolean("is_optional").notNullable().defaultTo(false);
    t.text("on_complete_effects").nullable(); // JSON: rep shifts, flags
    t.unique(["template_id", "phase_order"]);
  });

  // Mission choices — branching points within missions
  await knex.schema.createTable("mission_choices", (t) => {
    t.string("id", 36).primary();
    t.string("template_id", 36)
      .notNullable()
      .references("id")
      .inTable("mission_templates");
    t.string("phase_id", 36)
      .nullable()
      .references("id")
      .inTable("mission_phases");
    t.text("choice_key").notNullable();
    t.text("prompt_title").notNullable();
    t.text("prompt_body").notNullable();
    t.text("options").notNullable(); // JSON array of options
    t.boolean("is_permanent").notNullable().defaultTo(false);
    t.text("narration_key").nullable();
  });

  // Player choices record
  await knex.schema.createTable("player_mission_choices", (t) => {
    t.string("id", 36).primary();
    t.string("player_id", 36)
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("choice_id", 36)
      .notNullable()
      .references("id")
      .inTable("mission_choices");
    t.text("option_selected").notNullable();
    t.text("effects_applied").nullable(); // JSON snapshot
    t.text("created_at").notNullable().defaultTo(knex.fn.now());
    t.unique(["player_id", "choice_id"]);
  });

  // Story flags — persistent consequences
  await knex.schema.createTable("player_story_flags", (t) => {
    t.string("player_id", 36)
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.text("flag_key").notNullable();
    t.text("flag_value").notNullable().defaultTo("true");
    t.text("set_at").notNullable().defaultTo(knex.fn.now());
    t.primary(["player_id", "flag_key"]);
  });

  // Random event definitions
  await knex.schema.createTable("random_event_definitions", (t) => {
    t.string("id", 36).primary();
    t.text("event_key").notNullable().unique();
    t.text("title").notNullable();
    t.text("description").notNullable();
    t.text("trigger_type").notNullable(); // 'action' | 'game_state' | 'timed'
    t.text("trigger_conditions").notNullable(); // JSON
    t.float("spawn_chance").notNullable().defaultTo(0.05);
    t.integer("cooldown_hours").notNullable().defaultTo(24);
    t.integer("max_occurrences").notNullable().defaultTo(0); // 0 = unlimited
    t.string("mission_template_id", 36)
      .nullable()
      .references("id")
      .inTable("mission_templates");
    t.text("dialogue_data").nullable(); // JSON for simple inline events
    t.text("rewards").nullable(); // JSON
    t.integer("min_chapter").notNullable().defaultTo(1);
  });

  // Player random event instances
  await knex.schema.createTable("player_random_events", (t) => {
    t.string("id", 36).primary();
    t.string("player_id", 36)
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("event_id", 36)
      .notNullable()
      .references("id")
      .inTable("random_event_definitions");
    t.text("status").notNullable().defaultTo("triggered");
    t.text("spawned_at").notNullable().defaultTo(knex.fn.now());
    t.text("completed_at").nullable();
    t.text("data").nullable(); // JSON instance-specific data
    t.index(["player_id", "status"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("player_random_events");
  await knex.schema.dropTableIfExists("random_event_definitions");
  await knex.schema.dropTableIfExists("player_story_flags");
  await knex.schema.dropTableIfExists("player_mission_choices");
  await knex.schema.dropTableIfExists("mission_choices");
  await knex.schema.dropTableIfExists("mission_phases");
}
