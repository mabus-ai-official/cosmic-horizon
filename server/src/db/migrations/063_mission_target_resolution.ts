import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add target_resolution to mission_phases for dynamic location resolution
  await knex.schema.alterTable("mission_phases", (t) => {
    t.text("target_resolution").nullable(); // JSON: { type, params }
  });

  // Add 'core' as a valid sector type by updating the most-connected sector
  // (actual designation happens in universe generation, this just ensures
  // existing universes can have a core sector set via seed)
}

export async function down(knex: Knex): Promise<void> {
  // SQLite doesn't support DROP COLUMN well
}
