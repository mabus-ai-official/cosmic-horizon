import Phaser from "phaser";
import { MINING_CONFIG } from "./AsteroidMiningConfig";

export class ScannerBar {
  private bar: Phaser.GameObjects.Rectangle;
  private glow: Phaser.GameObjects.Rectangle;
  private speed: number;
  private direction: number = 1;
  private active: boolean = true;

  constructor(scene: Phaser.Scene, speed: number) {
    this.speed = speed;

    // Glow behind bar
    this.glow = scene.add.rectangle(
      MINING_CONFIG.FIELD_X,
      MINING_CONFIG.FIELD_Y + MINING_CONFIG.FIELD_HEIGHT / 2,
      12,
      MINING_CONFIG.DEPOSIT_HEIGHT,
      MINING_CONFIG.BAR_GLOW_COLOR,
      0.15,
    );
    this.glow.setDepth(5);

    // Main scanner bar
    this.bar = scene.add.rectangle(
      MINING_CONFIG.FIELD_X,
      MINING_CONFIG.FIELD_Y + MINING_CONFIG.FIELD_HEIGHT / 2,
      MINING_CONFIG.BAR_WIDTH,
      MINING_CONFIG.DEPOSIT_HEIGHT,
      MINING_CONFIG.BAR_COLOR,
      0.9,
    );
    this.bar.setDepth(6);
  }

  update(delta: number): void {
    if (!this.active) return;

    const pixelsPerMs = (this.speed * MINING_CONFIG.FIELD_WIDTH) / 1000;
    const dx = pixelsPerMs * delta * this.direction;
    const newX = this.bar.x + dx;

    if (newX >= MINING_CONFIG.FIELD_X + MINING_CONFIG.FIELD_WIDTH) {
      this.direction = -1;
    } else if (newX <= MINING_CONFIG.FIELD_X) {
      this.direction = 1;
    }

    this.bar.x = Phaser.Math.Clamp(
      newX,
      MINING_CONFIG.FIELD_X,
      MINING_CONFIG.FIELD_X + MINING_CONFIG.FIELD_WIDTH,
    );
    this.glow.x = this.bar.x;
  }

  getNormalizedPosition(): number {
    return (this.bar.x - MINING_CONFIG.FIELD_X) / MINING_CONFIG.FIELD_WIDTH;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  stop(): void {
    this.active = false;
  }

  start(): void {
    this.active = true;
  }

  reset(): void {
    this.bar.x = MINING_CONFIG.FIELD_X;
    this.glow.x = MINING_CONFIG.FIELD_X;
    this.direction = 1;
    this.active = true;
  }

  destroy(): void {
    this.bar.destroy();
    this.glow.destroy();
  }
}
