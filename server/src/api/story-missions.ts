import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { GAME_CONFIG } from "../config/game";
import {
  getStoryProgress,
  hasActiveStoryMission,
  getNextStoryMission,
  handleStoryMissionClaim,
  getStoryRecap,
  getFailureCount,
} from "../engine/story-missions";
import { buildObjectivesDetail, checkPrerequisite } from "../engine/missions";
import {
  awardMissionRewards,
  handleMissionChoice,
  handleRescuePurchase,
} from "../services/mission-tracker";
import {
  spawnStoryNPCs,
  cleanupStoryNPCs,
  getStoryNPCLocations,
} from "../engine/story-npcs";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";

const router = Router();

/**
 * Pick a sector with an outpost as a meeting point for a meet_npc objective.
 * Prefers sectors the player hasn't visited yet (exploration incentive).
 */
async function pickMeetNpcSector(
  playerId: string,
  currentSectorId: number,
): Promise<{ sectorId: number; outpostName: string | null }> {
  const player = await db("players").where({ id: playerId }).first();
  const explored: number[] = JSON.parse(player?.explored_sectors || "[]");

  // Get outpost sectors, excluding current
  const outpostSectors = await db("outposts")
    .where("sector_id", "!=", currentSectorId)
    .select("sector_id as sectorId", "name as outpostName");

  if (outpostSectors.length === 0) {
    return { sectorId: currentSectorId + 3, outpostName: null };
  }

  // Prefer unexplored sectors (gives player reason to explore)
  const unexplored = outpostSectors.filter(
    (s: any) => !explored.includes(s.sectorId),
  );
  const pool = unexplored.length > 0 ? unexplored : outpostSectors;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { sectorId: pick.sectorId, outpostName: pick.outpostName };
}

// Get full story progress
router.get("/progress", requireAuth, async (req, res) => {
  try {
    const progress = await getStoryProgress(req.session.playerId!);
    res.json(progress);
  } catch (err) {
    console.error("Story progress error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current/next story mission with details
router.get("/current", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const progress = await getStoryProgress(playerId);

    if (progress.activeStoryMission) {
      // Fetch full mission details
      const mission = await db("player_missions")
        .join(
          "mission_templates",
          "player_missions.template_id",
          "mission_templates.id",
        )
        .where({ "player_missions.id": progress.activeStoryMission.missionId })
        .select(
          "player_missions.id as missionId",
          "mission_templates.id as templateId",
          "mission_templates.title",
          "mission_templates.description",
          "mission_templates.type",
          "mission_templates.act",
          "mission_templates.chapter",
          "mission_templates.story_order as storyOrder",
          "mission_templates.lore_text as loreText",
          "mission_templates.objectives as templateObjectives",
          "mission_templates.hints",
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

      if (mission) {
        const failureCount = await getFailureCount(
          playerId,
          mission.templateId,
        );
        const showHints = failureCount >= GAME_CONFIG.STORY_HINT_THRESHOLD;
        const hints =
          typeof mission.hints === "string"
            ? JSON.parse(mission.hints)
            : mission.hints || [];

        // Include NPC locations for destroy_ship missions
        const npcLocations =
          mission.type === "destroy_ship"
            ? await getStoryNPCLocations(mission.missionId)
            : [];

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
              "objectives",
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

          // Backfill: rebuild objectives_detail from the current phase.
          // Handles stale detail from before phase advancement wrote it,
          // and adds location hints for meet_npc / deliver_cargo phases.
          if (currentPhaseData) {
            const phaseObj =
              typeof currentPhaseData.objectives === "string"
                ? JSON.parse(currentPhaseData.objectives)
                : currentPhaseData.objectives || {};
            const pp =
              typeof mission.phaseProgress === "string"
                ? JSON.parse(mission.phaseProgress || "{}")
                : mission.phaseProgress || {};

            const freshDetail = buildObjectivesDetail(
              currentPhaseData.objective_type,
              phaseObj,
            );
            let needsUpdate = false;

            // meet_npc: assign target sector if missing
            if (
              currentPhaseData.objective_type === "meet_npc" &&
              !pp.targetSectorId
            ) {
              const player = await db("players")
                .where({ id: playerId })
                .first();
              const meetTarget = await pickMeetNpcSector(
                playerId,
                player?.current_sector_id || 1,
              );
              pp.targetSectorId = meetTarget.sectorId;
              const npcName = phaseObj.npcName || "NPC";
              const hint = meetTarget.outpostName
                ? `${npcName} awaits at ${meetTarget.outpostName} in Sector ${meetTarget.sectorId}`
                : `${npcName} awaits in Sector ${meetTarget.sectorId}`;
              freshDetail[0].description += ` — ${hint}`;
              needsUpdate = true;
            } else if (
              currentPhaseData.objective_type === "meet_npc" &&
              pp.targetSectorId
            ) {
              // Already have a target — add the hint to the fresh detail
              const npcName = phaseObj.npcName || "NPC";
              const outpost = await db("outposts")
                .where({ sector_id: pp.targetSectorId })
                .first();
              const hint = outpost?.name
                ? `${npcName} awaits at ${outpost.name} in Sector ${pp.targetSectorId}`
                : `${npcName} awaits in Sector ${pp.targetSectorId}`;
              freshDetail[0].description += ` — ${hint}`;
            }

            // deliver_cargo: add outpost hint
            if (
              currentPhaseData.objective_type === "deliver_cargo" &&
              phaseObj.commodity
            ) {
              const modeCol = `${phaseObj.commodity}_mode`;
              const player = await db("players")
                .where({ id: playerId })
                .first();
              const explored: number[] = JSON.parse(
                player?.explored_sectors || "[]",
              );
              const buyingOutposts = await db("outposts")
                .where(modeCol, "buy")
                .select("name", "sector_id");
              if (buyingOutposts.length > 0) {
                const visited = buyingOutposts.filter((o: any) =>
                  explored.includes(o.sector_id),
                );
                const pick =
                  visited.length > 0 ? visited[0] : buyingOutposts[0];
                freshDetail[0].description += ` (Sell at ${pick.name}, Sector ${pick.sector_id})`;
              }
            }

            // survive_ambush: add location hint if an ambush NPC is alive
            if (currentPhaseData.objective_type === "survive_ambush") {
              const aliveNpc = await db("players")
                .where({ spawned_by_mission_id: mission.missionId })
                .join("ships", "ships.owner_id", "players.id")
                .where("ships.is_destroyed", false)
                .select("players.username", "players.current_sector_id")
                .first();
              if (aliveNpc) {
                const hint = `${aliveNpc.username} is waiting in Sector ${aliveNpc.current_sector_id}`;
                freshDetail[0].description += ` — ${hint}`;
              }
            }

            // Update progress from current state
            const currentProgress =
              typeof mission.phaseProgress === "string"
                ? JSON.parse(mission.phaseProgress || "{}")
                : mission.phaseProgress || {};

            // Check if detail has drifted from current phase
            const existingDetail =
              typeof mission.objectivesDetail === "string"
                ? JSON.parse(mission.objectivesDetail)
                : mission.objectivesDetail || [];
            const existingDesc = existingDetail[0]?.description || "";
            const freshDesc = freshDetail[0]?.description || "";
            // If the existing detail doesn't match the current phase's objective, update
            if (
              needsUpdate ||
              !existingDesc.startsWith(freshDesc.split(" —")[0].split(" (")[0])
            ) {
              await db("player_missions")
                .where({ id: mission.missionId })
                .update({
                  phase_progress: JSON.stringify(pp),
                  objectives_detail: JSON.stringify(freshDetail),
                });
              mission.phaseProgress = JSON.stringify(pp);
              mission.objectivesDetail = JSON.stringify(freshDetail);
            }
          }
        }

        // If mission is awaiting_choice or current phase is 'choose', include choice data
        let pendingChoice: any = null;
        if (
          mission.status === "awaiting_choice" ||
          (mission.status === "active" &&
            phaseInfo &&
            phaseInfo.currentPhaseType === "choose")
        ) {
          const currentPhaseId = mission.hasPhases
            ? (
                await db("mission_phases")
                  .where({
                    template_id: mission.templateId,
                    phase_order: mission.currentPhase || 1,
                  })
                  .first()
              )?.id
            : null;

          const choiceRow = currentPhaseId
            ? await db("mission_choices")
                .where({ phase_id: currentPhaseId })
                .first()
            : await db("mission_choices")
                .where({ template_id: mission.templateId, phase_id: null })
                .first();

          if (choiceRow) {
            pendingChoice = {
              choiceId: choiceRow.id,
              choiceKey: choiceRow.choice_key,
              title: choiceRow.prompt_title,
              body: choiceRow.prompt_body,
              options:
                typeof choiceRow.options === "string"
                  ? JSON.parse(choiceRow.options)
                  : choiceRow.options,
              isPermanent: !!choiceRow.is_permanent,
              narrationKey: choiceRow.narration_key,
            };
          }
        }

        return res.json({
          active: true,
          mission: {
            ...mission,
            chapter: mission.chapter || mission.act,
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
            hints: showHints ? hints : [],
            failureCount,
            showHints,
            npcLocations,
            phaseInfo,
            pendingChoice,
          },
        });
      }
    }

    // No active mission — return next available
    if (progress.nextMission) {
      const template = await db("mission_templates")
        .where({ id: progress.nextMission.templateId })
        .first();

      if (template) {
        return res.json({
          active: false,
          next: {
            templateId: template.id,
            title: template.title,
            description: template.description,
            type: template.type,
            act: template.act,
            chapter: template.chapter || template.act,
            storyOrder: template.story_order,
            loreText: template.lore_text,
            hasPhases: !!template.has_phases,
            objectives:
              typeof template.objectives === "string"
                ? JSON.parse(template.objectives)
                : template.objectives,
            rewardCredits: template.reward_credits,
            rewardXp: template.reward_xp,
          },
        });
      }
    }

    res.json({ active: false, next: null });
  } catch (err) {
    console.error("Story current error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept next story mission
router.post("/accept", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;

    // Check no active story mission
    const active = await hasActiveStoryMission(playerId);
    if (active) {
      return res.status(400).json({
        error: "You already have an active story mission",
      });
    }

    // Check cooldown
    const player = await db("players")
      .where({ id: playerId })
      .select("act_cooldown_until")
      .first();

    if (
      player?.act_cooldown_until &&
      new Date(player.act_cooldown_until) > new Date()
    ) {
      return res.status(400).json({
        error: "Act cooldown active. The next chapter begins soon.",
        cooldownUntil: player.act_cooldown_until,
      });
    }

    const template = await getNextStoryMission(playerId);
    if (!template) {
      return res.status(400).json({
        error: "No story mission available",
      });
    }

    // Check prerequisite
    if (template.prerequisite_mission_id) {
      const met = await checkPrerequisite(
        playerId,
        template.prerequisite_mission_id,
      );
      if (!met) {
        return res.status(400).json({
          error: "Previous story mission not yet completed",
        });
      }
    }

    // Check failure count for adaptive difficulty
    const failureCount = await getFailureCount(playerId, template.id);
    let objectives =
      typeof template.objectives === "string"
        ? JSON.parse(template.objectives)
        : template.objectives;

    // Apply difficulty reduction if too many failures
    if (failureCount >= GAME_CONFIG.STORY_DIFFICULTY_THRESHOLD) {
      const mod = GAME_CONFIG.STORY_DIFFICULTY_REDUCTION;
      objectives = { ...objectives };
      if (objectives.sectorsToVisit)
        objectives.sectorsToVisit = Math.ceil(objectives.sectorsToVisit * mod);
      if (objectives.shipsToDestroy)
        objectives.shipsToDestroy = Math.max(
          1,
          Math.ceil(objectives.shipsToDestroy * mod),
        );
      if (objectives.colonistsToDeposit)
        objectives.colonistsToDeposit = Math.max(
          1,
          Math.ceil(objectives.colonistsToDeposit * mod),
        );
      if (objectives.unitsToTrade)
        objectives.unitsToTrade = Math.ceil(objectives.unitsToTrade * mod);
      if (objectives.scansRequired)
        objectives.scansRequired = Math.max(
          1,
          Math.ceil(objectives.scansRequired * mod),
        );
      if (objectives.quantity)
        objectives.quantity = Math.max(1, Math.ceil(objectives.quantity * mod));
    }

    const hints =
      typeof template.hints === "string"
        ? JSON.parse(template.hints)
        : template.hints || [];

    // For deliver_cargo missions, find a recommended outpost and append to description
    let descriptionSuffix = "";
    if (template.type === "deliver_cargo" && objectives.commodity) {
      const modeCol = `${objectives.commodity}_mode`;
      const player = await db("players").where({ id: playerId }).first();
      const explored: number[] = JSON.parse(player?.explored_sectors || "[]");

      // Find outposts that buy this commodity
      const buyingOutposts = await db("outposts")
        .where(modeCol, "buy")
        .select("name", "sector_id");

      if (buyingOutposts.length > 0) {
        // Prefer one in an explored sector
        const visited = buyingOutposts.filter((o: any) =>
          explored.includes(o.sector_id),
        );
        const pick = visited.length > 0 ? visited[0] : buyingOutposts[0];
        descriptionSuffix = ` (sell at ${pick.name}, Sector ${pick.sector_id})`;
      }
    }

    // For colonize_planet missions, find nearest seed planet for colonist pickup
    if (template.type === "colonize_planet") {
      const player = await db("players").where({ id: playerId }).first();
      const explored: number[] = JSON.parse(player?.explored_sectors || "[]");

      const seedSectors = await db("sectors")
        .where({ has_seed_planet: true })
        .select("id");

      if (seedSectors.length > 0) {
        // Prefer explored seed sectors
        const exploredSeeds = seedSectors.filter((s: any) =>
          explored.includes(s.id),
        );
        const pick =
          exploredSeeds.length > 0 ? exploredSeeds[0] : seedSectors[0];
        descriptionSuffix = ` — collect colonists at Seed Planet in Sector ${pick.id}. Choose a race with high affinity for your target planet type!`;
      }
    }

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
      hints,
      descriptionSuffix,
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

    // For meet_npc missions, assign a target sector where the NPC will appear
    if (effectiveType === "meet_npc" && effectiveObjectives.npcId) {
      const player = await db("players").where({ id: playerId }).first();
      const meetTarget = await pickMeetNpcSector(
        playerId,
        player?.current_sector_id || 1,
      );
      const npcName = effectiveObjectives.npcName || "NPC";
      const locationHint = meetTarget.outpostName
        ? `${npcName} awaits at ${meetTarget.outpostName} in Sector ${meetTarget.sectorId}`
        : `${npcName} awaits in Sector ${meetTarget.sectorId}`;
      const updatedDetail = objectivesDetail.map((d: any) => ({
        ...d,
        description: `${d.description} — ${locationHint}`,
      }));
      const progressData = template.has_phases
        ? {
            phase_progress: JSON.stringify({
              targetSectorId: meetTarget.sectorId,
            }),
          }
        : {
            progress: JSON.stringify({
              targetSectorId: meetTarget.sectorId,
            }),
          };
      await db("player_missions")
        .where({ id: missionId })
        .update({
          objectives_detail: JSON.stringify(updatedDetail),
          ...progressData,
        });
    }

    // For destroy_ship missions, spawn NPC enemies in explored sectors
    let npcLocations: { name: string; sectorId: number }[] = [];
    if (template.type === "destroy_ship" && objectives.shipsToDestroy) {
      await spawnStoryNPCs(
        playerId,
        missionId,
        objectives.shipsToDestroy,
        template.act || 1,
        objectives.npcNames || objectives.npcShipType
          ? {
              nameOverride: objectives.npcNames,
              shipTypeOverride: objectives.npcShipType,
            }
          : undefined,
      );
      npcLocations = await getStoryNPCLocations(missionId);

      // Update objectives detail with NPC location hints
      const sectorSet = [...new Set(npcLocations.map((n) => n.sectorId))];
      const locationHint =
        sectorSet.length <= 3
          ? `Hostiles detected in Sector${sectorSet.length > 1 ? "s" : ""} ${sectorSet.join(", ")}`
          : `Hostiles detected across ${sectorSet.length} sectors in your explored space`;
      const updatedDetail = objectivesDetail.map((d: any) => ({
        ...d,
        description: `${d.description} — ${locationHint}`,
      }));
      await db("player_missions")
        .where({ id: missionId })
        .update({
          objectives_detail: JSON.stringify(updatedDetail),
          progress: JSON.stringify({ npcIds: npcLocations.map(() => null) }),
        });
    }

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
      act: template.act,
      chapter: template.chapter || template.act,
      storyOrder: template.story_order,
      loreText: template.lore_text,
      objectives: effectiveObjectives,
      objectivesDetail,
      rewardCredits: template.reward_credits,
      rewardXp: template.reward_xp,
      difficultyReduced: failureCount >= GAME_CONFIG.STORY_DIFFICULTY_THRESHOLD,
      failureCount,
      hasPhases: !!template.has_phases,
      totalPhases,
      phase1Title,
      phase1Description,
    });
  } catch (err) {
    console.error("Story accept error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Claim completed story mission (works from anywhere, not mall-gated)
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
        "mission_templates.source": "story",
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
        .json({ error: "No claimable story mission found" });
    }

    const io = req.app.get("io");

    // Award rewards
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

    // Mark as claimed
    await db("player_missions").where({ id: mission.missionId }).update({
      claim_status: "claimed",
    });

    // Clean up any remaining story NPCs
    await cleanupStoryNPCs(mission.missionId);

    // Handle story-specific claim logic (codex, act transitions, cooldowns)
    const socketId = req.headers["x-socket-id"] as string | undefined;
    const claimResult = await handleStoryMissionClaim(
      playerId,
      mission.missionId,
      io,
      socketId,
    );

    if (io) syncPlayer(io, playerId, "sync:status", socketId);

    const updatedPlayer = await db("players").where({ id: playerId }).first();

    res.json({
      claimed: true,
      title: mission.title,
      creditsAwarded: rewards.credits,
      xpAwarded: rewards.xp,
      newCredits: Number(updatedPlayer?.credits || 0),
      codex: claimResult.codex || null,
    });
  } catch (err) {
    console.error("Story claim error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Abandon active story mission
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
        "mission_templates.source": "story",
      })
      .whereIn("player_missions.status", ["active", "awaiting_choice"])
      .select(
        "player_missions.id as missionId",
        "mission_templates.id as templateId",
        "mission_templates.hints",
      )
      .first();

    if (!mission) {
      return res.status(404).json({ error: "Active story mission not found" });
    }

    await db("player_missions")
      .where({ id: mission.missionId })
      .update({ status: "abandoned" });

    // Clean up any spawned story NPCs
    await cleanupStoryNPCs(mission.missionId);

    // Clean up any recorded choices for this mission's template
    const templateChoices = await db("mission_choices")
      .where({ template_id: mission.templateId })
      .select("id");
    if (templateChoices.length > 0) {
      await db("player_mission_choices")
        .where({ player_id: playerId })
        .whereIn(
          "choice_id",
          templateChoices.map((c: any) => c.id),
        )
        .del();
    }

    const failureCount = await getFailureCount(playerId, mission.templateId);
    const showHints = failureCount >= GAME_CONFIG.STORY_HINT_THRESHOLD;
    const hints =
      typeof mission.hints === "string"
        ? JSON.parse(mission.hints)
        : mission.hints || [];

    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        playerId,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({
      abandoned: mission.missionId,
      failureCount,
      showHints,
      hints: showHints ? hints : [],
      difficultyReduced: failureCount >= GAME_CONFIG.STORY_DIFFICULTY_THRESHOLD,
    });
  } catch (err) {
    console.error("Story abandon error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get lore codex entries
router.get("/codex", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;

    const allEntries = await db("lore_codex_entries")
      .orderBy("story_order", "asc")
      .select("*");

    const unlocked = await db("player_codex_unlocks")
      .where({ player_id: playerId })
      .select("codex_entry_id", "unlocked_at");

    const unlockedIds = new Set(unlocked.map((u: any) => u.codex_entry_id));
    const unlockDates: Record<string, string> = {};
    for (const u of unlocked) {
      unlockDates[u.codex_entry_id] = u.unlocked_at;
    }

    // Group by act
    const grouped: Record<
      number,
      Array<{
        id: string;
        title: string;
        content: string | null;
        chapter: string | null;
        storyOrder: number;
        unlocked: boolean;
        unlockedAt: string | null;
      }>
    > = {};

    for (const entry of allEntries) {
      if (!grouped[entry.act]) grouped[entry.act] = [];
      const isUnlocked = unlockedIds.has(entry.id);
      grouped[entry.act].push({
        id: entry.id,
        title: isUnlocked ? entry.title : "???",
        content: isUnlocked ? entry.content : null,
        chapter: isUnlocked ? entry.chapter : null,
        storyOrder: entry.story_order,
        unlocked: isUnlocked,
        unlockedAt: isUnlocked ? unlockDates[entry.id] : null,
      });
    }

    res.json({
      codex: grouped,
      totalEntries: allEntries.length,
      unlockedCount: unlockedIds.size,
    });
  } catch (err) {
    console.error("Codex error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit a mission choice (for multi-phase missions with branching)
router.post("/choice", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { missionId, choiceId, optionId } = req.body;

    if (!missionId || !choiceId || !optionId) {
      return res
        .status(400)
        .json({ error: "missionId, choiceId, and optionId are required" });
    }

    console.log("[story/choice] received:", {
      playerId,
      missionId,
      choiceId,
      optionId,
    });

    const io = req.app.get("io");
    const result = await handleMissionChoice(
      playerId,
      missionId,
      choiceId,
      optionId,
      io,
    );

    console.log("[story/choice] result:", result);

    if (!result.success) {
      console.error("Story choice failed:", result.error, {
        missionId,
        choiceId,
        optionId,
      });
      return res.status(400).json({ error: result.error });
    }

    const socketId = req.headers["x-socket-id"] as string | undefined;
    if (io) syncPlayer(io, playerId, "sync:status", socketId);

    res.json({ success: true });
  } catch (err) {
    console.error("Story choice error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Purchase from rescue merchant NPC (appears after 10 moves during deliver_cargo)
router.post("/rescue-buy", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { missionId } = req.body;

    if (!missionId) {
      return res.status(400).json({ error: "missionId is required" });
    }

    const io = req.app.get("io");
    const result = await handleRescuePurchase(playerId, missionId, io);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      quantity: result.quantity,
      cost: result.cost,
    });
  } catch (err) {
    console.error("Rescue buy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get player's story flags
router.get("/flags", requireAuth, async (req, res) => {
  try {
    const flags = await db("player_story_flags")
      .where({ player_id: req.session.playerId! })
      .select("flag_key", "flag_value", "set_at");

    res.json({ flags });
  } catch (err) {
    console.error("Story flags error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get recap data for login toast
router.get("/recap", requireAuth, async (req, res) => {
  try {
    const recap = await getStoryRecap(req.session.playerId!);
    res.json(recap);
  } catch (err) {
    console.error("Story recap error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
