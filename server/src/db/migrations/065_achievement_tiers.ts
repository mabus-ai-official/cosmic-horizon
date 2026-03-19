import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Add tier column to achievements (1=bronze, 2=silver, 3=gold, 4=diamond)
  await knex.raw(
    `ALTER TABLE achievement_definitions ADD COLUMN tier INTEGER NOT NULL DEFAULT 1`,
  );

  // Assign tiers based on difficulty progression within categories
  // Bronze: first achievements in each category
  // Silver: mid-tier
  // Gold: high-tier
  // Diamond: maximum achievement

  // Leveling
  await knex("achievement_definitions")
    .where("id", "reach_level_10")
    .update({ tier: 1 });
  await knex("achievement_definitions")
    .where("id", "reach_level_25")
    .update({ tier: 2 });
  await knex("achievement_definitions")
    .where("id", "reach_level_50")
    .update({ tier: 3 });
  await knex("achievement_definitions")
    .where("id", "reach_level_75")
    .update({ tier: 3 });
  await knex("achievement_definitions")
    .where("id", "reach_level_100")
    .update({ tier: 4 });

  // Combat
  await knex("achievement_definitions")
    .where("id", "first_kill")
    .update({ tier: 1 });
  await knex("achievement_definitions")
    .where("id", "destroy_10")
    .update({ tier: 2 });
  await knex("achievement_definitions")
    .where("id", "destroy_50")
    .update({ tier: 3 });

  // Exploration
  await knex("achievement_definitions")
    .where("id", "explore_100")
    .update({ tier: 1 });
  await knex("achievement_definitions")
    .where("id", "explore_500")
    .update({ tier: 2 });
  await knex("achievement_definitions")
    .where("id", "explore_1000")
    .update({ tier: 3 });
  await knex("achievement_definitions")
    .where("id", "first_planet")
    .update({ tier: 1 });
  await knex("achievement_definitions")
    .where("id", "own_5_planets")
    .update({ tier: 2 });

  // Trading
  await knex("achievement_definitions")
    .where("id", "first_trade")
    .update({ tier: 1 });
  await knex("achievement_definitions")
    .where("id", "trade_1000_units")
    .update({ tier: 3 });

  // Missions
  await knex("achievement_definitions")
    .where("id", "first_mission")
    .update({ tier: 1 });
  await knex("achievement_definitions")
    .where("id", "complete_10_missions")
    .update({ tier: 2 });
  await knex("achievement_definitions")
    .where("id", "complete_50_missions")
    .update({ tier: 3 });

  // Special (hidden)
  await knex("achievement_definitions")
    .where("id", "hidden_sector_1")
    .update({ tier: 2 });
  await knex("achievement_definitions")
    .where("id", "hidden_million_credits")
    .update({ tier: 4 });

  // Set any expanded achievements (seed 021) that don't have specific tier to bronze
  // They'll be updated via the seed if needed
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TABLE achievement_definitions DROP COLUMN tier`);
}
