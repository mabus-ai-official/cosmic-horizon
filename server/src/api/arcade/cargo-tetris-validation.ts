import { ARCADE_CONFIG } from "./constants";
import type {
  CargoTetrisResult,
  CargoTetrisRoundConfig,
  DrinkEffect,
} from "./constants";

export function validateCargoTetrisScore(
  result: CargoTetrisResult,
  roundConfig: CargoTetrisRoundConfig,
  selfEffects: DrinkEffect[],
  opponentEffects: DrinkEffect[],
): { totalScore: number; validated: boolean } {
  const ct = ARCADE_CONFIG.CARGO_TETRIS;

  // Bounds checks (solo mode has no timer so allow higher caps)
  const isSolo = roundConfig.roundDuration <= 0;
  const maxLines = isSolo ? 999 : ct.MAX_LINES_PER_ROUND;
  const maxPieces = isSolo ? 9999 : ct.MAX_PIECES_PER_ROUND;
  if (result.linesCleared < 0 || result.linesCleared > maxLines) {
    return { totalScore: 0, validated: false };
  }
  if (result.piecesPlaced < 0 || result.piecesPlaced > maxPieces) {
    return { totalScore: 0, validated: false };
  }

  // Server recomputes score
  const totalScore =
    result.linesCleared * ct.POINTS_PER_LINE +
    result.piecesPlaced * ct.POINTS_PER_PIECE;

  return { totalScore, validated: true };
}

export function generateCargoTetrisRoundConfig(
  roundNumber: number,
  selfEffects: DrinkEffect[],
  opponentEffects: DrinkEffect[],
  solo: boolean = false,
): CargoTetrisRoundConfig {
  const ct = ARCADE_CONFIG.CARGO_TETRIS;

  let dropInterval: number =
    ct.BASE_DROP_INTERVAL - ct.DROP_INTERVAL_RAMP * (roundNumber - 1);
  let speedIncrease: number = ct.SPEED_INCREASE;

  // Apply drink effects
  for (const effect of selfEffects) {
    if (effect.type === "speed_boost") {
      // Speed boost on self lowers dropInterval (faster = harder)
      dropInterval *= effect.magnitude;
    }
    if (effect.type === "slow_down") {
      // Slow down on self raises dropInterval (slower = easier)
      dropInterval *= effect.magnitude;
    }
    if (effect.type === "accuracy_up") {
      // Accuracy up reduces speed increase (gentler acceleration)
      speedIncrease *= 1 / effect.magnitude;
    }
  }

  for (const effect of opponentEffects) {
    if (effect.type === "sabotage") {
      // Sabotage lowers dropInterval for target (faster = harder)
      dropInterval *= effect.magnitude;
    }
    if (effect.type === "speed_boost") {
      // Opponent speed boost makes drop faster
      dropInterval *= effect.magnitude;
    }
  }

  // Clamp values
  dropInterval = Math.max(
    ct.MIN_DROP_INTERVAL,
    Math.min(ct.MAX_DROP_INTERVAL, dropInterval),
  );
  speedIncrease = Math.max(1, Math.min(20, speedIncrease));

  const seed = Math.floor(Math.random() * 2147483647);

  return {
    seed,
    dropInterval,
    speedIncrease,
    roundDuration: solo ? 0 : (ct.ROUND_DURATIONS[roundNumber - 1] ?? 60),
  };
}
