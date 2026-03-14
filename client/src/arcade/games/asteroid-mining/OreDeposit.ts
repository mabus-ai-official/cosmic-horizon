import Phaser from "phaser";
import { MINING_CONFIG } from "./AsteroidMiningConfig";

export class OreDeposit {
  private scene: Phaser.Scene;
  private zone: Phaser.GameObjects.Rectangle;
  private core: Phaser.GameObjects.Rectangle;
  private position: number;
  private hit: boolean = false;

  constructor(scene: Phaser.Scene, normalizedPosition: number, width: number) {
    this.scene = scene;
    this.position = normalizedPosition;

    const x =
      MINING_CONFIG.FIELD_X + normalizedPosition * MINING_CONFIG.FIELD_WIDTH;
    const y = MINING_CONFIG.FIELD_Y + MINING_CONFIG.FIELD_HEIGHT / 2;
    const pixelWidth = width * MINING_CONFIG.FIELD_WIDTH;

    // Outer zone (good range)
    this.zone = scene.add.rectangle(
      x,
      y,
      pixelWidth,
      MINING_CONFIG.DEPOSIT_HEIGHT,
      MINING_CONFIG.DEPOSIT_GOOD_COLOR,
      0.08,
    );
    this.zone.setDepth(1);

    // Inner core (perfect range)
    this.core = scene.add.rectangle(
      x,
      y,
      pixelWidth * 0.3,
      MINING_CONFIG.DEPOSIT_HEIGHT,
      MINING_CONFIG.DEPOSIT_PERFECT_COLOR,
      0.15,
    );
    this.core.setDepth(2);

    // Pulsing glow
    scene.tweens.add({
      targets: [this.core],
      alpha: { from: 0.1, to: 0.25 },
      duration: MINING_CONFIG.DEPOSIT_PULSE_SPEED,
      yoyo: true,
      repeat: -1,
    });
  }

  markHit(): void {
    this.hit = true;
    this.zone.setAlpha(0.02);
    this.core.setAlpha(0.05);
    this.scene.tweens.killTweensOf(this.core);
  }

  isHit(): boolean {
    return this.hit;
  }

  getPosition(): number {
    return this.position;
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.core);
    this.zone.destroy();
    this.core.destroy();
  }
}
