/**
 * escort-mission.ts — Real-time escort convoy for mission 15.
 *
 * When the player accepts mission 15, a caravan spawns at a random sector
 * near the player and begins moving every 7 seconds. The player must keep
 * up with the caravan (be in the same sector when it moves). After 10 moves
 * the escort is complete. On the 6th move, an ambush triggers and the timer
 * pauses until combat resolves.
 */

import db from "../db/connection";
import { notifyPlayer } from "../ws/handlers";
import type { Server as SocketIOServer } from "socket.io";

const CARAVAN_MOVE_INTERVAL_MS = 7000;
const TOTAL_CARAVAN_MOVES = 10;
const AMBUSH_AT_MOVE = 6;

interface EscortState {
  playerId: string;
  missionId: string;
  caravanSectorId: number;
  moveCount: number;
  paused: boolean;
  timer: ReturnType<typeof setInterval> | null;
  io: SocketIOServer;
  sectorPath: number[];
}

/** Active escort missions keyed by playerId */
const activeEscorts = new Map<string, EscortState>();

/**
 * Generate a path of adjacent sectors starting near the player.
 */
async function generateCaravanPath(
  startSectorId: number,
  hops: number,
): Promise<number[]> {
  const path: number[] = [];
  let currentId = startSectorId;

  for (let i = 0; i < hops; i++) {
    const adjacents: { adjacent_sector_id: number }[] = await db(
      "sector_adjacency",
    )
      .where({ sector_id: currentId })
      .select("adjacent_sector_id");

    if (adjacents.length === 0) break;

    // Pick a random adjacent that isn't already in the path
    const candidates = adjacents.filter(
      (a) => !path.includes(a.adjacent_sector_id),
    );
    const next =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : adjacents[Math.floor(Math.random() * adjacents.length)];

    path.push(next.adjacent_sector_id);
    currentId = next.adjacent_sector_id;
  }

  return path;
}

/**
 * Start the escort convoy for a player.
 */
export async function startEscort(
  playerId: string,
  missionId: string,
  io: SocketIOServer,
): Promise<void> {
  // Clean up any existing escort for this player
  stopEscort(playerId);

  const player = await db("players").where({ id: playerId }).first();
  if (!player) return;

  const startSector = player.current_sector_id;

  // Generate path of TOTAL_CARAVAN_MOVES sectors
  const sectorPath = await generateCaravanPath(
    startSector,
    TOTAL_CARAVAN_MOVES + 2,
  );
  if (sectorPath.length < TOTAL_CARAVAN_MOVES) {
    // Not enough connected sectors — fill with randoms
    while (sectorPath.length < TOTAL_CARAVAN_MOVES) {
      const random = await db("sectors").orderByRaw("RANDOM()").first();
      if (random) sectorPath.push(random.id);
    }
  }

  const state: EscortState = {
    playerId,
    missionId,
    caravanSectorId: startSector,
    moveCount: 0,
    paused: false,
    timer: null,
    io,
    sectorPath,
  };

  activeEscorts.set(playerId, state);

  // Notify player of caravan start
  notifyPlayer(io, playerId, "escort:started", {
    missionId,
    caravanSectorId: startSector,
    totalMoves: TOTAL_CARAVAN_MOVES,
  });

  // Start the timer
  state.timer = setInterval(
    () => advanceCaravan(playerId),
    CARAVAN_MOVE_INTERVAL_MS,
  );
}

async function advanceCaravan(playerId: string): Promise<void> {
  const state = activeEscorts.get(playerId);
  if (!state || state.paused) return;

  const nextSector = state.sectorPath[state.moveCount];
  if (!nextSector) {
    // Path exhausted — complete
    await completeEscort(playerId, true);
    return;
  }

  state.caravanSectorId = nextSector;
  state.moveCount++;

  // Check if player is in the right sector
  const player = await db("players").where({ id: playerId }).first();
  const playerSector = player?.current_sector_id;

  // Notify caravan position
  notifyPlayer(state.io, playerId, "escort:caravan_moved", {
    caravanSectorId: nextSector,
    moveCount: state.moveCount,
    totalMoves: TOTAL_CARAVAN_MOVES,
    playerInRange: playerSector === nextSector,
  });

  // Ambush on move 6
  if (state.moveCount === AMBUSH_AT_MOVE) {
    state.paused = true;
    notifyPlayer(state.io, playerId, "escort:ambush", {
      caravanSectorId: nextSector,
      moveCount: state.moveCount,
    });
    return;
  }

  // Check if escort is complete
  if (state.moveCount >= TOTAL_CARAVAN_MOVES) {
    await completeEscort(playerId, true);
  }
}

/**
 * Resume the escort after ambush is resolved (player won combat).
 */
export function resumeEscort(playerId: string): void {
  const state = activeEscorts.get(playerId);
  if (!state || !state.paused) return;

  state.paused = false;
  notifyPlayer(state.io, playerId, "escort:resumed", {
    caravanSectorId: state.caravanSectorId,
    moveCount: state.moveCount,
    totalMoves: TOTAL_CARAVAN_MOVES,
  });
}

/**
 * Fail the escort (player lost combat or abandoned).
 */
export async function failEscort(playerId: string): Promise<void> {
  await completeEscort(playerId, false);
}

async function completeEscort(
  playerId: string,
  success: boolean,
): Promise<void> {
  const state = activeEscorts.get(playerId);
  if (!state) return;

  // Clear timer
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }

  activeEscorts.delete(playerId);

  if (success) {
    // Complete the mission
    await db("player_missions")
      .where({ id: state.missionId, status: "active" })
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        claim_status: "pending_claim",
      });

    notifyPlayer(state.io, playerId, "escort:completed", {
      missionId: state.missionId,
      success: true,
    });

    notifyPlayer(state.io, playerId, "mission:completed", {
      missionId: state.missionId,
      title: "Valandor's Warning",
      type: "escort",
      isStory: true,
      storyOrder: 15,
    });
  } else {
    // Reset mission to active so player can retry
    await db("player_missions")
      .where({ id: state.missionId })
      .update({
        status: "active",
        progress: JSON.stringify({}),
      });

    notifyPlayer(state.io, playerId, "escort:failed", {
      missionId: state.missionId,
      message: "The caravan was lost. Regroup and try again.",
    });
  }
}

/**
 * Stop the escort timer (cleanup on disconnect, abandon, etc.)
 */
export function stopEscort(playerId: string): void {
  const state = activeEscorts.get(playerId);
  if (!state) return;

  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }

  activeEscorts.delete(playerId);
}

/**
 * Check if a player has an active escort in progress.
 */
export function hasActiveEscort(playerId: string): boolean {
  return activeEscorts.has(playerId);
}

/**
 * Get current escort state for a player (for reconnection).
 */
export function getEscortState(
  playerId: string,
): {
  caravanSectorId: number;
  moveCount: number;
  totalMoves: number;
  paused: boolean;
} | null {
  const state = activeEscorts.get(playerId);
  if (!state) return null;
  return {
    caravanSectorId: state.caravanSectorId,
    moveCount: state.moveCount,
    totalMoves: TOTAL_CARAVAN_MOVES,
    paused: state.paused,
  };
}
