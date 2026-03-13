import Phaser from "phaser";
import { NR_CONFIG } from "./NebulaRunnerConfig";

export class NebulaRunnerUI {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;
  private crystalsText: Phaser.GameObjects.Text;
  private instructionText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Top-left: score
    this.scoreText = scene.add
      .text(10, 8, "SCORE: 0", {
        fontFamily: NR_CONFIG.FONT,
        fontSize: "14px",
        color: "#3fb950",
      })
      .setDepth(10);

    // Top-center: timer
    this.timerText = scene.add
      .text(NR_CONFIG.FIELD_WIDTH / 2, 6, "30.0", {
        fontFamily: NR_CONFIG.FONT,
        fontSize: "18px",
        color: "#56d4dd",
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    // Top-right: lives
    this.livesText = scene.add
      .text(NR_CONFIG.FIELD_WIDTH - 10, 8, "", {
        fontFamily: NR_CONFIG.FONT,
        fontSize: "14px",
        color: "#f85149",
      })
      .setOrigin(1, 0)
      .setDepth(10);

    // Below timer: crystal count
    this.crystalsText = scene.add
      .text(NR_CONFIG.FIELD_WIDTH / 2, 28, "CRYSTALS: 0", {
        fontFamily: NR_CONFIG.FONT,
        fontSize: "10px",
        color: "#d29922",
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    // Center: instruction text
    this.instructionText = scene.add
      .text(NR_CONFIG.FIELD_WIDTH / 2, NR_CONFIG.FIELD_HEIGHT / 2, "", {
        fontFamily: NR_CONFIG.FONT,
        fontSize: "20px",
        fontStyle: "bold",
        color: "#8b949e",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20)
      .setVisible(false);
  }

  updateScore(score: number): void {
    this.scoreText.setText(`SCORE: ${Math.floor(score)}`);
  }

  updateTime(seconds: number): void {
    const clamped = Math.max(0, seconds);
    this.timerText.setText(clamped.toFixed(1));

    // Color change when time is low
    if (clamped <= 5) {
      this.timerText.setColor("#f85149");
    } else if (clamped <= 10) {
      this.timerText.setColor("#d29922");
    } else {
      this.timerText.setColor("#56d4dd");
    }
  }

  updateLives(lives: number): void {
    this.livesText.setText("\u2666".repeat(Math.max(0, lives)));
  }

  updateCrystals(count: number): void {
    this.crystalsText.setText(`CRYSTALS: ${count}`);
  }

  showFloatingText(x: number, y: number, text: string, color: string): void {
    const floater = this.scene.add
      .text(x, y, text, {
        fontFamily: NR_CONFIG.FONT,
        fontSize: "12px",
        fontStyle: "bold",
        color,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20);

    this.scene.tweens.add({
      targets: floater,
      y: y - 25,
      alpha: 0,
      duration: 600,
      onComplete: () => floater.destroy(),
    });
  }

  showInstruction(text: string): void {
    this.instructionText.setText(text).setVisible(true);
  }

  hideInstruction(): void {
    this.instructionText.setVisible(false);
  }

  destroy(): void {
    this.scoreText.destroy();
    this.timerText.destroy();
    this.livesText.destroy();
    this.crystalsText.destroy();
    this.instructionText.destroy();
  }
}
