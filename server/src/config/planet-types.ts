export interface PlanetTypeConfig {
  classId: string;
  name: string;
  idealPopulation: number;
  productionRates: {
    cyrillium: number; // units per 10 colonists per tick
    tech: number;
    drones: number; // drones per 10 colonists per day
  };
  foodConsumptionRate: number; // food consumed per 10 colonists per tick at baseline
  foodProductionRate: number; // food produced per 10 colonists per tick (~60% of consumption)
  colonistGrowthRate: number; // % growth per tick when resources available
  uniqueResources?: { id: string; name: string; rate: number }[];
  rareVariant?: {
    variantId: string;
    variantName: string;
    ultraRareResource: { id: string; name: string };
  };
}

export const PLANET_TYPES: Record<string, PlanetTypeConfig> = {
  H: {
    classId: "H",
    name: "Goldilocks (Hospitable)",
    idealPopulation: 1000,
    productionRates: { cyrillium: 2, tech: 3, drones: 0.5 },
    foodConsumptionRate: 1.5,
    foodProductionRate: 1,
    colonistGrowthRate: 0.003,
    uniqueResources: [
      { id: "bio_fiber", name: "Bio-Fiber", rate: 1.5 },
      { id: "fertile_soil", name: "Fertile Soil", rate: 1.0 },
    ],
  },
  D: {
    classId: "D",
    name: "Desert",
    idealPopulation: 500,
    productionRates: { cyrillium: 8, tech: 2, drones: 0.3 },
    foodConsumptionRate: 1,
    foodProductionRate: 0.6,
    colonistGrowthRate: 0.001,
    uniqueResources: [
      { id: "silica_glass", name: "Silica Glass", rate: 2.0 },
      { id: "solar_crystal", name: "Solar Crystal", rate: 1.0 },
    ],
    rareVariant: {
      variantId: "ruin",
      variantName: "Desert-Ruin",
      ultraRareResource: { id: "artifact_fragment", name: "Artifact Fragment" },
    },
  },
  O: {
    classId: "O",
    name: "Ocean",
    idealPopulation: 800,
    productionRates: { cyrillium: 1, tech: 1, drones: 0.2 },
    foodConsumptionRate: 1,
    foodProductionRate: 0.6,
    colonistGrowthRate: 0.0025,
    uniqueResources: [
      { id: "bio_extract", name: "Bio-Extract", rate: 1.5 },
      { id: "coral_alloy", name: "Coral Alloy", rate: 1.0 },
    ],
    rareVariant: {
      variantId: "abyssal",
      variantName: "Ocean-Abyssal",
      ultraRareResource: { id: "leviathan_pearl", name: "Leviathan Pearl" },
    },
  },
  A: {
    classId: "A",
    name: "Alpine",
    idealPopulation: 700,
    productionRates: { cyrillium: 3, tech: 5, drones: 0.4 },
    foodConsumptionRate: 1.5,
    foodProductionRate: 0.9,
    colonistGrowthRate: 0.002,
    uniqueResources: [
      { id: "resonite_ore", name: "Resonite Ore", rate: 1.5 },
      { id: "wind_essence", name: "Wind Essence", rate: 1.0 },
    ],
    rareVariant: {
      variantId: "crystal",
      variantName: "Alpine-Crystal",
      ultraRareResource: {
        id: "harmonic_resonator",
        name: "Harmonic Resonator",
      },
    },
  },
  F: {
    classId: "F",
    name: "Frozen",
    idealPopulation: 400,
    productionRates: { cyrillium: 5, tech: 6, drones: 0.6 },
    foodConsumptionRate: 1,
    foodProductionRate: 0.6,
    colonistGrowthRate: 0.001,
    uniqueResources: [
      { id: "cryo_compound", name: "Cryogenic Compound", rate: 2.0 },
      { id: "frost_lattice", name: "Frost Lattice", rate: 1.0 },
    ],
    rareVariant: {
      variantId: "ancient",
      variantName: "Frozen-Ancient",
      ultraRareResource: { id: "cryo_fossil", name: "Cryo-Fossil" },
    },
  },
  V: {
    classId: "V",
    name: "Volcanic",
    idealPopulation: 300,
    productionRates: { cyrillium: 10, tech: 4, drones: 0.8 },
    foodConsumptionRate: 0.5,
    foodProductionRate: 0.3,
    colonistGrowthRate: 0.0008,
    uniqueResources: [
      { id: "magma_crystal", name: "Magma Crystal", rate: 2.5 },
      { id: "obsidian_plate", name: "Obsidian Plate", rate: 1.5 },
    ],
    rareVariant: {
      variantId: "prime",
      variantName: "Volcanic-Prime",
      ultraRareResource: { id: "dark_matter_shard", name: "Dark Matter Shard" },
    },
  },
  G: {
    classId: "G",
    name: "Gaseous",
    idealPopulation: 200,
    productionRates: { cyrillium: 12, tech: 8, drones: 0.1 },
    foodConsumptionRate: 0.5,
    foodProductionRate: 0.3,
    colonistGrowthRate: 0.0005,
    uniqueResources: [
      { id: "plasma_vapor", name: "Plasma Vapor", rate: 3.0 },
      { id: "nebula_dust", name: "Nebula Dust", rate: 2.0 },
    ],
    rareVariant: {
      variantId: "storm",
      variantName: "Gaseous-Storm",
      ultraRareResource: { id: "ion_crystal", name: "Ion Crystal" },
    },
  },
  S: {
    classId: "S",
    name: "Seed Planet",
    idealPopulation: 5000,
    productionRates: { cyrillium: 0, tech: 0, drones: 0 },
    foodConsumptionRate: 0,
    foodProductionRate: 0,
    colonistGrowthRate: 0.005, // fast growth - always producing colonists
    uniqueResources: [
      { id: "genome_fragment", name: "Genome Fragment", rate: 1.0 },
      { id: "spore_culture", name: "Spore Culture", rate: 0.5 },
    ],
  },
};

// Upgrade requirements per level
export const UPGRADE_REQUIREMENTS: Record<
  number,
  {
    colonists: number;
    cyrillium: number;
    food: number;
    tech: number;
    credits: number;
  }
> = {
  1: { colonists: 50, cyrillium: 100, food: 200, tech: 100, credits: 5000 },
  2: { colonists: 100, cyrillium: 300, food: 500, tech: 300, credits: 15000 },
  3: { colonists: 200, cyrillium: 800, food: 800, tech: 800, credits: 40000 },
  4: {
    colonists: 350,
    cyrillium: 1500,
    food: 1000,
    tech: 1500,
    credits: 80000,
  },
  5: {
    colonists: 500,
    cyrillium: 3000,
    food: 1500,
    tech: 3000,
    credits: 150000,
  },
  6: {
    colonists: 700,
    cyrillium: 5000,
    food: 2000,
    tech: 5000,
    credits: 250000,
  },
  7: {
    colonists: 900,
    cyrillium: 10000,
    food: 3000,
    tech: 10000,
    credits: 500000,
  },
};
