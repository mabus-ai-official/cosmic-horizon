import Phaser from "phaser";
import { CT_CONFIG } from "./CargoTetrisConfig";
import { CargoTetrisUI } from "./CargoTetrisUI";
import { Board } from "./Board";
import { Piece, type PieceType, ALL_PIECE_TYPES, getKicks } from "./Piece";
import { createSeededRng } from "../nebula-runner/SeededRng";

interface RoundConfig {
  seed: number;
  dropInterval: number;
  speedIncrease: number;
  roundDuration: number;
}

interface RoundStartData {
  round: number;
  roundConfig?: RoundConfig;
  effects?: unknown[];
}

interface RoundResult {
  linesCleared: number;
  piecesPlaced: number;
}

export class CargoTetrisScene extends Phaser.Scene {
  private board!: Board;
  private ui!: CargoTetrisUI;

  private rng!: () => number;
  private bag: PieceType[] = [];
  private nextPieces: PieceType[] = [];
  private currentPiece: Piece | null = null;

  private dropInterval: number = 800;
  private speedIncrease: number = 5;
  private roundDuration: number = 60;

  private dropTimer: number = 0;
  private timeRemaining: number = 0;
  private roundActive: boolean = false;

  private linesCleared: number = 0;
  private piecesPlaced: number = 0;
  private score: number = 0;
  private level: number = 1;
  private linesUntilNextLevel: number = CT_CONFIG.LINES_PER_LEVEL;
  private baseDropInterval: number = 800;

  // Lock delay
  private lockTimer: number = 0;
  private isLocking: boolean = false;

  // DAS
  private dasLeftTimer: number = 0;
  private dasRightTimer: number = 0;
  private dasLeftActive: boolean = false;
  private dasRightActive: boolean = false;
  private softDropActive: boolean = false;

  // Key state tracking
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
    ctrl: Phaser.Input.Keyboard.Key;
  };
  private ctrlHardDropFired: boolean = false;

  private onRoundComplete: ((result: RoundResult) => void) | null = null;

  constructor() {
    super({ key: "CargoTetris" });
  }

  preload(): void {
    this.load.image(
      "ct_block_cyan",
      "/assets/arcade/cargo-tetris/block_cyan.png",
    );
    this.load.image(
      "ct_block_orange",
      "/assets/arcade/cargo-tetris/block_orange.png",
    );
    this.load.image(
      "ct_block_purple",
      "/assets/arcade/cargo-tetris/block_purple.png",
    );
    this.load.image(
      "ct_block_green",
      "/assets/arcade/cargo-tetris/block_green.png",
    );
    this.load.image(
      "ct_block_red",
      "/assets/arcade/cargo-tetris/block_red.png",
    );
    this.load.image(
      "ct_block_darkblue",
      "/assets/arcade/cargo-tetris/block_darkblue.png",
    );
    this.load.image(
      "ct_block_blue",
      "/assets/arcade/cargo-tetris/block_blue.png",
    );
  }

  create(): void {
    // Dark background
    this.add
      .rectangle(
        CT_CONFIG.CANVAS_WIDTH / 2,
        CT_CONFIG.CANVAS_HEIGHT / 2,
        CT_CONFIG.CANVAS_WIDTH,
        CT_CONFIG.CANVAS_HEIGHT,
        0x0d1117,
        1,
      )
      .setDepth(0);

    // Board and UI
    this.board = new Board(this);
    this.ui = new CargoTetrisUI(this);

    // Keyboard
    if (this.input.keyboard) {
      this.keys = {
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        ctrl: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL),
      };

      // Space = rotate
      this.keys.space.on("down", () => {
        if (this.roundActive && this.currentPiece) {
          this.rotatePiece();
        }
      });
    }

    // Get round data from registry
    const roundStart = this.registry.get("roundStart") as
      | RoundStartData
      | undefined;
    this.onRoundComplete = this.registry.get("onRoundComplete") as
      | ((result: RoundResult) => void)
      | null;

    if (roundStart?.roundConfig) {
      this.startRound(roundStart);
    }

    // Listen for new round events
    this.game.events.on("newRound", (data: RoundStartData) => {
      this.startRound(data);
    });
  }

  private startRound(data: RoundStartData): void {
    if (!data.roundConfig) return;

    const cfg = data.roundConfig;
    this.dropInterval = cfg.dropInterval;
    this.speedIncrease = cfg.speedIncrease;
    this.roundDuration = cfg.roundDuration;

    // Initialize RNG
    this.rng = createSeededRng(cfg.seed);

    // Reset state
    this.board.reset();
    this.bag = [];
    this.nextPieces = [];
    this.currentPiece = null;
    this.linesCleared = 0;
    this.piecesPlaced = 0;
    this.score = 0;
    this.level = 1;
    this.linesUntilNextLevel = CT_CONFIG.LINES_PER_LEVEL;
    this.baseDropInterval = cfg.dropInterval;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.isLocking = false;
    this.timeRemaining = this.roundDuration;
    this.roundActive = false;

    // Fill the piece queue
    this.fillBag();
    this.fillBag();
    for (let i = 0; i < CT_CONFIG.PREVIEW_COUNT + 1; i++) {
      this.nextPieces.push(this.drawFromBag());
    }

    // Update UI
    this.ui.updateScore(0);
    this.ui.updateTime(this.roundDuration > 0 ? this.roundDuration : -1);
    this.ui.updateLines(0);
    if (this.roundDuration <= 0) {
      this.ui.updateLevel(1);
    }
    this.ui.updatePreview(this.nextPieces.slice(1));

    // Countdown
    this.startCountdown();
  }

  private startCountdown(): void {
    for (let i = 0; i < CT_CONFIG.COUNTDOWN_SEC; i++) {
      const count = CT_CONFIG.COUNTDOWN_SEC - i;
      this.time.delayedCall(i * 1000, () => {
        this.ui.showInstruction(`${count}`);
      });
    }

    this.time.delayedCall(CT_CONFIG.COUNTDOWN_SEC * 1000, () => {
      this.ui.hideInstruction();
      this.roundActive = true;
      this.spawnPiece();
    });
  }

  private fillBag(): void {
    // 7-bag randomizer
    const types = [...ALL_PIECE_TYPES];
    // Fisher-Yates shuffle with seeded RNG
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    this.bag.push(...types);
  }

  private drawFromBag(): PieceType {
    if (this.bag.length === 0) {
      this.fillBag();
    }
    return this.bag.shift()!;
  }

  private spawnPiece(): void {
    const type = this.nextPieces.shift()!;
    this.nextPieces.push(this.drawFromBag());
    this.ui.updatePreview(this.nextPieces);

    // Spawn at top center
    const startCol = type === "O" ? 4 : 3;
    this.currentPiece = new Piece(type, startCol, 0);

    // Check if spawn position is blocked (game over / round end)
    if (!this.board.canPlace(this.currentPiece)) {
      this.completeRound();
      return;
    }

    this.dropTimer = this.dropInterval;
    this.isLocking = false;
    this.lockTimer = 0;
  }

  private movePiece(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false;

    const test = this.currentPiece.clone();
    test.col += dx;
    test.row += dy;

    if (this.board.canPlace(test)) {
      this.currentPiece.col = test.col;
      this.currentPiece.row = test.row;

      // Reset lock delay on successful move
      if (this.isLocking) {
        this.lockTimer = CT_CONFIG.LOCK_DELAY_MS;
      }
      return true;
    }
    return false;
  }

  private rotatePiece(): void {
    if (!this.currentPiece) return;

    const fromRot = this.currentPiece.rotation;
    const toRot = (fromRot + 1) % 4;
    const kicks = getKicks(this.currentPiece.type, fromRot, toRot);

    for (const [dx, dy] of kicks) {
      const test = this.currentPiece.clone();
      test.rotation = toRot;
      test.col += dx;
      test.row -= dy; // SRS uses y-up, our grid uses y-down
      if (this.board.canPlace(test)) {
        this.currentPiece.rotation = toRot;
        this.currentPiece.col = test.col;
        this.currentPiece.row = test.row;

        // Reset lock delay on successful rotate
        if (this.isLocking) {
          this.lockTimer = CT_CONFIG.LOCK_DELAY_MS;
        }
        return;
      }
    }
  }

  private hardDrop(): void {
    if (!this.currentPiece) return;

    const ghostRow = this.board.getGhostRow(this.currentPiece);
    this.currentPiece.row = ghostRow;
    this.lockCurrentPiece();
  }

  private lockCurrentPiece(): void {
    if (!this.currentPiece) return;

    this.board.lockPiece(this.currentPiece);
    this.piecesPlaced++;

    // Clear lines
    const cleared = this.board.clearFullRows();
    if (cleared > 0) {
      this.linesCleared += cleared;
      this.ui.updateLines(this.linesCleared);

      // Show celebration text
      const labels = ["", "SINGLE", "DOUBLE", "TRIPLE", "TETRIS!"];
      const colors = ["", "#3fb950", "#56d4dd", "#d29922", "#a371f7"];
      const label = labels[Math.min(cleared, 4)];
      const color = colors[Math.min(cleared, 4)];
      const boardCenterX =
        CT_CONFIG.BOARD_X + (CT_CONFIG.BOARD_WIDTH * CT_CONFIG.CELL_SIZE) / 2;
      const boardCenterY =
        CT_CONFIG.BOARD_Y + (CT_CONFIG.BOARD_HEIGHT * CT_CONFIG.CELL_SIZE) / 2;
      if (label) {
        this.ui.showFloatingText(boardCenterX, boardCenterY, label, color);
      }

      // Level-up check (solo mode)
      if (this.roundDuration <= 0) {
        this.linesUntilNextLevel -= cleared;
        while (this.linesUntilNextLevel <= 0) {
          this.level++;
          this.linesUntilNextLevel += CT_CONFIG.LINES_PER_LEVEL;
          // Ramp gravity each level
          this.baseDropInterval = Math.max(
            100,
            this.baseDropInterval - CT_CONFIG.SOLO_LEVEL_DROP_RAMP,
          );
          this.dropInterval = this.baseDropInterval;
          this.ui.updateLevel(this.level);
          this.ui.showFloatingText(
            boardCenterX,
            boardCenterY - 30,
            `LEVEL ${this.level}`,
            "#56d4dd",
          );
        }
      }
    }

    // Update score
    this.score =
      this.linesCleared * CT_CONFIG.POINTS_PER_LINE +
      this.piecesPlaced * CT_CONFIG.POINTS_PER_PIECE;
    this.ui.updateScore(this.score);

    // Increase speed over time (timed modes)
    if (this.roundDuration > 0) {
      this.dropInterval = Math.max(100, this.dropInterval - this.speedIncrease);
    }

    this.currentPiece = null;
    this.isLocking = false;

    // Spawn next piece
    this.spawnPiece();
  }

  update(_time: number, delta: number): void {
    if (!this.roundActive) {
      // Still render the board even during countdown
      this.board.render(
        this.currentPiece,
        this.currentPiece ? this.board.getGhostRow(this.currentPiece) : 0,
      );
      return;
    }

    // Tick timer (roundDuration <= 0 means unlimited / solo mode)
    if (this.roundDuration > 0) {
      this.timeRemaining -= delta / 1000;
      this.ui.updateTime(this.timeRemaining);
      if (this.timeRemaining <= 0) {
        this.completeRound();
        return;
      }
    } else {
      this.ui.updateTime(-1);
    }

    // DAS input handling
    this.handleDAS(delta);

    // Ctrl+Down = hard drop (fires once per press)
    if (this.keys && this.keys.down.isDown && this.keys.ctrl.isDown) {
      if (!this.ctrlHardDropFired && this.currentPiece) {
        this.ctrlHardDropFired = true;
        this.hardDrop();
        return;
      }
    } else {
      this.ctrlHardDropFired = false;
    }

    // Soft drop (only when Ctrl is NOT held)
    if (this.keys && this.keys.down.isDown && !this.keys.ctrl.isDown) {
      if (!this.softDropActive) {
        this.softDropActive = true;
      }
    } else {
      this.softDropActive = false;
    }

    // Gravity / drop
    if (this.currentPiece) {
      const effectiveInterval = this.softDropActive
        ? Math.min(50, this.dropInterval)
        : this.dropInterval;

      this.dropTimer -= delta;
      if (this.dropTimer <= 0) {
        const moved = this.movePiece(0, 1);
        if (!moved) {
          // Piece can't move down — start/continue lock delay
          if (!this.isLocking) {
            this.isLocking = true;
            this.lockTimer = CT_CONFIG.LOCK_DELAY_MS;
          }
        } else {
          this.isLocking = false;
        }
        this.dropTimer = effectiveInterval;
      }

      // Lock delay countdown
      if (this.isLocking) {
        this.lockTimer -= delta;
        if (this.lockTimer <= 0) {
          this.lockCurrentPiece();
        }
      }
    }

    // Render
    this.board.render(
      this.currentPiece,
      this.currentPiece ? this.board.getGhostRow(this.currentPiece) : 0,
    );
  }

  private handleDAS(delta: number): void {
    if (!this.keys) return;

    // Left
    if (this.keys.left.isDown) {
      if (!this.dasLeftActive) {
        // Initial press — move immediately
        this.dasLeftActive = true;
        this.movePiece(-1, 0);
        this.dasLeftTimer = CT_CONFIG.DAS_INITIAL_MS;
      } else {
        this.dasLeftTimer -= delta;
        if (this.dasLeftTimer <= 0) {
          this.movePiece(-1, 0);
          this.dasLeftTimer = CT_CONFIG.DAS_REPEAT_MS;
        }
      }
    } else {
      this.dasLeftActive = false;
      this.dasLeftTimer = 0;
    }

    // Right
    if (this.keys.right.isDown) {
      if (!this.dasRightActive) {
        this.dasRightActive = true;
        this.movePiece(1, 0);
        this.dasRightTimer = CT_CONFIG.DAS_INITIAL_MS;
      } else {
        this.dasRightTimer -= delta;
        if (this.dasRightTimer <= 0) {
          this.movePiece(1, 0);
          this.dasRightTimer = CT_CONFIG.DAS_REPEAT_MS;
        }
      }
    } else {
      this.dasRightActive = false;
      this.dasRightTimer = 0;
    }
  }

  private completeRound(): void {
    this.roundActive = false;

    // Final score
    this.score =
      this.linesCleared * CT_CONFIG.POINTS_PER_LINE +
      this.piecesPlaced * CT_CONFIG.POINTS_PER_PIECE;

    this.ui.updateScore(this.score);
    if (this.roundDuration <= 0) {
      this.ui.showInstruction(`GAME OVER — LEVEL ${this.level}`);
    } else {
      this.ui.showInstruction("ROUND COMPLETE");
    }

    if (this.onRoundComplete) {
      this.onRoundComplete({
        linesCleared: this.linesCleared,
        piecesPlaced: this.piecesPlaced,
      });
    }
  }
}
