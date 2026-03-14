import Phaser from "phaser";
import { MINING_CONFIG } from "./AsteroidMiningConfig";

export class AsteroidMiningUI {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text;
  private hitCountText: Phaser.GameObjects.Text;
  private instructionText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.scoreText = scene.add
      .text(MINING_CONFIG.FIELD_X, 10, "SCORE: 0", {
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: "14px",
        color: "#3fb950",
      })
      .setDepth(10);

    this.hitCountText = scene.add
      .text(
        MINING_CONFIG.FIELD_X + MINING_CONFIG.FIELD_WIDTH,
        10,
        `HITS: 0/${MINING_CONFIG.HITS_PER_ROUND}`,
        {
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: "14px",
          color: "#56d4dd",
          align: "right",
        },
      )
      .setOrigin(1, 0)
      .setDepth(10);

    this.instructionText = scene.add
      .text(400, 460, "PRESS SPACE OR CLICK TO MINE", {
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: "11px",
        color: "#8b949e",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(10);
  }

  updateScore(score: number): void {
    this.scoreText.setText(`SCORE: ${score}`);
  }

  updateHitCount(hits: number): void {
    this.hitCountText.setText(`HITS: ${hits}/${MINING_CONFIG.HITS_PER_ROUND}`);
  }

  showFloatingText(x: number, y: number, text: string, color: string): void {
    const floater = this.scene.add
      .text(x, y, text, {
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: "18px",
        fontStyle: "bold",
        color,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20);

    this.scene.tweens.add({
      targets: floater,
      y: y - 40,
      alpha: 0,
      duration: MINING_CONFIG.HIT_FEEDBACK_DURATION,
      onComplete: () => floater.destroy(),
    });
  }

  hideInstruction(): void {
    this.instructionText.setVisible(false);
  }

  showInstruction(text: string): void {
    this.instructionText.setText(text).setVisible(true);
  }

  destroy(): void {
    this.scoreText.destroy();
    this.hitCountText.destroy();
    this.instructionText.destroy();
  }
}
