import { ARCADE_CONFIG } from "./constants";
import type { AIDifficulty } from "./constants";
import { getRandomDrinkId } from "./drinks";

function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

export function generateAIHits(
  sweetSpotPositions: number[],
  difficulty: AIDifficulty,
): number[] {
  const config = ARCADE_CONFIG.AI_DIFFICULTY[difficulty];
  const timings: number[] = [];

  for (const sweetSpot of sweetSpotPositions) {
    const offset = gaussianRandom(0, config.accuracyStdDev);
    const meanOffset = (Math.random() - 0.5) * config.accuracyMean;
    let timing = sweetSpot + offset + meanOffset;
    timing = Math.max(0, Math.min(1, timing));
    timings.push(timing);
  }

  return timings;
}

export function chooseAIDifficulty(playerLevel: number): AIDifficulty {
  if (playerLevel < 5) return "easy";
  if (playerLevel < 15) return "medium";
  return "hard";
}

export function chooseAIDrink(): string {
  return getRandomDrinkId();
}
