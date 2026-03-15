import db from "../db/connection";
import crypto from "crypto";
import { GAME_CONFIG } from "../config/game";
import { notifyPlayer } from "../ws/handlers";
import { playerRoom } from "../ws/events";
import type { Server as SocketIOServer } from "socket.io";

export interface StoryProgress {
  currentAct: number;
  currentMissionOrder: number;
  missionsCompletedInAct: number;
  totalStoryCompleted: number;
  actCooldownUntil: string | null;
  hasActiveStoryMission: boolean;
  activeStoryMission?: {
    missionId: string;
    templateId: string;
    title: string;
    storyOrder: number;
    act: number;
    status: string;
    claimStatus: string;
  };
  nextMission?: {
    templateId: string;
    title: string;
    storyOrder: number;
    act: number;
  };
}

export async function getStoryProgress(
  playerId: string,
): Promise<StoryProgress> {
  // Get all completed story missions
  const completed = await db("player_missions")
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where({
      "player_missions.player_id": playerId,
      "mission_templates.source": "story",
      "player_missions.status": "completed",
    })
    .whereIn("player_missions.claim_status", ["claimed", "auto"])
    .select("mission_templates.story_order", "mission_templates.act");

  const totalStoryCompleted = completed.length;

  // Determine current act based on completed missions
  const completedOrders = new Set(completed.map((c: any) => c.story_order));
  let currentAct = 1;
  let missionsCompletedInAct = 0;
  const acts = GAME_CONFIG.STORY_ACTS;

  let runningTotal = 0;
  for (let act = 1; act <= 4; act++) {
    const actSize = acts[act] || 0;
    const completedInThisAct = completed.filter(
      (c: any) => c.act === act,
    ).length;

    if (completedInThisAct >= actSize && act < 4) {
      runningTotal += actSize;
      continue;
    }

    currentAct = act;
    missionsCompletedInAct = completedInThisAct;
    break;
  }

  // Check for active story mission
  const activeMission = await db("player_missions")
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where({
      "player_missions.player_id": playerId,
      "mission_templates.source": "story",
    })
    .where(function () {
      this.where("player_missions.status", "active").orWhere(function () {
        this.where("player_missions.status", "completed").where(
          "player_missions.claim_status",
          "pending_claim",
        );
      });
    })
    .select(
      "player_missions.id as missionId",
      "mission_templates.id as templateId",
      "mission_templates.title",
      "mission_templates.story_order as storyOrder",
      "mission_templates.act",
      "player_missions.status",
      "player_missions.claim_status as claimStatus",
    )
    .first();

  const hasActiveStoryMission = !!activeMission;

  // Get cooldown
  const player = await db("players")
    .where({ id: playerId })
    .select("act_cooldown_until")
    .first();
  const actCooldownUntil = player?.act_cooldown_until || null;

  // Determine next mission
  let nextMission: StoryProgress["nextMission"] = undefined;
  if (!hasActiveStoryMission) {
    const next = await getNextStoryMission(playerId);
    if (next) {
      nextMission = {
        templateId: next.id,
        title: next.title,
        storyOrder: next.story_order,
        act: next.act,
      };
    }
  }

  // Determine current mission order
  let currentMissionOrder = 0;
  if (activeMission) {
    currentMissionOrder = activeMission.storyOrder;
  } else if (nextMission) {
    currentMissionOrder = nextMission.storyOrder;
  } else if (totalStoryCompleted > 0) {
    currentMissionOrder = Math.max(...Array.from(completedOrders));
  }

  return {
    currentAct,
    currentMissionOrder,
    missionsCompletedInAct,
    totalStoryCompleted,
    actCooldownUntil,
    hasActiveStoryMission,
    activeStoryMission: activeMission
      ? {
          missionId: activeMission.missionId,
          templateId: activeMission.templateId,
          title: activeMission.title,
          storyOrder: activeMission.storyOrder,
          act: activeMission.act,
          status: activeMission.status,
          claimStatus: activeMission.claimStatus,
        }
      : undefined,
    nextMission,
  };
}

export async function hasCompletedAct1(playerId: string): Promise<boolean> {
  const act1Completed = await db("player_missions")
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where({
      "player_missions.player_id": playerId,
      "mission_templates.source": "story",
      "mission_templates.act": 1,
      "player_missions.status": "completed",
    })
    .whereIn("player_missions.claim_status", ["claimed", "auto"])
    .count("* as count")
    .first();

  return Number(act1Completed?.count || 0) >= (GAME_CONFIG.STORY_ACTS[1] || 10);
}

export async function hasActiveStoryMission(
  playerId: string,
): Promise<boolean> {
  const active = await db("player_missions")
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where({
      "player_missions.player_id": playerId,
      "mission_templates.source": "story",
      "player_missions.status": "active",
    })
    .first();

  return !!active;
}

export async function getNextStoryMission(
  playerId: string,
): Promise<any | null> {
  // Find the highest story_order that is completed+claimed
  const lastCompleted = await db("player_missions")
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where({
      "player_missions.player_id": playerId,
      "mission_templates.source": "story",
      "player_missions.status": "completed",
    })
    .whereIn("player_missions.claim_status", ["claimed", "auto"])
    .orderBy("mission_templates.story_order", "desc")
    .select("mission_templates.story_order")
    .first();

  const nextOrder = lastCompleted ? lastCompleted.story_order + 1 : 1;

  const nextTemplate = await db("mission_templates")
    .where({ source: "story", story_order: nextOrder })
    .first();

  if (!nextTemplate) return null;

  // Check cooldown — if the next mission is in a new act, check act_cooldown_until
  const player = await db("players")
    .where({ id: playerId })
    .select("act_cooldown_until")
    .first();

  if (
    player?.act_cooldown_until &&
    new Date(player.act_cooldown_until) > new Date()
  ) {
    return null;
  }

  return nextTemplate;
}

const ACT_TITLES: Record<number, string> = {
  1: "Call of Destiny",
  2: "The Rising Storm",
  3: "Quest for Harmony",
  4: "Legacy of the Stars",
};

export async function handleStoryMissionClaim(
  playerId: string,
  missionId: string,
  io?: SocketIOServer,
  excludeSocketId?: string,
): Promise<{ codex?: { title: string; content: string; storyOrder: number } }> {
  let result: {
    codex?: { title: string; content: string; storyOrder: number };
  } = {};

  const playerMission = await db("player_missions")
    .where({ id: missionId })
    .first();
  if (!playerMission) return result;

  const template = await db("mission_templates")
    .where({ id: playerMission.template_id })
    .first();
  if (!template || template.source !== "story") return result;

  const act = template.act;
  const storyOrder = template.story_order;

  // Unlock codex entry
  const codexEntry = await db("lore_codex_entries")
    .where({ unlock_mission_id: template.id })
    .first();

  if (codexEntry) {
    const existing = await db("player_codex_unlocks")
      .where({ player_id: playerId, codex_entry_id: codexEntry.id })
      .first();

    if (!existing) {
      await db("player_codex_unlocks").insert({
        id: crypto.randomUUID(),
        player_id: playerId,
        codex_entry_id: codexEntry.id,
        unlocked_at: new Date().toISOString(),
      });

      result.codex = {
        title: codexEntry.title,
        content: codexEntry.content,
        storyOrder,
      };

      // Emit to other sessions (skip the claiming socket to avoid race)
      if (io) {
        if (excludeSocketId) {
          io.to(playerRoom(playerId))
            .except(excludeSocketId)
            .emit("story:lore_unlocked", {
              codexTitle: codexEntry.title,
              codexContent: codexEntry.content,
              storyOrder,
            });
        } else {
          notifyPlayer(io, playerId, "story:lore_unlocked", {
            codexTitle: codexEntry.title,
            codexContent: codexEntry.content,
            storyOrder,
          });
        }
      }
    }
  }

  // Check if this is the last mission in its act
  const actSize = GAME_CONFIG.STORY_ACTS[act] || 0;
  let actStartOrder = 1;
  for (let a = 1; a < act; a++) {
    actStartOrder += GAME_CONFIG.STORY_ACTS[a] || 0;
  }
  const actEndOrder = actStartOrder + actSize - 1;

  if (storyOrder === actEndOrder && act < 4) {
    // Set act cooldown
    const cooldownUntil = new Date(
      Date.now() + GAME_CONFIG.STORY_ACT_COOLDOWN_HOURS * 60 * 60 * 1000,
    ).toISOString();

    await db("players")
      .where({ id: playerId })
      .update({ act_cooldown_until: cooldownUntil });

    if (io) {
      notifyPlayer(io, playerId, "story:act_complete", {
        act,
        actTitle: ACT_TITLES[act] || `Act ${act}`,
        actSummary: `You have completed Act ${act}: ${ACT_TITLES[act]}. The next chapter of your journey begins soon.`,
      });
    }
  }

  // Reset difficulty modifier on successful claim
  await db("players")
    .where({ id: playerId })
    .update({ story_difficulty_modifier: 1.0 });

  return result;
}

export async function getStoryRecap(
  playerId: string,
): Promise<{ recap: string | null; missionTitle: string | null }> {
  // Get the most recently completed story mission's recap_text
  const lastCompleted = await db("player_missions")
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where({
      "player_missions.player_id": playerId,
      "mission_templates.source": "story",
      "player_missions.status": "completed",
    })
    .whereIn("player_missions.claim_status", ["claimed", "auto"])
    .orderBy("mission_templates.story_order", "desc")
    .select("mission_templates.recap_text", "mission_templates.title")
    .first();

  if (!lastCompleted) return { recap: null, missionTitle: null };

  return {
    recap: lastCompleted.recap_text,
    missionTitle: lastCompleted.title,
  };
}

export async function getFailureCount(
  playerId: string,
  templateId: string,
): Promise<number> {
  const result = await db("player_missions")
    .where({
      player_id: playerId,
      template_id: templateId,
      status: "abandoned",
    })
    .count("* as count")
    .first();

  return Number(result?.count || 0);
}
