import { ARCADE_CONFIG } from "./constants";
import type {
  CargoTetrisResult,
  CargoTetrisRoundConfig,
  AIDifficulty,
} from "./constants";

export function generateAICargoTetrisResult(
  roundConfig: CargoTetrisRoundConfig,
  difficulty: AIDifficulty,
): CargoTetrisResult {
  const ct = ARCADE_CONFIG.CARGO_TETRIS;

  let linesCleared: number;
  let piecesPlaced: number;

  switch (difficulty) {
    case "easy":
      linesCleared = 2 + Math.floor(Math.random() * 5); // 2-6
      piecesPlaced = 15 + Math.floor(Math.random() * 11); // 15-25
      break;
    case "medium":
      linesCleared = 8 + Math.floor(Math.random() * 7); // 8-14
      piecesPlaced = 25 + Math.floor(Math.random() * 16); // 25-40
      break;
    case "hard":
      linesCleared = 16 + Math.floor(Math.random() * 10); // 16-25
      piecesPlaced = 40 + Math.floor(Math.random() * 16); // 40-55
      break;
  }

  linesCleared = Math.min(linesCleared, ct.MAX_LINES_PER_ROUND);
  piecesPlaced = Math.min(piecesPlaced, ct.MAX_PIECES_PER_ROUND);

  // Compute score using the same formula as validation
  const score =
    linesCleared * ct.POINTS_PER_LINE + piecesPlaced * ct.POINTS_PER_PIECE;

  return { linesCleared, piecesPlaced, score };
}
