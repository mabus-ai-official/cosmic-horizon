import crypto from "crypto";
import db from "../db/connection";
import { SHIP_TYPES } from "../config/ship-types";

// NPC ship tier based on story mission difficulty/act
interface NpcShipConfig {
  shipType: string;
  hullHpFraction: number; // fraction of max hull HP (e.g., 0.6 = 60%)
  weaponFraction: number; // fraction of max weapon energy
  names: string[];
}

// Act 1: weak scouts — beatable with ~20 weapon energy from a starter scout
// Scout attack ratio 0.8 vs scout defense 1.0: 20 energy = 16 damage
const ACT_1_NPCS: NpcShipConfig = {
  shipType: "scout",
  hullHpFraction: 0.2, // 15 HP out of 75 max — one volley kill with 20 energy
  weaponFraction: 0.2,
  names: [
    "Pirate Scavenger",
    "Raider Scout",
    "Corsair Runner",
    "Marauder Pup",
    "Bandit Dart",
    "Pirate Lookout",
  ],
};

// Act 2: mix of scouts and freighters
const ACT_2_NPCS: NpcShipConfig = {
  shipType: "scout",
  hullHpFraction: 0.7,
  weaponFraction: 0.5,
  names: [
    "Dominion Patrol",
    "Iron Vanguard",
    "Dominion Enforcer",
    "Blockade Runner",
    "Dominion Interceptor",
    "Iron Sentinel",
    "Dominion Striker",
    "Dominion Prowler",
  ],
};

// Act 3: corvettes
const ACT_3_NPCS: NpcShipConfig = {
  shipType: "corvette",
  hullHpFraction: 0.6,
  weaponFraction: 0.5,
  names: [
    "Dominion Hunter",
    "Blighted Guardian",
    "Corrupted Construct",
    "Node Sentinel",
    "Blight Walker",
    "Dark Tendril",
    "Root Guardian",
    "Ancient Warden",
    "Primordium Defender",
    "Spore Construct",
  ],
};

// Act 4: cruisers
const ACT_4_NPCS: NpcShipConfig = {
  shipType: "cruiser",
  hullHpFraction: 0.5,
  weaponFraction: 0.4,
  names: [
    "Sporoclasm War-Form",
    "Sporoclasm Dreadnought",
    "Sporoclasm Titan",
    "Sporoclasm Vanguard",
    "Corruption Siege Engine",
    "Sporoclasm Commander",
    "Blight Behemoth",
    "Sporoclasm Destroyer",
    "Corruption Herald",
    "Sporoclasm Leviathan",
    "Dark Spore Carrier",
    "Sporoclasm Ravager",
    "Sporoclasm Elite",
    "Corruption Prime",
    "Sporoclasm Apex",
    "Sporoclasm Colossus",
    "Sporoclasm Reaver",
    "Sporoclasm Omega",
  ],
};

function getNpcConfig(act: number): NpcShipConfig {
  switch (act) {
    case 1:
      return ACT_1_NPCS;
    case 2:
      return ACT_2_NPCS;
    case 3:
      return ACT_3_NPCS;
    case 4:
      return ACT_4_NPCS;
    default:
      return ACT_2_NPCS;
  }
}

/** Optional overrides for per-mission NPC customization */
export interface NpcOverrides {
  nameOverride?: string | string[];
  shipTypeOverride?: string;
}

/**
 * Spawn temporary NPC enemies for a story destroy_ship mission.
 * Returns the IDs of the spawned NPC players.
 */
export async function spawnStoryNPCs(
  playerId: string,
  playerMissionId: string,
  count: number,
  act: number,
  overrides?: NpcOverrides,
): Promise<string[]> {
  const config = getNpcConfig(act);
  const shipTypeId = overrides?.shipTypeOverride || config.shipType;
  const resolvedShipType =
    SHIP_TYPES.find((s) => s.id === shipTypeId) ||
    SHIP_TYPES.find((s) => s.id === config.shipType)!;
  if (!resolvedShipType) throw new Error(`Unknown ship type: ${shipTypeId}`);
  const namePool = overrides?.nameOverride
    ? Array.isArray(overrides.nameOverride)
      ? overrides.nameOverride
      : [overrides.nameOverride]
    : config.names;

  // Get player's explored sectors, excluding protected ones
  const player = await db("players").where({ id: playerId }).first();
  const explored: number[] = JSON.parse(player?.explored_sectors || "[]");

  // Filter out protected sectors and the player's current sector
  const safeSectors = await db("sectors")
    .whereIn("id", explored)
    .whereNot({ id: player.current_sector_id })
    .whereNot("type", "protected")
    .whereNot("type", "harmony_enforced")
    .select("id");

  let candidateSectors = safeSectors.map((s: any) => s.id);

  // If not enough explored sectors, include the player's current sector
  if (candidateSectors.length === 0) {
    candidateSectors = [player.current_sector_id];
  }

  const npcIds: string[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    // Pick a sector — spread NPCs across sectors
    const sectorId = candidateSectors[i % candidateSectors.length];

    // Pick a unique name from the pool (override or act-default)
    let name: string;
    do {
      name = namePool[Math.floor(Math.random() * namePool.length)];
    } while (usedNames.has(name) && usedNames.size < namePool.length);
    usedNames.add(name);

    const npcPlayerId = crypto.randomUUID();
    const npcShipId = crypto.randomUUID();

    const hullHp = Math.max(
      10,
      Math.round(resolvedShipType.maxHullHp * config.hullHpFraction),
    );
    const weaponEnergy = Math.max(
      5,
      Math.round(resolvedShipType.maxWeaponEnergy * config.weaponFraction),
    );

    // Create NPC player row
    await db("players").insert({
      id: npcPlayerId,
      username: name,
      email: `npc-${npcPlayerId}@story.local`,
      password_hash: "NPC_NO_LOGIN",
      race: "muscarian",
      current_sector_id: sectorId,
      current_ship_id: npcShipId,
      energy: 0,
      credits: 0,
      explored_sectors: JSON.stringify([sectorId]),
      spawned_by_mission_id: playerMissionId,
    });

    // Create NPC ship row
    await db("ships").insert({
      id: npcShipId,
      ship_type_id: resolvedShipType.id,
      owner_id: npcPlayerId,
      sector_id: sectorId,
      weapon_energy: weaponEnergy,
      max_weapon_energy: resolvedShipType.maxWeaponEnergy,
      engine_energy: 0,
      max_engine_energy: resolvedShipType.maxEngineEnergy,
      cargo_holds: 0,
      max_cargo_holds: 0,
      hull_hp: hullHp,
      max_hull_hp: resolvedShipType.maxHullHp,
      is_destroyed: false,
      is_registered: true,
    });

    // Create subsystem rows for combat V2
    await createNpcSubsystems(
      npcShipId,
      resolvedShipType.id,
      config.hullHpFraction,
    );

    // Create weapon slots for combat V2
    await createNpcWeaponSlots(npcShipId, resolvedShipType.id);

    npcIds.push(npcPlayerId);
  }

  return npcIds;
}

/**
 * Spawn a single ambush NPC in a specific sector for a survive_ambush mission phase.
 * Unlike spawnStoryNPCs (which scatters NPCs across explored sectors), this places
 * one hostile NPC right in the player's current sector to simulate an ambush.
 */
export async function spawnAmbushNPC(
  playerId: string,
  playerMissionId: string,
  sectorId: number,
  act: number,
  overrides?: NpcOverrides,
): Promise<string> {
  const config = getNpcConfig(act);
  const shipTypeId = overrides?.shipTypeOverride || config.shipType;
  const resolvedShipType =
    SHIP_TYPES.find((s) => s.id === shipTypeId) ||
    SHIP_TYPES.find((s) => s.id === config.shipType)!;
  if (!resolvedShipType) throw new Error(`Unknown ship type: ${shipTypeId}`);

  const namePool = overrides?.nameOverride
    ? Array.isArray(overrides.nameOverride)
      ? overrides.nameOverride
      : [overrides.nameOverride]
    : config.names;

  const name = namePool[Math.floor(Math.random() * namePool.length)];
  const npcPlayerId = crypto.randomUUID();
  const npcShipId = crypto.randomUUID();

  const hullHp = Math.max(
    10,
    Math.round(resolvedShipType.maxHullHp * config.hullHpFraction),
  );
  const weaponEnergy = Math.max(
    5,
    Math.round(resolvedShipType.maxWeaponEnergy * config.weaponFraction),
  );

  await db("players").insert({
    id: npcPlayerId,
    username: name,
    email: `npc-${npcPlayerId}@story.local`,
    password_hash: "NPC_NO_LOGIN",
    race: "muscarian",
    current_sector_id: sectorId,
    current_ship_id: npcShipId,
    energy: 0,
    credits: 0,
    explored_sectors: JSON.stringify([sectorId]),
    spawned_by_mission_id: playerMissionId,
  });

  await db("ships").insert({
    id: npcShipId,
    ship_type_id: resolvedShipType.id,
    owner_id: npcPlayerId,
    sector_id: sectorId,
    weapon_energy: weaponEnergy,
    max_weapon_energy: resolvedShipType.maxWeaponEnergy,
    engine_energy: 0,
    max_engine_energy: resolvedShipType.maxEngineEnergy,
    cargo_holds: 0,
    max_cargo_holds: 0,
    hull_hp: hullHp,
    max_hull_hp: resolvedShipType.maxHullHp,
    is_destroyed: false,
    is_registered: true,
  });

  // Create subsystem rows for combat V2
  await createNpcSubsystems(
    npcShipId,
    resolvedShipType.id,
    config.hullHpFraction,
  );

  // Create weapon slots for combat V2
  await createNpcWeaponSlots(npcShipId, resolvedShipType.id);

  return npcPlayerId;
}

/**
 * Clean up all story NPCs for a given player_mission.
 * Deletes NPC ships and player rows.
 */
export async function cleanupStoryNPCs(
  playerMissionId: string,
): Promise<number> {
  const npcs = await db("players")
    .where({ spawned_by_mission_id: playerMissionId })
    .select("id", "current_ship_id");

  if (npcs.length === 0) return 0;

  const npcIds = npcs.map((n: any) => n.id);
  const shipIds = npcs.map((n: any) => n.current_ship_id).filter(Boolean);

  // Delete ships first (foreign key), then players
  // Also delete any dodge pods that were created on NPC death
  if (npcIds.length > 0) {
    await db("ships").whereIn("owner_id", npcIds).del();
  }
  await db("players").where({ spawned_by_mission_id: playerMissionId }).del();

  return npcs.length;
}

/**
 * Check if a destroyed player is a story NPC and clean it up.
 * Returns true if it was a story NPC (skip dodge pod creation).
 */
export async function isStoryNPC(playerId: string): Promise<boolean> {
  const player = await db("players").where({ id: playerId }).first();
  return !!player?.spawned_by_mission_id;
}

/**
 * Clean up a single destroyed story NPC (called from combat).
 * Must delete from all non-CASCADE FK tables before deleting the player row.
 */
export async function cleanupDestroyedNPC(npcPlayerId: string): Promise<void> {
  // Delete from tables that reference players(id) without CASCADE
  await db("ships").where({ owner_id: npcPlayerId }).del();
  const nonCascadeTables: { table: string; column: string }[] = [
    { table: "combat_logs", column: "attacker_id" },
    { table: "combat_logs", column: "defender_id" },
    { table: "combat_sessions", column: "attacker_id" },
    { table: "combat_sessions", column: "defender_id" },
    { table: "combat_rounds", column: "player_a_id" },
    { table: "combat_rounds", column: "player_b_id" },
    { table: "trade_logs", column: "player_id" },
    { table: "game_events", column: "player_id" },
    { table: "bounties", column: "placed_by_id" },
    { table: "bounties", column: "target_player_id" },
    { table: "bounties", column: "claimed_by_id" },
    { table: "leaderboard_cache", column: "player_id" },
    { table: "player_npc_state", column: "player_id" },
    { table: "player_faction_rep", column: "player_id" },
    { table: "notes", column: "player_id" },
    { table: "sector_events", column: "resolved_by_id" },
    { table: "messages", column: "sender_id" },
    { table: "messages", column: "recipient_id" },
  ];
  for (const { table, column } of nonCascadeTables) {
    try {
      await db(table)
        .where({ [column]: npcPlayerId })
        .del();
    } catch {
      /* table may not exist */
    }
  }
  await db("players").where({ id: npcPlayerId }).del();
}

/**
 * Get sectors where story NPCs are for a given mission.
 * Used to tell the player where to find them.
 */
export async function getStoryNPCLocations(
  playerMissionId: string,
): Promise<{ name: string; sectorId: number }[]> {
  const npcs = await db("players")
    .where({ spawned_by_mission_id: playerMissionId })
    .select("username", "current_sector_id");

  return npcs.map((n: any) => ({
    name: n.username,
    sectorId: n.current_sector_id,
  }));
}

// ─── Combat V2 helpers for NPC ship setup ──────────────────────────────────

/** Subsystem HP baselines per ship type — matches migration 067 values */
const SHIP_SUBSYSTEM_BASELINES: Record<
  string,
  {
    shield: number;
    weapon: number;
    engine: number;
    sensor: number;
    life: number;
    slots: number;
    reactor: number;
  }
> = {
  dodge_pod: {
    shield: 0,
    weapon: 0,
    engine: 10,
    sensor: 5,
    life: 5,
    slots: 0,
    reactor: 5,
  },
  scout: {
    shield: 25,
    weapon: 20,
    engine: 30,
    sensor: 15,
    life: 15,
    slots: 2,
    reactor: 30,
  },
  freighter: {
    shield: 35,
    weapon: 15,
    engine: 25,
    sensor: 10,
    life: 20,
    slots: 1,
    reactor: 25,
  },
  corvette: {
    shield: 40,
    weapon: 35,
    engine: 30,
    sensor: 20,
    life: 20,
    slots: 3,
    reactor: 50,
  },
  cruiser: {
    shield: 60,
    weapon: 50,
    engine: 40,
    sensor: 30,
    life: 25,
    slots: 4,
    reactor: 70,
  },
  battleship: {
    shield: 75,
    weapon: 65,
    engine: 35,
    sensor: 25,
    life: 25,
    slots: 5,
    reactor: 90,
  },
  stealth: {
    shield: 15,
    weapon: 20,
    engine: 35,
    sensor: 40,
    life: 15,
    slots: 2,
    reactor: 35,
  },
  colony_ship: {
    shield: 30,
    weapon: 10,
    engine: 20,
    sensor: 10,
    life: 30,
    slots: 1,
    reactor: 20,
  },
};

/**
 * Create ship_subsystems rows for an NPC ship.
 * HP scaled by the act's hullHpFraction (same difficulty scaling as hull HP).
 */
async function createNpcSubsystems(
  shipId: string,
  shipTypeId: string,
  hpFraction: number,
): Promise<void> {
  const baselines = SHIP_SUBSYSTEM_BASELINES[shipTypeId];
  if (!baselines) return;

  const subsystems = [
    { type: "shields", hp: baselines.shield },
    { type: "weapons", hp: baselines.weapon },
    { type: "engines", hp: baselines.engine },
    { type: "sensors", hp: baselines.sensor },
    { type: "life_support", hp: baselines.life },
  ];

  for (const sub of subsystems) {
    const scaledHp = Math.max(0, Math.round(sub.hp * hpFraction));
    await db("ship_subsystems").insert({
      ship_id: shipId,
      subsystem_type: sub.type,
      current_hp: scaledHp,
      max_hp: sub.hp,
      is_disabled: scaledHp <= 0,
    });
  }

  // Also set reactor power on the ship
  await db("ships").where({ id: shipId }).update({
    reactor_power: baselines.reactor,
    max_reactor_power: baselines.reactor,
    weapon_slot_count: baselines.slots,
  });
}

/**
 * Create weapon_slots rows for an NPC ship (pulse_lasers by default).
 */
async function createNpcWeaponSlots(
  shipId: string,
  shipTypeId: string,
): Promise<void> {
  const baselines = SHIP_SUBSYSTEM_BASELINES[shipTypeId];
  if (!baselines || baselines.slots === 0) return;

  for (let i = 0; i < baselines.slots; i++) {
    await db("weapon_slots").insert({
      ship_id: shipId,
      weapon_type_id: "pulse_laser",
      slot_index: i,
      cooldown_remaining: 0,
    });
  }
}
