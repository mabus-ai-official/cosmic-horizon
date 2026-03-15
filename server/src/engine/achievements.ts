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
  const evalType = def.eval_type || "legacy";

  // Data-driven evaluation for new achievements
  if (evalType !== "legacy") {
    return evaluateDataDriven(playerId, def, action, data);
  }

  // Legacy hardcoded evaluation for existing achievements
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

/**
 * Data-driven achievement evaluator.
 * Uses eval_type and eval_config from achievement_definitions to check
 * conditions without requiring code changes per achievement.
 */
async function evaluateDataDriven(
  playerId: string,
  def: any,
  action: string,
  data: Record<string, any>,
): Promise<boolean> {
  // Only evaluate if the trigger action matches (or no trigger_action = always check)
  if (def.trigger_action && def.trigger_action !== action) return false;

  const config =
    typeof def.eval_config === "string"
      ? JSON.parse(def.eval_config)
      : def.eval_config;
  if (!config) return false;

  switch (def.eval_type) {
    case "stat_threshold": {
      // Check player_stats.{stat_key} >= threshold
      const stats = await db("player_stats")
        .where({ player_id: playerId })
        .first();
      if (!stats) return false;
      return Number(stats[config.stat_key] || 0) >= config.threshold;
    }

    case "count_query": {
      // Count rows in a table matching conditions
      let query = db(config.table).where({ player_id: playerId });
      if (config.where) {
        for (const [col, val] of Object.entries(config.where)) {
          query = query.where(col, val as any);
        }
      }
      if (config.column_key) {
        // For JSON array length checks (e.g., explored_sectors)
        const row = await db(config.table)
          .where({ id: playerId })
          .select(config.column_key)
          .first();
        if (!row) return false;
        const arr = JSON.parse(row[config.column_key] || "[]");
        return arr.length >= config.threshold;
      }
      const count = await query.count("* as c").first();
      return Number(count?.c || 0) >= config.threshold;
    }

    case "flag_check": {
      // Check player_story_flags for a specific flag
      const flag = await db("player_story_flags")
        .where({ player_id: playerId, flag_key: config.flag_key })
        .first();
      if (!flag) return false;
      if (config.flag_value) {
        return flag.flag_value === config.flag_value;
      }
      return true;
    }

    case "mission_count": {
      // Count completed missions matching criteria
      let query = db("player_missions").where({
        player_id: playerId,
        status: "completed",
      });
      if (config.source) {
        query = query
          .join(
            "mission_templates",
            "player_missions.template_id",
            "mission_templates.id",
          )
          .where("mission_templates.source", config.source);
      }
      if (config.chapter) {
        query = query.where("mission_templates.chapter", config.chapter);
      }
      const count = await query.count("* as c").first();
      return Number(count?.c || 0) >= config.threshold;
    }

    case "composite": {
      // Multiple conditions that must all be true
      if (!config.conditions || !Array.isArray(config.conditions)) return false;
      for (const condition of config.conditions) {
        const subDef = {
          ...def,
          eval_type: condition.type,
          eval_config: condition,
        };
        const met = await evaluateDataDriven(playerId, subDef, action, data);
        if (!met) return false;
      }
      return true;
    }

    default:
      return false;
  }
}
