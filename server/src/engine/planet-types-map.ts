/**
 * Maps CoHo planet classes to biome themes for the planet explorer.
 * Each biome defines tile weights, color palettes, and the unique mineable resource.
 */

export interface BiomeTileWeights {
  grass: number;
  sand: number;
  stone: number;
  water: number;
  snow: number;
  ice: number;
  lava: number;
  crystal: number;
  ore: number;
  forest: number;
  ruins: number;
  gas_vent: number;
}

export interface BiomeConfig {
  id: string;
  name: string;
  tileWeights: BiomeTileWeights;
  groundColor: string; // base ground hex
  accentColor: string; // highlights hex
  fogColor: string;
  ambientLight: number; // 0-1
  uniqueResource: { id: string; name: string; tileType: string };
  enemyPrefix: string; // aesthetic prefix for automaton names
  musicTheme: string;
}

const EMPTY_WEIGHTS: BiomeTileWeights = {
  grass: 0,
  sand: 0,
  stone: 0,
  water: 0,
  snow: 0,
  ice: 0,
  lava: 0,
  crystal: 0,
  ore: 0,
  forest: 0,
  ruins: 0,
  gas_vent: 0,
};

export const BIOME_MAP: Record<string, BiomeConfig> = {
  H: {
    id: "earth_plains",
    name: "Earth Plains",
    tileWeights: {
      ...EMPTY_WEIGHTS,
      grass: 50,
      forest: 20,
      stone: 10,
      water: 10,
      ore: 5,
      crystal: 5,
    },
    groundColor: "#3a6b35",
    accentColor: "#7ec850",
    fogColor: "#c8e6c9",
    ambientLight: 0.9,
    uniqueResource: {
      id: "biocrystal",
      name: "Biocrystal",
      tileType: "crystal",
    },
    enemyPrefix: "Standard",
    musicTheme: "plains",
  },
  D: {
    id: "mars_dunes",
    name: "Mars Dunes",
    tileWeights: {
      ...EMPTY_WEIGHTS,
      sand: 55,
      stone: 20,
      ore: 15,
      ruins: 5,
      crystal: 5,
    },
    groundColor: "#c2955a",
    accentColor: "#e8c170",
    fogColor: "#f5deb3",
    ambientLight: 0.95,
    uniqueResource: { id: "sunstone", name: "Sunstone", tileType: "crystal" },
    enemyPrefix: "Desert-Rusted",
    musicTheme: "desert",
  },
  O: {
    id: "shore_islands",
    name: "Shore Islands",
    tileWeights: {
      ...EMPTY_WEIGHTS,
      water: 45,
      sand: 25,
      grass: 15,
      stone: 5,
      crystal: 5,
      ore: 5,
    },
    groundColor: "#2980b9",
    accentColor: "#5dade2",
    fogColor: "#d4effc",
    ambientLight: 0.85,
    uniqueResource: {
      id: "deepcoral",
      name: "Deepcoral",
      tileType: "crystal",
    },
    enemyPrefix: "Aquatic",
    musicTheme: "ocean",
  },
  A: {
    id: "mountain_snow",
    name: "Mountain Snow",
    tileWeights: {
      ...EMPTY_WEIGHTS,
      stone: 35,
      snow: 25,
      ore: 15,
      crystal: 15,
      grass: 5,
      ice: 5,
    },
    groundColor: "#7f8c8d",
    accentColor: "#bdc3c7",
    fogColor: "#ecf0f1",
    ambientLight: 0.8,
    uniqueResource: { id: "cryolith", name: "Cryolith", tileType: "crystal" },
    enemyPrefix: "Frost",
    musicTheme: "alpine",
  },
  F: {
    id: "tundra_ice",
    name: "Tundra Ice",
    tileWeights: {
      ...EMPTY_WEIGHTS,
      ice: 40,
      snow: 30,
      stone: 10,
      crystal: 10,
      ore: 10,
    },
    groundColor: "#a8d8ea",
    accentColor: "#e0f7fa",
    fogColor: "#e8f4f8",
    ambientLight: 0.7,
    uniqueResource: { id: "glacium", name: "Glacium", tileType: "ice" },
    enemyPrefix: "Arctic",
    musicTheme: "frozen",
  },
  V: {
    id: "lava_basalt",
    name: "Lava Basalt",
    tileWeights: {
      ...EMPTY_WEIGHTS,
      stone: 30,
      lava: 30,
      ore: 20,
      crystal: 15,
      gas_vent: 5,
    },
    groundColor: "#4a2c2a",
    accentColor: "#e74c3c",
    fogColor: "#ffccbc",
    ambientLight: 0.6,
    uniqueResource: {
      id: "pyrethium",
      name: "Pyrethium",
      tileType: "ore",
    },
    enemyPrefix: "Magma",
    musicTheme: "volcanic",
  },
  G: {
    id: "cloud_storm",
    name: "Cloud Storm",
    tileWeights: {
      ...EMPTY_WEIGHTS,
      gas_vent: 35,
      stone: 20,
      crystal: 20,
      ore: 15,
      water: 10,
    },
    groundColor: "#6c3483",
    accentColor: "#af7ac5",
    fogColor: "#d7bde2",
    ambientLight: 0.5,
    uniqueResource: {
      id: "stormglass",
      name: "Stormglass",
      tileType: "crystal",
    },
    enemyPrefix: "Storm",
    musicTheme: "storm",
  },
  S: {
    id: "lush_ancient",
    name: "Lush Ancient",
    tileWeights: {
      ...EMPTY_WEIGHTS,
      forest: 40,
      grass: 20,
      ruins: 15,
      water: 10,
      crystal: 10,
      ore: 5,
    },
    groundColor: "#1b5e20",
    accentColor: "#66bb6a",
    fogColor: "#c8e6c9",
    ambientLight: 0.75,
    uniqueResource: {
      id: "primordial_shard",
      name: "Primordial Shard",
      tileType: "ruins",
    },
    enemyPrefix: "Ancient",
    musicTheme: "ancient",
  },
};

/** Difficulty tier based on planet upgrade level */
export interface DifficultyTier {
  minEnemyLevel: number;
  maxEnemyLevel: number;
  enemyDensity: number; // mobs per chunk
  eliteChance: number; // 0-1
  bossSpawnChance: number; // 0-1 per chunk
  oreDensity: number; // ore tiles per chunk
  lootMultiplier: number;
}

export const DIFFICULTY_TIERS: Record<number, DifficultyTier> = {
  0: {
    minEnemyLevel: 1,
    maxEnemyLevel: 10,
    enemyDensity: 3,
    eliteChance: 0,
    bossSpawnChance: 0,
    oreDensity: 4,
    lootMultiplier: 1.0,
  },
  1: {
    minEnemyLevel: 5,
    maxEnemyLevel: 15,
    enemyDensity: 4,
    eliteChance: 0.05,
    bossSpawnChance: 0,
    oreDensity: 5,
    lootMultiplier: 1.2,
  },
  2: {
    minEnemyLevel: 8,
    maxEnemyLevel: 20,
    enemyDensity: 5,
    eliteChance: 0.1,
    bossSpawnChance: 0.02,
    oreDensity: 5,
    lootMultiplier: 1.4,
  },
  3: {
    minEnemyLevel: 15,
    maxEnemyLevel: 30,
    enemyDensity: 5,
    eliteChance: 0.15,
    bossSpawnChance: 0.05,
    oreDensity: 6,
    lootMultiplier: 1.7,
  },
  4: {
    minEnemyLevel: 20,
    maxEnemyLevel: 40,
    enemyDensity: 6,
    eliteChance: 0.2,
    bossSpawnChance: 0.08,
    oreDensity: 7,
    lootMultiplier: 2.0,
  },
  5: {
    minEnemyLevel: 30,
    maxEnemyLevel: 55,
    enemyDensity: 7,
    eliteChance: 0.25,
    bossSpawnChance: 0.1,
    oreDensity: 8,
    lootMultiplier: 2.5,
  },
  6: {
    minEnemyLevel: 40,
    maxEnemyLevel: 65,
    enemyDensity: 8,
    eliteChance: 0.3,
    bossSpawnChance: 0.12,
    oreDensity: 9,
    lootMultiplier: 3.0,
  },
  7: {
    minEnemyLevel: 50,
    maxEnemyLevel: 80,
    enemyDensity: 9,
    eliteChance: 0.35,
    bossSpawnChance: 0.15,
    oreDensity: 10,
    lootMultiplier: 4.0,
  },
};

export function getDifficultyTier(upgradeLevel: number): DifficultyTier {
  return DIFFICULTY_TIERS[Math.min(upgradeLevel, 7)] ?? DIFFICULTY_TIERS[0];
}

export function getBiomeConfig(planetClass: string): BiomeConfig {
  return BIOME_MAP[planetClass] ?? BIOME_MAP["H"];
}
