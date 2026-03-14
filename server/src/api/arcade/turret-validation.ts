import { ARCADE_CONFIG } from "./constants";
import type {
  TurretDefenseResult,
  TurretRoundConfig,
  DrinkEffect,
} from "./constants";

export function validateTurretDefenseScore(
  result: TurretDefenseResult,
  roundConfig: TurretRoundConfig,
  selfEffects: DrinkEffect[],
  opponentEffects: DrinkEffect[],
): { totalScore: number; validated: boolean } {
  const td = ARCADE_CONFIG.TURRET_DEFENSE;

  // Compute total possible enemies across all waves
  const totalEnemiesPossible = roundConfig.waves.reduce(
    (sum, w) => sum + w.enemyCount,
    0,
  );

  // Basic sanity checks
  if (result.wavesCompleted < 0 || result.wavesCompleted > td.WAVES_PER_ROUND) {
    return { totalScore: 0, validated: false };
  }
  if (result.enemiesKilled < 0 || result.enemiesKilled > totalEnemiesPossible) {
    return { totalScore: 0, validated: false };
  }
  if (result.baseHPRemaining < 0 || result.baseHPRemaining > td.BASE_HP) {
    return { totalScore: 0, validated: false };
  }

  // Apply drink effects as modifiers for plausibility
  let damageMultiplier = 1;
  let enemyHPMultiplier = 1;

  for (const effect of selfEffects) {
    if (effect.type === "accuracy_up") {
      damageMultiplier *= effect.magnitude;
    }
  }
  for (const effect of opponentEffects) {
    if (effect.type === "sabotage") {
      enemyHPMultiplier *= 1 + (1 - effect.magnitude);
    }
  }

  // Server recomputes score
  const totalScore =
    result.enemiesKilled * td.SCORE_PER_KILL +
    result.wavesCompleted * td.SCORE_PER_WAVE +
    result.baseHPRemaining * td.SCORE_PER_HP;

  return { totalScore, validated: true };
}

export function generateTurretRoundConfig(
  roundNumber: number,
  selfEffects: DrinkEffect[],
  opponentEffects: DrinkEffect[],
): TurretRoundConfig {
  const td = ARCADE_CONFIG.TURRET_DEFENSE;

  // Apply drink effects to enemy stats
  let enemySpeedMult = 1;
  let enemyHPMult = 1;

  for (const effect of selfEffects) {
    if (effect.type === "slow_down") {
      // slow_down on self side means enemies move slower (beneficial)
      enemySpeedMult *= 1 / effect.magnitude;
    }
  }
  for (const effect of opponentEffects) {
    if (effect.type === "sabotage") {
      // Sabotage makes enemies tougher
      enemyHPMult *= 1 + (1 - effect.magnitude);
    }
    if (effect.type === "speed_boost") {
      // Opponent speed_boost makes enemies faster
      enemySpeedMult *= effect.magnitude;
    }
  }

  const waves = [];
  for (let w = 0; w < td.WAVES_PER_ROUND; w++) {
    const waveIndex = (roundNumber - 1) * td.WAVES_PER_ROUND + w;
    waves.push({
      enemyCount: td.BASE_ENEMY_COUNT + waveIndex * td.ENEMY_COUNT_SCALE,
      enemyHP: Math.max(
        1,
        (td.BASE_ENEMY_HP + waveIndex * td.ENEMY_HP_SCALE) * enemyHPMult,
      ),
      enemySpeed: Math.max(
        0.3,
        (td.BASE_ENEMY_SPEED + waveIndex * td.ENEMY_SPEED_SCALE) *
          enemySpeedMult,
      ),
    });
  }

  return {
    waves,
    startingCurrency: td.STARTING_CURRENCY,
    baseHP: td.BASE_HP,
    turrets: td.TURRETS,
  };
}
