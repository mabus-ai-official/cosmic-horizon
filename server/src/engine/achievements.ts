import db from "../db/connection";
import crypto from "crypto";
import { settleCreditPlayer } from "../chain/tx-queue";

export interface AchievementUnlock {
  achievementId: string;
  name: string;
  description: string;
  xpReward: number;
  creditReward: number;
  hidden: boolean;
}

/**
 * Check and award achievements based on a triggering action.
 * Returns list of newly unlocked achievements.
 */
export async function checkAchievements(
  playerId: string,
  action: string,
  data: Record<string, any>,
): Promise<AchievementUnlock[]> {
  const unlocked: AchievementUnlock[] = [];

  try {
    const earned = await db("player_achievements")
      .where({ player_id: playerId })
      .pluck("achievement_id");

    const candidates = await db("achievement_definitions").whereNotIn(
      "id",
      earned.length > 0 ? earned : ["__none__"],
    );

    for (const def of candidates) {
      const met = await evaluateAchievement(playerId, def, action, data);
      if (met) {
        await db("player_achievements").insert({
          id: crypto.randomUUID(),
          player_id: playerId,
          achievement_id: def.id,
        });

        if (def.credit_reward > 0) {
          await db("players")
            .where({ id: playerId })
            .increment("credits", def.credit_reward);
          await settleCreditPlayer(playerId, def.credit_reward);
        }

        unlocked.push({
          achievementId: def.id,
          name: def.name,
          description: def.description,
          xpReward: def.xp_reward,
          creditReward: def.credit_reward,
          hidden: !!def.hidden,
        });
      }
    }
  } catch (err) {
    console.error("Achievement check error:", err);
  }

  return unlocked;
}

async function evaluateAchievement(
  playerId: string,
  def: any,
  action: string,
  data: Record<string, any>,
): Promise<boolean> {
  switch (def.id) {
    // Leveling
    case "reach_level_10":
      return action === "level_up" && data.newLevel >= 10;
    case "reach_level_25":
      return action === "level_up" && data.newLevel >= 25;
    case "reach_level_50":
      return action === "level_up" && data.newLevel >= 50;
    case "reach_level_75":
      return action === "level_up" && data.newLevel >= 75;
    case "reach_level_100":
      return action === "level_up" && data.newLevel >= 100;

    // Combat
    case "first_kill":
      return action === "combat_destroy";
    case "destroy_10": {
      if (action !== "combat_destroy") return false;
      const count = await db("combat_logs")
        .where({ attacker_id: playerId, outcome: "ship_destroyed" })
        .count("* as c")
        .first();
      return Number(count?.c || 0) >= 10;
    }
    case "destroy_50": {
      if (action !== "combat_destroy") return false;
      const count = await db("combat_logs")
        .where({ attacker_id: playerId, outcome: "ship_destroyed" })
        .count("* as c")
        .first();
      return Number(count?.c || 0) >= 50;
    }

    // Exploration
    case "explore_100": {
      if (action !== "explore") return false;
      const player = await db("players").where({ id: playerId }).first();
      const explored = JSON.parse(player?.explored_sectors || "[]");
      return explored.length >= 100;
    }
    case "explore_500": {
      if (action !== "explore") return false;
      const player = await db("players").where({ id: playerId }).first();
      const explored = JSON.parse(player?.explored_sectors || "[]");
      return explored.length >= 500;
    }
    case "explore_1000": {
      if (action !== "explore") return false;
      const player = await db("players").where({ id: playerId }).first();
      const explored = JSON.parse(player?.explored_sectors || "[]");
      return explored.length >= 1000;
    }

    // Trading
    case "first_trade":
      return action === "trade";
    case "trade_1000_units": {
      if (action !== "trade") return false;
      const prog = await db("player_progression")
        .where({ player_id: playerId })
        .first();
      // Rough proxy: total_trade_xp / avg xp per unit traded
      return Number(prog?.total_trade_xp || 0) >= 3500;
    }

    // Missions
    case "first_mission":
      return action === "mission_complete";
    case "complete_10_missions": {
      if (action !== "mission_complete") return false;
      const count = await db("player_missions")
        .where({ player_id: playerId, status: "completed" })
        .count("* as c")
        .first();
      return Number(count?.c || 0) >= 10;
    }
    case "complete_50_missions": {
      if (action !== "mission_complete") return false;
      const count = await db("player_missions")
        .where({ player_id: playerId, status: "completed" })
        .count("* as c")
        .first();
      return Number(count?.c || 0) >= 50;
    }

    // Planets
    case "first_planet":
      return action === "claim_planet";
    case "own_5_planets": {
      if (action !== "claim_planet") return false;
      const count = await db("planets")
        .where({ owner_id: playerId })
        .count("* as c")
        .first();
      return Number(count?.c || 0) >= 5;
    }

    // Hidden
    case "hidden_sector_1": {
      if (action !== "explore") return false;
      return data.sectorId === 1;
    }
    case "hidden_million_credits": {
      if (action !== "trade") return false;
      const player = await db("players").where({ id: playerId }).first();
      return Number(player?.credits || 0) >= 1000000;
    }

    default:
      return false;
  }
}
