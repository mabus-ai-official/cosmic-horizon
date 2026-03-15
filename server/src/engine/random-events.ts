import db from "../db/connection";
import crypto from "crypto";
import { notifyPlayer } from "../ws/handlers";
import type { Server as SocketIOServer } from "socket.io";

export interface RandomEventTrigger {
  eventId: string;
  eventKey: string;
  title: string;
  description: string;
  spawnChance: number;
  missionTemplateId: string | null;
  rewards: any;
}

/**
 * Check if any random events should trigger based on a player action.
 * Called alongside checkAndUpdateMissions() in game action handlers.
 *
 * @param playerId - The player performing the action
 * @param action - The action type (e.g., 'explore', 'trade', 'combat_destroy')
 * @param data - Action-specific data (e.g., { sectorId, newLevel })
 * @param io - Socket.IO server for notifications
 */
export async function checkRandomEvents(
  playerId: string,
  action: string,
  data: Record<string, any>,
  io?: SocketIOServer,
): Promise<void> {
  try {
    const player = await db("players").where({ id: playerId }).first();
    if (!player) return;

    const playerLevel = player.level || 1;

    // Get all event definitions that match this trigger action
    const candidates = await db("random_event_definitions")
      .where({ trigger_type: "action" })
      .where("min_chapter", "<=", player.current_chapter || 1);

    for (const eventDef of candidates) {
      const conditions =
        typeof eventDef.trigger_conditions === "string"
          ? JSON.parse(eventDef.trigger_conditions)
          : eventDef.trigger_conditions;

      // Check if this event's trigger action matches
      if (conditions.action && conditions.action !== action) continue;

      // Check minimum level
      if (conditions.minLevel && playerLevel < conditions.minLevel) continue;

      // Check max occurrences
      if (eventDef.max_occurrences > 0) {
        const occurrenceCount = await db("player_random_events")
          .where({ player_id: playerId, event_id: eventDef.id })
          .count("* as c")
          .first();
        if (Number(occurrenceCount?.c || 0) >= eventDef.max_occurrences)
          continue;
      }

      // Check cooldown
      if (eventDef.cooldown_hours > 0) {
        const lastEvent = await db("player_random_events")
          .where({ player_id: playerId, event_id: eventDef.id })
          .orderBy("spawned_at", "desc")
          .first();

        if (lastEvent) {
          const cooldownMs = eventDef.cooldown_hours * 60 * 60 * 1000;
          const elapsed = Date.now() - new Date(lastEvent.spawned_at).getTime();
          if (elapsed < cooldownMs) continue;
        }
      }

      // Roll spawn chance
      const roll = Math.random();
      if (roll > eventDef.spawn_chance) continue;

      // Event triggered — create player_random_events record
      const eventInstanceId = crypto.randomUUID();
      await db("player_random_events").insert({
        id: eventInstanceId,
        player_id: playerId,
        event_id: eventDef.id,
        status: "triggered",
        spawned_at: new Date().toISOString(),
        data: JSON.stringify({
          action,
          triggerData: data,
          sectorId: player.current_sector_id,
        }),
      });

      // Notify player via WebSocket with event overlay
      if (io) {
        const rewards =
          typeof eventDef.rewards === "string"
            ? JSON.parse(eventDef.rewards)
            : eventDef.rewards;

        notifyPlayer(io, playerId, "random_event:triggered", {
          eventInstanceId,
          eventKey: eventDef.event_key,
          title: eventDef.title,
          description: eventDef.description,
          missionTemplateId: eventDef.mission_template_id,
          rewards,
        });
      }

      // Only trigger one event per action to avoid event spam
      break;
    }
  } catch (err) {
    console.error("Random event check error:", err);
  }
}

/**
 * Check game-state-spawned events during game tick.
 * These trigger based on player state rather than specific actions.
 */
export async function checkGameStateEvents(
  playerId: string,
  io?: SocketIOServer,
): Promise<void> {
  try {
    const player = await db("players").where({ id: playerId }).first();
    if (!player) return;

    const candidates = await db("random_event_definitions")
      .where({ trigger_type: "game_state" })
      .where("min_chapter", "<=", player.current_chapter || 1);

    for (const eventDef of candidates) {
      const conditions =
        typeof eventDef.trigger_conditions === "string"
          ? JSON.parse(eventDef.trigger_conditions)
          : eventDef.trigger_conditions;

      // Evaluate game-state conditions
      const met = await evaluateGameStateCondition(
        playerId,
        player,
        conditions,
      );
      if (!met) continue;

      // Check max occurrences
      if (eventDef.max_occurrences > 0) {
        const occurrenceCount = await db("player_random_events")
          .where({ player_id: playerId, event_id: eventDef.id })
          .count("* as c")
          .first();
        if (Number(occurrenceCount?.c || 0) >= eventDef.max_occurrences)
          continue;
      }

      // Check cooldown
      if (eventDef.cooldown_hours > 0) {
        const lastEvent = await db("player_random_events")
          .where({ player_id: playerId, event_id: eventDef.id })
          .orderBy("spawned_at", "desc")
          .first();

        if (lastEvent) {
          const cooldownMs = eventDef.cooldown_hours * 60 * 60 * 1000;
          const elapsed = Date.now() - new Date(lastEvent.spawned_at).getTime();
          if (elapsed < cooldownMs) continue;
        }
      }

      // Roll spawn chance
      if (Math.random() > eventDef.spawn_chance) continue;

      // Event triggered
      const eventInstanceId = crypto.randomUUID();
      await db("player_random_events").insert({
        id: eventInstanceId,
        player_id: playerId,
        event_id: eventDef.id,
        status: "triggered",
        spawned_at: new Date().toISOString(),
        data: JSON.stringify({ state: conditions }),
      });

      if (io) {
        const rewards =
          typeof eventDef.rewards === "string"
            ? JSON.parse(eventDef.rewards)
            : eventDef.rewards;

        notifyPlayer(io, playerId, "random_event:triggered", {
          eventInstanceId,
          eventKey: eventDef.event_key,
          title: eventDef.title,
          description: eventDef.description,
          missionTemplateId: eventDef.mission_template_id,
          rewards,
        });
      }

      // One event per tick
      break;
    }
  } catch (err) {
    console.error("Game state event check error:", err);
  }
}

/**
 * Accept a triggered random event — spawns its associated mission if any.
 */
export async function acceptRandomEvent(
  playerId: string,
  eventInstanceId: string,
): Promise<{ success: boolean; missionId?: string; error?: string }> {
  const eventInstance = await db("player_random_events")
    .where({ id: eventInstanceId, player_id: playerId, status: "triggered" })
    .first();

  if (!eventInstance) {
    return { success: false, error: "Event not found or already handled" };
  }

  await db("player_random_events")
    .where({ id: eventInstanceId })
    .update({ status: "accepted" });

  // If the event has an associated mission template, spawn it
  const eventDef = await db("random_event_definitions")
    .where({ id: eventInstance.event_id })
    .first();

  if (eventDef?.mission_template_id) {
    const template = await db("mission_templates")
      .where({ id: eventDef.mission_template_id })
      .first();

    if (template) {
      const missionId = crypto.randomUUID();
      const objectives =
        typeof template.objectives === "string"
          ? JSON.parse(template.objectives)
          : template.objectives;

      await db("player_missions").insert({
        id: missionId,
        player_id: playerId,
        template_id: template.id,
        status: "active",
        progress: JSON.stringify({}),
        reward_credits: template.reward_credits,
        reward_item_id: template.reward_item_id || null,
        accepted_at: new Date().toISOString(),
        expires_at:
          template.type === "timed_delivery"
            ? new Date(
                Date.now() + (objectives.timeMinutes || 30) * 60 * 1000,
              ).toISOString()
            : null,
        objectives_detail: JSON.stringify([]),
        claim_status: "auto",
        current_phase: 1,
        phase_progress: JSON.stringify({}),
      });

      return { success: true, missionId };
    }
  }

  // Event with no mission — just apply rewards directly
  if (eventDef?.rewards) {
    const rewards =
      typeof eventDef.rewards === "string"
        ? JSON.parse(eventDef.rewards)
        : eventDef.rewards;

    if (rewards.credits) {
      await db("players")
        .where({ id: playerId })
        .increment("credits", rewards.credits);
    }
    if (rewards.xp) {
      await db("players").where({ id: playerId }).increment("xp", rewards.xp);
    }

    await db("player_random_events").where({ id: eventInstanceId }).update({
      status: "completed",
      completed_at: new Date().toISOString(),
    });
  }

  return { success: true };
}

/**
 * Decline a triggered random event.
 */
export async function declineRandomEvent(
  playerId: string,
  eventInstanceId: string,
): Promise<{ success: boolean; error?: string }> {
  const updated = await db("player_random_events")
    .where({ id: eventInstanceId, player_id: playerId, status: "triggered" })
    .update({ status: "declined" });

  if (updated === 0) {
    return { success: false, error: "Event not found or already handled" };
  }

  return { success: true };
}

/**
 * Evaluate game-state conditions for game-state-spawned events.
 */
async function evaluateGameStateCondition(
  playerId: string,
  player: any,
  conditions: Record<string, any>,
): Promise<boolean> {
  // Check minimum level
  if (conditions.minLevel && (player.level || 1) < conditions.minLevel) {
    return false;
  }

  // Check credits threshold
  if (
    conditions.minCredits &&
    Number(player.credits || 0) < conditions.minCredits
  ) {
    return false;
  }

  // Check explored sectors count
  if (conditions.minExploredSectors) {
    const explored = JSON.parse(player.explored_sectors || "[]");
    if (explored.length < conditions.minExploredSectors) return false;
  }

  // Check planet count
  if (conditions.minPlanets) {
    const planetCount = await db("planets")
      .where({ owner_id: playerId })
      .count("* as c")
      .first();
    if (Number(planetCount?.c || 0) < conditions.minPlanets) return false;
  }

  // Check fame level with a specific faction
  if (conditions.minFame) {
    const fame = await db("player_faction_rep")
      .where({ player_id: playerId, faction_id: conditions.factionId })
      .first();
    if (Number(fame?.fame || 0) < conditions.minFame) return false;
  }

  // Check NPC encounter count
  if (conditions.minNpcEncounters) {
    const encounters = await db("player_npc_state")
      .where({ player_id: playerId })
      .count("* as c")
      .first();
    if (Number(encounters?.c || 0) < conditions.minNpcEncounters) return false;
  }

  // Check syndicate membership
  if (conditions.requiresSyndicate) {
    if (!player.syndicate_id) return false;
    if (conditions.minSyndicateMembers) {
      const memberCount = await db("players")
        .where({ syndicate_id: player.syndicate_id })
        .count("* as c")
        .first();
      if (Number(memberCount?.c || 0) < conditions.minSyndicateMembers)
        return false;
    }
  }

  // Check planet happiness (for colony crisis events)
  if (conditions.maxPlanetHappiness) {
    const unhappyPlanet = await db("planets")
      .where({ owner_id: playerId })
      .where("happiness", "<", conditions.maxPlanetHappiness)
      .first();
    if (!unhappyPlanet) return false;
  }

  return true;
}
