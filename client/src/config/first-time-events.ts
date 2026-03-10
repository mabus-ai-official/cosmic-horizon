// First-time event definitions — shown once per player via localStorage

export interface FirstTimeEvent {
  key: string; // localStorage key suffix
  title: string;
  subtitle: string;
  body: string;
  colorScheme: string;
  duration: number;
}

export const FIRST_TIME_EVENTS: Record<string, FirstTimeEvent> = {
  combat: {
    key: "first_combat",
    title: "FIRST BLOOD",
    subtitle: "Combat Initiated",
    body: "You've engaged your first hostile. Weapons are hot, shields are up. Welcome to the frontier, pilot — out here, credits are earned the hard way.",
    colorScheme: "magenta",
    duration: 6000,
  },
  trade: {
    key: "first_trade",
    title: "FIRST TRANSACTION",
    subtitle: "Markets Unlocked",
    body: "Your first trade is on the books. The Calvatian economy runs on cyrillium, food, and tech — learn the routes, watch the margins, and the credits will follow.",
    colorScheme: "green",
    duration: 6000,
  },
  dock: {
    key: "first_dock",
    title: "WELCOME ABOARD",
    subtitle: "Outpost Docked",
    body: "You've docked at your first outpost. Outposts offer trade, repairs, missions, and the occasional rumor. Keep your ears open — the best opportunities come from the strangest places.",
    colorScheme: "cyan",
    duration: 6000,
  },
  explore: {
    key: "first_explore",
    title: "UNCHARTED SPACE",
    subtitle: "New Sector Discovered",
    body: "You've ventured into a sector no one has mapped for you. The galaxy is vast — every sector holds potential: resources, danger, or secrets waiting to be found.",
    colorScheme: "purple",
    duration: 6000,
  },
  planet_claim: {
    key: "first_planet",
    title: "LANDFALL",
    subtitle: "Planet Claimed",
    body: "You've claimed your first planet. Colonize it, develop it, defend it. Planets generate resources and expand your influence across the galaxy.",
    colorScheme: "orange",
    duration: 6000,
  },
  starmall: {
    key: "first_starmall",
    title: "STAR MALL",
    subtitle: "Commercial Hub",
    body: "Star Malls are the beating heart of galactic commerce. Ships, upgrades, gear, and secrets — if it exists in the Calvatian Galaxy, someone here is selling it.",
    colorScheme: "yellow",
    duration: 6000,
  },
};

const STORAGE_PREFIX = "coho_evt_";

export function hasSeenFirstTime(key: string): boolean {
  return localStorage.getItem(STORAGE_PREFIX + key) === "1";
}

export function markFirstTimeSeen(key: string): void {
  localStorage.setItem(STORAGE_PREFIX + key, "1");
}
