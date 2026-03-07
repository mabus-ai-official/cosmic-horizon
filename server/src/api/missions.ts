import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { GAME_CONFIG } from "../config/game";
import {
  generateMissionPool,
  isMissionExpired,
  buildObjectivesDetail,
  checkPrerequisite,
} from "../engine/missions";
import { awardMissionRewards } from "../services/mission-tracker";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";
import { pickFlavor, outpostNpcRace } from "../config/flavor-text";

const router = Router();

// Get available missions (mission pool at current Star Mall)
router.get("/available", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (!sector?.has_star_mall) {
      return res
        .status(400)
        .json({ error: "Must be at a star mall to view mission board" });
    }

    // Get player level
    const prog = await db("player_progression")
      .where({ player_id: player.id })
      .first();
    const playerLevel = prog?.level || 1;

    const pool = await generateMissionPool(
      player.id,
      player.current_sector_id,
      playerLevel,
    );

    // Add lock info for prerequisite missions
    const enriched = await Promise.all(
      pool.map(async (m: any) => {
        let prerequisiteMet = true;
        if (m.prerequisiteMissionId) {
          prerequisiteMet = await checkPrerequisite(
            player.id,
            m.prerequisiteMissionId,
          );
        }
        return { ...m, prerequisiteMet };
      }),
    );

    // Show tier level requirements for locked tiers
    const tierLevels = GAME_CONFIG.MISSION_TIER_LEVELS;
    const lockedTiers = Object.entries(tierLevels)
      .filter(([, reqLevel]) => playerLevel < reqLevel)
      .map(([tier, reqLevel]) => ({
        tier: Number(tier),
        requiredLevel: reqLevel,
      }));

    res.json({ missions: enriched, lockedTiers, playerLevel });
  } catch (err) {
    console.error("Mission pool error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept a mission
router.post("/accept/:templateId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Check active mission count
    const activeCount = await db("player_missions")
      .where({ player_id: player.id, status: "active" })
      .count("* as count")
      .first();

    if (Number(activeCount?.count || 0) >= GAME_CONFIG.MAX_ACTIVE_MISSIONS) {
      return res.status(400).json({
        error: `Maximum ${GAME_CONFIG.MAX_ACTIVE_MISSIONS} active missions`,
      });
    }

    const template = await db("mission_templates")
      .where({ id: req.params.templateId })
      .first();
    if (!template)
      return res.status(404).json({ error: "Mission template not found" });

    // Check level gate
    const prog = await db("player_progression")
      .where({ player_id: player.id })
      .first();
    const playerLevel = prog?.level || 1;
    const tierLevels = GAME_CONFIG.MISSION_TIER_LEVELS;
    const requiredLevel = tierLevels[template.tier] || 0;
    if (playerLevel < requiredLevel) {
      return res.status(400).json({
        error: `Requires level ${requiredLevel} to accept tier ${template.tier} missions`,
      });
    }

    // Check prerequisite
    if (template.prerequisite_mission_id) {
      const met = await checkPrerequisite(
        player.id,
        template.prerequisite_mission_id,
      );
      if (!met) {
        return res
          .status(400)
          .json({ error: "Prerequisite mission not yet completed" });
      }
    }

    // Check if non-repeatable mission already completed or active
    if (!template.repeatable) {
      const existing = await db("player_missions")
        .where({ player_id: player.id, template_id: template.id })
        .whereIn("status", ["active", "completed"])
        .first();
      if (existing) {
        return res
          .status(400)
          .json({ error: "Mission already accepted or completed" });
      }
    }

    const now = new Date();
    const expiresAt = template.time_limit_minutes
      ? new Date(
          now.getTime() + template.time_limit_minutes * 60000,
        ).toISOString()
      : null;

    // Build objectives detail
    const objectives =
      typeof template.objectives === "string"
        ? JSON.parse(template.objectives)
        : template.objectives;
    const hints =
      typeof template.hints === "string"
        ? JSON.parse(template.hints)
        : template.hints || [];
    const objectivesDetail = buildObjectivesDetail(
      template.type,
      objectives,
      hints,
    );

    const claimStatus = template.requires_claim_at_mall ? "auto" : "auto";
    // Note: claim_status starts as 'auto' for all. It changes to 'pending_claim' on completion if requires_claim_at_mall is true.

    const missionId = crypto.randomUUID();
    await db("player_missions").insert({
      id: missionId,
      player_id: player.id,
      template_id: template.id,
      status: "active",
      progress: JSON.stringify({}),
      reward_credits: template.reward_credits,
      reward_item_id: template.reward_item_id,
      accepted_at: now.toISOString(),
      expires_at: expiresAt,
      objectives_detail: JSON.stringify(objectivesDetail),
      claim_status: claimStatus,
    });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    const missionRace = outpostNpcRace(sector?.id?.toString() ?? "0");
    res.json({
      missionId,
      title: template.title,
      description: template.description,
      type: template.type,
      tier: template.tier,
      objectives,
      objectivesDetail,
      rewardCredits: template.reward_credits,
      rewardXp: template.reward_xp,
      requiresClaimAtMall: !!template.requires_claim_at_mall,
      expiresAt,
      message: pickFlavor("mission_accept", missionRace, {
        mission: template.title,
      }),
    });
  } catch (err) {
    console.error("Accept mission error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List active missions
router.get("/active", requireAuth, async (req, res) => {
  try {
    const missions = await db("player_missions")
      .join(
        "mission_templates",
        "player_missions.template_id",
        "mission_templates.id",
      )
      .where({
        "player_missions.player_id": req.session.playerId,
        "player_missions.status": "active",
      })
      .select(
        "player_missions.id as missionId",
        "mission_templates.title",
        "mission_templates.description",
        "mission_templates.type",
        "mission_templates.tier",
        "mission_templates.objectives as templateObjectives",
        "player_missions.progress",
        "player_missions.reward_credits as rewardCredits",
        "mission_templates.reward_xp as rewardXp",
        "mission_templates.requires_claim_at_mall as requiresClaimAtMall",
        "player_missions.objectives_detail as objectivesDetail",
        "player_missions.claim_status as claimStatus",
        "player_missions.accepted_at as acceptedAt",
        "player_missions.expires_at as expiresAt",
      );

    // Also include completed+pending_claim missions
    const pendingClaim = await db("player_missions")
      .join(
        "mission_templates",
        "player_missions.template_id",
        "mission_templates.id",
      )
      .where({
        "player_missions.player_id": req.session.playerId,
        "player_missions.status": "completed",
        "player_missions.claim_status": "pending_claim",
      })
      .select(
        "player_missions.id as missionId",
        "mission_templates.title",
        "mission_templates.description",
        "mission_templates.type",
        "mission_templates.tier",
        "mission_templates.objectives as templateObjectives",
        "player_missions.progress",
        "player_missions.reward_credits as rewardCredits",
        "mission_templates.reward_xp as rewardXp",
        "mission_templates.requires_claim_at_mall as requiresClaimAtMall",
        "player_missions.objectives_detail as objectivesDetail",
        "player_missions.claim_status as claimStatus",
        "player_missions.accepted_at as acceptedAt",
        "player_missions.expires_at as expiresAt",
      );

    const allMissions = [...missions, ...pendingClaim];

    res.json({
      missions: allMissions.map((m) => ({
        ...m,
        templateObjectives:
          typeof m.templateObjectives === "string"
            ? JSON.parse(m.templateObjectives)
            : m.templateObjectives,
        progress:
          typeof m.progress === "string" ? JSON.parse(m.progress) : m.progress,
        objectivesDetail:
          typeof m.objectivesDetail === "string"
            ? JSON.parse(m.objectivesDetail)
            : m.objectivesDetail || [],
        requiresClaimAtMall: !!m.requiresClaimAtMall,
      })),
    });
  } catch (err) {
    console.error("Active missions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List completed missions
router.get("/completed", requireAuth, async (req, res) => {
  try {
    const missions = await db("player_missions")
      .join(
        "mission_templates",
        "player_missions.template_id",
        "mission_templates.id",
      )
      .where({
        "player_missions.player_id": req.session.playerId,
        "player_missions.status": "completed",
      })
      .where("player_missions.claim_status", "!=", "pending_claim")
      .orderBy("player_missions.completed_at", "desc")
      .limit(20)
      .select(
        "player_missions.id as missionId",
        "mission_templates.title",
        "mission_templates.tier",
        "player_missions.reward_credits as rewardCredits",
        "mission_templates.reward_xp as rewardXp",
        "player_missions.completed_at as completedAt",
      );

    res.json({ missions });
  } catch (err) {
    console.error("Completed missions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List claimable missions (completed + pending_claim, at star mall)
router.get("/claimable", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (!sector?.has_star_mall) {
      return res
        .status(400)
        .json({ error: "Must be at a star mall to claim rewards" });
    }

    const missions = await db("player_missions")
      .join(
        "mission_templates",
        "player_missions.template_id",
        "mission_templates.id",
      )
      .where({
        "player_missions.player_id": player.id,
        "player_missions.status": "completed",
        "player_missions.claim_status": "pending_claim",
      })
      .select(
        "player_missions.id as missionId",
        "mission_templates.title",
        "mission_templates.tier",
        "player_missions.reward_credits as rewardCredits",
        "mission_templates.reward_xp as rewardXp",
      );

    res.json({ missions });
  } catch (err) {
    console.error("Claimable missions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Claim a completed mission's rewards
router.post("/claim/:missionId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (!sector?.has_star_mall) {
      return res
        .status(400)
        .json({ error: "Must be at a star mall to claim rewards" });
    }

    const mission = await db("player_missions")
      .join(
        "mission_templates",
        "player_missions.template_id",
        "mission_templates.id",
      )
      .where({
        "player_missions.id": req.params.missionId,
        "player_missions.player_id": player.id,
        "player_missions.status": "completed",
        "player_missions.claim_status": "pending_claim",
      })
      .select(
        "player_missions.id as missionId",
        "mission_templates.title",
        "player_missions.reward_credits",
        "mission_templates.reward_xp",
        "mission_templates.reward_items",
      )
      .first();

    if (!mission) {
      return res
        .status(404)
        .json({ error: "No claimable mission found with that ID" });
    }

    // Award rewards
    const rewards = await awardMissionRewards(player.id, {
      reward_credits: mission.reward_credits,
      reward_xp: mission.reward_xp,
    });

    // Mark as claimed
    await db("player_missions").where({ id: mission.missionId }).update({
      claim_status: "claimed",
    });

    const updatedPlayer = await db("players").where({ id: player.id }).first();

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({
      claimed: true,
      title: mission.title,
      creditsAwarded: rewards.credits,
      xpAwarded: rewards.xp,
      newCredits: Number(updatedPlayer?.credits || 0),
    });
  } catch (err) {
    console.error("Claim mission error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Abandon a mission
router.post("/abandon/:missionId", requireAuth, async (req, res) => {
  try {
    const mission = await db("player_missions")
      .where({
        id: req.params.missionId,
        player_id: req.session.playerId,
        status: "active",
      })
      .first();

    if (!mission)
      return res.status(404).json({ error: "Active mission not found" });

    await db("player_missions")
      .where({ id: mission.id })
      .update({ status: "abandoned" });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        req.session.playerId!,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ abandoned: mission.id });
  } catch (err) {
    console.error("Abandon mission error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
