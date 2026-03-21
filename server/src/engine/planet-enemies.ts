/**
 * Automaton enemy definitions for the planet explorer.
 * Enemies scale with planet upgrade level (difficulty tier).
 * Each tier has a set of enemy types with different combat behaviors.
 */

export type EnemyBehavior = "patrol" | "chase" | "guard" | "swarm" | "ambush";

export interface EnemyDefinition {
  id: string;
  name: string;
  tier: number; // 0-7, matches difficulty tiers
  behavior: EnemyBehavior;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number; // tiles per second
  aggroRange: number; // tiles
  attackRange: number; // tiles (1 = melee)
  attackSpeed: number; // attacks per second
  xpReward: number;
  goldReward: number;
  isElite: boolean;
  isBoss: boolean;
  spriteId: string;
  lootTable: LootEntry[];
}

export interface LootEntry {
  itemId: string;
  chance: number; // 0-1
  minQty: number;
  maxQty: number;
}

// Tier 0: Basic automaton (planet upgrade 0)
const TIER_0: EnemyDefinition[] = [
  {
    id: "scout_drone",
    name: "Scout Drone",
    tier: 0,
    behavior: "patrol",
    baseHp: 30,
    baseAttack: 5,
    baseDefense: 2,
    speed: 1.5,
    aggroRange: 5,
    attackRange: 1,
    attackSpeed: 1.0,
    xpReward: 10,
    goldReward: 3,
    isElite: false,
    isBoss: false,
    spriteId: "scout_drone",
    lootTable: [
      { itemId: "scrap_metal", chance: 0.5, minQty: 1, maxQty: 3 },
      { itemId: "tech", chance: 0.3, minQty: 1, maxQty: 2 },
    ],
  },
  {
    id: "worker_bot",
    name: "Worker Bot",
    tier: 0,
    behavior: "guard",
    baseHp: 50,
    baseAttack: 8,
    baseDefense: 5,
    speed: 1.0,
    aggroRange: 4,
    attackRange: 1,
    attackSpeed: 0.8,
    xpReward: 15,
    goldReward: 5,
    isElite: false,
    isBoss: false,
    spriteId: "worker_bot",
    lootTable: [
      { itemId: "scrap_metal", chance: 0.6, minQty: 1, maxQty: 4 },
      { itemId: "tech", chance: 0.4, minQty: 1, maxQty: 3 },
      { itemId: "circuit_board", chance: 0.1, minQty: 1, maxQty: 1 },
    ],
  },
];

// Tier 1: Harvester class
const TIER_1: EnemyDefinition[] = [
  {
    id: "harvester",
    name: "Harvester",
    tier: 1,
    behavior: "patrol",
    baseHp: 80,
    baseAttack: 12,
    baseDefense: 8,
    speed: 1.2,
    aggroRange: 6,
    attackRange: 1,
    attackSpeed: 1.0,
    xpReward: 25,
    goldReward: 8,
    isElite: false,
    isBoss: false,
    spriteId: "harvester",
    lootTable: [
      { itemId: "scrap_metal", chance: 0.5, minQty: 2, maxQty: 5 },
      { itemId: "tech", chance: 0.4, minQty: 1, maxQty: 4 },
      { itemId: "circuit_board", chance: 0.2, minQty: 1, maxQty: 2 },
    ],
  },
  {
    id: "sentry_turret",
    name: "Sentry Turret",
    tier: 1,
    behavior: "guard",
    baseHp: 60,
    baseAttack: 18,
    baseDefense: 4,
    speed: 0,
    aggroRange: 8,
    attackRange: 6,
    attackSpeed: 1.5,
    xpReward: 30,
    goldReward: 10,
    isElite: false,
    isBoss: false,
    spriteId: "sentry_turret",
    lootTable: [
      { itemId: "tech", chance: 0.6, minQty: 2, maxQty: 5 },
      { itemId: "targeting_chip", chance: 0.15, minQty: 1, maxQty: 1 },
    ],
  },
];

// Tier 2: Sentinel class
const TIER_2: EnemyDefinition[] = [
  {
    id: "sentinel",
    name: "Sentinel",
    tier: 2,
    behavior: "chase",
    baseHp: 150,
    baseAttack: 22,
    baseDefense: 15,
    speed: 1.8,
    aggroRange: 8,
    attackRange: 1,
    attackSpeed: 1.2,
    xpReward: 50,
    goldReward: 15,
    isElite: false,
    isBoss: false,
    spriteId: "sentinel",
    lootTable: [
      { itemId: "tech", chance: 0.5, minQty: 2, maxQty: 6 },
      { itemId: "circuit_board", chance: 0.3, minQty: 1, maxQty: 3 },
      { itemId: "power_core", chance: 0.1, minQty: 1, maxQty: 1 },
    ],
  },
  {
    id: "swarm_unit",
    name: "Swarm Unit",
    tier: 2,
    behavior: "swarm",
    baseHp: 40,
    baseAttack: 15,
    baseDefense: 5,
    speed: 2.5,
    aggroRange: 10,
    attackRange: 1,
    attackSpeed: 2.0,
    xpReward: 20,
    goldReward: 5,
    isElite: false,
    isBoss: false,
    spriteId: "swarm_unit",
    lootTable: [
      { itemId: "scrap_metal", chance: 0.7, minQty: 1, maxQty: 3 },
      { itemId: "nano_fiber", chance: 0.15, minQty: 1, maxQty: 1 },
    ],
  },
];

// Tier 3: Executioner class
const TIER_3: EnemyDefinition[] = [
  {
    id: "executioner",
    name: "Executioner",
    tier: 3,
    behavior: "chase",
    baseHp: 300,
    baseAttack: 40,
    baseDefense: 25,
    speed: 1.6,
    aggroRange: 10,
    attackRange: 2,
    attackSpeed: 0.8,
    xpReward: 100,
    goldReward: 30,
    isElite: false,
    isBoss: false,
    spriteId: "executioner",
    lootTable: [
      { itemId: "tech", chance: 0.6, minQty: 5, maxQty: 10 },
      { itemId: "power_core", chance: 0.25, minQty: 1, maxQty: 2 },
      { itemId: "rare_alloy", chance: 0.1, minQty: 1, maxQty: 1 },
    ],
  },
  {
    id: "ambush_spider",
    name: "Ambush Spider",
    tier: 3,
    behavior: "ambush",
    baseHp: 180,
    baseAttack: 55,
    baseDefense: 12,
    speed: 3.0,
    aggroRange: 6,
    attackRange: 1,
    attackSpeed: 1.5,
    xpReward: 80,
    goldReward: 25,
    isElite: false,
    isBoss: false,
    spriteId: "ambush_spider",
    lootTable: [
      { itemId: "venom_sac", chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: "nano_fiber", chance: 0.3, minQty: 1, maxQty: 3 },
      { itemId: "rare_alloy", chance: 0.05, minQty: 1, maxQty: 1 },
    ],
  },
];

// Tier 4: Archivist class
const TIER_4: EnemyDefinition[] = [
  {
    id: "archivist",
    name: "Archivist",
    tier: 4,
    behavior: "guard",
    baseHp: 500,
    baseAttack: 50,
    baseDefense: 40,
    speed: 1.0,
    aggroRange: 12,
    attackRange: 5,
    attackSpeed: 0.6,
    xpReward: 200,
    goldReward: 60,
    isElite: false,
    isBoss: false,
    spriteId: "archivist",
    lootTable: [
      { itemId: "tech", chance: 0.7, minQty: 8, maxQty: 15 },
      { itemId: "data_crystal", chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: "ancient_blueprint", chance: 0.05, minQty: 1, maxQty: 1 },
    ],
  },
  {
    id: "axiom_guard",
    name: "Axiom Guard",
    tier: 4,
    behavior: "patrol",
    baseHp: 400,
    baseAttack: 60,
    baseDefense: 35,
    speed: 1.5,
    aggroRange: 10,
    attackRange: 2,
    attackSpeed: 1.0,
    xpReward: 180,
    goldReward: 50,
    isElite: false,
    isBoss: false,
    spriteId: "axiom_guard",
    lootTable: [
      { itemId: "power_core", chance: 0.4, minQty: 1, maxQty: 3 },
      { itemId: "rare_alloy", chance: 0.2, minQty: 1, maxQty: 2 },
      { itemId: "ancient_blueprint", chance: 0.03, minQty: 1, maxQty: 1 },
    ],
  },
];

// Tier 5: Coreborne class
const TIER_5: EnemyDefinition[] = [
  {
    id: "coreborne",
    name: "Coreborne",
    tier: 5,
    behavior: "chase",
    baseHp: 800,
    baseAttack: 75,
    baseDefense: 55,
    speed: 2.0,
    aggroRange: 14,
    attackRange: 2,
    attackSpeed: 1.0,
    xpReward: 400,
    goldReward: 100,
    isElite: false,
    isBoss: false,
    spriteId: "coreborne",
    lootTable: [
      { itemId: "tech", chance: 0.8, minQty: 10, maxQty: 25 },
      { itemId: "data_crystal", chance: 0.4, minQty: 1, maxQty: 3 },
      { itemId: "core_fragment", chance: 0.15, minQty: 1, maxQty: 1 },
    ],
  },
];

// Elite variants — spawned based on eliteChance per difficulty tier
const ELITES: EnemyDefinition[] = [
  {
    id: "elite_enforcer",
    name: "Elite Enforcer",
    tier: 2,
    behavior: "chase",
    baseHp: 400,
    baseAttack: 45,
    baseDefense: 30,
    speed: 2.0,
    aggroRange: 12,
    attackRange: 2,
    attackSpeed: 1.2,
    xpReward: 150,
    goldReward: 50,
    isElite: true,
    isBoss: false,
    spriteId: "elite_enforcer",
    lootTable: [
      { itemId: "power_core", chance: 0.5, minQty: 1, maxQty: 3 },
      { itemId: "rare_alloy", chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: "elite_circuit", chance: 0.2, minQty: 1, maxQty: 1 },
    ],
  },
  {
    id: "elite_warden",
    name: "Elite Warden",
    tier: 3,
    behavior: "guard",
    baseHp: 700,
    baseAttack: 65,
    baseDefense: 50,
    speed: 1.2,
    aggroRange: 14,
    attackRange: 4,
    attackSpeed: 0.8,
    xpReward: 300,
    goldReward: 80,
    isElite: true,
    isBoss: false,
    spriteId: "elite_warden",
    lootTable: [
      { itemId: "data_crystal", chance: 0.5, minQty: 1, maxQty: 3 },
      { itemId: "ancient_blueprint", chance: 0.15, minQty: 1, maxQty: 1 },
      { itemId: "elite_circuit", chance: 0.3, minQty: 1, maxQty: 2 },
    ],
  },
];

// Boss definitions — one per biome, spawned based on bossSpawnChance
const BOSSES: EnemyDefinition[] = [
  {
    id: "nation_overlord",
    name: "Nation Overlord",
    tier: 5,
    behavior: "guard",
    baseHp: 3000,
    baseAttack: 120,
    baseDefense: 80,
    speed: 1.0,
    aggroRange: 16,
    attackRange: 3,
    attackSpeed: 0.6,
    xpReward: 1500,
    goldReward: 500,
    isElite: false,
    isBoss: true,
    spriteId: "nation_overlord",
    lootTable: [
      { itemId: "tech", chance: 1.0, minQty: 30, maxQty: 60 },
      { itemId: "core_fragment", chance: 0.8, minQty: 1, maxQty: 3 },
      { itemId: "ancient_blueprint", chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: "legendary_component", chance: 0.1, minQty: 1, maxQty: 1 },
    ],
  },
];

const ALL_TIERS: EnemyDefinition[][] = [
  TIER_0,
  TIER_1,
  TIER_2,
  TIER_3,
  TIER_4,
  TIER_5,
];

/**
 * Get enemy pool for a given difficulty tier.
 * Includes enemies from current tier and one tier below.
 */
export function getEnemyPool(tier: number): EnemyDefinition[] {
  const clamped = Math.min(tier, ALL_TIERS.length - 1);
  const pool: EnemyDefinition[] = [];
  if (clamped > 0) pool.push(...ALL_TIERS[clamped - 1]);
  pool.push(...ALL_TIERS[clamped]);
  return pool;
}

export function getElitePool(minTier: number): EnemyDefinition[] {
  return ELITES.filter((e) => e.tier >= minTier - 1);
}

export function getBoss(): EnemyDefinition {
  return BOSSES[0];
}

/**
 * Scale enemy stats by level. Linear scaling with small exponential curve.
 */
export function scaleEnemyStats(
  base: EnemyDefinition,
  level: number,
): { hp: number; attack: number; defense: number; xp: number; gold: number } {
  const scale = 1 + (level - 1) * 0.12;
  const expScale = Math.pow(1.02, level - 1);
  return {
    hp: Math.round(base.baseHp * scale * expScale),
    attack: Math.round(base.baseAttack * scale * expScale),
    defense: Math.round(base.baseDefense * scale * expScale),
    xp: Math.round(base.xpReward * scale),
    gold: Math.round(base.goldReward * scale),
  };
}
