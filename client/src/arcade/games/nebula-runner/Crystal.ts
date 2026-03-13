import Phaser from "phaser";
import { NR_CONFIG } from "./NebulaRunnerConfig";

export class Crystal {
  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.Image;
  private pulseTween: Phaser.Tweens.Tween | null = null;

  public alive: boolean = true;
  public collected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Crystal sprite sized to match the crystal hitbox
    const diameter = NR_CONFIG.CRYSTAL_SIZE * 2;
    this.body = scene.add
      .image(x, y, "nr_crystal")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(diameter, diameter)
      .setDepth(4);

    // Subtle pulsing alpha
    this.pulseTween = scene.tweens.add({
      targets: this.body,
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  update(delta: number, scrollSpeed: number): void {
    if (!this.alive) return;

    const dx = scrollSpeed * (delta / 1000);
    this.body.x -= dx;

    if (this.body.x < -NR_CONFIG.CRYSTAL_SIZE) {
      this.alive = false;
    }
  }

  collect(): void {
    this.collected = true;
    this.alive = false;

    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }

    // Collection animation: scale up + fade out
    this.scene.tweens.add({
      targets: this.body,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      ease: "Quad.easeOut",
      onComplete: () => this.body.destroy(),
    });
  }

  destroy(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    if (this.body) {
      this.body.destroy();
    }
  }
}
