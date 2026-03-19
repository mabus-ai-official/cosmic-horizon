import crypto from "crypto";
import { PLANET_TYPES } from "../config/planet-types";
import { GAME_CONFIG } from "../config/game";

// Seeded RNG (same implementation as universe.ts / 001_universe.ts)
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function toRoman(num: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = [
    "M",
    "CM",
    "D",
    "CD",
    "C",
    "XC",
    "L",
    "XL",
    "X",
    "IX",
    "V",
    "IV",
    "I",
  ];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i];
      num -= vals[i];
    }
  }
  return result;
}

export const OUTPOST_NAMES = [
  "Nebula Station",
  "Void Bazaar",
  "Frontier Post",
  "Drift Market",
  "Comet's Rest",
  "Starfall Depot",
  "Eclipse Trading Post",
  "Quasar Exchange",
  "Pulsar Hub",
  "Nova Outpost",
  "Meteor Market",
  "Warp Gate Station",
  "Asteroid Emporium",
  "Horizon Dock",
  "Singularity Store",
  "Cosmic Crossroads",
  "Dust Trail Depot",
  "Rim Station",
  "Deep Space Market",
  "Orbital Exchange",
];

export const PLANET_NAMES = [
  "Aurelia",
  "Boreas",
  "Calypso",
  "Daedalus",
  "Elysium",
  "Fortuna",
  "Gaia",
  "Helios",
  "Icarus",
  "Janus",
  "Kronos",
  "Luna",
  "Minerva",
  "Neptune",
  "Olympus",
  "Prometheus",
  "Quirinus",
  "Rhea",
  "Solaris",
  "Titan",
  "Ursa",
  "Vesta",
  "Wyvern",
  "Xanthe",
  "Ymir",
  "Zenith",
  "Aether",
  "Bastion",
  "Cygnus",
  "Draco",
  "Erebus",
  "Fenrir",
  "Grendel",
  "Hades",
  "Io",
  "Jotun",
  "Kairos",
  "Lethe",
  "Morpheus",
  "Nyx",
  "Oberon",
  "Pandora",
  "Quetzal",
  "Ragnar",
  "Styx",
  "Tartarus",
  "Umbra",
  "Valkyrie",
  "Wyrm",
  "Xibalba",
];

export interface OutpostData {
  id: string;
  name: string;
  sector_id: number;
  sells_fuel: boolean;
  cyrillium_stock: number;
  food_stock: number;
  tech_stock: number;
  cyrillium_capacity: number;
  food_capacity: number;
  tech_capacity: number;
  cyrillium_mode: string;
  food_mode: string;
  tech_mode: string;
  vedic_stock: number;
  vedic_capacity: number;
  vedic_mode: string;
  treasury: number;
}

export interface PlanetData {
  id: string;
  name: string;
  sector_id: number;
  owner_id: string | null;
  planet_class: string;
  colonists: number;
  ideal_population: number;
  upgrade_level: number;
}

const commodityModes = ["buy", "sell", "none"] as const;

function stockForMode(mode: string, rng: () => number): number {
  if (mode === "sell") return 3000 + Math.floor(rng() * 7000);
  if (mode === "buy") return Math.floor(rng() * 2000);
  return 0;
}

/**
 * Generate outpost data for a set of sectors.
 * starMallSectorIds get guaranteed outposts first, remaining are random.
 */
export function generateOutposts(
  allSectorIds: number[],
  starMallSectorIds: number[],
  rng: () => number,
  count: number,
): OutpostData[] {
  const outpostSectors = new Set<number>();

  // Star malls get outposts first
  for (const sid of starMallSectorIds) {
    outpostSectors.add(sid);
  }

  // Fill remaining randomly
  while (
    outpostSectors.size < count &&
    outpostSectors.size < allSectorIds.length
  ) {
    const idx = Math.floor(rng() * allSectorIds.length);
    outpostSectors.add(allSectorIds[idx]);
  }

  const outposts: OutpostData[] = [];
  let nameIdx = 0;

  for (const sectorId of outpostSectors) {
    const name =
      `${OUTPOST_NAMES[nameIdx % OUTPOST_NAMES.length]} ${Math.floor(nameIdx / OUTPOST_NAMES.length) + 1}`.replace(
        / 1$/,
        "",
      );
    nameIdx++;

    const cyrMode = commodityModes[Math.floor(rng() * 3)];
    const foodMode = commodityModes[Math.floor(rng() * 3)];
    const techMode = commodityModes[Math.floor(rng() * 3)];

    outposts.push({
      id: crypto.randomUUID(),
      name,
      sector_id: sectorId,
      sells_fuel: rng() > 0.3,
      cyrillium_stock: stockForMode(cyrMode, rng),
      food_stock: stockForMode(foodMode, rng),
      tech_stock: stockForMode(techMode, rng),
      cyrillium_capacity: 10000,
      food_capacity: 10000,
      tech_capacity: 10000,
      vedic_stock: 0,
      vedic_capacity: 10000,
      vedic_mode: "none",
      cyrillium_mode: cyrMode,
      food_mode: foodMode,
      tech_mode: techMode,
      treasury: GAME_CONFIG.OUTPOST_BASE_TREASURY + Math.floor(rng() * 50000),
    });
  }

  return outposts;
}

/**
 * Generate planet data scattered across sectors.
 */
export function generatePlanets(
  allSectorIds: number[],
  rng: () => number,
  count: number,
): PlanetData[] {
  const planetClasses = Object.keys(PLANET_TYPES).filter((c) => c !== "S");
  const planets: PlanetData[] = [];
  let nameIdx = 0;

  for (let i = 0; i < count; i++) {
    const sectorId = allSectorIds[Math.floor(rng() * allSectorIds.length)];
    const planetClass = planetClasses[Math.floor(rng() * planetClasses.length)];
    const config = PLANET_TYPES[planetClass];

    const baseName = PLANET_NAMES[nameIdx % PLANET_NAMES.length];
    const suffix = Math.floor(nameIdx / PLANET_NAMES.length);
    const name = suffix === 0 ? baseName : `${baseName} ${toRoman(suffix + 1)}`;
    nameIdx++;

    planets.push({
      id: crypto.randomUUID(),
      name,
      sector_id: sectorId,
      owner_id: null,
      planet_class: planetClass,
      colonists: 0,
      ideal_population: config.idealPopulation,
      upgrade_level: 0,
    });
  }

  return planets;
}

/**
 * Generate seed planets at designated sectors.
 */
export function generateSeedPlanets(
  seedPlanetSectorIds: number[],
): PlanetData[] {
  return seedPlanetSectorIds.map((sectorId, i) => ({
    id: crypto.randomUUID(),
    name: `Seed World ${toRoman(i + 1)}`,
    sector_id: sectorId,
    owner_id: null,
    planet_class: "S",
    colonists: 25000,
    ideal_population: PLANET_TYPES.S.idealPopulation,
    upgrade_level: 0,
  }));
}
