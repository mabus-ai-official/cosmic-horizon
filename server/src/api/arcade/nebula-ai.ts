import { ARCADE_CONFIG } from "./constants";
import type {
  NebulaRunnerResult,
  NebulaRoundConfig,
  AIDifficulty,
} from "./constants";

export function generateAINebulaResult(
  roundConfig: NebulaRoundConfig,
  difficulty: AIDifficulty,
): NebulaRunnerResult {
  const nr = ARCADE_CONFIG.NEBULA_RUNNER;

  // Estimate max crystals available based on round duration and crystal interval
  const estimatedMaxCrystals = Math.floor(
    roundConfig.roundDuration / nr.CRYSTAL_INTERVAL,
  );

  let distanceSurvived: number;
  let crystalRate: number;
  let nearMisses: number;
  let livesRemaining: number;
  let asteroidsDestroyed: number;

  switch (difficulty) {
    case "easy":
      distanceSurvived = 15 + Math.random() * 7; // 15-22s
      crystalRate = 0.4 + Math.random() * 0.15; // 40-55%
      nearMisses = 2 + Math.floor(Math.random() * 4); // 2-5
      livesRemaining = Math.floor(Math.random() * 2); // 0-1
      asteroidsDestroyed = 1 + Math.floor(Math.random() * 4); // 1-4
      break;
    case "medium":
      distanceSurvived = 22 + Math.random() * 6; // 22-28s
      crystalRate = 0.55 + Math.random() * 0.2; // 55-75%
      nearMisses = 5 + Math.floor(Math.random() * 6); // 5-10
      livesRemaining = 1 + Math.floor(Math.random() * 2); // 1-2
      asteroidsDestroyed = 5 + Math.floor(Math.random() * 8); // 5-12
      break;
    case "hard":
      distanceSurvived = 28 + Math.random() * 2; // 28-30s
      crystalRate = 0.75 + Math.random() * 0.2; // 75-95%
      nearMisses = 10 + Math.floor(Math.random() * 9); // 10-18
      livesRemaining = 2 + Math.floor(Math.random() * 2); // 2-3
      asteroidsDestroyed = 15 + Math.floor(Math.random() * 11); // 15-25
      break;
  }

  // Clamp distance to round duration
  distanceSurvived = Math.min(distanceSurvived, roundConfig.roundDuration);

  const crystalsCollected = Math.min(
    Math.round(estimatedMaxCrystals * crystalRate),
    nr.MAX_CRYSTALS_PER_ROUND,
  );

  nearMisses = Math.min(nearMisses, nr.MAX_NEAR_MISSES_PER_ROUND);
  livesRemaining = Math.min(livesRemaining, nr.LIVES);
  asteroidsDestroyed = Math.min(asteroidsDestroyed, nr.MAX_ASTEROIDS_DESTROYED);

  // Compute score using the same formula as validation
  const score =
    crystalsCollected * nr.CRYSTAL_VALUE * roundConfig.crystalMultiplier +
    distanceSurvived * nr.DISTANCE_POINTS_PER_SEC +
    nearMisses * nr.NEAR_MISS_BONUS +
    asteroidsDestroyed * nr.KILL_BONUS;

  return {
    crystalsCollected,
    distanceSurvived,
    nearMisses,
    livesRemaining,
    asteroidsDestroyed,
    score,
  };
}
