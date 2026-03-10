import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Mark players spawned as story mission NPCs
  // NULL = real player, set = spawned by this player_mission
  await knex.raw(
    `ALTER TABLE players ADD COLUMN spawned_by_mission_id TEXT DEFAULT NULL`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE players DROP COLUMN spawned_by_mission_id`);
}
