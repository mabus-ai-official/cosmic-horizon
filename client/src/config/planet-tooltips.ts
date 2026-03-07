export interface PlanetTypeInfo {
  name: string;
  description: string;
  production: string;
  uniqueResource?: string;
  rareVariant?: string;
}

export const PLANET_TYPES: Record<string, PlanetTypeInfo> = {
  H: {
    name: "Habitable",
    description: "Earth-like world with breathable atmosphere",
    production: "Food, Colonists",
    uniqueResource: "Organic Compounds",
  },
  D: {
    name: "Desert",
    description: "Arid world with mineral-rich sands",
    production: "Cyrillium",
    uniqueResource: "Rare Minerals",
  },
  I: {
    name: "Ice",
    description: "Frozen world with sub-surface oceans",
    production: "Tech Components",
    uniqueResource: "Cryogenic Compounds",
  },
  V: {
    name: "Volcanic",
    description: "Tectonically active with lava flows",
    production: "Cyrillium, Tech",
    uniqueResource: "Plasma Crystals",
  },
  G: {
    name: "Gas Giant",
    description: "Massive gas world — orbital stations only",
    production: "Fuel, Rare Gases",
    rareVariant: "Ringed Giant",
  },
  O: {
    name: "Oceanic",
    description: "Planet-wide ocean with floating platforms",
    production: "Food, Organic Compounds",
    uniqueResource: "Aquatic Biomass",
  },
  R: {
    name: "Rocky",
    description: "Barren rock with mining potential",
    production: "Cyrillium",
  },
  T: {
    name: "Toxic",
    description: "Hazardous atmosphere, rich in exotic materials",
    production: "Tech Components",
    uniqueResource: "Xenochemicals",
  },
  S: {
    name: "Seed World",
    description: "Proto-planet ready for terraforming",
    production: "Varies by terraforming",
    rareVariant: "Pristine Seed",
  },
};

export function getPlanetTypeInfo(planetClass: string): PlanetTypeInfo | null {
  return PLANET_TYPES[planetClass] || null;
}
