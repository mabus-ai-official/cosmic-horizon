import Phaser from "phaser";
import { NR_CONFIG } from "./NebulaRunnerConfig";

export class Ship {
  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.Image;
  private thrust: Phaser.GameObjects.Image;
  private thrustTween: Phaser.Tweens.Tween;

  public hitboxRadius: number;
  public alive: boolean = true;
  public targetX: number;
  public targetY: number;

  private invulnerabilityTimer: number = 0;
  private flashTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, hitboxRadius: number) {
    this.scene = scene;
    this.hitboxRadius = hitboxRadius;
    this.targetX = x;
    this.targetY = y;

    const hw = NR_CONFIG.SHIP_WIDTH / 2;

    // Ship sprite (rotated 90° CW — Kenney sprite faces up, game scrolls right)
    this.body = scene.add
      .image(x, y, "nr_ship")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(NR_CONFIG.SHIP_WIDTH, NR_CONFIG.SHIP_HEIGHT)
      .setRotation(Math.PI / 2)
      .setDepth(6);

    // Thrust sprite behind ship (rotated to match)
    this.thrust = scene.add
      .image(x - hw - 8, y, "nr_thrust")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(14, 10)
      .setRotation(Math.PI / 2)
      .setDepth(5);

    this.thrustTween = scene.tweens.add({
      targets: this.thrust,
      alpha: 0.3,
      scaleX: 0.6,
      scaleY: 0.6,
      duration: 150,
      yoyo: true,
      repeat: -1,
    });
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  get isInvulnerable(): boolean {
    return this.invulnerabilityTimer > 0;
  }

  update(delta: number): void {
    if (!this.alive) return;

    // Lerp toward target Y
    const lerpFactor = Math.min(1, (8 * delta) / 1000);
    const newY = this.body.y + (this.targetY - this.body.y) * lerpFactor;
    const clampedY = Phaser.Math.Clamp(newY, 20, NR_CONFIG.FIELD_HEIGHT - 20);

    this.body.y = clampedY;
    this.thrust.y = clampedY;

    // Lerp toward target X
    const newX = this.body.x + (this.targetX - this.body.x) * lerpFactor;
    const clampedX = Phaser.Math.Clamp(
      newX,
      NR_CONFIG.SHIP_MIN_X,
      NR_CONFIG.SHIP_MAX_X,
    );

    this.body.x = clampedX;
    const hw = NR_CONFIG.SHIP_WIDTH / 2;
    this.thrust.x = clampedX - hw - 8;

    // Tick invulnerability
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= delta;
      // Flash alpha during invulnerability
      const flash = Math.sin(this.invulnerabilityTimer / 80) * 0.4 + 0.6;
      this.body.setAlpha(flash);

      if (this.invulnerabilityTimer <= 0) {
        this.invulnerabilityTimer = 0;
        this.body.setAlpha(1);
      }
    }
  }

  hit(): void {
    this.invulnerabilityTimer = NR_CONFIG.INVULNERABILITY_MS;

    // Flash red tint
    if (this.flashTween) {
      this.flashTween.stop();
    }

    this.body.setTint(0xf85149);
    this.flashTween = this.scene.tweens.add({
      targets: this.body,
      duration: 200,
      onComplete: () => {
        this.body.clearTint();
      },
    });
  }

  destroy(): void {
    if (this.flashTween) {
      this.flashTween.stop();
    }
    this.thrustTween.stop();
    this.body.destroy();
    this.thrust.destroy();
  }
}
