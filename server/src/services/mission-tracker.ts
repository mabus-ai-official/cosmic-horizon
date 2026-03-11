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
import {
  incrementStat,
  logActivity,
  checkMilestones,
} from "../engine/profile-stats";
import { notifyPlayer } from "../ws/handlers";
import { calculateTier } from "../engine/npcs";
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
      );

    for (const mission of activeMissions) {
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
        // Update objectives_detail if present
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
          // Story missions always require manual claim
          const isStory = mission.source === "story";
          const requiresClaim = isStory || !!mission.requires_claim_at_mall;

          if (requiresClaim) {
            // Don't award rewards yet — player must claim at a Star Mall
            await db("player_missions")
              .where({ id: mission.missionId })
              .update({
                progress: JSON.stringify(result.progress),
                objectives_detail: updatedDetail
                  ? JSON.stringify(updatedDetail)
                  : undefined,
                status: "completed",
                completed_at: new Date().toISOString(),
                claim_status: "pending_claim",
              });
          } else {
            // Auto-claim: award rewards immediately
            await db("player_missions")
              .where({ id: mission.missionId })
              .update({
                progress: JSON.stringify(result.progress),
                objectives_detail: updatedDetail
                  ? JSON.stringify(updatedDetail)
                  : undefined,
                status: "completed",
                completed_at: new Date().toISOString(),
                claim_status: "claimed",
              });
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

          // Push mission:completed event to client
          if (io) {
            notifyPlayer(io, playerId, "mission:completed", {
              missionId: mission.missionId,
              title: mission.title || mission.type,
              type: mission.type,
              rewardCredits: mission.reward_credits,
              rewardXp: mission.reward_xp || 0,
              requiresClaim,
              isStory,
            });
          }

          // Profile stats: mission completed
          incrementStat(playerId, "missions_completed", 1);
          logActivity(
            playerId,
            "mission_complete",
            `Completed mission: ${mission.type}`,
          );
          checkMilestones(playerId);

          // SP mission hooks: mall unlocking and tier auto-advance
          try {
            await handleSPMissionCompletion(playerId, mission.missionId);
          } catch (spErr) {
            console.error("SP mission hook error:", spErr);
          }
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

          // Push live progress update to client
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
  } catch (err) {
    console.error("Mission tracker error:", err);
  }
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
