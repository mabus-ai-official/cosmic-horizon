import Phaser from "phaser";
import { CT_CONFIG } from "./CargoTetrisConfig";
import { Piece, type PieceType } from "./Piece";

export class Board {
  private grid: (PieceType | null)[][];
  private bgRects: Phaser.GameObjects.Rectangle[][];
  private cellImages: Phaser.GameObjects.Image[][];

  constructor(scene: Phaser.Scene) {
    this.grid = this.createEmptyGrid();
    this.bgRects = [];
    this.cellImages = [];

    const bx = CT_CONFIG.BOARD_X;
    const by = CT_CONFIG.BOARD_Y;
    const cs = CT_CONFIG.CELL_SIZE;

    // Draw board border
    scene.add
      .rectangle(
        bx + (CT_CONFIG.BOARD_WIDTH * cs) / 2,
        by + (CT_CONFIG.BOARD_HEIGHT * cs) / 2,
        CT_CONFIG.BOARD_WIDTH * cs + 2,
        CT_CONFIG.BOARD_HEIGHT * cs + 2,
        0x000000,
        0,
      )
      .setStrokeStyle(1, CT_CONFIG.BORDER_COLOR)
      .setDepth(2);

    // Pre-create background rectangles (grid squares) and sprite image pool
    for (let r = 0; r < CT_CONFIG.BOARD_HEIGHT; r++) {
      this.bgRects[r] = [];
      this.cellImages[r] = [];
      for (let c = 0; c < CT_CONFIG.BOARD_WIDTH; c++) {
        const cx = bx + c * cs + cs / 2;
        const cy = by + r * cs + cs / 2;

        // Background rect (always visible, shows grid color)
        const rect = scene.add
          .rectangle(cx, cy, cs - 1, cs - 1, CT_CONFIG.GRID_COLOR, 1)
          .setDepth(3);
        this.bgRects[r][c] = rect;

        // Sprite image (overlaid on top, hidden by default)
        const img = scene.add
          .image(cx, cy, "ct_block_cyan")
          .setScale(CT_CONFIG.CELL_SCALE)
          .setDepth(4)
          .setVisible(false);
        this.cellImages[r][c] = img;
      }
    }
  }

  private createEmptyGrid(): (PieceType | null)[][] {
    const grid: (PieceType | null)[][] = [];
    for (let r = 0; r < CT_CONFIG.BOARD_HEIGHT; r++) {
      grid[r] = new Array(CT_CONFIG.BOARD_WIDTH).fill(null);
    }
    return grid;
  }

  canPlace(piece: Piece): boolean {
    for (const [r, c] of piece.cells()) {
      if (r < 0 || r >= CT_CONFIG.BOARD_HEIGHT) return false;
      if (c < 0 || c >= CT_CONFIG.BOARD_WIDTH) return false;
      if (this.grid[r][c] !== null) return false;
    }
    return true;
  }

  lockPiece(piece: Piece): void {
    for (const [r, c] of piece.cells()) {
      if (
        r >= 0 &&
        r < CT_CONFIG.BOARD_HEIGHT &&
        c >= 0 &&
        c < CT_CONFIG.BOARD_WIDTH
      ) {
        this.grid[r][c] = piece.type;
      }
    }
  }

  clearFullRows(): number {
    let cleared = 0;
    for (let r = CT_CONFIG.BOARD_HEIGHT - 1; r >= 0; r--) {
      if (this.grid[r].every((cell) => cell !== null)) {
        // Remove the full row and add empty row at top
        this.grid.splice(r, 1);
        this.grid.unshift(new Array(CT_CONFIG.BOARD_WIDTH).fill(null));
        cleared++;
        r++; // Re-check this row index since rows shifted down
      }
    }
    return cleared;
  }

  getGhostRow(piece: Piece): number {
    const test = piece.clone();
    while (this.canPlace(test)) {
      test.row++;
    }
    return test.row - 1;
  }

  render(currentPiece: Piece | null, ghostRow: number): void {
    // Reset all cells: show grid background, hide sprites
    for (let r = 0; r < CT_CONFIG.BOARD_HEIGHT; r++) {
      for (let c = 0; c < CT_CONFIG.BOARD_WIDTH; c++) {
        const cell = this.grid[r][c];
        if (cell) {
          const tex = CT_CONFIG.PIECE_TEXTURES[cell];
          this.cellImages[r][c].setTexture(tex).setAlpha(1).setVisible(true);
        } else {
          this.cellImages[r][c].setVisible(false);
        }
      }
    }

    if (!currentPiece) return;

    // Render ghost piece
    const ghost = currentPiece.clone();
    ghost.row = ghostRow;
    const ghostTex = CT_CONFIG.PIECE_TEXTURES[currentPiece.type];
    for (const [r, c] of ghost.cells()) {
      if (
        r >= 0 &&
        r < CT_CONFIG.BOARD_HEIGHT &&
        c >= 0 &&
        c < CT_CONFIG.BOARD_WIDTH
      ) {
        if (this.grid[r][c] === null) {
          this.cellImages[r][c]
            .setTexture(ghostTex)
            .setAlpha(CT_CONFIG.GHOST_ALPHA)
            .setVisible(true);
        }
      }
    }

    // Render current piece (overwrites ghost if overlapping)
    const pieceTex = CT_CONFIG.PIECE_TEXTURES[currentPiece.type];
    for (const [r, c] of currentPiece.cells()) {
      if (
        r >= 0 &&
        r < CT_CONFIG.BOARD_HEIGHT &&
        c >= 0 &&
        c < CT_CONFIG.BOARD_WIDTH
      ) {
        this.cellImages[r][c].setTexture(pieceTex).setAlpha(1).setVisible(true);
      }
    }
  }

  reset(): void {
    this.grid = this.createEmptyGrid();
  }
}
