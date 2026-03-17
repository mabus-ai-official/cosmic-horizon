import db from "../db/connection";
import {
  checkMissionProgress,
  updateObjectivesDetail,
  buildObjectivesDetail,
  ObjectiveDetail,
} from "../engine/missions";
import { awardXP } from "../engine/progression";
import { checkAchievements } from "../engine/achievements";
import { GAME_CONFIG } from "../config/game";
import { settleCreditPlayer } from "../chain/tx-queue";
import {
  incrementStat,
  logActivity,
  checkMilestones,
} from "../engine/profile-stats";
import { notifyPlayer } from "../ws/handlers";
import { calculateTier } from "../engine/npcs";
import {
  resolveTargets,
  enrichDescription,
  TargetResolution,
} from "../engine/target-resolution";
import crypto from "crypto";
import type { Server as SocketIOServer } from "socket.io";

// Award mission rewards (credits, XP, items). Reused by auto-claim and manual claim.
export async function awardMissionRewards(
  playerId: string,
  mission: {
    reward_credits: number;
    reward_xp?: number;
    reward_items?: string | null;
    reward_faction_id?: string | null;
    reward_fame?: number;
  },
  io?: SocketIOServer,
): Promise<{ credits: number; xp: number }> {
  let creditsAwarded = 0;
  let xpAwarded = 0;

  if (mission.reward_credits > 0) {
    await db("players")
      .where({ id: playerId })
      .increment("credits", mission.reward_credits);
    await settleCreditPlayer(playerId, mission.reward_credits);
    creditsAwarded = mission.reward_credits;
  }

  // Award mission XP (from template reward_xp, falling back to difficulty-based calc)
  const rewardXp = mission.reward_xp || 0;
  if (rewardXp > 0) {
    const result = await awardXP(playerId, rewardXp, "mission");
    xpAwarded = result.xpAwarded;
  } else {
    // Fallback for old missions without reward_xp
    const difficulty = Math.max(1, Math.ceil(mission.reward_credits / 500));
    const result = await awardXP(
      playerId,
      GAME_CONFIG.XP_MISSION_COMPLETE_BASE * difficulty,
      "mission",
    );
    xpAwarded = result.xpAwarded;
  }

  const unlocked = await checkAchievements(playerId, "mission_complete", {});
  if (io) {
    for (const a of unlocked) {
      notifyPlayer(io, playerId, "achievement:unlocked", {
        name: a.name,
        description: a.description,
        xpReward: a.xpReward,
        creditReward: a.creditReward,
      });
    }
  }

  // Grant reward items if configured
  if (mission.reward_items) {
    try {
      const items =
        typeof mission.reward_items === "string"
          ? JSON.parse(mission.reward_items)
          : mission.reward_items;
      for (const item of items) {
        await db("game_events").insert({
          id: crypto.randomUUID(),
          player_id: playerId,
          event_type: `item:${item.itemId}`,
          message: `Received ${item.name}`,
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Reward items grant error:", err);
    }
  }

  // Award faction fame if configured
  if (
    mission.reward_faction_id &&
    mission.reward_fame &&
    mission.reward_fame > 0
  ) {
    try {
      const existing = await db("player_faction_rep")
        .where({ player_id: playerId, faction_id: mission.reward_faction_id })
        .first();

      if (existing) {
        await db("player_faction_rep")
          .where({ player_id: playerId, faction_id: mission.reward_faction_id })
          .increment("fame", mission.reward_fame);
      } else {
        await db("player_faction_rep").insert({
          player_id: playerId,
          faction_id: mission.reward_faction_id,
          fame: mission.reward_fame,
          infamy: 0,
        });
      }

      // Apply rivalry spillover
      const rivalries = await db("faction_rivalries").where({
        faction_id: mission.reward_faction_id,
      });
      for (const rivalry of rivalries) {
        const spilloverInfamy = Math.floor(
          mission.reward_fame * rivalry.spillover_ratio,
        );
        if (spilloverInfamy > 0) {
          const rivalRep = await db("player_faction_rep")
            .where({
              player_id: playerId,
              faction_id: rivalry.rival_faction_id,
            })
            .first();
          if (rivalRep) {
            await db("player_faction_rep")
              .where({
                player_id: playerId,
                faction_id: rivalry.rival_faction_id,
              })
              .increment("infamy", spilloverInfamy);
          } else {
            await db("player_faction_rep").insert({
              player_id: playerId,
              faction_id: rivalry.rival_faction_id,
              fame: 0,
              infamy: spilloverInfamy,
            });
          }
        }
      }
      // Check if fame crossed a tier boundary → push faction:rankup
      if (io) {
        const oldFame = existing ? existing.fame : 0;
        const oldInfamy = existing ? existing.infamy : 0;
        const newFame = oldFame + mission.reward_fame;
        const oldTier = calculateTier(oldFame, oldInfamy);
        const newTier = calculateTier(newFame, oldInfamy);
        if (newTier !== oldTier) {
          const faction = await db("factions")
            .where({ id: mission.reward_faction_id })
            .first();
          notifyPlayer(io, playerId, "faction:rankup", {
            factionId: mission.reward_faction_id,
            factionName: faction?.name ?? mission.reward_faction_id,
            newTier,
            fame: newFame,
          });
        }
      }
    } catch (err) {
      console.error("Faction fame reward error:", err);
    }
  }

  return { credits: creditsAwarded, xp: xpAwarded };
}

export async function checkAndUpdateMissions(
  playerId: string,
  action: string,
  data: Record<string, any>,
  io?: SocketIOServer,
): Promise<void> {
  try {
    const activeMissions = await db("player_missions")
      .join(
        "mission_templates",
        "player_missions.template_id",
        "mission_templates.id",
      )
      .where({
        "player_missions.player_id": playerId,
        "player_missions.status": "active",
      })
      .select(
        "player_missions.id as missionId",
        "mission_templates.id as templateId",
        "mission_templates.type",
        "mission_templates.title",
        "mission_templates.objectives as templateObjectives",
        "player_missions.progress",
        "player_missions.reward_credits",
        "player_missions.objectives_detail",
        "mission_templates.requires_claim_at_mall",
        "mission_templates.reward_xp",
        "mission_templates.reward_faction_id",
        "mission_templates.reward_fame",
        "mission_templates.source",
        "mission_templates.story_order",
        "mission_templates.has_phases",
        "player_missions.current_phase",
        "player_missions.phase_progress",
      );

    for (const mission of activeMissions) {
      if (mission.has_phases) {
        await handlePhasedMission(playerId, mission, action, data, io);
      } else {
        await handleSingleObjectiveMission(playerId, mission, action, data, io);
      }
    }
  } catch (err) {
    console.error("Mission tracker error:", err);
  }
}

/**
 * Handle progress for a multi-phase mission.
 * Checks progress against the current phase's objective, advances phases,
 * and triggers choices when encountered.
 */
async function handlePhasedMission(
  playerId: string,
  mission: any,
  action: string,
  data: Record<string, any>,
  io?: SocketIOServer,
): Promise<void> {
  const phases = await db("mission_phases")
    .where({ template_id: mission.templateId })
    .orderBy("phase_order", "asc");

  if (phases.length === 0) return;

  const currentPhaseIndex = (mission.current_phase || 1) - 1;
  if (currentPhaseIndex >= phases.length) return;

  const currentPhase = phases[currentPhaseIndex];
  const phaseObjectives =
    typeof currentPhase.objectives === "string"
      ? JSON.parse(currentPhase.objectives)
      : currentPhase.objectives;
  const phaseProgress =
    typeof mission.phase_progress === "string" && mission.phase_progress
      ? JSON.parse(mission.phase_progress)
      : mission.phase_progress || {};

  // Check timed_delivery expiry before processing progress
  if (
    currentPhase.objective_type === "timed_delivery" &&
    phaseProgress.expires_at &&
    new Date(phaseProgress.expires_at) < new Date()
  ) {
    // Timer expired — fail the mission
    await db("player_missions")
      .where({ id: mission.missionId })
      .update({ status: "failed" });
    if (io) {
      notifyPlayer(io, playerId, "mission:failed", {
        missionId: mission.missionId,
        title: mission.title,
        reason: "Time expired",
      });
    }
    return;
  }

  const result = checkMissionProgress(
    {
      type: currentPhase.objective_type,
      objectives: phaseObjectives,
      progress: phaseProgress,
    },
    action,
    data,
  );

  if (!result.updated) return;

  // Build phase-level objectives detail
  const phaseDetail = buildObjectivesDetail(
    currentPhase.objective_type,
    phaseObjectives,
  );
  const updatedPhaseDetail = updateObjectivesDetail(
    currentPhase.objective_type,
    result.progress,
    phaseDetail,
  );

  if (result.completed) {
    // Apply phase completion effects (rep shifts, flags)
    if (currentPhase.on_complete_effects) {
      const effects =
        typeof currentPhase.on_complete_effects === "string"
          ? JSON.parse(currentPhase.on_complete_effects)
          : currentPhase.on_complete_effects;
      await applyEffects(playerId, effects, io);
    }

    // Check for a choice at this phase
    const choice = await db("mission_choices")
      .where({ phase_id: currentPhase.id })
      .first();

    if (choice) {
      // Pause mission until player makes choice
      await db("player_missions")
        .where({ id: mission.missionId })
        .update({
          status: "awaiting_choice",
          phase_progress: JSON.stringify(result.progress),
        });

      if (io) {
        const options =
          typeof choice.options === "string"
            ? JSON.parse(choice.options)
            : choice.options;
        notifyPlayer(io, playerId, "mission:choice_required", {
          missionId: mission.missionId,
          choiceId: choice.id,
          choiceKey: choice.choice_key,
          title: choice.prompt_title,
          body: choice.prompt_body,
          options,
          isPermanent: !!choice.is_permanent,
          narrationKey: choice.narration_key,
        });
      }
    } else if (currentPhaseIndex + 1 < phases.length) {
      // Advance to next phase
      const nextPhase = phases[currentPhaseIndex + 1];
      let nextPhaseProgress: Record<string, any> = {};

      const nextObjectives =
        typeof nextPhase.objectives === "string"
          ? JSON.parse(nextPhase.objectives)
          : nextPhase.objectives;
      const detail = buildObjectivesDetail(
        nextPhase.objective_type,
        nextObjectives,
      );
      let phaseDescriptionWithHint = nextPhase.description;

      // Dynamic target resolution — if the phase has target_resolution, resolve
      // sector IDs based on player state and store in phase_progress
      const targetResolution = nextPhase.target_resolution
        ? typeof nextPhase.target_resolution === "string"
          ? JSON.parse(nextPhase.target_resolution)
          : nextPhase.target_resolution
        : null;

      if (targetResolution) {
        try {
          const resolved = await resolveTargets(
            playerId,
            targetResolution as TargetResolution,
          );
          if (resolved.targetSectorId) {
            nextPhaseProgress.targetSectorId = resolved.targetSectorId;
          }
          if (resolved.targetSectorIds) {
            nextPhaseProgress.targetSectorIds = resolved.targetSectorIds;
          }
          if (resolved.locationHint) {
            detail[0].description = enrichDescription(
              detail[0].description,
              resolved,
            );
            phaseDescriptionWithHint = enrichDescription(
              phaseDescriptionWithHint,
              resolved,
            );
          }
        } catch (err) {
          console.error("Target resolution error:", err);
        }
      }

      // If next phase is meet_npc, auto-assign a target sector (fallback if
      // no target_resolution was specified or resolution failed)
      if (
        nextPhase.objective_type === "meet_npc" &&
        !nextPhaseProgress.targetSectorId
      ) {
        const player = await db("players").where({ id: playerId }).first();
        const currentSectorId = player?.current_sector_id || 1;
        const outpostSectors = await db("outposts")
          .where("sector_id", "!=", currentSectorId)
          .select("sector_id as sectorId", "name as outpostName");
        if (outpostSectors.length > 0) {
          const pick =
            outpostSectors[Math.floor(Math.random() * outpostSectors.length)];
          nextPhaseProgress.targetSectorId = pick.sectorId;
          const npcName = nextObjectives.npcName || "NPC";
          const hint = pick.outpostName
            ? `${npcName} awaits at ${pick.outpostName} in Sector ${pick.sectorId}`
            : `${npcName} awaits in Sector ${pick.sectorId}`;
          detail[0].description += ` — ${hint}`;
          phaseDescriptionWithHint += ` — ${hint}`;
        }
      }

      // If next phase is deliver_cargo, hint where to sell (fallback)
      if (
        nextPhase.objective_type === "deliver_cargo" &&
        nextObjectives.commodity &&
        !nextPhaseProgress.targetSectorId
      ) {
        const modeCol = `${nextObjectives.commodity}_mode`;
        const player = await db("players").where({ id: playerId }).first();
        const explored: number[] = JSON.parse(player?.explored_sectors || "[]");
        const buyingOutposts = await db("outposts")
          .where(modeCol, "buy")
          .select("name", "sector_id");
        if (buyingOutposts.length > 0) {
          const visited = buyingOutposts.filter((o: any) =>
            explored.includes(o.sector_id),
          );
          const pick = visited.length > 0 ? visited[0] : buyingOutposts[0];
          detail[0].description += ` — Nearest: ${pick.name}, Sector ${pick.sector_id}`;
          phaseDescriptionWithHint += ` — Nearest: ${pick.name}, Sector ${pick.sector_id}`;
        }
      }

      // If next phase is timed_delivery, set the timer
      if (
        nextPhase.objective_type === "timed_delivery" &&
        nextObjectives.timeMinutes
      ) {
        const expiresAt = new Date(
          Date.now() + nextObjectives.timeMinutes * 60 * 1000,
        ).toISOString();
        nextPhaseProgress.expires_at = expiresAt;
        if (io) {
          notifyPlayer(io, playerId, "mission:timer_started", {
            missionId: mission.missionId,
            expiresAt,
            timeMinutes: nextObjectives.timeMinutes,
          });
        }
      }

      // If next phase is a 'choose' phase, immediately trigger the choice
      // overlay instead of waiting for a player action that will never come
      if (nextPhase.objective_type === "choose") {
        const phaseChoice = await db("mission_choices")
          .where({ phase_id: nextPhase.id })
          .first();

        if (phaseChoice) {
          await db("player_missions")
            .where({ id: mission.missionId })
            .update({
              current_phase: nextPhase.phase_order,
              status: "awaiting_choice",
              phase_progress: JSON.stringify(nextPhaseProgress),
              objectives_detail: JSON.stringify(detail),
            });

          if (io) {
            const choiceOptions =
              typeof phaseChoice.options === "string"
                ? JSON.parse(phaseChoice.options)
                : phaseChoice.options;
            notifyPlayer(io, playerId, "mission:choice_required", {
              missionId: mission.missionId,
              choiceId: phaseChoice.id,
              choiceKey: phaseChoice.choice_key,
              title: phaseChoice.prompt_title,
              body: phaseChoice.prompt_body,
              options: choiceOptions,
              isPermanent: !!phaseChoice.is_permanent,
              narrationKey: phaseChoice.narration_key,
            });
          }
          return;
        }
      }

      await db("player_missions")
        .where({ id: mission.missionId })
        .update({
          current_phase: nextPhase.phase_order,
          phase_progress: JSON.stringify(nextPhaseProgress),
          objectives_detail: JSON.stringify(detail),
        });

      if (io) {
        notifyPlayer(io, playerId, "mission:phase_advanced", {
          missionId: mission.missionId,
          title: mission.title,
          phaseOrder: nextPhase.phase_order,
          phaseTitle: nextPhase.title,
          phaseDescription: phaseDescriptionWithHint,
          totalPhases: phases.length,
          loreText: nextPhase.lore_text,
          narrationKey: nextPhase.narration_key,
          storyOrder: mission.story_order || 0,
        });
      }
    } else {
      // All phases complete — check for end-of-mission choice
      const endChoice = await db("mission_choices")
        .where({ template_id: mission.templateId, phase_id: null })
        .first();

      if (endChoice) {
        await db("player_missions")
          .where({ id: mission.missionId })
          .update({
            status: "awaiting_choice",
            phase_progress: JSON.stringify(result.progress),
          });

        if (io) {
          const options =
            typeof endChoice.options === "string"
              ? JSON.parse(endChoice.options)
              : endChoice.options;
          notifyPlayer(io, playerId, "mission:choice_required", {
            missionId: mission.missionId,
            choiceId: endChoice.id,
            choiceKey: endChoice.choice_key,
            title: endChoice.prompt_title,
            body: endChoice.prompt_body,
            options,
            isPermanent: !!endChoice.is_permanent,
            narrationKey: endChoice.narration_key,
          });
        }
      } else {
        // Complete the mission
        await completeMission(
          playerId,
          mission,
          result.progress,
          io,
          updatedPhaseDetail,
        );
      }
    }
  } else {
    // Phase in progress — save progress + updated objectives detail
    await db("player_missions")
      .where({ id: mission.missionId })
      .update({
        phase_progress: JSON.stringify(result.progress),
        objectives_detail: JSON.stringify(updatedPhaseDetail),
      });

    if (io) {
      notifyPlayer(io, playerId, "mission:phase_progress", {
        missionId: mission.missionId,
        phaseOrder: currentPhase.phase_order,
        phaseTitle: currentPhase.title,
        totalPhases: phases.length,
        progress: result.progress,
        objectivesDetail: updatedPhaseDetail,
      });
    }
  }
}

/**
 * Handle progress for a single-objective mission (existing behavior).
 */
async function handleSingleObjectiveMission(
  playerId: string,
  mission: any,
  action: string,
  data: Record<string, any>,
  io?: SocketIOServer,
): Promise<void> {
  const objectives =
    typeof mission.templateObjectives === "string"
      ? JSON.parse(mission.templateObjectives)
      : mission.templateObjectives;
  const progress =
    typeof mission.progress === "string"
      ? JSON.parse(mission.progress)
      : mission.progress;

  const result = checkMissionProgress(
    { type: mission.type, objectives, progress },
    action,
    data,
  );

  if (result.updated) {
    let updatedDetail: ObjectiveDetail[] | null = null;
    if (mission.objectives_detail) {
      const detail =
        typeof mission.objectives_detail === "string"
          ? JSON.parse(mission.objectives_detail)
          : mission.objectives_detail;
      updatedDetail = updateObjectivesDetail(
        mission.type,
        result.progress,
        detail,
      );
    }

    if (result.completed) {
      await completeMission(
        playerId,
        mission,
        result.progress,
        io,
        updatedDetail,
      );
    } else {
      const updateData: Record<string, any> = {
        progress: JSON.stringify(result.progress),
      };
      if (updatedDetail) {
        updateData.objectives_detail = JSON.stringify(updatedDetail);
      }
      await db("player_missions")
        .where({ id: mission.missionId })
        .update(updateData);

      if (io) {
        notifyPlayer(io, playerId, "mission:progress", {
          missionId: mission.missionId,
          progress: result.progress,
          objectivesDetail: updatedDetail,
        });
      }
    }
  }
}

/**
 * Complete a mission: update status, award rewards, notify, update stats.
 */
async function completeMission(
  playerId: string,
  mission: any,
  progress: any,
  io?: SocketIOServer,
  updatedDetail?: ObjectiveDetail[] | null,
): Promise<void> {
  const isStory = mission.source === "story";
  const requiresClaim = isStory || !!mission.requires_claim_at_mall;

  const updatePayload: Record<string, any> = {
    progress: JSON.stringify(progress),
    status: "completed",
    completed_at: new Date().toISOString(),
    claim_status: requiresClaim ? "pending_claim" : "claimed",
  };
  if (updatedDetail) {
    updatePayload.objectives_detail = JSON.stringify(updatedDetail);
  }

  await db("player_missions")
    .where({ id: mission.missionId })
    .update(updatePayload);

  if (!requiresClaim) {
    await awardMissionRewards(
      playerId,
      {
        reward_credits: mission.reward_credits,
        reward_xp: mission.reward_xp,
        reward_faction_id: mission.reward_faction_id,
        reward_fame: mission.reward_fame,
      },
      io,
    );
  }

  if (io) {
    notifyPlayer(io, playerId, "mission:completed", {
      missionId: mission.missionId,
      title: mission.title || mission.type,
      type: mission.type,
      rewardCredits: mission.reward_credits,
      rewardXp: mission.reward_xp || 0,
      requiresClaim,
      isStory,
      storyOrder: mission.story_order || 0,
    });
  }

  incrementStat(playerId, "missions_completed", 1);
  logActivity(
    playerId,
    "mission_complete",
    `Completed mission: ${mission.title || mission.type}`,
  );
  checkMilestones(playerId);

  try {
    await handleSPMissionCompletion(playerId, mission.missionId);
  } catch (spErr) {
    console.error("SP mission hook error:", spErr);
  }
}

/**
 * Apply effects from phase completion or choice selection.
 * Handles fame/infamy adjustments, NPC rep changes, story flags, and inline rewards.
 */
export async function applyEffects(
  playerId: string,
  effects: Record<string, any>,
  io?: SocketIOServer,
): Promise<void> {
  try {
    // Fame adjustments: { cosmic_scholars: 10, frontier_rangers: -5 }
    if (effects.fame) {
      for (const [factionId, amount] of Object.entries(effects.fame)) {
        const fameAmount = amount as number;
        if (fameAmount === 0) continue;
        const existing = await db("player_faction_rep")
          .where({ player_id: playerId, faction_id: factionId })
          .first();
        if (existing) {
          if (fameAmount > 0) {
            await db("player_faction_rep")
              .where({ player_id: playerId, faction_id: factionId })
              .increment("fame", fameAmount);
          } else {
            await db("player_faction_rep")
              .where({ player_id: playerId, faction_id: factionId })
              .increment("infamy", Math.abs(fameAmount));
          }
        } else {
          await db("player_faction_rep").insert({
            player_id: playerId,
            faction_id: factionId,
            fame: fameAmount > 0 ? fameAmount : 0,
            infamy: fameAmount < 0 ? Math.abs(fameAmount) : 0,
          });
        }
      }
    }

    // NPC reputation: { valandor: 15 }
    if (effects.npc_rep) {
      for (const [npcId, amount] of Object.entries(effects.npc_rep)) {
        const repAmount = amount as number;
        const existing = await db("player_npc_state")
          .where({ player_id: playerId, npc_id: npcId })
          .first();
        if (existing) {
          await db("player_npc_state")
            .where({ player_id: playerId, npc_id: npcId })
            .increment("reputation", repAmount);
        }
      }
    }

    // Story flags: { shared_data_with_vedic: true }
    if (effects.flags) {
      for (const [flagKey, flagValue] of Object.entries(effects.flags)) {
        await db("player_story_flags")
          .insert({
            player_id: playerId,
            flag_key: flagKey,
            flag_value: String(flagValue),
            set_at: new Date().toISOString(),
          })
          .onConflict(["player_id", "flag_key"])
          .merge({ flag_value: String(flagValue) });
      }
    }

    // Inline rewards: { credits: 5000, xp: 500 }
    if (effects.rewards) {
      if (effects.rewards.credits) {
        await db("players")
          .where({ id: playerId })
          .increment("credits", effects.rewards.credits);
      }
      if (effects.rewards.xp) {
        const { awardXP } = await import("../engine/progression");
        await awardXP(playerId, effects.rewards.xp, "mission");
      }
    }
  } catch (err) {
    console.error("applyEffects error:", err);
  }
}

/**
 * Handle a player's choice response for a mission in 'awaiting_choice' state.
 * Records the choice, applies effects, and advances the mission.
 */
export async function handleMissionChoice(
  playerId: string,
  missionId: string,
  choiceId: string,
  optionId: string,
  io?: SocketIOServer,
): Promise<{ success: boolean; error?: string }> {
  // Accept both 'awaiting_choice' (normal flow) and 'active' (fallback when
  // phase type is 'choose' but status wasn't transitioned properly)
  const playerMission = await db("player_missions")
    .where({ id: missionId, player_id: playerId })
    .whereIn("status", ["awaiting_choice", "active"])
    .first();
  if (!playerMission) {
    // Debug: check what status the mission actually has
    const anyMission = await db("player_missions")
      .where({ id: missionId, player_id: playerId })
      .first();
    console.error(
      "[handleMissionChoice] mission not found with awaiting_choice/active status. Actual:",
      anyMission?.status,
      "id:",
      missionId,
    );
    return { success: false, error: "No awaiting choice for this mission" };
  }
  console.log("[handleMissionChoice] found mission:", {
    id: playerMission.id,
    status: playerMission.status,
    current_phase: playerMission.current_phase,
  });

  const choice = await db("mission_choices").where({ id: choiceId }).first();
  if (!choice) {
    return { success: false, error: "Choice not found" };
  }

  const options =
    typeof choice.options === "string"
      ? JSON.parse(choice.options)
      : choice.options;
  const selectedOption = options.find((o: any) => o.id === optionId);
  if (!selectedOption) {
    return { success: false, error: "Invalid option" };
  }

  // Record the choice (remove any previous record from abandoned attempt)
  await db("player_mission_choices")
    .where({ player_id: playerId, choice_id: choiceId })
    .del();
  await db("player_mission_choices").insert({
    id: crypto.randomUUID(),
    player_id: playerId,
    choice_id: choiceId,
    option_selected: optionId,
    effects_applied: selectedOption.effects
      ? JSON.stringify(selectedOption.effects)
      : null,
    created_at: new Date().toISOString(),
  });

  // Apply effects from the chosen option
  if (selectedOption.effects) {
    await applyEffects(playerId, selectedOption.effects, io);
  }

  // Determine what happens next: advance phase or complete mission
  const template = await db("mission_templates")
    .where({ id: playerMission.template_id })
    .first();

  if (template?.has_phases) {
    const phases = await db("mission_phases")
      .where({ template_id: template.id })
      .orderBy("phase_order", "asc");

    const currentPhaseIndex = (playerMission.current_phase || 1) - 1;
    console.log("[handleMissionChoice] phase check:", {
      has_phases: true,
      totalPhases: phases.length,
      currentPhaseIndex,
      choicePhaseId: choice.phase_id,
      willAdvance: !!(choice.phase_id && currentPhaseIndex + 1 < phases.length),
      willComplete: !(choice.phase_id && currentPhaseIndex + 1 < phases.length),
    });

    // If this was a mid-mission choice (phase_id != null), advance to next phase
    if (choice.phase_id && currentPhaseIndex + 1 < phases.length) {
      const nextPhase = phases[currentPhaseIndex + 1];
      const nextObjectives =
        typeof nextPhase.objectives === "string"
          ? JSON.parse(nextPhase.objectives)
          : nextPhase.objectives;
      const nextDetail = buildObjectivesDetail(
        nextPhase.objective_type,
        nextObjectives,
      );

      await db("player_missions")
        .where({ id: missionId })
        .update({
          status: "active",
          current_phase: nextPhase.phase_order,
          phase_progress: JSON.stringify({}),
          objectives_detail: JSON.stringify(nextDetail),
        });

      if (io) {
        notifyPlayer(io, playerId, "mission:phase_advanced", {
          missionId,
          title: template.title,
          phaseOrder: nextPhase.phase_order,
          phaseTitle: nextPhase.title,
          phaseDescription: nextPhase.description,
          totalPhases: phases.length,
          loreText: nextPhase.lore_text,
          narrationKey: nextPhase.narration_key,
          storyOrder: template.story_order || 0,
        });
      }
      return { success: true };
    }
  }

  // End-of-mission choice or no more phases — complete the mission
  const missionData = await db("player_missions")
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where({ "player_missions.id": missionId })
    .select(
      "player_missions.id as missionId",
      "mission_templates.type",
      "mission_templates.title",
      "player_missions.progress",
      "player_missions.reward_credits",
      "mission_templates.requires_claim_at_mall",
      "mission_templates.reward_xp",
      "mission_templates.reward_faction_id",
      "mission_templates.reward_fame",
      "mission_templates.source",
      "mission_templates.story_order",
    )
    .first();

  if (missionData) {
    const progress =
      typeof missionData.progress === "string"
        ? JSON.parse(missionData.progress)
        : missionData.progress;

    // Build updated objectives_detail marking the choose objective as complete
    const chooseDetail: ObjectiveDetail[] = [
      {
        description: `Choice made: ${selectedOption.label}`,
        target: 1,
        current: 1,
        complete: true,
      },
    ];

    try {
      await completeMission(playerId, missionData, progress, io, chooseDetail);
    } catch (err) {
      console.error("completeMission failed in handleMissionChoice:", err);
      return { success: false, error: "Failed to complete mission" };
    }
  } else {
    console.error("handleMissionChoice: missionData not found for", missionId);
    return { success: false, error: "Mission data not found" };
  }

  return { success: true };
}

// SP mission IDs that trigger Star Mall unlocks
const SP_MALL_UNLOCK_MISSIONS: Record<string, number> = {
  "d0000000-0000-0000-0000-000000000005": 1, // Mission 5 → unlock Star Mall 1
  "d0000000-0000-0000-0000-000000000012": 2, // Mission 12 → unlock Star Mall 2
  "d0000000-0000-0000-0000-000000000018": 3, // Mission 18 → unlock Star Mall 3
};

// SP tier boundaries: completing all missions in a tier unlocks the next
const SP_TIER_BOUNDARIES: Record<number, number[]> = {
  1: [1, 2, 3, 4, 5], // Tier 1 missions (sort_order)
  2: [6, 7, 8, 9, 10], // Tier 2
  3: [11, 12, 13, 14, 15], // Tier 3
  4: [16, 17, 18, 19, 20], // Tier 4
};

/**
 * Handle SP-specific mission completion effects:
 * - Unlock Star Malls when specific missions complete
 * - Auto-assign next tier of missions when a tier gate mission completes
 */
async function handleSPMissionCompletion(
  playerId: string,
  playerMissionId: string,
): Promise<void> {
  const player = await db("players").where({ id: playerId }).first();
  if (!player || player.game_mode !== "singleplayer") return;

  // Get the template for this completed mission
  const playerMission = await db("player_missions")
    .where({ id: playerMissionId })
    .first();
  if (!playerMission) return;

  const templateId = playerMission.template_id;

  // Check if this mission unlocks a Star Mall
  const mallNumber = SP_MALL_UNLOCK_MISSIONS[templateId];
  if (mallNumber) {
    // Find the Nth locked star mall in this player's SP sectors
    const lockedMalls = await db("sectors")
      .where({
        owner_id: playerId,
        universe: "sp",
        has_star_mall: true,
        sp_mall_locked: true,
      })
      .orderBy("id", "asc");

    if (lockedMalls.length > 0) {
      // Unlock the first locked mall
      await db("sectors")
        .where({ id: lockedMalls[0].id })
        .update({ sp_mall_locked: false });
    }
  }

  // Check if completing this mission should auto-assign next tier missions
  // Get the template's sort_order to determine which tier was completed
  const template = await db("mission_templates")
    .where({ id: templateId })
    .first();
  if (!template || template.source !== "singleplayer") return;

  const sortOrder = template.sort_order;

  // Find which tier this mission belongs to and check if it's the gate mission (last in tier)
  for (const [tier, missionOrders] of Object.entries(SP_TIER_BOUNDARIES)) {
    const tierNum = Number(tier);
    const lastInTier = missionOrders[missionOrders.length - 1];

    if (sortOrder === lastInTier) {
      // This is the gate mission for this tier — check if next tier missions should be assigned
      const nextTier = tierNum + 1;
      const nextTierMissions = await db("mission_templates")
        .where({ source: "singleplayer", tier: nextTier })
        .orderBy("sort_order", "asc");

      if (nextTierMissions.length === 0) break; // No more tiers

      // Check which next-tier missions aren't already assigned
      for (const nextMission of nextTierMissions) {
        const existing = await db("player_missions")
          .where({ player_id: playerId, template_id: nextMission.id })
          .first();

        if (!existing) {
          const objectives =
            typeof nextMission.objectives === "string"
              ? JSON.parse(nextMission.objectives)
              : nextMission.objectives;
          const hints =
            typeof nextMission.hints === "string"
              ? JSON.parse(nextMission.hints)
              : nextMission.hints || [];

          const detail = buildObjectivesDetail(
            nextMission.type,
            objectives,
            hints,
          );

          await db("player_missions").insert({
            id: crypto.randomUUID(),
            player_id: playerId,
            template_id: nextMission.id,
            status: "active",
            progress: JSON.stringify({}),
            objectives_detail: JSON.stringify(detail),
            accepted_at: new Date().toISOString(),
            reward_credits: nextMission.reward_credits,
            claim_status: "auto",
          });
        }
      }
      break;
    }
  }
}

/**
 * Check if a rescue merchant NPC should spawn for deliver_cargo phases.
 * After 10 sector moves without completing the delivery, a friendly NPC
 * appears offering to sell the needed commodity.
 */
const RESCUE_MERCHANT_MOVE_THRESHOLD = 10;

export async function checkRescueMerchant(
  playerId: string,
  sectorId: number,
  io?: SocketIOServer,
): Promise<void> {
  // Find active phased missions where current phase is deliver_cargo
  const activeMissions = await db("player_missions")
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where({
      "player_missions.player_id": playerId,
      "player_missions.status": "active",
      "mission_templates.has_phases": true,
    })
    .select(
      "player_missions.id as missionId",
      "player_missions.template_id",
      "player_missions.current_phase",
      "player_missions.phase_progress",
      "mission_templates.title",
    );

  for (const mission of activeMissions) {
    const phase = await db("mission_phases")
      .where({
        template_id: mission.template_id,
        phase_order: mission.current_phase || 1,
      })
      .first();

    if (!phase || phase.objective_type !== "deliver_cargo") continue;

    const objectives =
      typeof phase.objectives === "string"
        ? JSON.parse(phase.objectives)
        : phase.objectives;

    const progress =
      typeof mission.phase_progress === "string" && mission.phase_progress
        ? JSON.parse(mission.phase_progress)
        : mission.phase_progress || {};

    // Already completed delivery
    if ((progress.cargoDelivered || 0) >= (objectives.quantity || 0)) continue;

    // Increment move counter
    progress.rescueMoves = (progress.rescueMoves || 0) + 1;

    // If player re-enters a sector where rescue NPC was placed, re-notify
    if (progress.rescueNpcSectorId === sectorId) {
      await db("player_missions")
        .where({ id: mission.missionId })
        .update({ phase_progress: JSON.stringify(progress) });

      if (io) {
        notifyPlayer(io, playerId, "npc:rescue_merchant", {
          missionId: mission.missionId,
          missionTitle: mission.title,
          commodity: objectives.commodity,
          quantity: objectives.quantity - (progress.cargoDelivered || 0),
          pricePerUnit: GAME_CONFIG.BASE_CYRILLIUM_PRICE,
          sectorId,
          npcName: "Vedic Trader",
          npcRace: "Vedic",
        });
      }
      return;
    }

    // Spawn rescue NPC after threshold moves
    if (
      progress.rescueMoves >= RESCUE_MERCHANT_MOVE_THRESHOLD &&
      !progress.rescueNpcSectorId
    ) {
      progress.rescueNpcSectorId = sectorId;

      await db("player_missions")
        .where({ id: mission.missionId })
        .update({ phase_progress: JSON.stringify(progress) });

      if (io) {
        notifyPlayer(io, playerId, "npc:rescue_merchant", {
          missionId: mission.missionId,
          missionTitle: mission.title,
          commodity: objectives.commodity,
          quantity: objectives.quantity - (progress.cargoDelivered || 0),
          pricePerUnit: GAME_CONFIG.BASE_CYRILLIUM_PRICE,
          sectorId,
          npcName: "Vedic Trader",
          npcRace: "Vedic",
        });
      }
      return;
    }

    // Just save the incremented move counter
    await db("player_missions")
      .where({ id: mission.missionId })
      .update({ phase_progress: JSON.stringify(progress) });
  }
}

/**
 * Handle purchase from a rescue merchant NPC.
 * Charges credits and adds commodity to player cargo.
 */
export async function handleRescuePurchase(
  playerId: string,
  missionId: string,
  io?: SocketIOServer,
): Promise<{
  success: boolean;
  error?: string;
  quantity?: number;
  cost?: number;
}> {
  const playerMission = await db("player_missions")
    .where({ id: missionId, player_id: playerId, status: "active" })
    .first();
  if (!playerMission) {
    return { success: false, error: "Mission not found or not active" };
  }

  const phase = await db("mission_phases")
    .where({
      template_id: playerMission.template_id,
      phase_order: playerMission.current_phase || 1,
    })
    .first();

  if (!phase || phase.objective_type !== "deliver_cargo") {
    return { success: false, error: "Current phase is not deliver_cargo" };
  }

  const objectives =
    typeof phase.objectives === "string"
      ? JSON.parse(phase.objectives)
      : phase.objectives;
  const progress =
    typeof playerMission.phase_progress === "string" &&
    playerMission.phase_progress
      ? JSON.parse(playerMission.phase_progress)
      : playerMission.phase_progress || {};

  if (!progress.rescueNpcSectorId) {
    return { success: false, error: "No rescue merchant available" };
  }

  const needed = (objectives.quantity || 0) - (progress.cargoDelivered || 0);
  if (needed <= 0) {
    return { success: false, error: "Already have enough cargo" };
  }

  const pricePerUnit = GAME_CONFIG.BASE_CYRILLIUM_PRICE;
  const totalCost = needed * pricePerUnit;

  // Check player has enough credits
  const player = await db("players").where({ id: playerId }).first();
  if (!player || player.credits < totalCost) {
    return { success: false, error: `Not enough credits (need ${totalCost})` };
  }

  // Check cargo space
  const ship = await db("ships")
    .where({ player_id: playerId, is_active: true })
    .first();
  if (!ship) {
    return { success: false, error: "No active ship" };
  }

  const currentCargo =
    (ship.cyrillium_cargo || 0) +
    (ship.food_cargo || 0) +
    (ship.tech_cargo || 0) +
    (ship.colonists_cargo || 0);
  if (currentCargo + needed > ship.max_cargo_holds) {
    return { success: false, error: "Not enough cargo space" };
  }

  // Deduct credits and add cargo
  await db("players").where({ id: playerId }).decrement("credits", totalCost);
  await db("ships").where({ id: ship.id }).increment("cyrillium_cargo", needed);

  // Clear rescue NPC — merchant disappears after purchase
  delete progress.rescueNpcSectorId;
  await db("player_missions")
    .where({ id: missionId })
    .update({ phase_progress: JSON.stringify(progress) });

  // Sync player
  if (io) {
    const socketId = undefined;
    const { syncPlayer } = await import("../ws/sync");
    syncPlayer(io, playerId, "sync:status", socketId);
  }

  return { success: true, quantity: needed, cost: totalCost };
}
