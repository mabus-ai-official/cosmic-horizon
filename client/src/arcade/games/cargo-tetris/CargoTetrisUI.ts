import Phaser from "phaser";
import { CT_CONFIG } from "./CargoTetrisConfig";
import { type PieceType, PIECE_SHAPES } from "./Piece";

export class CargoTetrisUI {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private linesText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private instructionText: Phaser.GameObjects.Text;
  // Preview piece images (3 previews × 4 cells each = 12 images)
  private previewImages: Phaser.GameObjects.Image[][] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Top-left: score
    this.scoreText = scene.add
      .text(10, 8, "SCORE: 0", {
        fontFamily: CT_CONFIG.FONT,
        fontSize: "14px",
        color: "#3fb950",
      })
      .setDepth(10);

    // Top-center: timer
    this.timerText = scene.add
      .text(CT_CONFIG.CANVAS_WIDTH / 2, 6, "60.0", {
        fontFamily: CT_CONFIG.FONT,
        fontSize: "18px",
        color: "#56d4dd",
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    // Top-right: lines
    this.linesText = scene.add
      .text(CT_CONFIG.CANVAS_WIDTH - 10, 8, "LINES: 0", {
        fontFamily: CT_CONFIG.FONT,
        fontSize: "14px",
        color: "#d29922",
      })
      .setOrigin(1, 0)
      .setDepth(10);

    // Level display (solo mode, hidden by default)
    this.levelText = scene.add
      .text(CT_CONFIG.CANVAS_WIDTH - 10, 26, "", {
        fontFamily: CT_CONFIG.FONT,
        fontSize: "14px",
        color: "#56d4dd",
      })
      .setOrigin(1, 0)
      .setDepth(10)
      .setVisible(false);

    // Center: instruction text
    this.instructionText = scene.add
      .text(
        CT_CONFIG.BOARD_X + (CT_CONFIG.BOARD_WIDTH * CT_CONFIG.CELL_SIZE) / 2,
        CT_CONFIG.BOARD_Y + (CT_CONFIG.BOARD_HEIGHT * CT_CONFIG.CELL_SIZE) / 2,
        "",
        {
          fontFamily: CT_CONFIG.FONT,
          fontSize: "20px",
          fontStyle: "bold",
          color: "#8b949e",
        },
      )
      .setOrigin(0.5, 0.5)
      .setDepth(20)
      .setVisible(false);

    // NEXT label
    scene.add
      .text(CT_CONFIG.PREVIEW_X, CT_CONFIG.PREVIEW_Y - 20, "NEXT", {
        fontFamily: CT_CONFIG.FONT,
        fontSize: "12px",
        color: "#8b949e",
      })
      .setDepth(10);

    // Pre-create preview images for 3 pieces (4 cells each)
    for (let p = 0; p < CT_CONFIG.PREVIEW_COUNT; p++) {
      const imgs: Phaser.GameObjects.Image[] = [];
      for (let i = 0; i < 4; i++) {
        const img = scene.add
          .image(0, 0, "ct_block_cyan")
          .setScale(CT_CONFIG.PREVIEW_SCALE)
          .setDepth(10)
          .setVisible(false);
        imgs.push(img);
      }
      this.previewImages.push(imgs);
    }

    // Controls hint
    scene.add
      .text(
        CT_CONFIG.HINT_X,
        CT_CONFIG.HINT_Y,
        "\u2190/\u2192: Move\n\u2193: Soft Drop\nSpace: Rotate\nCtrl+\u2193: Hard Drop",
        {
          fontFamily: CT_CONFIG.FONT,
          fontSize: "11px",
          color: "#484f58",
          lineSpacing: 6,
        },
      )
      .setDepth(10);
  }

  updateScore(score: number): void {
    this.scoreText.setText(`SCORE: ${Math.floor(score)}`);
  }

  updateTime(seconds: number): void {
    if (seconds < 0) {
      // Unlimited / solo mode
      this.timerText.setText("SOLO").setColor("#a371f7");
      return;
    }
    const clamped = Math.max(0, seconds);
    this.timerText.setText(clamped.toFixed(1));

    if (clamped <= 5) {
      this.timerText.setColor("#f85149");
    } else if (clamped <= 10) {
      this.timerText.setColor("#d29922");
    } else {
      this.timerText.setColor("#56d4dd");
    }
  }

  updateLines(lines: number): void {
    this.linesText.setText(`LINES: ${lines}`);
  }

  updateLevel(level: number): void {
    this.levelText.setText(`LEVEL: ${level}`).setVisible(true);
  }

  updatePreview(nextPieces: PieceType[]): void {
    for (let p = 0; p < CT_CONFIG.PREVIEW_COUNT; p++) {
      const imgs = this.previewImages[p];
      if (p >= nextPieces.length) {
        imgs.forEach((img) => img.setVisible(false));
        continue;
      }

      const type = nextPieces[p];
      const shape = PIECE_SHAPES[type][0]; // rotation 0
      const baseX = CT_CONFIG.PREVIEW_X;
      const baseY = CT_CONFIG.PREVIEW_Y + p * CT_CONFIG.PREVIEW_GAP;
      const cs = CT_CONFIG.PREVIEW_CELL;
      const tex = CT_CONFIG.PIECE_TEXTURES[type];

      for (let i = 0; i < 4; i++) {
        const [r, c] = shape[i];
        imgs[i]
          .setPosition(baseX + c * cs + cs / 2, baseY + r * cs + cs / 2)
          .setTexture(tex)
          .setVisible(true);
      }
    }
  }

  showFloatingText(x: number, y: number, text: string, color: string): void {
    const floater = this.scene.add
      .text(x, y, text, {
        fontFamily: CT_CONFIG.FONT,
        fontSize: "14px",
        fontStyle: "bold",
        color,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20);

    this.scene.tweens.add({
      targets: floater,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => floater.destroy(),
    });
  }

  showInstruction(text: string): void {
    this.instructionText.setText(text).setVisible(true);
  }

  hideInstruction(): void {
    this.instructionText.setVisible(false);
  }
}
