import * as THREE from "three";

// --- Seeded RNG (Park-Miller) ---
export function seededRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// --- Sector layout ---
export const SECTOR_RADIUS = 60; // total sector space radius
export const PLANET_MIN_DIST = 18;
export const PLANET_MAX_DIST = 45;
export const OUTPOST_MIN_DIST = 12;
export const OUTPOST_MAX_DIST = 30;
export const WARP_GATE_DIST = 50;
export const PLAYER_SPAWN_RADIUS = 8;

// Deterministic position for a sector entity
export function entityPosition(
  sectorId: number,
  entityIndex: number,
  entityType: "planet" | "outpost" | "warpgate" | "player",
): THREE.Vector3 {
  // Different seed offsets per entity type to avoid overlaps
  const typeOffset =
    entityType === "planet"
      ? 31337
      : entityType === "outpost"
        ? 71993
        : entityType === "warpgate"
          ? 104729
          : 55661;
  const rand = seededRng(sectorId * 7919 + entityIndex * 1301 + typeOffset);

  let minDist: number, maxDist: number;
  switch (entityType) {
    case "planet":
      minDist = PLANET_MIN_DIST;
      maxDist = PLANET_MAX_DIST;
      break;
    case "outpost":
      minDist = OUTPOST_MIN_DIST;
      maxDist = OUTPOST_MAX_DIST;
      break;
    case "warpgate":
      minDist = WARP_GATE_DIST - 5;
      maxDist = WARP_GATE_DIST + 5;
      break;
    case "player":
      minDist = 2;
      maxDist = PLAYER_SPAWN_RADIUS;
      break;
  }

  const r = minDist + rand() * (maxDist - minDist);
  const theta = rand() * Math.PI * 2;
  const y =
    entityType === "planet"
      ? (rand() - 0.6) * 6 // range ~-3.6 to +2.4, biased slightly below camera
      : (rand() - 0.5) * 6;

  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
}

// --- Planet visual config ---
export const PLANET_CLASSES: Record<
  string,
  {
    baseColor: string;
    atmosphereColor: string;
    emissive: string;
    scale: number;
  }
> = {
  H: {
    baseColor: "#4a8a3a",
    atmosphereColor: "#88cc88",
    emissive: "#000000",
    scale: 5.0,
  },
  D: {
    baseColor: "#c9a05a",
    atmosphereColor: "#ddbb77",
    emissive: "#000000",
    scale: 4.0,
  },
  O: {
    baseColor: "#2a5a9a",
    atmosphereColor: "#6699cc",
    emissive: "#000000",
    scale: 4.5,
  },
  A: {
    baseColor: "#7a8a7a",
    atmosphereColor: "#aabbaa",
    emissive: "#000000",
    scale: 4.2,
  },
  F: {
    baseColor: "#a0c8e0",
    atmosphereColor: "#ccddee",
    emissive: "#112233",
    scale: 3.8,
  },
  V: {
    baseColor: "#8a3a2a",
    atmosphereColor: "#cc5533",
    emissive: "#ff4400",
    scale: 3.5,
  },
  G: {
    baseColor: "#d0a060",
    atmosphereColor: "#ddbb88",
    emissive: "#000000",
    scale: 6.5,
  },
  S: {
    baseColor: "#3a9a6a",
    atmosphereColor: "#55cc99",
    emissive: "#114422",
    scale: 3.0,
  },
};

// --- Ship scale by type ---
export const SHIP_SCALES: Record<string, number> = {
  dodge_pod: 2.0,
  scout: 2.5,
  freighter: 4.0,
  corvette: 3.0,
  cruiser: 3.5,
  battleship: 4.5,
  stealth: 2.5,
  colony_ship: 4.5,
};

// --- Lighting context colors ---
export const CONTEXT_COLORS: Record<
  string,
  { main: string; accent: string; intensity: number; fogColor: string }
> = {
  ambient: {
    main: "#2a2a5e",
    accent: "#56d4dd",
    intensity: 0.7,
    fogColor: "#050510",
  },
  combat: {
    main: "#5e2a2a",
    accent: "#f85149",
    intensity: 1.0,
    fogColor: "#0a0505",
  },
  docked: {
    main: "#3a3a2a",
    accent: "#d29922",
    intensity: 0.8,
    fogColor: "#080806",
  },
  danger: {
    main: "#5e3a2a",
    accent: "#f0883e",
    intensity: 0.9,
    fogColor: "#080605",
  },
  warp: {
    main: "#2a2a6e",
    accent: "#a371f7",
    intensity: 1.0,
    fogColor: "#050508",
  },
};
