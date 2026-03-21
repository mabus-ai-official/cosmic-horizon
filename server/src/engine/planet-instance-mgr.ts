/**
 * Planet Instance Manager — manages world instances per planet.
 *
 * - One PlanetWorld per planet with active players
 * - 20Hz tick per active instance
 * - 5-minute grace period after last player leaves before teardown
 * - Broadcasts state snapshots via socket.io rooms
 */

import { Server as SocketServer } from "socket.io";
import {
  PlanetWorld,
  WorldSnapshot,
  WorldEvent,
  InputFrame,
} from "./planet-world";

const TICK_INTERVAL_MS = 50; // 20Hz
const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

export interface PlanetInstanceInfo {
  planetId: string;
  planetClass: string;
  upgradeLevel: number;
  playerCount: number;
  tick: number;
  createdAt: number;
}

interface Instance {
  world: PlanetWorld;
  tickInterval: NodeJS.Timeout;
  lastActive: number;
  graceTimeout: NodeJS.Timeout | null;
  playerSockets: Map<string, string>; // playerId -> socketId
}

export function planetRoom(planetId: string): string {
  return `planet:${planetId}`;
}

export class PlanetInstanceManager {
  private instances = new Map<string, Instance>();
  private io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
  }

  /**
   * Get or create a world instance for a planet.
   */
  getOrCreate(
    planetId: string,
    planetClass: string,
    upgradeLevel: number,
    dbIdSeed: number,
  ): PlanetWorld {
    const existing = this.instances.get(planetId);
    if (existing) {
      // Cancel grace period if it was counting down
      if (existing.graceTimeout) {
        clearTimeout(existing.graceTimeout);
        existing.graceTimeout = null;
      }
      return existing.world;
    }

    // Create new instance
    const world = new PlanetWorld(
      planetId,
      planetClass,
      upgradeLevel,
      dbIdSeed,
    );

    // Start 20Hz tick loop
    const tickInterval = setInterval(() => {
      this.tickInstance(planetId);
    }, TICK_INTERVAL_MS);

    const instance: Instance = {
      world,
      tickInterval,
      lastActive: Date.now(),
      graceTimeout: null,
      playerSockets: new Map(),
    };

    this.instances.set(planetId, instance);
    return world;
  }

  /**
   * Register a player joining a planet instance.
   */
  joinPlayer(
    planetId: string,
    playerId: string,
    socketId: string,
    playerName: string,
    level: number,
    role: string,
    hp: number,
    maxHp: number,
    soulNodes: Map<string, number>,
    spriteId?: string,
  ): PlanetWorld | null {
    const instance = this.instances.get(planetId);
    if (!instance) return null;

    instance.playerSockets.set(playerId, socketId);
    instance.lastActive = Date.now();

    // Cancel grace period
    if (instance.graceTimeout) {
      clearTimeout(instance.graceTimeout);
      instance.graceTimeout = null;
    }

    // Add player to world
    instance.world.addPlayer(
      playerId,
      playerName,
      level,
      role,
      hp,
      maxHp,
      soulNodes,
      spriteId,
    );

    // Join socket.io room
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(planetRoom(planetId));
    }

    return instance.world;
  }

  /**
   * Remove a player from a planet instance.
   * Returns the player's session loot if they were near the landing pad.
   */
  leavePlayer(
    planetId: string,
    playerId: string,
  ): { loot: { itemId: string; quantity: number }[]; nearPad: boolean } | null {
    const instance = this.instances.get(planetId);
    if (!instance) return null;

    const nearPad = instance.world.isNearLandingPad(playerId);
    const player = instance.world.removePlayer(playerId);
    if (!player) return null;

    // Remove from socket room
    const socketId = instance.playerSockets.get(playerId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(planetRoom(planetId));
      }
      instance.playerSockets.delete(playerId);
    }

    instance.lastActive = Date.now();

    // Start grace period if no players left
    if (instance.world.players.size === 0) {
      this.startGracePeriod(planetId);
    }

    return {
      loot: nearPad ? player.sessionLoot : [],
      nearPad,
    };
  }

  /**
   * Process an input frame from a player.
   */
  processInput(planetId: string, playerId: string, input: InputFrame): void {
    const instance = this.instances.get(planetId);
    if (!instance) return;
    instance.world.processInput(playerId, input);
  }

  /**
   * Respawn a dead player at the landing pad.
   */
  respawnPlayer(planetId: string, playerId: string): void {
    const instance = this.instances.get(planetId);
    if (!instance) return;
    instance.world.respawnPlayer(playerId);
  }

  /**
   * Get chunk data around a player for initial load / reconnect.
   */
  getPlayerState(
    planetId: string,
    playerId: string,
  ): {
    snapshot: WorldSnapshot;
    chunks: {
      key: string;
      cx: number;
      cy: number;
      tiles: number[][];
      heights: number[][];
    }[];
    biome: {
      id: string;
      name: string;
      groundColor: string;
      accentColor: string;
      fogColor: string;
    };
    sessionLoot: { itemId: string; quantity: number }[];
  } | null {
    const instance = this.instances.get(planetId);
    if (!instance) return null;

    const player = instance.world.players.get(playerId);
    if (!player) return null;

    const chunks = instance.world
      .getChunksAroundPlayer(playerId, 2)
      .map((c) => ({
        key: c.key,
        cx: c.cx,
        cy: c.cy,
        tiles: c.tiles as number[][],
        heights: c.heights,
      }));

    const { snapshot } = instance.world.update();

    return {
      snapshot,
      chunks,
      biome: {
        id: instance.world.biome.id,
        name: instance.world.biome.name,
        groundColor: instance.world.biome.groundColor,
        accentColor: instance.world.biome.accentColor,
        fogColor: instance.world.biome.fogColor,
      },
      sessionLoot: player.sessionLoot,
    };
  }

  /**
   * Get info about all active instances (for admin/monitoring).
   */
  getActiveInstances(): PlanetInstanceInfo[] {
    const result: PlanetInstanceInfo[] = [];
    for (const [planetId, instance] of this.instances) {
      result.push({
        planetId,
        planetClass: instance.world.planetClass,
        upgradeLevel: instance.world.upgradeLevel,
        playerCount: instance.world.players.size,
        tick: instance.world.tick,
        createdAt: instance.lastActive,
      });
    }
    return result;
  }

  hasInstance(planetId: string): boolean {
    return this.instances.has(planetId);
  }

  getWorld(planetId: string): PlanetWorld | undefined {
    return this.instances.get(planetId)?.world;
  }

  // ── Private ────────────────────────────────────────────

  private tickInstance(planetId: string): void {
    const instance = this.instances.get(planetId);
    if (!instance) return;

    const { snapshot, events } = instance.world.update();

    // Broadcast snapshot to all players in the room
    this.io.to(planetRoom(planetId)).emit("planet:state", snapshot);

    // Send targeted events
    for (const event of events) {
      if (event.targetPlayerIds && event.targetPlayerIds.length > 0) {
        for (const pid of event.targetPlayerIds) {
          const socketId = instance.playerSockets.get(pid);
          if (socketId) {
            this.io.to(socketId).emit("planet:event", event);
          }
        }
      } else {
        // Broadcast to all in room
        this.io.to(planetRoom(planetId)).emit("planet:event", event);
      }
    }
  }

  private startGracePeriod(planetId: string): void {
    const instance = this.instances.get(planetId);
    if (!instance) return;

    instance.graceTimeout = setTimeout(() => {
      this.teardown(planetId);
    }, GRACE_PERIOD_MS);
  }

  private teardown(planetId: string): void {
    const instance = this.instances.get(planetId);
    if (!instance) return;

    // Don't tear down if players rejoined during grace period
    if (instance.world.players.size > 0) return;

    clearInterval(instance.tickInterval);
    if (instance.graceTimeout) clearTimeout(instance.graceTimeout);
    this.instances.delete(planetId);
  }

  /**
   * Shutdown all instances (for server shutdown).
   */
  shutdown(): void {
    for (const [planetId, instance] of this.instances) {
      clearInterval(instance.tickInterval);
      if (instance.graceTimeout) clearTimeout(instance.graceTimeout);
    }
    this.instances.clear();
  }
}
