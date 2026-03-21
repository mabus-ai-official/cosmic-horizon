/**
 * Combat V2 State Manager — Database-backed session lifecycle + in-memory timers.
 *
 * Manages: session creation, order submission, round resolution,
 * result application to DB, and session termination.
 */

import crypto from "crypto";
import db from "../db/connection";
import {
  resolveRound,
  generateDefaultOrders,
  generateNPCOrders,
  validatePowerAllocation,
  type CombatPlayerState,
  type CombatOrders,
  type SubsystemState,
  type WeaponState,
  type CrewMember,
  type CombatHazard,
  type RoundResolution,
} from "./combat-v2";
import { handleShipDestruction } from "./combat-rewards";
import { isStoryNPC } from "./story-npcs";
import { handleSectorChange } from "../ws/handlers";
import { syncPlayer } from "../ws/sync";
import type { Server as IOServer } from "socket.io";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROUND_TIMER_MS = 30_000; // 30 seconds per round

/**
 * Emit a combat event to both players in a session via their personal rooms.
 */
async function emitToBothPlayers(
  io: IOServer,
  sessionId: string,
  event: string,
  data: any,
): Promise<void> {
  const session = await db("combat_sessions").where({ id: sessionId }).first();
  if (!session) return;
  io.to(`player:${session.attacker_id}`).emit(event, data);
  io.to(`player:${session.defender_id}`).emit(event, data);
}

// ─── Timer Management ────────────────────────────────────────────────────────

const roundTimers = new Map<string, NodeJS.Timeout>();

function clearRoundTimer(sessionId: string): void {
  const existing = roundTimers.get(sessionId);
  if (existing) {
    clearTimeout(existing);
    roundTimers.delete(sessionId);
  }
}

// ─── Load Combat State from DB ──────────────────────────────────────────────

/**
 * Load a player's full combat state from the database.
 */
export async function loadCombatPlayerState(
  playerId: string,
): Promise<CombatPlayerState | null> {
  const player = await db("players").where({ id: playerId }).first();
  if (!player) return null;

  const ship = await db("ships").where({ id: player.current_ship_id }).first();
  if (!ship) return null;

  const subsystems = await db("ship_subsystems")
    .where({ ship_id: ship.id })
    .select("*");

  const weapons = await db("weapon_slots")
    .where({ ship_id: ship.id })
    .join("weapon_types", "weapon_slots.weapon_type_id", "weapon_types.id")
    .select(
      "weapon_slots.slot_index",
      "weapon_slots.weapon_type_id",
      "weapon_slots.cooldown_remaining",
      "weapon_types.damage_base",
      "weapon_types.cooldown_rounds",
      "weapon_types.power_cost",
      "weapon_types.accuracy",
      "weapon_types.weapon_class",
    );

  // Load crew
  let crewRows: any[] = [];
  try {
    crewRows = await db("crew_members")
      .where({ player_id: playerId })
      .whereNot({ status: "dead" })
      .select("*");
  } catch {
    // crew_members table may not exist yet
  }

  return {
    playerId,
    shipId: ship.id,
    hullHp: ship.hull_hp,
    maxHullHp: ship.max_hull_hp,
    reactorPower: ship.reactor_power,
    maxReactorPower: ship.max_reactor_power,
    subsystems: subsystems.map(
      (s: any): SubsystemState => ({
        type: s.subsystem_type,
        currentHp: s.current_hp,
        maxHp: s.max_hp,
        isDisabled: !!s.is_disabled,
      }),
    ),
    weapons: weapons.map(
      (w: any): WeaponState => ({
        slotIndex: w.slot_index,
        weaponTypeId: w.weapon_type_id,
        damageBase: w.damage_base,
        cooldownRounds: w.cooldown_rounds,
        powerCost: w.power_cost,
        accuracy: w.accuracy,
        weaponClass: w.weapon_class,
        cooldownRemaining: w.cooldown_remaining,
      }),
    ),
    crew: crewRows.map(
      (c: any): CrewMember => ({
        id: c.id,
        name: c.name,
        role: c.role,
        skillLevel: c.skill_level,
        hp: c.hp,
        maxHp: c.max_hp,
        assignedStation: c.assigned_station,
        status: c.status,
      }),
    ),
  };
}

// ─── Session Lifecycle ──────────────────────────────────────────────────────

/**
 * Create a new combat session between two players.
 * Returns the session ID and initial state.
 */
export async function createCombatSession(
  attackerId: string,
  defenderId: string,
  sectorId: number,
  io: IOServer | null,
): Promise<{
  sessionId: string;
  playerAState: CombatPlayerState;
  playerBState: CombatPlayerState;
}> {
  const sessionId = crypto.randomUUID();
  const deadline = new Date(Date.now() + ROUND_TIMER_MS);

  await db("combat_sessions").insert({
    id: sessionId,
    attacker_id: attackerId,
    defender_id: defenderId,
    sector_id: sectorId,
    status: "active",
    current_round: 1,
    round_deadline: deadline,
  });

  await db("combat_rounds").insert({
    session_id: sessionId,
    round_number: 1,
    player_a_id: attackerId,
    player_b_id: defenderId,
  });

  const playerAState = await loadCombatPlayerState(attackerId);
  const playerBState = await loadCombatPlayerState(defenderId);

  if (!playerAState || !playerBState) {
    throw new Error("Failed to load combat states");
  }

  // Start round timer
  startRoundTimer(sessionId, io);

  // Check if defender is NPC — auto-submit orders
  const defenderIsNPC = await isStoryNPC(defenderId);
  if (defenderIsNPC) {
    const npcOrders = generateNPCOrders(playerBState, playerAState);
    // Submit NPC orders immediately (will resolve when player also submits)
    await submitOrdersInternal(sessionId, defenderId, npcOrders, io);
  }

  return { sessionId, playerAState, playerBState };
}

/**
 * Submit combat orders for a player in a session.
 * If both players have submitted, automatically resolves the round.
 */
export async function submitOrders(
  sessionId: string,
  playerId: string,
  orders: CombatOrders,
  io: IOServer | null,
): Promise<{ resolved: boolean; resolution?: RoundResolution }> {
  return submitOrdersInternal(sessionId, playerId, orders, io);
}

async function submitOrdersInternal(
  sessionId: string,
  playerId: string,
  orders: CombatOrders,
  io: IOServer | null,
): Promise<{ resolved: boolean; resolution?: RoundResolution }> {
  const session = await db("combat_sessions")
    .where({ id: sessionId, status: "active" })
    .first();
  if (!session) throw new Error("Combat session not found or not active");

  const round = await db("combat_rounds")
    .where({
      session_id: sessionId,
      round_number: session.current_round,
      resolved: false,
    })
    .first();
  if (!round) throw new Error("No active round found");

  // Determine which player slot (A or B)
  const isPlayerA = round.player_a_id === playerId;
  const isPlayerB = round.player_b_id === playerId;
  if (!isPlayerA && !isPlayerB) {
    throw new Error("Player not part of this combat session");
  }

  // Save orders
  const updateData: Record<string, any> = {};
  if (isPlayerA) {
    updateData.player_a_orders = JSON.stringify(orders);
    updateData.player_a_submitted_at = new Date();
  } else {
    updateData.player_b_orders = JSON.stringify(orders);
    updateData.player_b_submitted_at = new Date();
  }

  await db("combat_rounds").where({ id: round.id }).update(updateData);

  // Notify opponent that orders are locked in
  const opponentId = isPlayerA ? round.player_b_id : round.player_a_id;
  if (io) {
    emitToBothPlayers(io, sessionId, "combat-v2:opponent_ready", {
      playerId,
    });
  }

  // Refresh round to check if both submitted
  const refreshedRound = await db("combat_rounds")
    .where({ id: round.id })
    .first();

  if (refreshedRound.player_a_orders && refreshedRound.player_b_orders) {
    // Both submitted — resolve
    const resolution = await resolveCurrentRound(sessionId, io);
    return { resolved: true, resolution };
  }

  return { resolved: false };
}

/**
 * Resolve the current round of a combat session.
 */
async function resolveCurrentRound(
  sessionId: string,
  io: IOServer | null,
): Promise<RoundResolution> {
  clearRoundTimer(sessionId);

  const session = await db("combat_sessions").where({ id: sessionId }).first();
  const round = await db("combat_rounds")
    .where({
      session_id: sessionId,
      round_number: session.current_round,
    })
    .first();

  // Load fresh combat states
  const playerAState = await loadCombatPlayerState(round.player_a_id);
  const playerBState = await loadCombatPlayerState(round.player_b_id);
  if (!playerAState || !playerBState) {
    throw new Error("Failed to load combat player states");
  }

  // Parse orders (use defaults if somehow null)
  const ordersA: CombatOrders = round.player_a_orders
    ? JSON.parse(round.player_a_orders)
    : generateDefaultOrders(playerAState);
  const ordersB: CombatOrders = round.player_b_orders
    ? JSON.parse(round.player_b_orders)
    : generateDefaultOrders(playerBState);

  // Validate power allocations
  if (
    !validatePowerAllocation(
      ordersA.powerAllocation,
      playerAState.maxReactorPower,
    )
  ) {
    Object.assign(ordersA, generateDefaultOrders(playerAState));
  }
  if (
    !validatePowerAllocation(
      ordersB.powerAllocation,
      playerBState.maxReactorPower,
    )
  ) {
    Object.assign(ordersB, generateDefaultOrders(playerBState));
  }

  // Load sector hazard for environment effects
  let combatHazard: CombatHazard = null;
  try {
    const sector = await db("sectors").where({ id: session.sector_id }).first();
    combatHazard = (sector?.combat_hazard as CombatHazard) ?? null;
  } catch {
    /* combat_hazard column may not exist yet */
  }

  // Resolve the round (mutates states in place)
  const resolution = resolveRound(
    playerAState,
    ordersA,
    playerBState,
    ordersB,
    session.current_round,
    Math.random,
    combatHazard,
  );

  // Mark round as resolved
  await db("combat_rounds")
    .where({ id: round.id })
    .update({
      resolved: true,
      resolution_data: JSON.stringify(resolution),
    });

  // Apply results to database
  await applyRoundResults(resolution);

  // Emit round resolved event
  if (io) {
    emitToBothPlayers(io, sessionId, "combat-v2:round_resolved", {
      sessionId,
      resolution,
    });
  }

  // Check if combat ended
  if (resolution.combatEnded) {
    try {
      await endCombatSession(sessionId, resolution, io);
    } catch (err) {
      console.error("endCombatSession error:", err);
      // Ensure session gets closed even if rewards fail
      await db("combat_sessions").where({ id: sessionId }).update({
        status: "resolved",
        updated_at: new Date(),
      });
      if (io) {
        emitToBothPlayers(io, sessionId, "combat-v2:combat_end", {
          sessionId,
          status: "resolved",
          winnerId: null,
          endReason: resolution.endReason,
          destroyedPlayerId: resolution.destroyedPlayerId,
        });
      }
    }
  } else {
    // Start next round
    const nextRound = session.current_round + 1;
    const nextDeadline = new Date(Date.now() + ROUND_TIMER_MS);

    await db("combat_sessions").where({ id: sessionId }).update({
      current_round: nextRound,
      round_deadline: nextDeadline,
      updated_at: new Date(),
    });

    await db("combat_rounds").insert({
      session_id: sessionId,
      round_number: nextRound,
      player_a_id: round.player_a_id,
      player_b_id: round.player_b_id,
    });

    // Emit next round start
    if (io) {
      emitToBothPlayers(io, sessionId, "combat-v2:round_start", {
        sessionId,
        roundNumber: nextRound,
        deadline: nextDeadline.toISOString(),
        playerAState: resolution.playerAState,
        playerBState: resolution.playerBState,
      });
    }

    // Start timer for next round
    startRoundTimer(sessionId, io);

    // Auto-submit NPC orders for next round
    const aIsNPC = await isStoryNPC(round.player_a_id);
    const bIsNPC = await isStoryNPC(round.player_b_id);
    if (aIsNPC && resolution.playerAState) {
      const npcOrders = generateNPCOrders(
        resolution.playerAState,
        resolution.playerBState,
      );
      await submitOrdersInternal(sessionId, round.player_a_id, npcOrders, io);
    }
    if (bIsNPC && resolution.playerBState) {
      const npcOrders = generateNPCOrders(
        resolution.playerBState,
        resolution.playerAState,
      );
      await submitOrdersInternal(sessionId, round.player_b_id, npcOrders, io);
    }
  }

  return resolution;
}

/**
 * Apply round results to the database — update ship_subsystems, weapon_slots, hull_hp.
 */
async function applyRoundResults(resolution: RoundResolution): Promise<void> {
  for (const state of [resolution.playerAState, resolution.playerBState]) {
    // Update ship hull HP
    await db("ships")
      .where({ id: state.shipId })
      .update({
        hull_hp: Math.max(0, state.hullHp),
      });

    // Update subsystems
    for (const sub of state.subsystems) {
      await db("ship_subsystems")
        .where({ ship_id: state.shipId, subsystem_type: sub.type })
        .update({
          current_hp: sub.currentHp,
          is_disabled: sub.isDisabled,
        });
    }

    // Update weapon cooldowns
    for (const weapon of state.weapons) {
      await db("weapon_slots")
        .where({ ship_id: state.shipId, slot_index: weapon.slotIndex })
        .update({ cooldown_remaining: weapon.cooldownRemaining });
    }

    // Update crew state (Phase 4)
    for (const crew of state.crew) {
      try {
        await db("crew_members").where({ id: crew.id }).update({
          hp: crew.hp,
          status: crew.status,
          assigned_station: crew.assignedStation,
        });
      } catch {
        /* crew_members table may not exist yet */
      }
    }
  }
}

/**
 * End a combat session — handle destruction rewards, update status.
 */
async function endCombatSession(
  sessionId: string,
  resolution: RoundResolution,
  io: IOServer | null,
): Promise<void> {
  clearRoundTimer(sessionId);

  const session = await db("combat_sessions").where({ id: sessionId }).first();
  if (!session) return;

  // Determine winner/status FIRST (before any cleanup that might delete rows)
  let status: string;
  let winnerId: string | null = null;

  if (resolution.endReason === "destroyed") {
    status = "destroyed";
    const destroyedId = resolution.destroyedPlayerId!;
    winnerId =
      destroyedId === resolution.playerAState.playerId
        ? resolution.playerBState.playerId
        : resolution.playerAState.playerId;
  } else if (resolution.endReason === "fled") {
    status = "fled";
    const fledId = resolution.fledPlayerId!;
    winnerId =
      fledId === resolution.playerAState.playerId
        ? resolution.playerBState.playerId
        : resolution.playerAState.playerId;
  } else if (resolution.endReason === "captured") {
    status = "resolved";
    const capturedId = resolution.capturedPlayerId!;
    winnerId =
      capturedId === resolution.playerAState.playerId
        ? resolution.playerBState.playerId
        : resolution.playerAState.playerId;
  } else if (resolution.endReason === "mutual_destruction") {
    status = "destroyed";
  } else {
    status = "resolved";
  }

  // Update session status + emit combat_end BEFORE rewards/cleanup
  // (NPC cleanup deletes the session row, so this must happen first)
  await db("combat_sessions").where({ id: sessionId }).update({
    status,
    winner_id: winnerId,
    updated_at: new Date(),
  });

  if (io) {
    // Emit directly to player rooms (not via emitToBothPlayers which queries the session)
    const endData = {
      sessionId,
      status,
      winnerId,
      endReason: resolution.endReason,
      destroyedPlayerId: resolution.destroyedPlayerId,
      fledPlayerId: resolution.fledPlayerId,
      capturedPlayerId: resolution.capturedPlayerId,
    };
    io.to(`player:${session.attacker_id}`).emit(
      "combat-v2:combat_end",
      endData,
    );
    io.to(`player:${session.defender_id}`).emit(
      "combat-v2:combat_end",
      endData,
    );

    syncPlayer(io, resolution.playerAState.playerId, "sync:full");
    syncPlayer(io, resolution.playerBState.playerId, "sync:full");
  }

  // NOW handle rewards/cleanup (may delete session row via NPC cleanup)
  if (resolution.endReason === "destroyed") {
    const destroyedId = resolution.destroyedPlayerId!;
    const loser =
      destroyedId === resolution.playerAState.playerId
        ? resolution.playerAState
        : resolution.playerBState;
    const winner =
      destroyedId === resolution.playerAState.playerId
        ? resolution.playerBState
        : resolution.playerAState;

    try {
      await handleShipDestruction(
        winner.playerId,
        loser.playerId,
        winner.shipId,
        loser.shipId,
        session.sector_id,
        io,
      );
    } catch (err) {
      console.error("handleShipDestruction error (non-fatal):", err);
    }
  } else if (resolution.endReason === "fled") {
    const fledId = resolution.fledPlayerId!;
    const player = await db("players").where({ id: fledId }).first();
    if (player) {
      const edges = await db("sector_edges").where({
        from_sector_id: session.sector_id,
      });
      if (edges.length > 0) {
        const randomEdge = edges[Math.floor(Math.random() * edges.length)];
        await db("players").where({ id: fledId }).update({
          current_sector_id: randomEdge.to_sector_id,
          docked_at_outpost_id: null,
          landed_at_planet_id: null,
        });
        if (player.current_ship_id) {
          await db("ships")
            .where({ id: player.current_ship_id })
            .update({ sector_id: randomEdge.to_sector_id });
        }
        if (io) {
          handleSectorChange(
            io,
            fledId,
            session.sector_id,
            randomEdge.to_sector_id,
            player.username,
          );
          syncPlayer(io, fledId, "sync:full");
        }
      }
    }
  } else if (resolution.endReason === "captured") {
    const capturedId = resolution.capturedPlayerId!;
    const loser =
      capturedId === resolution.playerAState.playerId
        ? resolution.playerAState
        : resolution.playerBState;
    const winner =
      capturedId === resolution.playerAState.playerId
        ? resolution.playerBState
        : resolution.playerAState;

    try {
      await db("players")
        .where({ id: winner.playerId })
        .increment("credits", 5000);
      await handleShipDestruction(
        winner.playerId,
        loser.playerId,
        winner.shipId,
        loser.shipId,
        session.sector_id,
        io,
      );
    } catch (err) {
      console.error("handleShipDestruction (capture) error (non-fatal):", err);
    }
  } else if (resolution.endReason === "mutual_destruction") {
    try {
      await handleShipDestruction(
        resolution.playerBState.playerId,
        resolution.playerAState.playerId,
        resolution.playerBState.shipId,
        resolution.playerAState.shipId,
        session.sector_id,
        io,
      );
      await handleShipDestruction(
        resolution.playerAState.playerId,
        resolution.playerBState.playerId,
        resolution.playerAState.shipId,
        resolution.playerBState.shipId,
        session.sector_id,
        io,
      );
    } catch (err) {
      console.error("handleShipDestruction (mutual) error (non-fatal):", err);
    }
  }
}

// ─── Timer ──────────────────────────────────────────────────────────────────

function startRoundTimer(sessionId: string, io: IOServer | null): void {
  clearRoundTimer(sessionId);

  const timer = setTimeout(async () => {
    try {
      await handleTimerExpiry(sessionId, io);
    } catch (err) {
      console.error(`Combat timer expiry error for session ${sessionId}:`, err);
    }
  }, ROUND_TIMER_MS);

  roundTimers.set(sessionId, timer);
}

/**
 * Handle timer expiry — auto-submit default orders for any player who hasn't submitted.
 */
async function handleTimerExpiry(
  sessionId: string,
  io: IOServer | null,
): Promise<void> {
  const session = await db("combat_sessions")
    .where({ id: sessionId, status: "active" })
    .first();
  if (!session) return;

  const round = await db("combat_rounds")
    .where({
      session_id: sessionId,
      round_number: session.current_round,
      resolved: false,
    })
    .first();
  if (!round) return;

  // Auto-submit default orders for players who haven't submitted
  if (!round.player_a_orders) {
    const stateA = await loadCombatPlayerState(round.player_a_id);
    if (stateA) {
      const defaultOrders = generateDefaultOrders(stateA);
      await db("combat_rounds")
        .where({ id: round.id })
        .update({
          player_a_orders: JSON.stringify(defaultOrders),
          player_a_submitted_at: new Date(),
        });
    }
  }

  if (!round.player_b_orders) {
    const stateB = await loadCombatPlayerState(round.player_b_id);
    if (stateB) {
      const defaultOrders = generateDefaultOrders(stateB);
      await db("combat_rounds")
        .where({ id: round.id })
        .update({
          player_b_orders: JSON.stringify(defaultOrders),
          player_b_submitted_at: new Date(),
        });
    }
  }

  // Now resolve
  await resolveCurrentRound(sessionId, io);
}

// ─── Surrender ──────────────────────────────────────────────────────────────

/**
 * Surrender — immediate loss. Treated as ship destruction.
 */
export async function surrender(
  sessionId: string,
  playerId: string,
  io: IOServer | null,
): Promise<void> {
  const session = await db("combat_sessions")
    .where({ id: sessionId, status: "active" })
    .first();
  if (!session) throw new Error("Combat session not found or not active");

  clearRoundTimer(sessionId);

  const isAttacker = session.attacker_id === playerId;
  const winnerId = isAttacker ? session.defender_id : session.attacker_id;
  const loserId = playerId;

  const loserState = await loadCombatPlayerState(loserId);
  const winnerState = await loadCombatPlayerState(winnerId);

  if (loserState && winnerState) {
    // Set hull to 0
    loserState.hullHp = 0;
    await db("ships").where({ id: loserState.shipId }).update({ hull_hp: 0 });

    await handleShipDestruction(
      winnerId,
      loserId,
      winnerState.shipId,
      loserState.shipId,
      session.sector_id,
      io,
    );
  }

  await db("combat_sessions").where({ id: sessionId }).update({
    status: "destroyed",
    winner_id: winnerId,
    updated_at: new Date(),
  });

  if (io) {
    emitToBothPlayers(io, sessionId, "combat-v2:combat_end", {
      sessionId,
      status: "destroyed",
      winnerId,
      endReason: "destroyed",
      destroyedPlayerId: loserId,
    });
    syncPlayer(io, winnerId, "sync:full");
    syncPlayer(io, loserId, "sync:full");
  }
}

// ─── Get Session State ──────────────────────────────────────────────────────

/**
 * Get the current state of a combat session (for reconnect/refresh).
 */
export async function getCombatSessionState(playerId: string): Promise<{
  session: any;
  round: any;
  playerState: CombatPlayerState | null;
  opponentState: CombatPlayerState | null;
  roundHistory: any[];
} | null> {
  // Find active session for this player
  const session = await db("combat_sessions")
    .where({ status: "active" })
    .where(function () {
      this.where({ attacker_id: playerId }).orWhere({ defender_id: playerId });
    })
    .first();

  if (!session) return null;

  const opponentId =
    session.attacker_id === playerId
      ? session.defender_id
      : session.attacker_id;

  const currentRound = await db("combat_rounds")
    .where({
      session_id: session.id,
      round_number: session.current_round,
    })
    .first();

  const playerState = await loadCombatPlayerState(playerId);
  const opponentState = await loadCombatPlayerState(opponentId);

  // Get resolved round history
  const roundHistory = await db("combat_rounds")
    .where({ session_id: session.id, resolved: true })
    .orderBy("round_number", "asc")
    .select("round_number", "resolution_data");

  return {
    session: {
      id: session.id,
      attackerId: session.attacker_id,
      defenderId: session.defender_id,
      sectorId: session.sector_id,
      currentRound: session.current_round,
      roundDeadline: session.round_deadline,
    },
    round: currentRound
      ? {
          roundNumber: currentRound.round_number,
          playerSubmitted:
            (currentRound.player_a_id === playerId &&
              !!currentRound.player_a_submitted_at) ||
            (currentRound.player_b_id === playerId &&
              !!currentRound.player_b_submitted_at),
          opponentSubmitted:
            (currentRound.player_a_id === opponentId &&
              !!currentRound.player_a_submitted_at) ||
            (currentRound.player_b_id === opponentId &&
              !!currentRound.player_b_submitted_at),
        }
      : null,
    playerState,
    opponentState,
    roundHistory: roundHistory.map((r: any) => ({
      roundNumber: r.round_number,
      resolution: r.resolution_data ? JSON.parse(r.resolution_data) : null,
    })),
  };
}

// ─── Server Restart Recovery ─────────────────────────────────────────────────

/**
 * On server startup, scan for active sessions and resume/resolve stale rounds.
 */
export async function recoverActiveSessions(
  io: IOServer | null,
): Promise<void> {
  const activeSessions = await db("combat_sessions")
    .where({ status: "active" })
    .select("id", "current_round", "round_deadline");

  for (const session of activeSessions) {
    const deadline = session.round_deadline
      ? new Date(session.round_deadline).getTime()
      : 0;
    const now = Date.now();

    if (deadline <= now) {
      // Timer already expired — resolve immediately
      try {
        await handleTimerExpiry(session.id, io);
      } catch (err) {
        console.error(`Failed to recover combat session ${session.id}:`, err);
      }
    } else {
      // Resume timer with remaining time
      const remaining = deadline - now;
      const timer = setTimeout(async () => {
        try {
          await handleTimerExpiry(session.id, io);
        } catch (err) {
          console.error(
            `Combat timer recovery error for session ${session.id}:`,
            err,
          );
        }
      }, remaining);
      roundTimers.set(session.id, timer);
    }
  }
}
