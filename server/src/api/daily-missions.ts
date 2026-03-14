import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { awardXP } from "../engine/progression";
import db from "../db/connection";
import { settleCreditPlayer } from "../chain/tx-queue";

const router = Router();

interface MissionTemplate {
  type: string;
  description: string;
  target: number;
  xpReward: number;
  creditReward: number;
}

const MISSION_POOL: MissionTemplate[] = [
  {
    type: "visit_sectors",
    description: "Visit 3 new sectors",
    target: 3,
    xpReward: 75,
    creditReward: 200,
  },
  {
    type: "visit_sectors",
    description: "Visit 5 new sectors",
    target: 5,
    xpReward: 125,
    creditReward: 350,
  },
  {
    type: "win_combat",
    description: "Win a combat encounter",
    target: 1,
    xpReward: 100,
    creditReward: 300,
  },
  {
    type: "trade_value",
    description: "Trade 500 credits worth of goods",
    target: 500,
    xpReward: 80,
    creditReward: 250,
  },
  {
    type: "trade_value",
    description: "Trade 1000 credits worth of goods",
    target: 1000,
    xpReward: 150,
    creditReward: 400,
  },
  {
    type: "scan_sectors",
    description: "Scan 3 sectors",
    target: 3,
    xpReward: 60,
    creditReward: 150,
  },
  {
    type: "scan_sectors",
    description: "Scan 5 sectors",
    target: 5,
    xpReward: 100,
    creditReward: 250,
  },
  {
    type: "dock_outpost",
    description: "Dock at an outpost",
    target: 1,
    xpReward: 40,
    creditReward: 100,
  },
  {
    type: "land_planet",
    description: "Land on a planet",
    target: 1,
    xpReward: 50,
    creditReward: 150,
  },
  {
    type: "earn_xp",
    description: "Earn 200 XP from any source",
    target: 200,
    xpReward: 100,
    creditReward: 200,
  },
];

function pickDailyMissions(date: string): MissionTemplate[] {
  // Deterministic shuffle based on date so all players get the same missions
  const seed = date.split("-").reduce((acc, n) => acc * 31 + Number(n), 0);
  const shuffled = [...MISSION_POOL];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 16807 + 12345) % 2147483647;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Pick 3, avoiding duplicate types
  const picked: MissionTemplate[] = [];
  const usedTypes = new Set<string>();
  for (const m of shuffled) {
    if (usedTypes.has(m.type)) continue;
    picked.push(m);
    usedTypes.add(m.type);
    if (picked.length === 3) break;
  }
  return picked;
}

// GET /daily-missions — returns today's 3 missions, generating if needed
router.get("/", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const today = new Date().toISOString().slice(0, 10);

    let missions = await db("daily_missions").where({
      player_id: playerId,
      date: today,
    });

    if (missions.length === 0) {
      // Generate today's missions
      const templates = pickDailyMissions(today);
      const inserts = templates.map((t) => ({
        id: crypto.randomUUID(),
        player_id: playerId,
        mission_type: t.type,
        description: t.description,
        target: t.target,
        progress: 0,
        completed: false,
        claimed: false,
        xp_reward: t.xpReward,
        credit_reward: t.creditReward,
        date: today,
      }));
      await db("daily_missions").insert(inserts);
      missions = inserts;
    }

    res.json({
      date: today,
      missions: missions.map((m: any) => ({
        id: m.id,
        type: m.mission_type,
        description: m.description,
        target: m.target,
        progress: m.progress,
        completed: !!m.completed,
        claimed: !!m.claimed,
        xpReward: m.xp_reward,
        creditReward: m.credit_reward,
      })),
    });
  } catch (err) {
    console.error("Daily missions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /daily-missions/:id/claim — claim a completed mission reward
router.post("/:id/claim", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const mission = await db("daily_missions")
      .where({ id: req.params.id, player_id: playerId })
      .first();

    if (!mission) return res.status(404).json({ error: "Mission not found" });
    if (!mission.completed)
      return res.status(400).json({ error: "Mission not completed" });
    if (mission.claimed)
      return res.status(400).json({ error: "Already claimed" });

    await db("daily_missions")
      .where({ id: mission.id })
      .update({ claimed: true });

    // Award rewards
    const xpResult = await awardXP(playerId, mission.xp_reward, "mission");
    await db("players")
      .where({ id: playerId })
      .update({ credits: db.raw(`credits + ${mission.credit_reward}`) });
    await settleCreditPlayer(playerId, mission.credit_reward);

    res.json({
      claimed: true,
      xpAwarded: mission.xp_reward,
      creditsAwarded: mission.credit_reward,
      level: xpResult.level,
      levelUp: xpResult.levelUp,
    });
  } catch (err) {
    console.error("Daily mission claim error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

/**
 * Update daily mission progress. Called from game action handlers.
 * Returns true if any mission was completed by this update.
 */
export async function updateDailyMissionProgress(
  playerId: string,
  missionType: string,
  amount: number = 1,
): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const missions = await db("daily_missions").where({
    player_id: playerId,
    date: today,
    mission_type: missionType,
    completed: false,
  });

  let anyCompleted = false;
  for (const m of missions) {
    const newProgress = Math.min(m.progress + amount, m.target);
    const completed = newProgress >= m.target;
    await db("daily_missions")
      .where({ id: m.id })
      .update({ progress: newProgress, completed });
    if (completed) anyCompleted = true;
  }
  return anyCompleted;
}
