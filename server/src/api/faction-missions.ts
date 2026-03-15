import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { buildObjectivesDetail, checkPrerequisite } from "../engine/missions";
import {
  awardMissionRewards,
  handleMissionChoice,
} from "../services/mission-tracker";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";

const router = Router();

// Get available faction questlines for this player
router.get("/questlines", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Get all faction questline templates grouped by questline
    const factionTemplates = await db("mission_templates")
      .where({ source: "faction" })
      .whereNotNull("faction_questline")
      .orderBy("questline_order", "asc")
      .select(
        "id",
        "title",
        "description",
        "faction_questline",
        "questline_order",
        "required_faction_tier",
        "required_flags",
        "reward_credits",
        "reward_xp",
        "has_phases",
      );

    // Get player's completed faction missions
    const completedMissions = await db("player_missions")
      .where({ player_id: playerId })
      .whereIn("status", ["completed", "claimed"])
      .whereIn(
        "template_id",
        factionTemplates.map((t: any) => t.id),
      )
      .select("template_id", "status", "claim_status");
    const completedIds = new Set(
      completedMissions.map((m: any) => m.template_id),
    );

    // Get active faction mission
    const activeMission = await db("player_missions")
      .where({ player_id: playerId, status: "active" })
      .whereIn(
        "template_id",
        factionTemplates.map((t: any) => t.id),
      )
      .first();

    // Get player's faction rep
    const factionReps = await db("player_faction_rep")
      .where({ player_id: playerId })
      .select("faction_id", "reputation", "fame");

    const repMap: Record<string, { reputation: string; fame: number }> = {};
    for (const r of factionReps) {
      repMap[r.faction_id] = {
        reputation: r.reputation,
        fame: Number(r.fame || 0),
      };
    }

    // Get story flags for prerequisite checking
    const storyFlags = await db("player_story_flags")
      .where({ player_id: playerId })
      .select("flag_key", "flag_value");
    const flagMap: Record<string, string> = {};
    for (const f of storyFlags) {
      flagMap[f.flag_key] = f.flag_value;
    }

    // Group by questline
    const questlines: Record<
      string,
      {
        questline: string;
        missions: any[];
        completedCount: number;
        totalCount: number;
        nextAvailable: any | null;
        isActive: boolean;
      }
    > = {};

    for (const t of factionTemplates) {
      if (!questlines[t.faction_questline]) {
        questlines[t.faction_questline] = {
          questline: t.faction_questline,
          missions: [],
          completedCount: 0,
          totalCount: 0,
          nextAvailable: null,
          isActive: false,
        };
      }

      const ql = questlines[t.faction_questline];
      const isCompleted = completedIds.has(t.id);
      const isActive = activeMission?.template_id === t.id;

      ql.missions.push({
        templateId: t.id,
        title: t.title,
        description: t.description,
        questlineOrder: t.questline_order,
        rewardCredits: t.reward_credits,
        rewardXp: t.reward_xp,
        hasPhases: !!t.has_phases,
        completed: isCompleted,
        active: isActive,
        locked: !isCompleted && !isActive,
      });

      ql.totalCount++;
      if (isCompleted) ql.completedCount++;
      if (isActive) ql.isActive = true;

      // Determine next available (first non-completed, non-active)
      if (!ql.nextAvailable && !isCompleted && !isActive && !activeMission) {
        // Check if previous mission in questline is completed
        const prevOrder = t.questline_order - 1;
        const prevMission = factionTemplates.find(
          (ft: any) =>
            ft.faction_questline === t.faction_questline &&
            ft.questline_order === prevOrder,
        );
        const prevCompleted =
          prevOrder === 0 || (prevMission && completedIds.has(prevMission.id));

        if (prevCompleted) {
          ql.nextAvailable = {
            templateId: t.id,
            title: t.title,
            questlineOrder: t.questline_order,
          };
        }
      }
    }

    res.json({ questlines: Object.values(questlines) });
  } catch (err) {
    console.error("Faction questlines error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get active faction mission details
router.get("/current", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;

    const mission = await db("player_missions")
      .join(
        "mission_templates",
        "player_missions.template_id",
        "mission_templates.id",
      )
      .where({
        "player_missions.player_id": playerId,
        "player_missions.status": "active",
        "mission_templates.source": "faction",
      })
      .select(
        "player_missions.id as missionId",
        "mission_templates.id as templateId",
        "mission_templates.title",
        "mission_templates.description",
        "mission_templates.type",
        "mission_templates.faction_questline as questline",
        "mission_templates.questline_order as questlineOrder",
        "mission_templates.lore_text as loreText",
        "mission_templates.objectives as templateObjectives",
        "mission_templates.has_phases as hasPhases",
        "player_missions.progress",
        "player_missions.objectives_detail as objectivesDetail",
        "player_missions.reward_credits as rewardCredits",
        "mission_templates.reward_xp as rewardXp",
        "player_missions.status",
        "player_missions.claim_status as claimStatus",
        "player_missions.current_phase as currentPhase",
        "player_missions.phase_progress as phaseProgress",
      )
      .first();

    if (!mission) {
      return res.json({ active: false, mission: null });
    }

    // Load phase info for multi-phase missions
    let phaseInfo = null;
    if (mission.hasPhases) {
      const phases = await db("mission_phases")
        .where({ template_id: mission.templateId })
        .orderBy("phase_order", "asc")
        .select(
          "id",
          "phase_order",
          "title",
          "description",
          "objective_type",
          "is_optional",
          "lore_text",
        );

      const currentPhaseNum = mission.currentPhase || 1;
      const currentPhaseData = phases.find(
        (p: any) => p.phase_order === currentPhaseNum,
      );

      phaseInfo = {
        currentPhase: currentPhaseNum,
        totalPhases: phases.length,
        currentPhaseTitle: currentPhaseData?.title || null,
        currentPhaseDescription: currentPhaseData?.description || null,
        currentPhaseLore: currentPhaseData?.lore_text || null,
        currentPhaseType: currentPhaseData?.objective_type || null,
        phases: phases.map((p: any) => ({
          order: p.phase_order,
          title: p.title,
          completed: p.phase_order < currentPhaseNum,
          current: p.phase_order === currentPhaseNum,
          optional: !!p.is_optional,
        })),
      };
    }

    res.json({
      active: true,
      mission: {
        ...mission,
        templateObjectives:
          typeof mission.templateObjectives === "string"
            ? JSON.parse(mission.templateObjectives)
            : mission.templateObjectives,
        progress:
          typeof mission.progress === "string"
            ? JSON.parse(mission.progress)
            : mission.progress,
        phaseProgress:
          typeof mission.phaseProgress === "string"
            ? JSON.parse(mission.phaseProgress || "{}")
            : mission.phaseProgress || {},
        objectivesDetail:
          typeof mission.objectivesDetail === "string"
            ? JSON.parse(mission.objectivesDetail)
            : mission.objectivesDetail || [],
        phaseInfo,
      },
    });
  } catch (err) {
    console.error("Faction current error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept a faction questline mission
router.post("/accept", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: "templateId is required" });
    }

    // Check no active faction mission
    const activeFaction = await db("player_missions")
      .join(
        "mission_templates",
        "player_missions.template_id",
        "mission_templates.id",
      )
      .where({
        "player_missions.player_id": playerId,
        "player_missions.status": "active",
        "mission_templates.source": "faction",
      })
      .first();

    if (activeFaction) {
      return res
        .status(400)
        .json({ error: "You already have an active faction mission" });
    }

    const template = await db("mission_templates")
      .where({ id: templateId, source: "faction" })
      .first();

    if (!template) {
      return res.status(404).json({ error: "Faction mission not found" });
    }

    // Check prerequisite (previous mission in questline must be completed)
    if (template.questline_order > 1) {
      const prevTemplate = await db("mission_templates")
        .where({
          source: "faction",
          faction_questline: template.faction_questline,
          questline_order: template.questline_order - 1,
        })
        .first();

      if (prevTemplate) {
        const prevCompleted = await db("player_missions")
          .where({
            player_id: playerId,
            template_id: prevTemplate.id,
          })
          .whereIn("status", ["completed", "claimed"])
          .first();

        if (!prevCompleted) {
          return res.status(400).json({
            error: "Previous questline mission not yet completed",
          });
        }
      }
    }

    // Check required story flags
    if (template.required_flags) {
      const flags =
        typeof template.required_flags === "string"
          ? JSON.parse(template.required_flags)
          : template.required_flags;

      if (flags && typeof flags === "object") {
        for (const [key, value] of Object.entries(flags)) {
          const playerFlag = await db("player_story_flags")
            .where({ player_id: playerId, flag_key: key })
            .first();
          if (!playerFlag || playerFlag.flag_value !== String(value)) {
            return res.status(400).json({
              error: "Required story prerequisites not met",
            });
          }
        }
      }
    }

    let objectives =
      typeof template.objectives === "string"
        ? JSON.parse(template.objectives)
        : template.objectives;

    // For multi-phase missions, use phase 1 objectives
    let effectiveType = template.type;
    let effectiveObjectives = objectives;
    let totalPhases = 0;
    let phase1Title: string | null = null;
    let phase1Description: string | null = null;

    if (template.has_phases) {
      const phases = await db("mission_phases")
        .where({ template_id: template.id })
        .orderBy("phase_order", "asc");

      totalPhases = phases.length;
      if (phases.length > 0) {
        const phase1 = phases[0];
        effectiveType = phase1.objective_type;
        effectiveObjectives =
          typeof phase1.objectives === "string"
            ? JSON.parse(phase1.objectives)
            : phase1.objectives;
        phase1Title = phase1.title;
        phase1Description = phase1.description;
      }
    }

    const objectivesDetail = buildObjectivesDetail(
      effectiveType,
      effectiveObjectives,
      [],
      "",
    );

    const missionId = crypto.randomUUID();
    await db("player_missions").insert({
      id: missionId,
      player_id: playerId,
      template_id: template.id,
      status: "active",
      progress: JSON.stringify({}),
      reward_credits: template.reward_credits,
      reward_item_id: template.reward_item_id || null,
      accepted_at: new Date().toISOString(),
      expires_at: null,
      objectives_detail: JSON.stringify(objectivesDetail),
      claim_status: "auto",
      current_phase: 1,
      phase_progress: JSON.stringify({}),
    });

    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        playerId,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({
      missionId,
      title: template.title,
      description: template.description,
      type: effectiveType,
      questline: template.faction_questline,
      questlineOrder: template.questline_order,
      loreText: template.lore_text,
      objectives: effectiveObjectives,
      objectivesDetail,
      rewardCredits: template.reward_credits,
      rewardXp: template.reward_xp,
      hasPhases: !!template.has_phases,
      totalPhases,
      phase1Title,
      phase1Description,
    });
  } catch (err) {
    console.error("Faction accept error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Claim completed faction mission
router.post("/claim/:missionId", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;

    const mission = await db("player_missions")
      .join(
        "mission_templates",
        "player_missions.template_id",
        "mission_templates.id",
      )
      .where({
        "player_missions.id": req.params.missionId,
        "player_missions.player_id": playerId,
        "player_missions.status": "completed",
        "player_missions.claim_status": "pending_claim",
        "mission_templates.source": "faction",
      })
      .select(
        "player_missions.id as missionId",
        "mission_templates.title",
        "player_missions.reward_credits",
        "mission_templates.reward_xp",
        "mission_templates.reward_items",
        "mission_templates.reward_faction_id",
        "mission_templates.reward_fame",
      )
      .first();

    if (!mission) {
      return res
        .status(404)
        .json({ error: "No claimable faction mission found" });
    }

    const io = req.app.get("io");

    const rewards = await awardMissionRewards(
      playerId,
      {
        reward_credits: mission.reward_credits,
        reward_xp: mission.reward_xp,
        reward_items: mission.reward_items,
        reward_faction_id: mission.reward_faction_id,
        reward_fame: mission.reward_fame,
      },
      io,
    );

    await db("player_missions").where({ id: mission.missionId }).update({
      claim_status: "claimed",
    });

    const socketId = req.headers["x-socket-id"] as string | undefined;
    if (io) syncPlayer(io, playerId, "sync:status", socketId);

    const updatedPlayer = await db("players").where({ id: playerId }).first();

    res.json({
      claimed: true,
      title: mission.title,
      creditsAwarded: rewards.credits,
      xpAwarded: rewards.xp,
      newCredits: Number(updatedPlayer?.credits || 0),
    });
  } catch (err) {
    console.error("Faction claim error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Abandon active faction mission
router.post("/abandon/:missionId", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;

    const mission = await db("player_missions")
      .join(
        "mission_templates",
        "player_missions.template_id",
        "mission_templates.id",
      )
      .where({
        "player_missions.id": req.params.missionId,
        "player_missions.player_id": playerId,
        "player_missions.status": "active",
        "mission_templates.source": "faction",
      })
      .select("player_missions.id as missionId")
      .first();

    if (!mission) {
      return res
        .status(404)
        .json({ error: "Active faction mission not found" });
    }

    await db("player_missions")
      .where({ id: mission.missionId })
      .update({ status: "abandoned" });

    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        playerId,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ abandoned: mission.missionId });
  } catch (err) {
    console.error("Faction abandon error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit a faction mission choice
router.post("/choice", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { missionId, choiceId, optionId } = req.body;

    if (!missionId || !choiceId || !optionId) {
      return res
        .status(400)
        .json({ error: "missionId, choiceId, and optionId are required" });
    }

    const io = req.app.get("io");
    const result = await handleMissionChoice(
      playerId,
      missionId,
      choiceId,
      optionId,
      io,
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const socketId = req.headers["x-socket-id"] as string | undefined;
    if (io) syncPlayer(io, playerId, "sync:status", socketId);

    res.json({ success: true });
  } catch (err) {
    console.error("Faction choice error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
