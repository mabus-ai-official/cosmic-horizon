/**
 * Tutorial sandbox configuration.
 *
 * Defines the scripted tutorial map (sectors 90001-90004) and virtual state
 * used during the deterministic onboarding flow.
 */

export interface TutorialOutpost {
  id: string;
  name: string;
  treasury: number;
  cyrillium: { stock: number; capacity: number; mode: "buy" | "sell" | "none" };
  food: { stock: number; capacity: number; mode: "buy" | "sell" | "none" };
  tech: { stock: number; capacity: number; mode: "buy" | "sell" | "none" };
  vedic: { stock: number; capacity: number; mode: "buy" | "sell" | "none" };
}

export interface TutorialPlanet {
  id: string;
  name: string;
  planetClass: string;
  ownerId: string | null;
}

export interface TutorialSector {
  id: number;
  type: string;
  regionId: number;
  hasStarMall: boolean;
  adjacentSectors: number[];
  outpost: TutorialOutpost | null;
  planets?: TutorialPlanet[];
}

export interface TutorialVirtualState {
  currentSectorId: number;
  credits: number;
  energy: number;
  maxEnergy: number;
  cyrilliumCargo: number;
  foodCargo: number;
  techCargo: number;
  colonistsCargo: number;
  cargoHolds: number;
  maxCargoHolds: number;
  exploredSectors: number[];
  dockedAtOutpostId?: string | null;
  landedAtPlanetId?: string | null;
  claimedPlanetIds?: string[];
}

export const TUTORIAL_SECTORS: Record<number, TutorialSector> = {
  90001: {
    id: 90001,
    type: "protected",
    regionId: 9000,
    hasStarMall: false,
    adjacentSectors: [90002],
    outpost: null,
  },
  90002: {
    id: 90002,
    type: "standard",
    regionId: 9000,
    hasStarMall: false,
    adjacentSectors: [90001, 90003],
    outpost: {
      id: "tutorial-outpost-depot",
      name: "Training Depot",
      treasury: 100000,
      cyrillium: { stock: 500, capacity: 1000, mode: "sell" },
      food: { stock: 300, capacity: 1000, mode: "sell" },
      tech: { stock: 100, capacity: 1000, mode: "sell" },
      vedic: { stock: 0, capacity: 1000, mode: "none" },
    },
  },
  90003: {
    id: 90003,
    type: "standard",
    regionId: 9000,
    hasStarMall: false,
    adjacentSectors: [90002, 90004],
    outpost: null,
  },
  90004: {
    id: 90004,
    type: "standard",
    regionId: 9000,
    hasStarMall: false,
    adjacentSectors: [90003, 90005],
    outpost: {
      id: "tutorial-outpost-frontier",
      name: "Frontier Post",
      treasury: 100000,
      cyrillium: { stock: 50, capacity: 1000, mode: "buy" },
      food: { stock: 50, capacity: 1000, mode: "buy" },
      tech: { stock: 50, capacity: 1000, mode: "buy" },
      vedic: { stock: 0, capacity: 1000, mode: "none" },
    },
  },
  90005: {
    id: 90005,
    type: "standard",
    regionId: 9000,
    hasStarMall: false,
    adjacentSectors: [90004],
    outpost: null,
    planets: [
      {
        id: "tutorial-planet-1",
        name: "Nova Prime",
        planetClass: "H",
        ownerId: null,
      },
    ],
  },
};

export function getTutorialSector(id: number): TutorialSector | undefined {
  return TUTORIAL_SECTORS[id];
}

export function isTutorialSector(id: number): boolean {
  return id in TUTORIAL_SECTORS;
}

export function getDefaultTutorialState(
  credits: number,
  maxEnergy: number,
): TutorialVirtualState {
  return {
    currentSectorId: 90001,
    credits,
    energy: maxEnergy,
    maxEnergy,
    cyrilliumCargo: 0,
    foodCargo: 0,
    techCargo: 0,
    colonistsCargo: 0,
    cargoHolds: 20,
    maxCargoHolds: 20,
    exploredSectors: [90001],
  };
}
