import crypto from "crypto";
import db from "../db/connection";

// Valid stat keys that match player_stats columns
const VALID_STAT_KEYS = [
  "combat_kills",
  "combat_deaths",
  "damage_dealt",
  "damage_taken",
  "sectors_explored",
  "missions_completed",
  "trades_completed",
  "trade_credits_earned",
  "trade_credits_spent",
  "items_crafted",
  "resources_gathered",
  "planets_colonized",
  "food_deposited",
  "caravans_dispatched",
  "caravans_delivered",
  "caravans_ransacked",
  "caravans_lost",
  "caravans_escorted",
  "bounties_placed",
  "bounties_claimed",
  "credits_from_bounties",
  "dodge_pod_uses",
  "warp_gate_uses",
  "chat_messages_sent",
  "energy_spent",
  "planets_bombarded",
  "planets_conquered",
  "cargo_looted",
] as const;

type StatKey = (typeof VALID_STAT_KEYS)[number];

/**
 * Fire-and-forget stat increment. Upserts player_stats row and daily snapshot.
 */
export function incrementStat(
  playerId: string,
  statKey: StatKey,
  amount: number = 1,
): void {
  (async () => {
    try {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      // Upsert player_stats
      await db.raw(
        `
        INSERT INTO player_stats (player_id, ${statKey}, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(player_id) DO UPDATE SET
          ${statKey} = player_stats.${statKey} + ?,
          updated_at = ?
      `,
        [playerId, amount, now, amount, now],
      );

      // Upsert daily snapshot
      const dailyId = crypto.randomUUID();
      await db.raw(
        `
        INSERT INTO player_stats_daily (id, player_id, stat_date, stat_key, value)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, stat_date, stat_key) DO UPDATE SET
          value = player_stats_daily.value + ?
      `,
        [dailyId, playerId, today, statKey, amount, amount],
      );
    } catch (err) {
      // Fire-and-forget — don't propagate
      console.error("incrementStat error:", err);
    }
  })();
}

/**
 * Fire-and-forget activity log entry.
 */
export function logActivity(
  playerId: string,
  eventType: string,
  description: string,
  details?: Record<string, any>,
): void {
  (async () => {
    try {
      await db("player_activity_log").insert({
        id: crypto.randomUUID(),
        player_id: playerId,
        event_type: eventType,
        description,
        details_json: details ? JSON.stringify(details) : null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("logActivity error:", err);
    }
  })();
}

/**
 * Fire-and-forget personal best check. Inserts or updates if new value > existing.
 */
export function checkPersonalBest(
  playerId: string,
  bestType: string,
  value: number,
  description: string,
): void {
  (async () => {
    try {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await db.raw(
        `
        INSERT INTO player_personal_bests (id, player_id, best_type, value, description, achieved_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(player_id, best_type) DO UPDATE SET
          value = MAX(player_personal_bests.value, excluded.value),
          description = CASE WHEN excluded.value > player_personal_bests.value THEN excluded.description ELSE player_personal_bests.description END,
          achieved_at = CASE WHEN excluded.value > player_personal_bests.value THEN excluded.achieved_at ELSE player_personal_bests.achieved_at END
      `,
        [id, playerId, bestType, value, description, now],
      );
    } catch (err) {
      console.error("checkPersonalBest error:", err);
    }
  })();
}

/**
 * Check milestone thresholds against player stats and award new milestones.
 * Returns array of newly earned milestone IDs.
 */
export async function checkMilestones(playerId: string): Promise<string[]> {
  try {
    const stats = await db("player_stats")
      .where({ player_id: playerId })
      .first();
    if (!stats) return [];

    // Get all threshold-based milestones
    const definitions = await db("milestone_definitions").whereNotNull(
      "stat_key",
    );

    // Get already-earned milestones
    const earned = await db("player_milestones")
      .where({ player_id: playerId })
      .select("milestone_id");
    const earnedSet = new Set(earned.map((e) => e.milestone_id));

    const newlyEarned: string[] = [];
    const now = new Date().toISOString();

    for (const def of definitions) {
      if (earnedSet.has(def.id)) continue;
      const statValue = stats[def.stat_key] || 0;
      if (statValue >= def.threshold) {
        await db("player_milestones").insert({
          id: crypto.randomUUID(),
          player_id: playerId,
          milestone_id: def.id,
          earned_at: now,
        });
        newlyEarned.push(def.id);
      }
    }

    return newlyEarned;
  } catch (err) {
    console.error("checkMilestones error:", err);
    return [];
  }
}

/**
 * Get full player profile data for the profile panel.
 */
export async function getProfile(playerId: string) {
  // Player basics
  const player = await db("players")
    .where({ id: playerId })
    .select("id", "username", "race", "credits", "game_mode")
    .first();
  if (!player) return null;

  // Progression
  let progression = await db("player_progression")
    .where({ player_id: playerId })
    .first();
  if (!progression) {
    progression = { level: 1, xp: 0 };
  }

  const { getRankTitle } = require("../config/progression");
  const rank = getRankTitle(progression.level);

  // All-time stats
  const stats = await db("player_stats").where({ player_id: playerId }).first();
  const allTime = stats || {};

  // Period breakdowns (7d, 30d)
  const now = new Date();
  const date7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const date30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const dailyRows = await db("player_stats_daily")
    .where({ player_id: playerId })
    .where("stat_date", ">=", date30d);

  const last7d: Record<string, number> = {};
  const last30d: Record<string, number> = {};

  for (const row of dailyRows) {
    last30d[row.stat_key] = (last30d[row.stat_key] || 0) + row.value;
    if (row.stat_date >= date7d) {
      last7d[row.stat_key] = (last7d[row.stat_key] || 0) + row.value;
    }
  }

  // Recent activity (last 50)
  const recentActivity = await db("player_activity_log")
    .where({ player_id: playerId })
    .orderBy("created_at", "desc")
    .limit(50)
    .select("event_type", "description", "created_at");

  // Personal bests
  const personalBests = await db("player_personal_bests")
    .where({ player_id: playerId })
    .select("best_type", "value", "description", "achieved_at");

  // Milestones
  const earnedMilestones = await db("player_milestones")
    .join(
      "milestone_definitions",
      "player_milestones.milestone_id",
      "milestone_definitions.id",
    )
    .where({ "player_milestones.player_id": playerId })
    .select(
      "milestone_definitions.id",
      "milestone_definitions.category",
      "milestone_definitions.name",
      "milestone_definitions.description",
      "milestone_definitions.tier",
      "milestone_definitions.icon_key",
      "player_milestones.earned_at",
    );

  const allMilestones = await db("milestone_definitions").select(
    "id",
    "category",
    "name",
    "description",
    "tier",
    "icon_key",
    "stat_key",
    "threshold",
  );
  const earnedIds = new Set(earnedMilestones.map((m) => m.id));
  const availableMilestones = allMilestones.filter((m) => !earnedIds.has(m.id));

  // Achievements
  let achievements: any[] = [];
  try {
    achievements = await db("player_achievements")
      .join(
        "achievement_definitions",
        "player_achievements.achievement_id",
        "achievement_definitions.id",
      )
      .where({ "player_achievements.player_id": playerId })
      .select(
        "achievement_definitions.id",
        "achievement_definitions.name",
        "achievement_definitions.description",
        "player_achievements.earned_at",
      );
  } catch {
    /* table may not exist yet */
  }

  // Faction reputation
  let factionRep: any[] = [];
  try {
    factionRep = await db("player_faction_rep")
      .join("factions", "player_faction_rep.faction_id", "factions.id")
      .where({ player_id: playerId })
      .select(
        "factions.id as factionId",
        "factions.name as factionName",
        "player_faction_rep.fame",
        "player_faction_rep.infamy",
      );
  } catch {
    /* table may not exist yet */
  }

  // Clean stat columns (remove non-stat fields)
  const statFields = VALID_STAT_KEYS as readonly string[];
  const cleanStats: Record<string, number> = {};
  for (const key of statFields) {
    cleanStats[key] = allTime[key] || 0;
  }

  return {
    player: {
      username: player.username,
      race: player.race,
      level: progression.level,
      rank,
      xp: Number(progression.xp),
      credits: Number(player.credits),
      gameMode: player.game_mode || "multiplayer",
    },
    stats: {
      allTime: cleanStats,
      last7d,
      last30d,
    },
    recentActivity: recentActivity.map((a) => ({
      eventType: a.event_type,
      description: a.description,
      createdAt: a.created_at,
    })),
    personalBests: personalBests.map((b) => ({
      bestType: b.best_type,
      value: b.value,
      description: b.description,
      achievedAt: b.achieved_at,
    })),
    milestones: {
      earned: earnedMilestones.map((m) => ({
        id: m.id,
        category: m.category,
        name: m.name,
        description: m.description,
        tier: m.tier,
        iconKey: m.icon_key,
        earnedAt: m.earned_at,
      })),
      available: availableMilestones.map((m) => ({
        id: m.id,
        category: m.category,
        name: m.name,
        description: m.description,
        tier: m.tier,
        iconKey: m.icon_key,
        statKey: m.stat_key,
        threshold: m.threshold,
      })),
    },
    achievements: achievements.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      earnedAt: a.earned_at,
    })),
    factionRep: factionRep.map((f) => ({
      factionId: f.factionId,
      factionName: f.factionName,
      fame: f.fame,
      infamy: f.infamy,
    })),
  };
}

/**
 * Get paginated activity feed.
 */
export async function getActivityFeed(
  playerId: string,
  limit: number = 50,
  before?: string,
) {
  let query = db("player_activity_log")
    .where({ player_id: playerId })
    .orderBy("created_at", "desc")
    .limit(limit);

  if (before) {
    query = query.where("created_at", "<", before);
  }

  const rows = await query.select(
    "event_type",
    "description",
    "details_json",
    "created_at",
  );

  return rows.map((r) => ({
    eventType: r.event_type,
    description: r.description,
    details: r.details_json ? JSON.parse(r.details_json) : null,
    createdAt: r.created_at,
  }));
}

/**
 * Get all milestone definitions with player's earned status.
 */
export async function getMilestoneStatus(playerId: string) {
  const definitions = await db("milestone_definitions")
    .orderBy("category")
    .orderBy("tier")
    .orderBy("threshold");

  const earned = await db("player_milestones")
    .where({ player_id: playerId })
    .select("milestone_id", "earned_at");

  const earnedMap = new Map(earned.map((e) => [e.milestone_id, e.earned_at]));

  return definitions.map((d) => ({
    id: d.id,
    category: d.category,
    name: d.name,
    description: d.description,
    statKey: d.stat_key,
    threshold: d.threshold,
    tier: d.tier,
    iconKey: d.icon_key,
    earned: earnedMap.has(d.id),
    earnedAt: earnedMap.get(d.id) || null,
  }));
}
