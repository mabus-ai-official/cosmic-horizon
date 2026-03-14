import { ARCADE_CONFIG } from "./constants";
import type {
  NebulaRunnerResult,
  NebulaRoundConfig,
  DrinkEffect,
} from "./constants";

export function validateNebulaRunnerScore(
  result: NebulaRunnerResult,
  roundConfig: NebulaRoundConfig,
  selfEffects: DrinkEffect[],
  opponentEffects: DrinkEffect[],
): { totalScore: number; validated: boolean } {
  const nr = ARCADE_CONFIG.NEBULA_RUNNER;

  // Bounds checks
  if (
    result.crystalsCollected < 0 ||
    result.crystalsCollected > nr.MAX_CRYSTALS_PER_ROUND
  ) {
    return { totalScore: 0, validated: false };
  }
  if (
    result.nearMisses < 0 ||
    result.nearMisses > nr.MAX_NEAR_MISSES_PER_ROUND
  ) {
    return { totalScore: 0, validated: false };
  }
  if (
    result.distanceSurvived < 0 ||
    result.distanceSurvived > nr.ROUND_DURATION_SEC
  ) {
    return { totalScore: 0, validated: false };
  }
  if (result.livesRemaining < 0 || result.livesRemaining > nr.LIVES) {
    return { totalScore: 0, validated: false };
  }
  if (
    result.asteroidsDestroyed < 0 ||
    result.asteroidsDestroyed > nr.MAX_ASTEROIDS_DESTROYED
  ) {
    return { totalScore: 0, validated: false };
  }

  // Server recomputes score
  const totalScore =
    result.crystalsCollected *
      nr.CRYSTAL_VALUE *
      roundConfig.crystalMultiplier +
    result.distanceSurvived * nr.DISTANCE_POINTS_PER_SEC +
    result.nearMisses * nr.NEAR_MISS_BONUS +
    result.asteroidsDestroyed * nr.KILL_BONUS;

  return { totalScore, validated: true };
}

export function generateNebulaRoundConfig(
  roundNumber: number,
  selfEffects: DrinkEffect[],
  opponentEffects: DrinkEffect[],
): NebulaRoundConfig {
  const nr = ARCADE_CONFIG.NEBULA_RUNNER;

  let scrollSpeed: number = nr.BASE_SCROLL_SPEED;
  let hitboxRadius: number = nr.SHIP_HITBOX_RADIUS;
  let obstacleDensity: number = nr.BASE_OBSTACLE_INTERVAL;
  let crystalMultiplier: number = nr.CRYSTAL_MULTIPLIER_DEFAULT;

  // Apply drink effects
  for (const effect of selfEffects) {
    if (effect.type === "speed_boost") {
      // Speed boost on self increases scroll speed (harder but more distance)
      scrollSpeed *= effect.magnitude;
    }
    if (effect.type === "accuracy_up") {
      // Accuracy up shrinks hitbox (easier to dodge)
      hitboxRadius *= 1 / effect.magnitude;
    }
  }

  for (const effect of opponentEffects) {
    if (effect.type === "sabotage") {
      // Sabotage increases obstacle density (lower interval = more obstacles)
      obstacleDensity *= effect.magnitude;
    }
    if (effect.type === "speed_boost") {
      // Opponent speed boost makes scrolling faster
      scrollSpeed *= effect.magnitude;
    }
    if (effect.type === "accuracy_down") {
      // Accuracy down on opponent side enlarges hitbox (harder to dodge)
      hitboxRadius *= effect.magnitude;
    }
  }

  // Clamp values
  scrollSpeed = Math.max(
    nr.MIN_SCROLL_SPEED,
    Math.min(nr.MAX_SCROLL_SPEED, scrollSpeed),
  );
  hitboxRadius = Math.max(
    nr.MIN_HITBOX_RADIUS,
    Math.min(nr.MAX_HITBOX_RADIUS, hitboxRadius),
  );
  obstacleDensity = Math.max(nr.MIN_OBSTACLE_INTERVAL, obstacleDensity);

  const seed = Math.floor(Math.random() * 2147483647);

  return {
    seed,
    scrollSpeed,
    hitboxRadius,
    crystalMultiplier,
    obstacleDensity,
    roundDuration: nr.ROUND_DURATION_SEC,
  };
}
