import { ARCADE_CONFIG } from "./constants";
import type { DrinkEffect } from "./constants";

interface HitResult {
  hitIndex: number;
  timing: number;
  sweetSpotPosition: number;
  distance: number;
  score: number;
  rating: "perfect" | "good" | "miss";
}

export function validateRoundScore(
  hitTimings: number[],
  sweetSpotPositions: number[],
  selfEffects: DrinkEffect[],
  opponentEffects: DrinkEffect[],
): { totalScore: number; hits: HitResult[] } {
  const hits: HitResult[] = [];
  let totalScore = 0;

  // Calculate effective sweet spot width from effects
  let sweetSpotMultiplier = 1;
  for (const effect of selfEffects) {
    if (effect.type === "accuracy_up") {
      sweetSpotMultiplier *= effect.magnitude;
    }
  }
  for (const effect of opponentEffects) {
    if (effect.type === "accuracy_down") {
      sweetSpotMultiplier *= effect.magnitude;
    }
    if (effect.type === "sabotage") {
      sweetSpotMultiplier *= effect.magnitude;
    }
  }

  const effectiveWidth =
    ARCADE_CONFIG.BASE_SWEET_SPOT_WIDTH * sweetSpotMultiplier;
  const clampedWidth = Math.max(
    ARCADE_CONFIG.MIN_SWEET_SPOT_WIDTH,
    Math.min(ARCADE_CONFIG.MAX_SWEET_SPOT_WIDTH, effectiveWidth),
  );

  const perfectThreshold = clampedWidth * 0.3;
  const goodThreshold = clampedWidth * 0.5;

  for (let i = 0; i < ARCADE_CONFIG.HITS_PER_ROUND; i++) {
    const timing = hitTimings[i] ?? -1;
    const sweetSpot = sweetSpotPositions[i] ?? 0.5;

    if (timing < 0 || timing > 1) {
      hits.push({
        hitIndex: i,
        timing,
        sweetSpotPosition: sweetSpot,
        distance: 1,
        score: 0,
        rating: "miss",
      });
      continue;
    }

    const distance = Math.abs(timing - sweetSpot);
    let score: number;
    let rating: "perfect" | "good" | "miss";

    if (distance <= perfectThreshold) {
      score = ARCADE_CONFIG.PERFECT_SCORE;
      rating = "perfect";
    } else if (distance <= goodThreshold) {
      const t =
        (distance - perfectThreshold) / (goodThreshold - perfectThreshold);
      score = Math.round(
        ARCADE_CONFIG.GOOD_MAX_SCORE -
          t * (ARCADE_CONFIG.GOOD_MAX_SCORE - ARCADE_CONFIG.GOOD_BASE_SCORE),
      );
      rating = "good";
    } else {
      const t = Math.min(1, (distance - goodThreshold) / (1 - goodThreshold));
      score = Math.round(ARCADE_CONFIG.MISS_MAX_SCORE * (1 - t));
      rating = "miss";
    }

    // Double or nothing effect
    const hasDoubleOrNothing = selfEffects.some(
      (e) => e.type === "double_or_nothing",
    );
    if (hasDoubleOrNothing) {
      if (rating === "perfect" || rating === "good") {
        score = Math.round(score * 2);
      } else {
        score = 0;
      }
    }

    totalScore += score;
    hits.push({
      hitIndex: i,
      timing,
      sweetSpotPosition: sweetSpot,
      distance,
      score,
      rating,
    });
  }

  return { totalScore, hits };
}

export function generateSweetSpotPositions(count: number): number[] {
  const positions: number[] = [];
  const margin = 0.1;
  const minGap = 0.12;

  for (let i = 0; i < count; i++) {
    let pos: number;
    let attempts = 0;
    do {
      pos = margin + Math.random() * (1 - 2 * margin);
      attempts++;
    } while (
      attempts < 50 &&
      positions.some((p) => Math.abs(p - pos) < minGap)
    );
    positions.push(pos);
  }

  return positions;
}

export function calculateBarSpeed(
  selfEffects: DrinkEffect[],
  opponentEffects: DrinkEffect[],
): number {
  let speed = ARCADE_CONFIG.BASE_BAR_SPEED;

  for (const effect of selfEffects) {
    if (effect.type === "speed_boost") {
      speed *= effect.magnitude;
    }
  }
  for (const effect of opponentEffects) {
    if (effect.type === "slow_down") {
      speed *= effect.magnitude;
    }
  }

  return Math.max(
    ARCADE_CONFIG.MIN_BAR_SPEED,
    Math.min(ARCADE_CONFIG.MAX_BAR_SPEED, speed),
  );
}
