import crypto from "crypto";
import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import { PLANET_TYPES } from "../config/planet-types";
import { awardXP } from "./progression";
import { adjustPlayerResource } from "./crafting";
import { applyUpgradesToShip } from "./upgrades";
import { getPlayerLevelBonuses } from "./progression";
import { grantRandomTablet } from "./tablets";
import { settleCreditPlayer } from "../chain/tx-queue";

// === Resource event types ===

type ResourceEventType =
  | "asteroid_field"
  | "derelict"
  | "anomaly"
  | "alien_cache";

interface ResourceNode {
  resourceId: string;
  name: string;
  quantity: number;
  harvested: boolean;
}

// Tier-1 unique resources (from planet types) for asteroid spawns
const TIER1_RESOURCES = [
  { id: "bio_fiber", name: "Bio-Fiber" },
  { id: "fertile_soil", name: "Fertile Soil" },
  { id: "silica_glass", name: "Silica Glass" },
  { id: "solar_crystal", name: "Solar Crystal" },
  { id: "bio_extract", name: "Bio-Extract" },
  { id: "coral_alloy", name: "Coral Alloy" },
  { id: "resonite_ore", name: "Resonite Ore" },
  { id: "wind_essence", name: "Wind Essence" },
  { id: "cryo_compound", name: "Cryogenic Compound" },
  { id: "frost_lattice", name: "Frost Lattice" },
  { id: "magma_crystal", name: "Magma Crystal" },
  { id: "obsidian_plate", name: "Obsidian Plate" },
  { id: "plasma_vapor", name: "Plasma Vapor" },
  { id: "nebula_dust", name: "Nebula Dust" },
];

const ULTRA_RARE_RESOURCES = [
  { id: "dark_matter_shard", name: "Dark Matter Shard" },
  { id: "cryo_fossil", name: "Cryo-Fossil" },
  { id: "ion_crystal", name: "Ion Crystal" },
  { id: "leviathan_pearl", name: "Leviathan Pearl" },
  { id: "artifact_fragment", name: "Artifact Fragment" },
  { id: "harmonic_resonator", name: "Harmonic Resonator" },
];

// === Helpers ===

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAsteroidNodes(): ResourceNode[] {
  const count = randInt(
    GAME_CONFIG.RARE_ASTEROID_NODES_MIN,
    GAME_CONFIG.RARE_ASTEROID_NODES_MAX,
  );
  const nodes: ResourceNode[] = [];
  for (let i = 0; i < count; i++) {
    // 60% tier-1 unique, 30% base commodities, 10% rare
    const roll = Math.random();
    let res: { id: string; name: string };
    if (roll < 0.6) {
      res = pickRandom(TIER1_RESOURCES);
    } else if (roll < 0.9) {
      res = pickRandom([
        { id: "cyrillium", name: "Cyrillium" },
        { id: "food", name: "Food" },
        { id: "tech", name: "Tech Components" },
      ]);
    } else {
      res = pickRandom(TIER1_RESOURCES);
    }
    nodes.push({
      resourceId: res.id,
      name: res.name,
      quantity: randInt(1, 5),
      harvested: false,
    });
  }
  return nodes;
}

function generateAnomalyResources(): ResourceNode[] {
  const res = pickRandom(TIER1_RESOURCES);
  return [
    {
      resourceId: res.id,
      name: res.name,
      quantity: randInt(
        GAME_CONFIG.RARE_ANOMALY_YIELD_MIN,
        GAME_CONFIG.RARE_ANOMALY_YIELD_MAX,
      ),
      harvested: false,
    },
  ];
}

function generateDerelictResources(): ResourceNode[] {
  const credits = randInt(
    GAME_CONFIG.RARE_DERELICT_CREDITS_MIN,
    GAME_CONFIG.RARE_DERELICT_CREDITS_MAX,
  );
  const resources: ResourceNode[] = [
    {
      resourceId: "_credits",
      name: "Credits",
      quantity: credits,
      harvested: false,
    },
  ];
  // 40% chance to also contain a resource
  if (Math.random() < 0.4) {
    const res = pickRandom(TIER1_RESOURCES);
    resources.push({
      resourceId: res.id,
      name: res.name,
      quantity: randInt(3, 10),
      harvested: false,
    });
  }
  return resources;
}

function generateAlienCacheResources(): ResourceNode[] {
  const primary = pickRandom(ULTRA_RARE_RESOURCES);
  const resources: ResourceNode[] = [
    {
      resourceId: primary.id,
      name: primary.name,
      quantity: randInt(1, 3),
      harvested: false,
    },
  ];
  // 30% chance for a second ultra-rare
  if (Math.random() < 0.3) {
    const secondary = pickRandom(
      ULTRA_RARE_RESOURCES.filter((r) => r.id !== primary.id),
    );
    resources.push({
      resourceId: secondary.id,
      name: secondary.name,
      quantity: 1,
      harvested: false,
    });
  }
  return resources;
}

function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

// === Spawn logic ===

export async function spawnResourceEvents(): Promise<number[]> {
  const activeCount = await db("sector_resource_events")
    .where("expires_at", ">", new Date().toISOString())
    .count("* as count")
    .first();

  if (
    Number(activeCount?.count || 0) >=
    GAME_CONFIG.RARE_MAX_ACTIVE_RESOURCE_EVENTS
  )
    return [];

  const now = new Date();
  const affectedSectors: number[] = [];

  // Asteroid fields
  const asteroidCount = randInt(
    GAME_CONFIG.RARE_ASTEROID_SPAWN_MIN,
    GAME_CONFIG.RARE_ASTEROID_SPAWN_MAX,
  );
  for (let i = 0; i < asteroidCount; i++) {
    const sector = await db("sectors").orderByRaw("RANDOM()").first();
    if (!sector) continue;
    const durationHours = randInt(
      GAME_CONFIG.RARE_ASTEROID_DURATION_HOURS_MIN,
      GAME_CONFIG.RARE_ASTEROID_DURATION_HOURS_MAX,
    );
    await db("sector_resource_events").insert({
      id: crypto.randomUUID(),
      sector_id: sector.id,
      event_type: "asteroid_field",
      resources: JSON.stringify(generateAsteroidNodes()),
      spawned_at: now.toISOString(),
      expires_at: new Date(
        now.getTime() + hoursToMs(durationHours),
      ).toISOString(),
    });
    affectedSectors.push(sector.id);
  }

  // Derelict ships
  const derelictCount = randInt(
    GAME_CONFIG.RARE_DERELICT_SPAWN_MIN,
    GAME_CONFIG.RARE_DERELICT_SPAWN_MAX,
  );
  for (let i = 0; i < derelictCount; i++) {
    const sector = await db("sectors").orderByRaw("RANDOM()").first();
    if (!sector) continue;
    const durationHours = randInt(
      GAME_CONFIG.RARE_DERELICT_DURATION_HOURS_MIN,
      GAME_CONFIG.RARE_DERELICT_DURATION_HOURS_MAX,
    );
    await db("sector_resource_events").insert({
      id: crypto.randomUUID(),
      sector_id: sector.id,
      event_type: "derelict",
      resources: JSON.stringify(generateDerelictResources()),
      spawned_at: now.toISOString(),
      expires_at: new Date(
        now.getTime() + hoursToMs(durationHours),
      ).toISOString(),
      metadata: JSON.stringify({ tabletDropChance: 0.05 }),
    });
    affectedSectors.push(sector.id);
  }

  // Anomalies
  const anomalyCount = randInt(
    GAME_CONFIG.RARE_ANOMALY_SPAWN_MIN,
    GAME_CONFIG.RARE_ANOMALY_SPAWN_MAX,
  );
  for (let i = 0; i < anomalyCount; i++) {
    const sector = await db("sectors").orderByRaw("RANDOM()").first();
    if (!sector) continue;
    const durationHours = randInt(
      GAME_CONFIG.RARE_ANOMALY_DURATION_HOURS_MIN,
      GAME_CONFIG.RARE_ANOMALY_DURATION_HOURS_MAX,
    );
    await db("sector_resource_events").insert({
      id: crypto.randomUUID(),
      sector_id: sector.id,
      event_type: "anomaly",
      resources: JSON.stringify(generateAnomalyResources()),
      spawned_at: now.toISOString(),
      expires_at: new Date(
        now.getTime() + hoursToMs(durationHours),
      ).toISOString(),
    });
    affectedSectors.push(sector.id);
  }

  // Alien cache (10% chance per spawn wave)
  if (Math.random() < GAME_CONFIG.RARE_ALIEN_CACHE_CHANCE) {
    const sector = await db("sectors").orderByRaw("RANDOM()").first();
    if (sector) {
      await db("sector_resource_events").insert({
        id: crypto.randomUUID(),
        sector_id: sector.id,
        event_type: "alien_cache",
        resources: JSON.stringify(generateAlienCacheResources()),
        spawned_at: now.toISOString(),
        expires_at: new Date(
          now.getTime() +
            hoursToMs(GAME_CONFIG.RARE_ALIEN_CACHE_DURATION_HOURS),
        ).toISOString(),
        guardian_hp: GAME_CONFIG.RARE_ALIEN_CACHE_GUARDIAN_HP,
        metadata: JSON.stringify({ guardianLevel: randInt(1, 5) }),
      });
      affectedSectors.push(sector.id);
    }
  }

  return [...new Set(affectedSectors)];
}

export async function expireResourceEvents(): Promise<number[]> {
  const expiring = await db("sector_resource_events")
    .where("expires_at", "<", new Date().toISOString())
    .select("sector_id");

  if (expiring.length === 0) return [];

  await db("sector_resource_events")
    .where("expires_at", "<", new Date().toISOString())
    .del();

  return [...new Set(expiring.map((e: any) => e.sector_id))];
}

// === Harvest (asteroid_field / anomaly) ===

export async function harvestResourceEvent(
  playerId: string,
  eventId: string,
  nodeIndex: number,
): Promise<{
  resource: { id: string; name: string; quantity: number };
  remainingNodes: number;
}> {
  const event = await db("sector_resource_events")
    .where({ id: eventId })
    .first();
  if (!event) throw new Error("Resource event not found");
  if (new Date(event.expires_at) < new Date())
    throw new Error("Event has expired");

  const player = await db("players").where({ id: playerId }).first();
  if (!player) throw new Error("Player not found");
  if (event.sector_id !== player.current_sector_id)
    throw new Error("Event is not in your sector");

  if (event.event_type !== "asteroid_field" && event.event_type !== "anomaly") {
    throw new Error(
      'This event cannot be harvested. Use "salvage" for derelicts or "attack" for alien caches.',
    );
  }

  const resources: ResourceNode[] = JSON.parse(event.resources);
  if (nodeIndex < 0 || nodeIndex >= resources.length)
    throw new Error("Invalid node index");

  const node = resources[nodeIndex];
  if (node.harvested) throw new Error("This node has already been harvested");
  if (node.quantity <= 0) throw new Error("This node is depleted");

  // Harvest the full node
  const harvestedQty = node.quantity;
  node.quantity = 0;
  node.harvested = true;

  // Add resource to player
  await adjustPlayerResource(playerId, node.resourceId, harvestedQty);

  // Update event
  const allDepleted = resources.every((r) => r.harvested);
  if (allDepleted) {
    await db("sector_resource_events").where({ id: eventId }).del();
  } else {
    await db("sector_resource_events")
      .where({ id: eventId })
      .update({
        resources: JSON.stringify(resources),
      });
  }

  // Award XP
  await awardXP(playerId, GAME_CONFIG.XP_HARVEST, "explore");

  const remainingNodes = resources.filter((r) => !r.harvested).length;
  return {
    resource: { id: node.resourceId, name: node.name, quantity: harvestedQty },
    remainingNodes,
  };
}

// === Salvage derelict ===

export async function salvageDerelict(
  playerId: string,
  eventId: string,
): Promise<{
  credits: number;
  resources: { id: string; name: string; quantity: number }[];
  tabletDrop: { name: string; rarity: string } | null;
}> {
  const event = await db("sector_resource_events")
    .where({ id: eventId })
    .first();
  if (!event) throw new Error("Resource event not found");
  if (new Date(event.expires_at) < new Date())
    throw new Error("Event has expired");
  if (event.event_type !== "derelict")
    throw new Error("This is not a derelict ship");
  if (event.claimed_by)
    throw new Error("This derelict has already been salvaged");

  const player = await db("players").where({ id: playerId }).first();
  if (!player) throw new Error("Player not found");
  if (event.sector_id !== player.current_sector_id)
    throw new Error("Event is not in your sector");

  // Mark as claimed
  await db("sector_resource_events")
    .where({ id: eventId })
    .update({ claimed_by: playerId });

  const resources: ResourceNode[] = JSON.parse(event.resources);
  let creditsGained = 0;
  const resourcesGained: { id: string; name: string; quantity: number }[] = [];

  for (const node of resources) {
    if (node.resourceId === "_credits") {
      creditsGained = node.quantity;
      await db("players")
        .where({ id: playerId })
        .increment("credits", creditsGained);
      await settleCreditPlayer(playerId, creditsGained);
    } else {
      await adjustPlayerResource(playerId, node.resourceId, node.quantity);
      resourcesGained.push({
        id: node.resourceId,
        name: node.name,
        quantity: node.quantity,
      });
    }
  }

  // 5% tablet drop chance
  let tabletDrop: { name: string; rarity: string } | null = null;
  const metadata = event.metadata ? JSON.parse(event.metadata) : {};
  const dropChance = metadata.tabletDropChance || 0.05;
  if (Math.random() < dropChance) {
    try {
      const result = await grantRandomTablet(playerId);
      if (!result.overflow) {
        tabletDrop = { name: result.name!, rarity: result.rarity! };
      }
    } catch {
      /* tablet system may not be ready */
    }
  }

  // Award XP
  await awardXP(playerId, GAME_CONFIG.XP_SALVAGE, "explore");

  // Delete event (single-use)
  await db("sector_resource_events").where({ id: eventId }).del();

  return { credits: creditsGained, resources: resourcesGained, tabletDrop };
}

// === Attack guardian ===

export async function attackGuardian(
  playerId: string,
  eventId: string,
): Promise<{
  defeated: boolean;
  damageDealt: number;
  remainingHp: number;
  damageTaken: number;
  loot: { resources: { id: string; name: string; quantity: number }[] } | null;
}> {
  const event = await db("sector_resource_events")
    .where({ id: eventId })
    .first();
  if (!event) throw new Error("Resource event not found");
  if (new Date(event.expires_at) < new Date())
    throw new Error("Event has expired");
  if (event.event_type !== "alien_cache")
    throw new Error("This is not an alien cache");
  if (event.guardian_hp === null || event.guardian_hp <= 0) {
    throw new Error("Guardian already defeated. Use the cache to claim loot.");
  }

  const player = await db("players").where({ id: playerId }).first();
  if (!player) throw new Error("Player not found");
  if (event.sector_id !== player.current_sector_id)
    throw new Error("Event is not in your sector");

  const ship = player.current_ship_id
    ? await db("ships").where({ id: player.current_ship_id }).first()
    : null;
  if (!ship) throw new Error("No active ship");

  const upgrades = await applyUpgradesToShip(ship.id);
  const levelBonuses = await getPlayerLevelBonuses(playerId);
  const totalWeapon =
    ship.weapon_energy +
    (upgrades?.weaponBonus ?? 0) +
    levelBonuses.weaponBonus;

  // Get ship type attack ratio
  const shipType = await db("ship_types")
    .where({ id: ship.ship_type_id })
    .first();
  const attackRatio = shipType?.attack_ratio || 1.0;

  // Calculate damage
  const baseDamage = totalWeapon * attackRatio;
  const randomFactor = 0.8 + Math.random() * 0.4; // 0.8-1.2x
  const damageDealt = Math.max(1, Math.floor(baseDamage * randomFactor));

  const newHp = Math.max(0, event.guardian_hp - damageDealt);
  await db("sector_resource_events")
    .where({ id: eventId })
    .update({ guardian_hp: newHp });

  // Guardian fights back
  const metadata = event.metadata ? JSON.parse(event.metadata) : {};
  const guardianDamage = Math.max(
    1,
    Math.floor((metadata.guardianLevel || 1) * 2 * (0.5 + Math.random())),
  );
  const newHullHp = Math.max(1, ship.hull_hp - guardianDamage);
  const actualDamageTaken = ship.hull_hp - newHullHp;
  await db("ships").where({ id: ship.id }).update({ hull_hp: newHullHp });

  // Award XP for combat
  await awardXP(playerId, GAME_CONFIG.XP_COMBAT_VOLLEY, "combat");

  if (newHp <= 0) {
    // Guardian defeated — auto-claim
    await awardXP(playerId, GAME_CONFIG.XP_DEFEAT_GUARDIAN, "combat");
    const loot = await claimAlienCache(playerId, eventId);
    return {
      defeated: true,
      damageDealt,
      remainingHp: 0,
      damageTaken: actualDamageTaken,
      loot,
    };
  }

  return {
    defeated: false,
    damageDealt,
    remainingHp: newHp,
    damageTaken: actualDamageTaken,
    loot: null,
  };
}

// === Claim alien cache ===

export async function claimAlienCache(
  playerId: string,
  eventId: string,
): Promise<{ resources: { id: string; name: string; quantity: number }[] }> {
  const event = await db("sector_resource_events")
    .where({ id: eventId })
    .first();
  if (!event) throw new Error("Resource event not found");
  if (event.event_type !== "alien_cache") throw new Error("Not an alien cache");
  if (event.guardian_hp !== null && event.guardian_hp > 0)
    throw new Error("Guardian still active");
  if (event.claimed_by) throw new Error("Already claimed");

  await db("sector_resource_events")
    .where({ id: eventId })
    .update({ claimed_by: playerId });

  const resources: ResourceNode[] = JSON.parse(event.resources);
  const loot: { id: string; name: string; quantity: number }[] = [];

  for (const node of resources) {
    await adjustPlayerResource(playerId, node.resourceId, node.quantity);
    loot.push({
      id: node.resourceId,
      name: node.name,
      quantity: node.quantity,
    });
  }

  await awardXP(playerId, GAME_CONFIG.XP_ALIEN_CACHE_CLAIM, "explore");

  // Delete event after claiming
  await db("sector_resource_events").where({ id: eventId }).del();

  return { resources: loot };
}

// === Rare planet production ===

export async function produceRarePlanetResources(planet: any): Promise<void> {
  if (
    !planet.variant ||
    !planet.rare_resource ||
    !planet.owner_id ||
    planet.colonists <= 0
  )
    return;

  const colonists = planet.colonists || 0;
  const produced = Math.floor(
    GAME_CONFIG.RARE_PLANET_ULTRA_PRODUCTION_RATE * (colonists / 1000),
  );
  if (produced <= 0) return;

  const existing = await db("planet_resources")
    .where({ planet_id: planet.id, resource_id: planet.rare_resource })
    .first();

  if (existing) {
    await db("planet_resources")
      .where({ planet_id: planet.id, resource_id: planet.rare_resource })
      .increment("stock", produced);
  } else {
    await db("planet_resources").insert({
      planet_id: planet.id,
      resource_id: planet.rare_resource,
      stock: produced,
    });
  }
}

// === Query helpers ===

export async function getResourceEventsInSector(
  sectorId: number,
): Promise<any[]> {
  const events = await db("sector_resource_events")
    .where({ sector_id: sectorId })
    .where("expires_at", ">", new Date().toISOString())
    .select("*");

  return events.map((e) => {
    const resources: ResourceNode[] = JSON.parse(e.resources);
    const remainingNodes = resources.filter((r) => !r.harvested).length;
    const totalValue = resources.reduce((sum, r) => sum + r.quantity, 0);
    return {
      id: e.id,
      eventType: e.event_type,
      resources,
      remainingNodes,
      totalValue,
      expiresAt: e.expires_at,
      guardianHp: e.guardian_hp,
      claimedBy: e.claimed_by,
      metadata: e.metadata ? JSON.parse(e.metadata) : null,
    };
  });
}

export async function getResourceEventsInSectors(
  sectorIds: number[],
): Promise<any[]> {
  if (sectorIds.length === 0) return [];

  const events = await db("sector_resource_events")
    .whereIn("sector_id", sectorIds)
    .where("expires_at", ">", new Date().toISOString())
    .select("*");

  return events.map((e) => {
    const resources: ResourceNode[] = JSON.parse(e.resources);
    const remainingNodes = resources.filter((r) => !r.harvested).length;
    const totalValue = resources.reduce((sum, r) => sum + r.quantity, 0);
    return {
      id: e.id,
      sectorId: e.sector_id,
      eventType: e.event_type,
      remainingNodes,
      totalValue,
      expiresAt: e.expires_at,
      guardianHp: e.guardian_hp,
      claimedBy: e.claimed_by,
    };
  });
}
