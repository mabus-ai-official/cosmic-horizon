import { ARCADE_CONFIG } from "./constants";
import type {
  TurretDefenseResult,
  TurretRoundConfig,
  AIDifficulty,
} from "./constants";

export function generateAITurretResult(
  roundConfig: TurretRoundConfig,
  difficulty: AIDifficulty,
): TurretDefenseResult {
  const td = ARCADE_CONFIG.TURRET_DEFENSE;
  const totalEnemies = roundConfig.waves.reduce(
    (sum, w) => sum + w.enemyCount,
    0,
  );

  let wavesCompleted: number;
  let killRate: number;
  let hpRate: number;

  switch (difficulty) {
    case "easy":
      wavesCompleted = 3 + Math.floor(Math.random() * 2); // 3-4
      killRate = 0.6 + Math.random() * 0.15; // 60-75%
      hpRate = 0.2 + Math.random() * 0.3; // 20-50% HP remaining
      break;
    case "medium":
      wavesCompleted = 4 + Math.floor(Math.random() * 2); // 4-5
      killRate = 0.75 + Math.random() * 0.15; // 75-90%
      hpRate = 0.4 + Math.random() * 0.3; // 40-70% HP remaining
      break;
    case "hard":
      wavesCompleted = td.WAVES_PER_ROUND; // always all 5
      killRate = 0.9 + Math.random() * 0.1; // 90-100%
      hpRate = 0.6 + Math.random() * 0.35; // 60-95% HP remaining
      break;
  }

  wavesCompleted = Math.min(wavesCompleted, td.WAVES_PER_ROUND);
  const enemiesKilled = Math.min(
    Math.round(totalEnemies * killRate),
    totalEnemies,
  );
  const baseHPRemaining = Math.round(roundConfig.baseHP * hpRate);

  const score =
    enemiesKilled * td.SCORE_PER_KILL +
    wavesCompleted * td.SCORE_PER_WAVE +
    baseHPRemaining * td.SCORE_PER_HP;

  return {
    wavesCompleted,
    enemiesKilled,
    baseHPRemaining,
    score,
  };
}
