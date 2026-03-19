import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getPlayerProgress,
  getPlayerLevelBonuses,
} from "../engine/progression";
import { xpForLevel, RANK_TABLE } from "../config/progression";
import { GAME_CONFIG } from "../config/game";
import db from "../db/connection";

const router = Router();

// GET /profile — Full player progression profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const progress = await getPlayerProgress(playerId);
    const bonuses = await getPlayerLevelBonuses(playerId);
    const currentLevelXp = xpForLevel(progress.level);
    const nextLevelXp =
      progress.level < 100 ? xpForLevel(progress.level + 1) : null;

    res.json({
      username: player.username,
      race: player.race,
      level: progress.level,
      rank: progress.rank,
      xp: progress.totalXp,
      xpForNextLevel: nextLevelXp,
      xpProgress: nextLevelXp ? progress.totalXp - currentLevelXp : 0,
      xpNeeded: nextLevelXp ? nextLevelXp - currentLevelXp : 0,
      levelBonuses: bonuses,
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /achievements — Player's earned + visible unearned achievements
router.get("/achievements", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;

    const earned = await db("player_achievements")
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
        "achievement_definitions.category",
        "achievement_definitions.icon",
        "achievement_definitions.hidden",
        "achievement_definitions.tier",
        "player_achievements.earned_at",
      )
      .orderBy("achievement_definitions.sort_order");

    const earnedIds = earned.map((e: any) => e.id);

    const unearned = await db("achievement_definitions")
      .where({ hidden: false })
      .whereNotIn("id", earnedIds.length > 0 ? earnedIds : ["__none__"])
      .select("id", "name", "description", "category", "icon", "tier")
      .orderBy("sort_order");

    // Build trophies: highest tier earned per category
    const trophies: Record<string, number> = {};
    for (const a of earned) {
      const tier = a.tier ?? 1;
      if (!trophies[a.category] || tier > trophies[a.category]) {
        trophies[a.category] = tier;
      }
    }

    res.json({
      earned: earned.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        icon: a.icon,
        tier: a.tier ?? 1,
        earnedAt: a.earned_at,
      })),
      available: unearned.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        icon: a.icon,
        tier: a.tier ?? 1,
      })),
      trophies,
      totalEarned: earned.length,
      totalVisible: earned.length + unearned.length,
    });
  } catch (err) {
    console.error("Achievements error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /ranks — Static rank table and ship gates
router.get("/ranks", requireAuth, async (_req, res) => {
  res.json({
    ranks: RANK_TABLE.map((r) => ({
      minLevel: r.minLevel,
      maxLevel: r.maxLevel,
      title: r.title,
    })),
    shipGates: GAME_CONFIG.SHIP_LEVEL_GATES,
  });
});

export default router;
