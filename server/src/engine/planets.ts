import { PLANET_TYPES, UPGRADE_REQUIREMENTS } from "../config/planet-types";
import { GAME_CONFIG } from "../config/game";
import { RACES, type RaceId } from "../config/races";
import { type RacePopulation } from "./happiness";

export interface ProductionResult {
  cyrillium: number;
  tech: number;
  drones: number;
}

/**
 * Calculate production using race-typed populations and happiness.
 * Per-race: rate * (raceCount/1000) * efficiency * happinessMultiplier * raceAffinity
 * Summed across all races.
 */
export function calculateProduction(
  planetClass: string,
  racePopulations: RacePopulation[],
  happiness: number,
): ProductionResult {
  const config = PLANET_TYPES[planetClass];
  if (!config) return { cyrillium: 0, tech: 0, drones: 0 };

  const totalColonists = racePopulations.reduce((sum, rp) => sum + rp.count, 0);
  if (totalColonists <= 0) return { cyrillium: 0, tech: 0, drones: 0 };

  // Overcrowding efficiency
  let efficiency = 1.0;
  if (totalColonists > config.idealPopulation) {
    const overRatio = totalColonists / config.idealPopulation;
    efficiency = 1.0 / (overRatio * overRatio);
  }

  // Happiness multiplier
  const tiers = GAME_CONFIG.HAPPINESS_TIERS;
  let happinessMultiplier = 0.75;
  if (happiness <= tiers.miserable.max)
    happinessMultiplier = tiers.miserable.productionMultiplier;
  else if (happiness <= tiers.unhappy.max)
    happinessMultiplier = tiers.unhappy.productionMultiplier;
  else if (happiness <= tiers.content.max)
    happinessMultiplier = tiers.content.productionMultiplier;
  else if (happiness <= tiers.happy.max)
    happinessMultiplier = tiers.happy.productionMultiplier;
  else happinessMultiplier = tiers.thriving.productionMultiplier;

  let totalCyrillium = 0;
  let totalTech = 0;
  let totalDrones = 0;

  for (const rp of racePopulations) {
    if (rp.count <= 0) continue;
    const raceConfig = RACES[rp.race as RaceId];
    const affinity = raceConfig?.planetAffinities?.[planetClass] ?? 1.0;
    const units = rp.count / 10;

    totalCyrillium +=
      config.productionRates.cyrillium *
      units *
      efficiency *
      happinessMultiplier *
      affinity;
    totalTech +=
      config.productionRates.tech *
      units *
      efficiency *
      happinessMultiplier *
      affinity;
    totalDrones +=
      config.productionRates.drones *
      units *
      efficiency *
      happinessMultiplier *
      affinity;
  }

  return {
    cyrillium: Math.floor(totalCyrillium),
    tech: Math.floor(totalTech),
    drones: Math.floor(totalDrones * 100) / 100,
  };
}

/**
 * Legacy wrapper for backward compatibility.
 * Wraps all colonists as unknown race with affinity 1.0.
 */
export function calculateProductionLegacy(
  planetClass: string,
  colonists: number,
  happiness: number = 50,
): ProductionResult {
  return calculateProduction(
    planetClass,
    [{ race: "unknown", count: colonists }],
    happiness,
  );
}

/**
 * Calculate food consumption per tick.
 * Self-stabilizing: low happiness → lower consumption → food lasts longer.
 */
export function calculateFoodConsumption(
  planetClass: string,
  colonists: number,
  happiness: number,
  upgradeLevel: number,
): number {
  const config = PLANET_TYPES[planetClass];
  if (!config || config.foodConsumptionRate === 0) return 0;
  if (colonists <= 0) return 0;

  const baseConsumption = config.foodConsumptionRate * (colonists / 10);
  const happinessScale =
    1.0 + (happiness - 50) * GAME_CONFIG.FOOD_CONSUMPTION_HAPPINESS_SCALE;
  const upgradeScale =
    1.0 + upgradeLevel * GAME_CONFIG.FOOD_CONSUMPTION_UPGRADE_SCALE;

  return Math.max(
    0,
    Math.floor(baseConsumption * happinessScale * upgradeScale),
  );
}

/**
 * Calculate food produced per tick (~30% of consumption, self-sustaining baseline).
 */
export function calculateFoodProduction(
  planetClass: string,
  colonists: number,
): number {
  const config = PLANET_TYPES[planetClass];
  if (!config || config.foodProductionRate === 0) return 0;
  if (colonists <= 0) return 0;

  return Math.floor(config.foodProductionRate * (colonists / 10));
}

/**
 * Calculate colonist growth and food consumption for a tick.
 */
export function calculateColonistGrowth(
  planetClass: string,
  currentColonists: number,
  happiness: number,
  foodStock: number,
  upgradeLevel: number = 0,
): { newColonists: number; foodConsumed: number; foodProduced: number } {
  const config = PLANET_TYPES[planetClass];
  if (!config)
    return { newColonists: currentColonists, foodConsumed: 0, foodProduced: 0 };

  // Seed planets: always grow, no food consumed or produced
  if (planetClass === "S") {
    const growthRate = config.colonistGrowthRate;
    const growth = Math.floor(currentColonists * growthRate);
    return {
      newColonists: currentColonists + growth,
      foodConsumed: 0,
      foodProduced: 0,
    };
  }

  // Food produced this tick
  const foodProduced = calculateFoodProduction(planetClass, currentColonists);

  // Effective food stock includes this tick's production
  const effectiveFoodStock = foodStock + foodProduced;

  // Calculate food consumption
  const foodConsumption = calculateFoodConsumption(
    planetClass,
    currentColonists,
    happiness,
    upgradeLevel,
  );
  const actualFoodConsumed = Math.min(foodConsumption, effectiveFoodStock);

  // If no effective food and happiness below threshold: population decline
  if (
    effectiveFoodStock <= 0 &&
    happiness < GAME_CONFIG.POP_DECLINE_ZERO_FOOD_THRESHOLD
  ) {
    const loss = Math.floor(
      currentColonists * GAME_CONFIG.FOOD_STARVATION_POP_LOSS,
    );
    return {
      newColonists: Math.max(0, currentColonists - loss),
      foodConsumed: 0,
      foodProduced,
    };
  }

  // If food available and happiness > 40: grow
  if (actualFoodConsumed > 0 && happiness > 40) {
    const growthRate = config.colonistGrowthRate;
    const happinessBonus = happiness / 100; // scale growth by happiness
    const growth = Math.floor(currentColonists * growthRate * happinessBonus);
    return {
      newColonists: currentColonists + growth,
      foodConsumed: actualFoodConsumed,
      foodProduced,
    };
  }

  // Otherwise: stagnation
  return {
    newColonists: currentColonists,
    foodConsumed: actualFoodConsumed,
    foodProduced,
  };
}

export interface UpgradeCheck {
  upgradeLevel: number;
  colonists: number;
  cyrilliumStock: number;
  foodStock: number;
  techStock: number;
  ownerCredits: number;
}

/**
 * Check if a planet meets all requirements for the next upgrade level.
 * Requirements escalate non-linearly (defined in UPGRADE_REQUIREMENTS) to
 * create meaningful progression milestones. Checks colonists, all three
 * resource stocks, and owner credits — upgrading is an expensive commitment
 * that signals a player's investment in that colony.
 */
export function canUpgrade(planet: UpgradeCheck): boolean {
  const nextLevel = planet.upgradeLevel + 1;
  const req = UPGRADE_REQUIREMENTS[nextLevel];
  if (!req) return false;

  return (
    planet.colonists >= req.colonists &&
    planet.cyrilliumStock >= req.cyrillium &&
    planet.foodStock >= req.food &&
    planet.techStock >= req.tech &&
    planet.ownerCredits >= req.credits
  );
}

/**
 * Calculate production with an optional factory bonus (50% increase).
 * Factory planets are a late-game specialization — players sacrifice
 * flexibility for raw output. The bonus is flat across all resource types
 * to keep the decision about planet class, not factory placement.
 */
export function calculateProductionWithFactoryBonus(
  planetClass: string,
  racePopulations: RacePopulation[],
  happiness: number,
  isFactory: boolean,
): ProductionResult {
  const base = calculateProduction(planetClass, racePopulations, happiness);
  if (!isFactory) return base;
  const bonus = 0.5;
  return {
    cyrillium: Math.floor(base.cyrillium * (1 + bonus)),
    tech: Math.floor(base.tech * (1 + bonus)),
    drones: Math.floor(base.drones * (1 + bonus) * 100) / 100,
  };
}
